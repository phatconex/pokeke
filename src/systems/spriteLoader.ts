// Nạp sprite Pokémon theo nhu cầu.
// Lúc khởi động chỉ nạp sheet Đi + Đứng của mọi loài (đủ cho chân dung, icon và đo kích thước);
// các sheet hành động (đánh, gồng, bắn, bị đánh, gục) chỉ nạp khi vào trận có loài đó.
import Phaser from 'phaser';
import { POKEMON } from '../data/pokemon';
import { AnimName, SPRITE_SHEETS } from '../data/spriteSheets';
import { animKey, isLooping, SPRITE_METRICS } from '../entities/PokemonSprite';
import { generateFallbackPokemon } from '../art/textures';

const TICK_MS = 1000 / 60;
export const BOOT_ANIMS: AnimName[] = ['walk', 'idle'];

/** Ghi lại loài nào phải dùng hình dự phòng (để hiển thị/ghi log) */
export const assetStatus = { failed: [] as string[] };

function simulateFail() {
  return new URLSearchParams(window.location.search).has('noassets');
}

/** Xếp các sheet còn thiếu của các loài vào hàng đợi tải; trả về số sheet đã xếp */
export function queueSheets(scene: Phaser.Scene, ids: Iterable<string>, only?: AnimName[]): number {
  let n = 0;
  const fail = simulateFail();
  for (const sid of new Set(ids)) {
    const sheets = SPRITE_SHEETS[sid];
    if (!sheets) continue;
    for (const [name, def] of Object.entries(sheets) as [AnimName, (typeof sheets)[AnimName]][]) {
      if (!def || (only && !only.includes(name))) continue;
      const key = `${sid}-${name}`;
      if (scene.textures.exists(key)) continue;
      scene.load.spritesheet(key, fail ? 'assets/__missing__/' + def.file : def.file, { frameWidth: def.frameWidth, frameHeight: def.frameHeight });
      n++;
    }
  }
  return n;
}

/** Sau khi tải: đo kích thước (lần đầu) và tạo animation cho các sheet đã có */
export function finalizeSpecies(scene: Phaser.Scene, ids: Iterable<string>) {
  for (const sid of new Set(ids)) {
    if (!POKEMON[sid]) continue;
    const sheets = SPRITE_SHEETS[sid] ?? {};
    // loài từng phải dùng hình dự phòng nhưng sheet vừa tải được (tải lại) → đo lại
    if (SPRITE_METRICS[sid] && !SPRITE_METRICS[sid].animated && scene.textures.exists(`${sid}-walk`)) {
      delete SPRITE_METRICS[sid];
      assetStatus.failed = assetStatus.failed.filter((x) => x !== sid);
    }
    if (!SPRITE_METRICS[sid]) {
      const metrics = scene.textures.exists(`${sid}-walk`) ? measure(scene, `${sid}-walk`) : null;
      if (metrics) {
        SPRITE_METRICS[sid] = { ...metrics, animated: true };
      } else {
        generateFallbackPokemon(scene, `${sid}-fallback`, POKEMON[sid].fallbackColor);
        SPRITE_METRICS[sid] = { footOffset: 16, height: 24, animated: false };
        assetStatus.failed.push(sid);
        continue;
      }
    }
    if (!SPRITE_METRICS[sid].animated) continue;
    for (const [name, def] of Object.entries(sheets)) {
      if (def && !scene.anims.exists(animKey(sid, name as AnimName, 0))) buildAnims(scene, sid, name as AnimName, def.durations);
    }
  }
}

/** Tải lại các sheet Đi/Đứng bị lỗi lúc khởi động (mạng/máy chủ chập chờn): thử tối đa `tries` lần, xong thì gọi done() */
export function retryFailedSheets(scene: Phaser.Scene, done: () => void, tries = 3, gapMs = 900) {
  if (!assetStatus.failed.length || tries <= 0 || simulateFail()) {
    done();
    return;
  }
  scene.time.delayedCall(gapMs, () => {
    const ids = [...assetStatus.failed];
    if (!queueSheets(scene, ids, BOOT_ANIMS)) {
      finalizeSpecies(scene, ids);
      retryFailedSheets(scene, done, tries - 1, gapMs);
      return;
    }
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      finalizeSpecies(scene, ids);
      retryFailedSheets(scene, done, tries - 1, gapMs);
    });
    scene.load.start();
  });
}

/** Đảm bảo đủ sheet của các loài (dùng ngoài preload, vd. khi bắt / tiến hóa giữa trận) */
export function ensureSpecies(scene: Phaser.Scene, ids: string[]): Promise<void> {
  return new Promise((resolve) => {
    if (!queueSheets(scene, ids)) {
      finalizeSpecies(scene, ids);
      resolve();
      return;
    }
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      finalizeSpecies(scene, ids);
      resolve();
    });
    scene.load.start();
  });
}

/** Tạo 8 animation (mỗi hướng một hàng) cho một sheet */
function buildAnims(scene: Phaser.Scene, sid: string, name: AnimName, durations: number[]) {
  const texKey = `${sid}-${name}`;
  if (!scene.textures.exists(texKey)) return;
  const tex = scene.textures.get(texKey);
  const src = tex.getSourceImage() as HTMLImageElement;
  const first = tex.get(0);
  const cols = Math.max(1, Math.floor(src.width / first.width));
  const rows = Math.max(1, Math.floor(src.height / first.height));
  const count = Math.min(cols, durations.length);
  for (let dir = 0; dir < 8; dir++) {
    const row = rows >= 8 ? dir : 0;
    const key = animKey(sid, name, dir);
    if (scene.anims.exists(key)) scene.anims.remove(key);
    scene.anims.create({
      key,
      frames: durations.slice(0, count).map((t, i) => ({ key: texKey, frame: row * cols + i, duration: t * TICK_MS })),
      frameRate: 60,
      repeat: isLooping(name) ? -1 : 0,
    });
  }
}

/** Đo khung đầu tiên (hướng xuống) để biết chân nằm ở đâu so với tâm khung */
function measure(scene: Phaser.Scene, texKey: string): { footOffset: number; height: number } | null {
  try {
    const frame = scene.textures.get(texKey).get(0);
    const src = frame.source.image as HTMLImageElement;
    const w = frame.width;
    const h = frame.height;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(src, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let minY = h;
    let maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 10) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxY < 0) return null;
    return { footOffset: maxY + 1 - h / 2, height: maxY - minY + 1 };
  } catch (e) {
    console.warn('[Pokeke] Không đo được sprite', texKey, e);
    return null;
  }
}
