import Phaser from 'phaser';
import { getSettings } from '../systems/settings';

/** Font pixel Galmuri11 (lưới 12px) và Galmuri9 (lưới 10px) – nạp trong index.html */
export const FONT = 'PixelUI, "Trebuchet MS", Arial, sans-serif';
export const FONT_SMALL = 'PixelUISmall, "Trebuchet MS", Arial, sans-serif';
export const MONO = FONT_SMALL;
/** Pixelify Sans (lưới 11px) – font giao diện tiếng Anh */
export const FONT_EN = 'Pixelify, PixelUI, sans-serif';
/** Press Start 2P (lưới 8px) – chỉ cho logo, không có dấu tiếng Việt */
export const FONT_LOGO = 'PixelLogo, PixelUI, sans-serif';

export const COLORS = {
  fire: '#ffa030',
  fireHex: 0xf08030,
  ink: '#1a1410',
  panel: 0x14231a,
  panelEdge: 0x6aa84f,
  text: '#f4f1e6',
  dim: '#a8b8a0',
  hp: 0xe04848,
  hpBack: 0x3a1a1a,
  xp: 0x3ec8f0,
  xpBack: 0x123040,
  gold: '#ffd34a',
  shadow: '#0b120d',
};

/**
 * Chọn font + cỡ chữ đúng bội số lưới pixel để nét chữ sắc (không nhòe).
 * Galmuri11 dùng các cỡ 12/24/36/48..., Galmuri9 dùng 10/20/30.
 */
export function pixelFont(size: number): { family: string; px: number; unit: number } {
  // tiếng Anh: Pixelify Sans, cỡ bội số 11px (11/22/33/44...) cho nét sắc
  if (getSettings().lang === 'en') {
    // Pixelify nhỏ hơn Galmuri ở cùng cỡ → chữ thường 12px đổi thành 16px cho dễ đọc
    if (size <= 9) return { family: FONT_EN, px: 11, unit: 1 }; // cỡ gốc 1×, cho nhãn rất chật
    if (size <= 11) return { family: FONT_EN, px: 13, unit: 1 };
    if (size <= 16) return { family: FONT_EN, px: 16, unit: 1 };
    const steps = Math.max(2, Math.round(size / 11));
    return { family: FONT_EN, px: steps * 11, unit: Math.max(1, steps - 1) };
  }
  if (size <= 11) return { family: FONT_SMALL, px: 10, unit: 1 };
  if (size <= 16) return { family: FONT, px: 12, unit: 1 };
  if (size <= 21) return { family: FONT_SMALL, px: 20, unit: 2 };
  if (size <= 27) return { family: FONT, px: 24, unit: 2 };
  if (size <= 33) return { family: FONT_SMALL, px: 30, unit: 3 };
  const steps = Math.max(3, Math.round(size / 12));
  return { family: FONT, px: steps * 12, unit: steps };
}

/**
 * Text có khoảng đệm phía trên (cho dấu tiếng Việt hai tầng Ế, Ẫ... không bị cắt) nhưng
 * gốc toạ độ vẫn tính theo khung chữ: phần đệm nhô lên trên, chữ không bị đẩy xuống đè dòng dưới.
 */
class PixelText extends Phaser.GameObjects.Text {
  updateDisplayOrigin() {
    const top = this.padding?.top ?? 0;
    const self = this as unknown as { _displayOriginX: number; _displayOriginY: number };
    self._displayOriginX = this.originX * this.width;
    self._displayOriginY = this.originY * (this.height - top) + top;
    return this;
  }
}

function addPixelText(scene: Phaser.Scene, x: number, y: number, value: string, style: Phaser.Types.GameObjects.Text.TextStyle) {
  return scene.add.existing(new PixelText(scene, x, y, value, style));
}

/** Chữ pixel có bóng đổ cứng (không viền bo tròn) */
export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 20,
  color = COLORS.text,
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
) {
  const f = pixelFont(size);
  const t = addPixelText(scene, x, y, value, {
    fontFamily: f.family,
    fontSize: `${f.px}px`,
    color,
    padding: { top: Math.ceil(f.px * 0.25) },
    ...extra,
  });
  const off = Math.max(1, f.unit);
  t.setShadow(off, off, COLORS.shadow, 0, false, true);
  return t;
}

