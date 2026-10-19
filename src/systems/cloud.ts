// Tài khoản và lưu game trên mây (Supabase).
// - Không có cấu hình (.env) hoặc mất mạng → game vẫn chạy bình thường, chỉ lưu trên máy.
// - Đăng nhập rồi thì mỗi lần lưu game sẽ tự đẩy lên mây (gộp lại, trễ vài giây).
// - Dữ liệu được bảo vệ bằng RLS: mỗi tài khoản chỉ đọc / ghi được save của mình.
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import type { GameState } from '../game/state';
import { t } from '../i18n';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const cloudEnabled = !!URL && !!KEY;

export interface CloudUser {
  id: string;
  email: string;
  trainerName: string;
  /** nhân vật đã chọn (data/avatars.ts) */
  avatar: string;
  /** đã qua màn chọn nhân vật + đặt tên */
  setupDone: boolean;
}

export interface CloudSaveInfo {
  data: unknown;
  badges: number;
  caught: number;
  playMs: number;
  updatedAt: string;
}

let client: SupabaseClient | null = null;
let user: CloudUser | null = null;
let pending: GameState | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
/** trạng thái đồng bộ gần nhất (hiện ở menu / màn tài khoản) */
export const syncStatus = { lastOkAt: 0, lastError: '', saving: false };
const listeners = new Set<(u: CloudUser | null) => void>();

function sb(): SupabaseClient | null {
  if (!cloudEnabled) return null;
  if (!client) client = createClient(URL!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'pokeke.auth' } });
  return client;
}

export function currentUser(): CloudUser | null {
  return user;
}

export function onUserChange(fn: (u: CloudUser | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function loadProfile(session: Session | null) {
  if (!session) {
    user = null;
  } else {
    const c = sb()!;
    const { data } = await c.from('profiles').select('trainer_name, avatar, setup_done').eq('id', session.user.id).maybeSingle();
    user = {
      id: session.user.id,
      email: session.user.email ?? '',
      trainerName: data?.trainer_name ?? 'Satoshi',
      avatar: data?.avatar ?? 'satoshi',
      setupDone: !!data?.setup_done,
    };
  }
  for (const fn of listeners) fn(user);
}

/** Gọi một lần khi khởi động: khôi phục phiên đăng nhập cũ (nếu có) */
export async function initCloud(): Promise<void> {
  const c = sb();
  if (!c) return;
  try {
    const { data } = await c.auth.getSession();
    await loadProfile(data.session);
    c.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') void loadProfile(session);
    });
  } catch {
    // mất mạng: chơi offline
  }
  window.addEventListener('beforeunload', () => void flushCloudSave());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushCloudSave();
  });
}

/** Thông báo lỗi theo ngôn ngữ đang chọn */
function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return t('account.err.credentials');
  if (m.includes('already registered') || m.includes('already been registered')) return t('account.err.registered');
  if (m.includes('email not confirmed')) return t('account.err.unconfirmed');
  if (m.includes('password should be at least') || m.includes('weak password')) return t('account.err.weakPassword');
  if (m.includes('unable to validate email') || m.includes('invalid email') || m.includes('is invalid')) return t('account.err.invalidEmail');
  if (m.includes('rate limit') || m.includes('too many')) return t('account.err.rateLimit');
  if (m.includes('failed to fetch') || m.includes('network')) return t('account.err.network');
  return msg;
}

export async function signUp(email: string, password: string): Promise<{ ok: boolean; needsConfirm?: boolean; error?: string }> {
  const c = sb();
  if (!c) return { ok: false, error: t('account.err.notConfigured') };
  try {
    const { data, error } = await c.auth.signUp({ email, password });
    if (error) return { ok: false, error: friendlyError(error.message) };
    // Supabase trả về user rỗng identities khi email đã tồn tại (chống dò email)
    if (data.user && data.user.identities && data.user.identities.length === 0) return { ok: false, error: t('account.err.registered') };
    if (!data.session) return { ok: true, needsConfirm: true };
    await loadProfile(data.session);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendlyError(String((e as Error).message ?? e)) };
  }
}

export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const c = sb();
  if (!c) return { ok: false, error: t('account.err.notConfigured') };
  try {
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: friendlyError(error.message) };
    await loadProfile(data.session);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendlyError(String((e as Error).message ?? e)) };
  }
}

export async function signOut(): Promise<void> {
  await flushCloudSave();
  try {
    await sb()?.auth.signOut();
  } catch {
    // bỏ qua
  }
  user = null;
  for (const fn of listeners) fn(null);
}

/** Lưu nhân vật + tên (màn Chọn nhân vật); đánh dấu đã thiết lập xong */
export async function updateProfile(name: string, avatar = user?.avatar ?? 'satoshi'): Promise<string | null> {
  const c = sb();
  if (!c || !user) return t('account.err.notSignedIn');
  const clean = name.trim().slice(0, 16);
  if (!clean) return t('account.err.emptyName');
  const { error } = await c.from('profiles').update({ trainer_name: clean, avatar, setup_done: true }).eq('id', user.id);
  if (error) return friendlyError(error.message);
  user = { ...user, trainerName: clean, avatar, setupDone: true };
  for (const fn of listeners) fn(user);
  return null;
}

/** Đọc save trên mây của tài khoản đang đăng nhập (null = chưa có) */
export async function fetchCloudSave(): Promise<CloudSaveInfo | null> {
  const c = sb();
  if (!c || !user) return null;
  const { data, error } = await c.from('game_saves').select('data, badges, caught, play_ms, updated_at').eq('user_id', user.id).maybeSingle();
  if (error || !data) return null;
  return { data: data.data, badges: data.badges, caught: data.caught, playMs: Number(data.play_ms), updatedAt: data.updated_at };
}

/** Đẩy save lên mây ngay */
export async function pushCloudSave(state: GameState): Promise<boolean> {
  const c = sb();
  if (!c || !user) return false;
  syncStatus.saving = true;
  try {
    const { error } = await c.from('game_saves').upsert({
      user_id: user.id,
      data: state,
      version: state.version,
      badges: state.badges.length,
      caught: state.dex?.caught.length ?? 0,
      play_ms: Math.round(state.playMs),
    });
    if (error) {
      syncStatus.lastError = friendlyError(error.message);
      return false;
    }
    syncStatus.lastOkAt = Date.now();
    syncStatus.lastError = '';
    return true;
  } catch (e) {
    syncStatus.lastError = friendlyError(String((e as Error).message ?? e));
    return false;
  } finally {
    syncStatus.saving = false;
  }
}

/** Hẹn đẩy save lên mây (gộp nhiều lần lưu liên tiếp thành 1 lần gửi) */
export function scheduleCloudSave(state: GameState) {
  if (!user) return;
  pending = state;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flushCloudSave(), 2500);
}

export async function flushCloudSave() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const s = pending;
  pending = null;
  if (s) await pushCloudSave(s);
}
