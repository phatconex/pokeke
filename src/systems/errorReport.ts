// Bắt lỗi toàn cục: lưu game, ghi nhật ký lỗi cục bộ (để gửi kèm khi báo lỗi) và hiện hộp thoại thân thiện thay vì để game đứng im.
import { saveGame } from '../game/state';
import { t } from '../i18n';

const LOG_KEY = 'pokeke.errors';
let shown = false;
let count = 0;

function log(msg: string, stack?: string) {
  try {
    const arr: { at: string; msg: string; stack?: string }[] = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]');
    arr.push({ at: new Date().toISOString(), msg: msg.slice(0, 300), stack: stack?.slice(0, 800) });
    localStorage.setItem(LOG_KEY, JSON.stringify(arr.slice(-20)));
  } catch {
    /* bộ nhớ cục bộ bị chặn: bỏ qua */
  }
}

function overlay() {
  if (shown) return;
  shown = true;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(5,10,8,.82);font-family:PixelUI,monospace';
  const box = document.createElement('div');
  box.style.cssText = 'max-width:460px;margin:16px;padding:22px 24px;background:#24305a;border:4px solid #f4f1e6;color:#fff;text-align:center;box-shadow:0 6px 0 rgba(0,0,0,.5)';
  const h = document.createElement('div');
  h.textContent = t('err.title');
  h.style.cssText = 'font-size:20px;color:#ffd34a;margin-bottom:10px';
  const p = document.createElement('div');
  p.textContent = t('err.body');
  p.style.cssText = 'font-size:13px;line-height:1.5;margin-bottom:16px';
  const mk = (label: string, primary: boolean, fn: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = `font:inherit;font-size:14px;margin:0 6px;padding:8px 16px;cursor:pointer;color:#fff;border:3px solid #f4f1e6;background:${primary ? '#d85a18' : '#3a4a8a'}`;
    b.onclick = fn;
    return b;
  };
  box.append(h, p, mk(t('err.reload'), true, () => location.reload()), mk(t('err.dismiss'), false, () => { wrap.remove(); shown = false; }));
  wrap.append(box);
  document.body.append(wrap);
}

function handle(msg: string, stack?: string) {
  count++;
  log(msg, stack);
  try {
    saveGame();
  } catch {
    /* ignore */
  }
  // lỗi nhỏ lẻ đơn lẻ thì chỉ ghi nhật ký; lặp lại (≥ 3) mới làm phiền người chơi
  if (count >= 3) overlay();
}

export function installErrorReporting() {
  window.addEventListener('error', (e) => {
    if (/ResizeObserver/.test(e.message)) return;
    // lỗi của tiện ích trình duyệt / script khác nguồn: bỏ qua
    if (e.filename && !e.filename.startsWith(location.origin)) return;
    handle(e.message, e.error?.stack);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string; stack?: string } | undefined;
    handle(String(r?.message ?? e.reason), r?.stack);
  });
}

/** Thiết bị cảm ứng, không có bàn phím: nhắc một lần */
export function touchWarning() {
  try {
    if (!window.matchMedia('(pointer: coarse)').matches || localStorage.getItem('pokeke.touchWarned')) return;
    localStorage.setItem('pokeke.touchWarned', '1');
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99998;padding:8px 12px;background:#d85a18;color:#fff;font:13px PixelUI,monospace;text-align:center';
    bar.textContent = t('touch.warn') + '  ';
    const b = document.createElement('button');
    b.textContent = t('touch.ok');
    b.style.cssText = 'font:inherit;margin-left:8px;padding:2px 10px;cursor:pointer';
    b.onclick = () => bar.remove();
    bar.append(b);
    document.body.append(bar);
  } catch {
    /* ignore */
  }
}