/** Chữ pixel lớn có viền dày vuông (vẽ nhiều lớp lệch nhau), dùng cho logo / tiêu đề */
export function outlinedText(scene: Phaser.Scene, x: number, y: number, value: string, size: number, color: string, outline = '#2a1430', thickness = 4, logo = false) {
  const f = logo ? { family: FONT_LOGO, px: Math.max(8, Math.round(size / 8) * 8) } : pixelFont(size);
  const style = { fontFamily: f.family, fontSize: `${f.px}px`, color: outline, padding: { top: Math.ceil(f.px * 0.25) } };
  const layers: Phaser.GameObjects.Text[] = [];
  for (let dx = -thickness; dx <= thickness; dx += thickness) {
    for (let dy = -thickness; dy <= thickness + thickness; dy += thickness) {
      if (dx === 0 && dy === 0) continue;
      layers.push(addPixelText(scene, x + dx, y + dy, value, style).setOrigin(0.5));
    }
  }
  const main = addPixelText(scene, x, y, value, { ...style, color }).setOrigin(0.5);
  return { main, layers, all: [...layers, main] };
}

/** Khung pixel đơn giản: viền 2 lớp kiểu game cổ điển */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.85) {
  const g = scene.add.graphics();
  g.fillStyle(0x0b120d, alpha);
  g.fillRect(x, y, w, h);
  g.lineStyle(2, COLORS.panelEdge, 1);
  g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  g.lineStyle(2, 0x0b120d, 1);
  g.strokeRect(x + 4, y + 4, w - 8, h - 8);
  return g;
}

/** Texture nút bo góc (vẽ một lần, kéo giãn bằng NineSlice) */
function ensurePillTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('ui-pill')) return;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x0b0f1e, 1).fillRoundedRect(0, 0, 40, 40, 12);
  g.fillStyle(0x34479a, 1).fillRoundedRect(3, 3, 34, 34, 10);
  g.fillStyle(0x3f55b0, 1).fillRoundedRect(6, 6, 28, 14, 6); // vệt sáng nửa trên
  g.lineStyle(2, 0xa8b6f0, 1).strokeRoundedRect(4, 4, 32, 32, 9);
  g.generateTexture('ui-pill', 40, 40);
  g.destroy();
}

/** Nút bo góc kiểu pixel (nền xanh, viền sáng) – đồng bộ với bảng Cài đặt */
export function button(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, w = 260) {
  const h = 48;
  ensurePillTexture(scene);
  const bg = scene.add.nineslice(x, y, 'ui-pill', undefined, w, h, 14, 14, 14, 14).setTint(0xd8dcf0).setInteractive({ useHandCursor: true });
  const t = text(scene, x, y, label, 22, '#ffffff').setOrigin(0.5);
  bg.on('pointerover', () => bg.setTint(0xffffff));
  bg.on('pointerout', () => bg.setTint(0xd8dcf0));
  bg.on('pointerdown', onClick);
  return { bg, t };
}

/** Icon pixel từ bộ 'icons' (16x16), mặc định phóng x2 cho UI */
export function icon(scene: Phaser.Scene, x: number, y: number, name: string, scale = 2) {
  return scene.add.image(x, y, 'icons', name).setScale(scale);
}

/** Khung bo góc kiểu pixel (góc cắt bậc thang) với viền sáng dày, nền tối – giống bảng menu tham khảo */
export function pixelPanel(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number,
  opts: { fill?: number; border?: number; alpha?: number; inner?: number } = {},
) {
  const fill = opts.fill ?? 0x24305a;
  const border = opts.border ?? 0xf4f1e6;
  const inner = opts.inner ?? 0x0b0f1e;
  const g = scene.add.graphics();
  const step = 4; // bậc của góc cắt
  const chamfer = (gx: number, gy: number, gw: number, gh: number, c: number, a: number) => {
    g.fillStyle(c, a);
    g.fillRect(gx + step * 2, gy, gw - step * 4, gh);
    g.fillRect(gx + step, gy + step, gw - step * 2, gh - step * 2);
    g.fillRect(gx, gy + step * 2, gw, gh - step * 4);
  };
  chamfer(x + 4, y + 6, w, h, 0x000000, 0.35); // bóng đổ
  chamfer(x, y, w, h, inner, 1); // viền tối ngoài
  chamfer(x + 3, y + 3, w - 6, h - 6, border, 1); // viền sáng
  chamfer(x + 7, y + 7, w - 14, h - 14, fill, opts.alpha ?? 1); // nền
  return g;
}
