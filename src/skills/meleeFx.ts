// Hình "chữ ký" cho đòn cận chiến: chém / cào (các vệt cong song song), cắn (hàm răng khép lại), húc / đấm (xung kích + tia).
// Dùng khi khuôn dashStrike không có hình riêng (scratch / arc / shockwave...). Màu theo hệ của chiêu.
import Phaser from 'phaser';
import type { MoveDef } from '../data/moveKit';
import { TYPE_COLOR } from '../data/types';
import { impactRays, powBurst } from '../fx/FightFx';

export type MeleeStyle = 'claw' | 'bite' | 'jab' | 'twin' | 'slap' | 'punch' | 'kick' | 'horn' | 'flurry' | 'impact';

const CLAW = /(scratch|slash|cutter|claw|wingAttack|karateChop|crossChop|xScissor|viceGrip|guillotine|vineWhip|bonemerang|boneClub|trảm|cào|chém)/i;
const SLAP = /(slap|tát)/i;
const PUNCH = /(punch|submission|đấm|quyền|vật ngã)/i;
const KICK = /(kick|đá)/i;
const HORN = /(hornDrill|hornAttack|húc sừng|mũi khoan)/i;
const FLURRY = /(thrash|rage|nổi điên|cuồng nộ|flail|quẫy)/i;
const TWIN = /(twineedle|kim đôi)/i;
const JAB = /(furyAttack|doublePeck|triPeck|needle|twineedle|jab|đâm loạn|mổ đôi|mổ ba)/i;
const BITE = /(bite|fang|crunch|hyperFang|peck|leechLife|cắn|nanh|mổ)/i;

export function meleeStyleOf(m: MoveDef): MeleeStyle {
  const key = `${m.id} ${m.name}`;
  if (TWIN.test(key)) return 'twin';
  if (SLAP.test(key)) return 'slap';
  if (PUNCH.test(key)) return 'punch';
  if (KICK.test(key)) return 'kick';
  if (HORN.test(key)) return 'horn';
  if (FLURRY.test(key)) return 'flurry';
  if (JAB.test(key)) return 'jab';
  if (CLAW.test(key)) return 'claw';
  if (BITE.test(key)) return 'bite';
  return 'impact';
}

const shade = (c: number, k: number) => {
  const r = Math.min(255, Math.max(0, ((c >> 16) & 255) + 255 * k));
  const g = Math.min(255, Math.max(0, ((c >> 8) & 255) + 255 * k));
  const b = Math.min(255, Math.max(0, (c & 255) + 255 * k));
  return (r << 16) | (g << 8) | b;
};

