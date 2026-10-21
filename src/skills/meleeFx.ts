// Hình "chữ ký" cho đòn cận chiến: chém / cào (các vệt cong song song), cắn (hàm răng khép lại), húc / đấm (xung kích + tia).
// Dùng khi khuôn dashStrike không có hình riêng (scratch / arc / shockwave...). Màu theo hệ của chiêu.
import Phaser from 'phaser';
import type { MoveDef } from '../data/moveKit';
import { TYPE_COLOR } from '../data/types';
import { impactRays, powBurst } from '../fx/FightFx';

export type MeleeStyle = 'claw' | 'bite' | 'jab' | 'twin' | 'impact';

const CLAW = /(scratch|slash|cutter|claw|wingAttack|karateChop|crossChop|xScissor|viceGrip|guillotine|vineWhip|bonemerang|boneClub|trảm|cào|chém)/i;
const TWIN = /(twineedle|kim đôi)/i;
const JAB = /(furyAttack|doublePeck|triPeck|needle|twineedle|jab|đâm loạn|mổ đôi|mổ ba)/i;
const BITE = /(bite|fang|crunch|hyperFang|peck|drill|horn|cắn|nanh|mổ|sừng)/i;

export function meleeStyleOf(m: MoveDef): MeleeStyle {
  const key = `${m.id} ${m.name}`;
  if (TWIN.test(key)) return 'twin';
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