/** vẽ đòn tại (x, y) theo hướng aim; kích thước theo scale (1 = nhỏ, ~1.6 = lớn) */
export function meleeSignature(sc: Phaser.Scene, m: MoveDef, x: number, y: number, aim: Phaser.Math.Vector2, scale = 1): void {
  const col = TYPE_COLOR[m.type];
  const ang = Math.atan2(aim.y, aim.x);
  const style = meleeStyleOf(m);
  const depth = y + 2200;
  if (style === 'claw') {
    // 3 vệt cong song song quét theo thứ tự, mỗi vệt dài ~48px
    for (let i = 0; i < 3; i++) {
      const g = sc.add.graphics().setDepth(depth).setPosition(x, y).setRotation(ang);
      const off = (i - 1) * 11 * scale;
      const len = 46 * scale;
      const t0 = { k: 0 };
      sc.tweens.add({
        targets: t0, k: 1, duration: 150, delay: i * 55, ease: 'Cubic.out',
        onUpdate: () => {
          g.clear();
          const pts: Phaser.Math.Vector2[] = [];
          const steps = 14;
          for (let s = 0; s <= steps * t0.k; s++) {
            const u = s / steps;
            // vệt cong: từ trên-trái xuống dưới-phải, vồng ra phía trước
            pts.push(new Phaser.Math.Vector2(-8 + u * len * 0.9 + Math.sin(u * Math.PI) * 10 * scale, off - 20 * scale + u * 40 * scale));
          }
          if (pts.length > 1) {
            g.lineStyle(7 * scale, shade(col, -0.25), 0.55).strokePoints(pts, false);
            g.lineStyle(4 * scale, col, 0.95).strokePoints(pts, false);
            g.lineStyle(1.6 * scale, 0xffffff, 1).strokePoints(pts, false);
          }
        },
        onComplete: () => sc.tweens.add({ targets: g, alpha: 0, duration: 140, onComplete: () => g.destroy() }),
      });
    }
    impactRays(sc, x + aim.x * 26 * scale, y + aim.y * 18 * scale, 7, 8 * scale, 24 * scale, shade(col, 0.45), 200);
  } else if (style === 'slap') {
    // tát liên hoàn: các bàn tay tát trái - phải xen kẽ, vệt cong nhanh
    for (let i = 0; i < 4; i++) {
      const g = sc.add.graphics().setDepth(depth).setPosition(x + aim.x * 22 * scale, y + aim.y * 14 * scale).setRotation(ang);
      const side = i % 2 ? 1 : -1;
      const t0 = { k: 0 };
      sc.tweens.add({
        targets: t0, k: 1, duration: 110, delay: i * 70, ease: 'Cubic.out',
        onUpdate: () => {
          g.clear();
          const pts: Phaser.Math.Vector2[] = [];
          for (let q = 0; q <= 9 * t0.k; q++) {
            const u = q / 9;
            pts.push(new Phaser.Math.Vector2(-14 + u * 30 * scale, side * (18 - u * 36) * scale * 0.7));
          }
          if (pts.length > 1) {
            g.lineStyle(8 * scale, col, 0.5).strokePoints(pts, false);
            g.lineStyle(3 * scale, 0xffffff, 1).strokePoints(pts, false);
          }
          g.fillStyle(0xfff0d0, 0.95).fillCircle(-14 + t0.k * 30 * scale, side * (18 - t0.k * 36) * scale * 0.7, 7 * scale);
          g.lineStyle(1.5, col, 1).strokeCircle(-14 + t0.k * 30 * scale, side * (18 - t0.k * 36) * scale * 0.7, 7 * scale);
        },
        onComplete: () => {
          impactRays(sc, g.x + Math.cos(ang) * 16, g.y + Math.sin(ang) * 10, 5, 4 * scale, 14 * scale, 0xffffff, 130);
          sc.tweens.add({ targets: g, alpha: 0, duration: 80, onComplete: () => g.destroy() });
        },
      });
    }
  } else if (style === 'punch') {
    // nắm đấm lớn đập ra, vòng xung kích, màu hệ (Đấm Lửa: lửa, Đấm Băng: băng...)
    const px = x + aim.x * 26 * scale;
    const py = y + aim.y * 17 * scale;
    const g = sc.add.graphics().setDepth(depth).setPosition(px, py);
    const t0 = { k: 0 };
    sc.tweens.add({
      targets: t0, k: 1, duration: 140, ease: 'Back.out',
      onUpdate: () => {
        g.clear();
        const r = 14 * scale * (0.5 + t0.k * 0.7);
        g.fillStyle(col, 0.4).fillCircle(0, 0, r * 1.5);
        g.fillStyle(0xfff0d8, 1).fillCircle(0, 0, r);
        g.lineStyle(3, shade(col, -0.25), 1).strokeCircle(0, 0, r);
        for (let q = -1; q <= 1; q++) g.lineStyle(2, shade(col, -0.2), 0.9).lineBetween(-r * 0.2 + q * r * 0.45, -r * 0.7, -r * 0.2 + q * r * 0.45, r * 0.15);
      },
      onComplete: () => {
        powBurst(sc, px, py, 22 * scale, 240);
        impactRays(sc, px, py, 10, 8 * scale, 34 * scale, shade(col, 0.4), 220);
        const ring = sc.add.ellipse(px, py, 16 * scale, 11 * scale, col, 0).setStrokeStyle(3, col, 1).setDepth(depth).setScale(0.3);
        sc.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 280, ease: 'Cubic.out', onComplete: () => ring.destroy() });
        sc.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
      },
    });
  } else if (style === 'kick') {
    // hai cú đá: hai vệt cong thấp quét liên tiếp
    for (let i = 0; i < 2; i++) {
      const g = sc.add.graphics().setDepth(depth).setPosition(x, y + 6).setRotation(ang);
      const t0 = { k: 0 };
      sc.tweens.add({
        targets: t0, k: 1, duration: 120, delay: i * 120, ease: 'Cubic.out',
        onUpdate: () => {
          g.clear();
          const pts: Phaser.Math.Vector2[] = [];
          for (let q = 0; q <= 12 * t0.k; q++) {
            const u = q / 12;
            pts.push(new Phaser.Math.Vector2(4 + u * 56 * scale, (i ? 1 : -1) * Math.sin(u * Math.PI) * 14 * scale));
          }
          if (pts.length > 1) {
            g.lineStyle(9 * scale, col, 0.5).strokePoints(pts, false);
            g.lineStyle(3.5 * scale, 0xffffff, 1).strokePoints(pts, false);
          }
        },
        onComplete: () => {
          impactRays(sc, g.x + Math.cos(ang) * 58 * scale, g.y + Math.sin(ang) * 46 * scale, 6, 5 * scale, 20 * scale, shade(col, 0.4), 160);
          sc.tweens.add({ targets: g, alpha: 0, duration: 90, onComplete: () => g.destroy() });
        },
      });
    }
  } else if (style === 'horn') {
    // húc sừng / mũi khoan: mũi nhọn xoắn ốc lao thẳng ra phía trước
    const g = sc.add.graphics().setDepth(depth).setPosition(x, y).setRotation(ang);
    const t0 = { k: 0 };
    sc.tweens.add({
      targets: t0, k: 1, duration: 170, ease: 'Cubic.in',
      onUpdate: () => {
        g.clear();
        const tip = 14 + 62 * scale * t0.k;
        const w = 9 * scale;
        g.fillStyle(col, 0.35).fillTriangle(tip - 30 * scale, -w * 1.4, tip - 30 * scale, w * 1.4, tip + 6, 0);
        g.fillStyle(0xfdf4d8, 1).fillTriangle(tip - 26 * scale, -w, tip - 26 * scale, w, tip, 0);
        g.lineStyle(2, shade(col, -0.2), 1).strokeTriangle(tip - 26 * scale, -w, tip - 26 * scale, w, tip, 0);
        // vân xoắn của mũi khoan
        for (let q = 0; q < 4; q++) {
          const px = tip - 24 * scale + q * 6 * scale;
          const sw = Math.sin(t0.k * 30 + q) * w * (1 - q / 5);
          g.lineStyle(1.6, shade(col, -0.3), 0.9).lineBetween(px, -sw, px + 4, sw);
        }
      },
      onComplete: () => {
        impactRays(sc, g.x + Math.cos(ang) * 78 * scale, g.y + Math.sin(ang) * 62 * scale, 8, 5 * scale, 24 * scale, shade(col, 0.45), 200);
        sc.tweens.add({ targets: g, alpha: 0, duration: 110, onComplete: () => g.destroy() });
      },
    });
  } else if (style === 'flurry') {
    // nổi điên / cuồng nộ: nhiều vòng xung kích đỏ chồng nhau + tia nổ ngẫu nhiên, vài lần liên tiếp
    for (let i = 0; i < 4; i++) {
      sc.time.delayedCall(i * 80, () => {
        const px = x + aim.x * 20 * scale + (Math.random() - 0.5) * 28 * scale;
        const py = y + aim.y * 13 * scale + (Math.random() - 0.5) * 20 * scale;
        powBurst(sc, px, py, 14 * scale, 200);
        impactRays(sc, px, py, 7, 5 * scale, 22 * scale, 0xff8a60, 170);
        const ring = sc.add.ellipse(px, py, 12 * scale, 8 * scale, col, 0).setStrokeStyle(2.5, 0xff6a40, 1).setDepth(depth).setScale(0.3);
        sc.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 220, onComplete: () => ring.destroy() });
      });
    }
  } else if (style === 'twin') {
    // hai ngòi kim to song song đâm thẳng tới một lượt, nhỏ độc
    for (const side of [-1, 1]) {
      const g = sc.add.graphics().setDepth(depth).setPosition(x, y).setRotation(ang);
      const t0 = { k: 0 };
      sc.tweens.add({
        targets: t0, k: 1, duration: 130, ease: 'Cubic.out',
        onUpdate: () => {
          g.clear();
          const tip = 20 + 62 * scale * t0.k;
          const tail = Math.max(0, tip - 46 * scale);
          const yy = side * 8 * scale;
          g.fillStyle(col, 0.35).fillTriangle(tail, yy - 6, tail, yy + 6, tip + 4, yy);
          g.fillStyle(0xffffff, 0.98).fillTriangle(tail, yy - 3.2, tail, yy + 3.2, tip, yy);
          g.lineStyle(1.6, col, 1).lineBetween(tail, yy, tip, yy);
        },
        onComplete: () => {
          impactRays(sc, x + Math.cos(ang) * 80 * scale, y + Math.sin(ang) * 80 * scale * 0.8 + side * 4, 5, 4 * scale, 14 * scale, shade(col, 0.5), 160);
          sc.tweens.add({ targets: g, alpha: 0, duration: 120, onComplete: () => g.destroy() });
        },
      });
    }
  } else if (style === 'jab') {
    // chọc liên hoàn: nhiều mũi kim / mỏ đâm nhanh vào điểm trúng từ các hướng lệch nhau
    for (let i = 0; i < 7; i++) {
      const g = sc.add.graphics().setDepth(depth).setPosition(x + aim.x * 26 * scale, y + aim.y * 18 * scale);
      const jx = (Math.random() - 0.5) * 22 * scale;
      const jy = (Math.random() - 0.5) * 16 * scale;
      const a2 = ang + (Math.random() - 0.5) * 0.9;
      const t0 = { k: 0 };
      sc.tweens.add({
        targets: t0, k: 1, duration: 120, delay: i * 38, ease: 'Cubic.out',
        onUpdate: () => {
          g.clear();
          const len = 34 * scale * (1 - t0.k * 0.35);
          const bx = jx - Math.cos(a2) * len * (1 - t0.k * 0.6);
          const by = jy - Math.sin(a2) * len * (1 - t0.k * 0.6);
          const nx = -Math.sin(a2) * 2.6;
          const ny = Math.cos(a2) * 2.6;
          g.fillStyle(0xffffff, 0.95).fillTriangle(bx + nx, by + ny, bx - nx, by - ny, jx, jy);
          g.lineStyle(1.4, col, 1).lineBetween(bx, by, jx, jy);
        },
        onComplete: () => {
          impactRays(sc, g.x + jx, g.y + jy, 4, 3 * scale, 11 * scale, shade(col, 0.5), 130);
          sc.tweens.add({ targets: g, alpha: 0, duration: 90, onComplete: () => g.destroy() });
        },
      });
    }
  } else if (style === 'bite') {
    // hàm răng trên + dưới khép lại tại điểm cắn
    const g = sc.add.graphics().setDepth(depth).setPosition(x + aim.x * 20 * scale, y + aim.y * 14 * scale).setRotation(ang);
    const t0 = { k: 0 };
    sc.tweens.add({
      targets: t0, k: 1, duration: 170, ease: 'Cubic.in',
      onUpdate: () => {
        g.clear();
        const gap = (1 - t0.k) * 26 * scale + 3;
        for (const side of [-1, 1]) {
          g.fillStyle(0xffffff, 0.95).lineStyle(2, col, 1);
          for (let i = -2; i <= 2; i++) {
            const bx = i * 8 * scale;
            const by = side * gap;
            g.beginPath();
            g.moveTo(bx - 4 * scale, by + side * 11 * scale);
            g.lineTo(bx + 4 * scale, by + side * 11 * scale);
            g.lineTo(bx, by);
            g.closePath();
            g.fillPath();
            g.strokePath();
          }
        }
      },
      onComplete: () => {
        impactRays(sc, g.x, g.y, 8, 6 * scale, 22 * scale, shade(col, 0.5), 200);
        sc.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
      },
    });
  } else {
    // húc / đấm / quật: vòng xung kích + tia
    powBurst(sc, x + aim.x * 22 * scale, y + aim.y * 14 * scale, 20 * scale, 240);
    impactRays(sc, x + aim.x * 22 * scale, y + aim.y * 14 * scale, 9, 8 * scale, 30 * scale, shade(col, 0.4), 220);
    const ring = sc.add.ellipse(x + aim.x * 22 * scale, y + aim.y * 14 * scale, 18 * scale, 12 * scale, col, 0).setStrokeStyle(3, col, 1).setDepth(depth).setScale(0.3);
    sc.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 260, ease: 'Cubic.out', onComplete: () => ring.destroy() });
  }
}
