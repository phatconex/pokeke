// Hiệu ứng chiến đấu dùng chung, có giới hạn số lượng để không chậm dần.
import Phaser from 'phaser';
import { CAPS } from '../config/balance';
import { getSettings } from '../systems/settings';
import { FONT_SMALL } from '../ui/style';
import { groundCracks, leafBurst } from './GrassFx';

interface TelegraphBase {
  start: number;
  end: number;
  color: number;
  /** đối tượng tạo ra cảnh báo – để xóa khi nó chết */
  owner?: unknown;
}

export type Telegraph =
  | (TelegraphBase & { kind: 'circle'; x: number; y: number; r: number })
  | (TelegraphBase & { kind: 'line'; x: number; y: number; angle: number; len: number; width: number })
  | (TelegraphBase & { kind: 'glow'; target: { x: number; y: number }; r: number });

interface DmgNumber {
  text: Phaser.GameObjects.Text;
  vy: number;
  life: number;
  maxLife: number;
}

export class Effects {
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private flames: Phaser.GameObjects.Particles.ParticleEmitter;
  private dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private jet: Phaser.GameObjects.Particles.ParticleEmitter;
  /** emitter theo texture (lửa, điện, lá, nước...) – tạo khi cần */
  private puffEmitters = new Map<string, Phaser.GameObjects.Particles.ParticleEmitter>();
  private jetEmitters = new Map<string, Phaser.GameObjects.Particles.ParticleEmitter>();
  private boltGfx: Phaser.GameObjects.Graphics;
  /** hiệu ứng lửa riêng (nguyên mẫu Charmeleon): hạt cộng sáng, khói, mảnh vỡ, dòng phun */
  private glow: Phaser.GameObjects.Particles.ParticleEmitter;
  private smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private debris: Phaser.GameObjects.Particles.ParticleEmitter;
  private stream: Phaser.GameObjects.Particles.ParticleEmitter;
  private numbers: DmgNumber[] = [];
  private telegraphGfx: Phaser.GameObjects.Graphics;
  private telegraphs: Telegraph[] = [];

  constructor(private scene: Phaser.Scene) {
    const cap = Math.floor(CAPS.particles / 3);
    this.sparks = scene.add.particles(0, 0, 'spark', {
      emitting: false,
      lifespan: { min: 180, max: 380 },
      speed: { min: 50, max: 150 },
      scale: { start: 1, end: 0 },
      maxParticles: cap,
    });
    this.flames = scene.add.particles(0, 0, 'flamepuff', {
      emitting: false,
      lifespan: { min: 250, max: 450 },
      speed: { min: 20, max: 70 },
      scale: { start: 1, end: 0.2 },
      alpha: { start: 1, end: 0 },
      maxParticles: cap,
    });
    this.jet = scene.add.particles(0, 0, 'flamepuff', {
      emitting: false,
      lifespan: { min: 260, max: 380 },
      speed: { min: 140, max: 300 },
      scale: { start: 0.7, end: 1.6 },
      alpha: { start: 1, end: 0 },
      maxParticles: cap,
    });
    this.dust = scene.add.particles(0, 0, 'pixel', {
      emitting: false,
      lifespan: { min: 200, max: 400 },
      speed: { min: 10, max: 40 },
      tint: [0xc8b090, 0xa08060],
      alpha: { start: 0.9, end: 0 },
      maxParticles: cap,
    });
    this.glow = scene.add.particles(0, 0, 'softglow', {
      emitting: false,
      lifespan: { min: 160, max: 320 },
      speed: { min: 6, max: 30 },
      scale: { start: 1, end: 0.2 },
      alpha: { start: 0.95, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      color: [0xffd860, 0xff9a28, 0xd8401a],
      colorEase: 'quad.out',
      maxParticles: 160,
    }).setDepth(99997);
    this.smoke = scene.add.particles(0, 0, 'smokepuff', {
      emitting: false,
      lifespan: { min: 500, max: 900 },
      speed: { min: 6, max: 26 },
      scale: { start: 1, end: 2.6 },
      alpha: { start: 0.6, end: 0 },
      gravityY: -24,
      maxParticles: 90,
    }).setDepth(99996);
    this.debris = scene.add.particles(0, 0, 'debris', {
      emitting: false,
      lifespan: { min: 450, max: 750 },
      speed: { min: 70, max: 170 },
      angle: { min: -165, max: -15 },
      gravityY: 420,
      rotate: { min: 0, max: 360 },
      scale: { min: 0.8, max: 1.6 },
      alpha: { start: 1, end: 0.6 },
      maxParticles: 60,
    }).setDepth(99998);
    this.stream = scene.add.particles(0, 0, 'softglow', {
      emitting: false,
      lifespan: { min: 300, max: 360 },
      speed: { min: 400, max: 470 },
      scale: { start: 0.55, end: 2.3 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      color: [0xffe070, 0xffb030, 0xff7a1a, 0xc8300c],
      colorEase: 'linear',
      maxParticles: 260,
    }).setDepth(99998);
    this.sparks.setDepth(100000);
    this.flames.setDepth(99999);
    this.jet.setDepth(99998);
    this.dust.setDepth(-4000);
    this.telegraphGfx = scene.add.graphics().setDepth(-3000);
    this.boltGfx = scene.add.graphics().setDepth(100002);
    this.puffEmitters.set('flamepuff', this.flames);
    this.jetEmitters.set('flamepuff', this.jet);
  }

  private puffEmitter(texture: string) {
    let em = this.puffEmitters.get(texture);
    if (!em) {
      em = this.scene.add.particles(0, 0, texture, {
        emitting: false,
        lifespan: { min: 250, max: 450 },
        speed: { min: 20, max: 80 },
        scale: { start: 1, end: 0.2 },
        alpha: { start: 1, end: 0 },
        maxParticles: Math.floor(CAPS.particles / 6),
      }).setDepth(99999);
      this.puffEmitters.set(texture, em);
    }
    return em;
  }

  private jetEmitter(texture: string) {
    let em = this.jetEmitters.get(texture);
    if (!em) {
      em = this.scene.add.particles(0, 0, texture, {
        emitting: false,
        lifespan: { min: 260, max: 380 },
        speed: { min: 140, max: 300 },
        scale: { start: 0.8, end: 1.5 },
        alpha: { start: 1, end: 0 },
        maxParticles: Math.floor(CAPS.particles / 6),
      }).setDepth(99998);
      this.jetEmitters.set(texture, em);
    }
    return em;
  }

  /** Bung hạt theo hệ của chiêu (flamepuff / zappuff / leafpuff / bubblepuff) */
  puff(texture: string, x: number, y: number, count = 4) {
    this.puffEmitter(texture).explode(count, x, y);
  }

  /** Phun hạt theo một hướng (chiêu hình quạt) */
  jetOf(texture: string, x: number, y: number, angleDeg: number, spreadDeg: number, count: number) {
    const em = this.jetEmitter(texture);
    // setEmitterAngle chỉ đổi giá trị hiện tại, không đổi khoảng ngẫu nhiên → nạp lại cấu hình góc
    em.ops.angle.loadConfig({ angle: { min: angleDeg - spreadDeg, max: angleDeg + spreadDeg } });
    em.explode(count, x, y);
  }

  /** Tia sét đánh từ trên trời xuống một điểm */
  lightning(x: number, y: number) {
    const g = this.boltGfx;
    let cx = x + (Math.random() - 0.5) * 10;
    let cy = y - 90;
    const pts: [number, number][] = [[cx, cy]];
    while (cy < y) {
      cy = Math.min(y, cy + 10 + Math.random() * 8);
      cx = x + (Math.random() - 0.5) * 14 * ((y - cy) / 90 + 0.2);
      pts.push([cx, cy]);
    }
    for (const [w, color, a] of [[4, 0xf8d030, 0.5], [2, 0xffffff, 1]] as const) {
      g.lineStyle(w, color, a);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const [px, py] of pts.slice(1)) g.lineTo(px, py);
      g.strokePath();
    }
    g.setAlpha(1);
    this.scene.tweens.killTweensOf(g);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.clear() });
    this.puff('zappuff', x, y, 6);
  }

  /** Tia nối giữa hai điểm (điện nảy, dòng máu Gieo Hạt) */
  arc(x1: number, y1: number, x2: number, y2: number, color: number) {
    const g = this.scene.add.graphics().setDepth(99997);
    const n = Math.max(3, Math.round(Math.hypot(x2 - x1, y2 - y1) / 12));
    const pts: [number, number][] = [[x1, y1]];
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push([x1 + (x2 - x1) * t + (Math.random() - 0.5) * 10, y1 + (y2 - y1) * t + (Math.random() - 0.5) * 10]);
    }
    pts.push([x2, y2]);
    for (const [w, c, a] of [[4, color, 0.45], [2, 0xffffff, 1]] as const) {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const [px, py] of pts.slice(1)) g.lineTo(px, py);
      g.strokePath();
    }
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
  }

  sparkBurst(x: number, y: number, count = 8) {
    this.sparks.explode(count, x, y);
  }

  flameBurst(x: number, y: number, count = 6) {
    this.flames.explode(count, x, y);
  }

  /** Phun lửa theo một hướng (dùng cho chiêu K) */
  flameJet(x: number, y: number, angleDeg: number, spreadDeg: number, count: number) {
    // setEmitterAngle chỉ đổi giá trị hiện tại, không đổi khoảng ngẫu nhiên → nạp lại cấu hình góc
    this.jet.ops.angle.loadConfig({ angle: { min: angleDeg - spreadDeg, max: angleDeg + spreadDeg } });
    this.jet.explode(count, x, y);
  }

  // ===================================================================== lửa (nguyên mẫu Charmeleon)

  /** vệt tàn lửa sau cầu lửa */
  emberTrail(x: number, y: number, count = 1) {
    this.glow.explode(count, x + (Math.random() - 0.5) * 3, y + (Math.random() - 0.5) * 3);
  }

  /** nổ nhỏ khi cầu lửa trúng */
  fireHit(x: number, y: number, big = false) {
    this.glow.explode(big ? 10 : 6, x, y);
    this.flames.explode(big ? 6 : 3, x, y);
    const ring = this.scene.add.circle(x, y, big ? 9 : 6, 0xffb040, 0).setStrokeStyle(2, 0xffd060, 0.9).setDepth(99997).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 200, onComplete: () => ring.destroy() });
  }

  /** một nhịp của dòng phun lửa: hạt bay dọc theo hướng angleDeg từ miệng (x, y) */
  streamPuff(x: number, y: number, angleDeg: number, count: number) {
    this.stream.ops.angle.loadConfig({ angle: { min: angleDeg - 5, max: angleDeg + 5 } });
    this.stream.explode(count, x, y);
  }

  smokeAt(x: number, y: number, count = 1) {
    this.smoke.explode(count, x, y);
  }

  /** vụ nổ lửa lớn: chớp sáng, cầu lửa bung, sóng xung kích, mảnh đá, khói */
  fireExplosion(x: number, y: number, r: number) {
    const sc = this.scene;
    const flash = sc.add.circle(x, y, r * 0.5, 0xffc050, 0.85).setDepth(100003);
    sc.tweens.add({ targets: flash, scale: 1.7, alpha: 0, duration: 140, onComplete: () => flash.destroy() });
    const ring = sc.add.circle(x, y, r, 0xff8a30, 0).setStrokeStyle(3, 0xff7a20, 1).setDepth(99997).setScale(0.2);
    sc.tweens.add({ targets: ring, scale: 1.15, alpha: 0, duration: 320, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    // cầu lửa bung: vài quầng sáng lớn chồng lên nhau
    const tints = [0x8a1a08, 0xe8401a, 0xff8a24, 0xffd060];
    tints.forEach((tint, i) => {
      const k = 1 - i * 0.2;
      const b = sc.add.image(x + (Math.random() - 0.5) * r * 0.3, y - 4 + (Math.random() - 0.5) * r * 0.3, 'softglow')
        .setTint(tint).setBlendMode(i === 3 ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL).setDepth(99998 + i).setScale(0.5).setAlpha(1);
      sc.tweens.add({ targets: b, scale: (r / 6) * 1.1 * k, alpha: 0, duration: 380 + i * 60, ease: 'Cubic.out', onComplete: () => b.destroy() });
    });
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r * 0.7;
      this.glow.explode(1, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7);
      if (i % 2 === 0) this.flames.explode(1, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7);
    }
    this.sparks.explode(10, x, y);
    this.debris.explode(14, x, y);
    sc.time.delayedCall(90, () => {
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        this.smoke.explode(1, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.35 - 4);
      }
    });
  }

  /** vết cháy xém trên nền, đỏ hồng rồi nguội dần, mờ hẳn sau ms */
  scorch(x: number, y: number, r: number, ms: number) {
    const sc = this.scene;
    const g = sc.add.graphics().setDepth(-2960);
    g.fillStyle(0x1a0e08, 0.55).fillEllipse(x, y, r * 2, r * 1.3);
    g.fillStyle(0x2a1a10, 0.5).fillEllipse(x, y, r * 1.4, r * 0.9);
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r * 0.8;
      g.fillStyle(0x0e0806, 0.6).fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 3, 2);
    }
    const hot = sc.add.graphics().setDepth(-2955);
    hot.fillStyle(0xe8401a, 0.4).fillEllipse(x, y, r * 1.3, r * 0.8);
    sc.tweens.add({ targets: hot, alpha: 0, duration: Math.min(1400, ms * 0.5), onComplete: () => hot.destroy() });
    sc.tweens.add({ targets: g, alpha: 0, delay: ms * 0.6, duration: ms * 0.4, onComplete: () => g.destroy() });
  }

  /** cột lửa phun lên từ mặt đất (tuyệt chiêu) */
  firePillar(x: number, y: number, h = 5) {
    const sc = this.scene;
    const outer = sc.add.image(x, y + 2, 'softglow').setOrigin(0.5, 0.92).setTint(0xe8401a).setDepth(y + 2100).setScale(1.7, 0.2);
    const inner = sc.add.image(x, y + 2, 'softglow').setOrigin(0.5, 0.92).setTint(0xffe080).setBlendMode(Phaser.BlendModes.ADD).setDepth(y + 2101).setScale(0.8, 0.2);
    sc.tweens.add({ targets: outer, scaleY: h, duration: 110, ease: 'Back.out', yoyo: false });
    sc.tweens.add({ targets: inner, scaleY: h * 0.85, duration: 110, ease: 'Back.out' });
    sc.tweens.add({ targets: [outer, inner], alpha: 0, scaleX: 0.3, delay: 180, duration: 260, onComplete: () => { outer.destroy(); inner.destroy(); } });
    this.glow.explode(3, x, y);
    this.flames.explode(2, x, y - 10);
    if (Math.random() < 0.4) this.smoke.explode(1, x, y - 20);
  }

  /** 3 vệt vuốt song song dọc đường lao + 3 nhát chém chéo tại điểm cuối (Nanh Lửa) */
  clawStreaks(x1: number, y1: number, x2: number, y2: number) {
    const sc = this.scene;
    const g = sc.add.graphics().setDepth(100001);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    const nx = -uy;
    const ny = ux;
    for (const off of [-5, 0, 5]) {
      const sx = x1 + nx * off;
      const sy = y1 + ny * off;
      const ex = x2 + nx * off * 0.6 + ux * 8;
      const ey = y2 + ny * off * 0.6 + uy * 8;
      g.lineStyle(4, 0xff7a20, 0.55).lineBetween(sx, sy, ex, ey);
      g.lineStyle(1.5, 0xfff4d0, 1).lineBetween(sx + ux * len * 0.25, sy + uy * len * 0.25, ex, ey);
    }
    // nhát chém tại mục tiêu: 3 đường chéo vuông góc với hướng lao
    const cx = x2 + ux * 14;
    const cy = y2 + uy * 14;
    const ang = Math.atan2(uy, ux) + Math.PI / 2 + 0.5;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    for (const off of [-6, 0, 6]) {
      const px = cx + ux * off;
      const py = cy + uy * off;
      g.lineStyle(5, 0xff5a14, 0.5).lineBetween(px - ca * 13, py - sa * 13, px + ca * 13, py + sa * 13);
      g.lineStyle(2, 0xffffff, 1).lineBetween(px - ca * 11, py - sa * 11, px + ca * 11, py + sa * 11);
    }
    g.setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: g, alpha: 0, delay: 90, duration: 260, onComplete: () => g.destroy() });
    this.glow.explode(6, cx, cy);
  }

  // ===================================================================== nước / điện (bộ từ vựng water / electric)

  /** emitter dùng riêng theo khóa – tạo khi cần lần đầu */
  private keyed = new Map<string, Phaser.GameObjects.Particles.ParticleEmitter>();
  private em(key: string, texture: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, depth: number) {
    let e = this.keyed.get(key);
    if (!e) {
      e = this.scene.add.particles(0, 0, texture, { emitting: false, ...cfg }).setDepth(depth);
      this.keyed.set(key, e);
    }
    return e;
  }
  /** giọt nước màu xanh (hạt thường, không cộng sáng) */
  private get drops() {
    return this.em('drops', 'softglow', {
      lifespan: { min: 260, max: 460 }, speed: { min: 8, max: 34 }, scale: { start: 0.65, end: 0.15 }, alpha: { start: 0.95, end: 0 },
      color: [0xe8fbff, 0x8ad8ff, 0x3a9ae8], colorEase: 'quad.out', maxParticles: 180,
    }, 99997);
  }
  /** giọt văng có trọng lực */
  private get splashDrops() {
    return this.em('splash', 'pixel', {
      lifespan: { min: 380, max: 620 }, speed: { min: 60, max: 150 }, angle: { min: -170, max: -10 }, gravityY: 380,
      scale: { min: 0.8, max: 1.5 }, tint: [0xffffff, 0xbfefff, 0x6ac0ff], alpha: { start: 1, end: 0.2 }, maxParticles: 160,
    }, 99998);
  }
  private get foamEm() {
    return this.em('foam', 'softglow', {
      lifespan: { min: 420, max: 760 }, speed: { min: 4, max: 22 }, scale: { start: 0.7, end: 1.8 }, alpha: { start: 0.75, end: 0 },
      tint: [0xffffff, 0xe0f6ff], maxParticles: 120,
    }, 99996);
  }
  private get waterJet() {
    return this.em('wjet', 'softglow', {
      lifespan: { min: 300, max: 360 }, speed: { min: 420, max: 500 }, scale: { start: 0.6, end: 2.1 }, alpha: { start: 0.95, end: 0 },
      color: [0xffffff, 0xa8e8ff, 0x48a8f0, 0x2060c0], colorEase: 'linear', maxParticles: 260,
    }, 99998);
  }
  private get zapGlow() {
    return this.em('zglow', 'softglow', {
      lifespan: { min: 120, max: 260 }, speed: { min: 10, max: 50 }, scale: { start: 0.9, end: 0.1 }, alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD, color: [0xffffff, 0xfff27a, 0xf8c020], colorEase: 'quad.out', maxParticles: 180,
    }, 99997);
  }
  private get zapJet() {
    return this.em('zjet', 'softglow', {
      lifespan: { min: 220, max: 300 }, speed: { min: 380, max: 480 }, scale: { start: 0.5, end: 1.6 }, alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD, color: [0xffffff, 0xfff27a, 0xf8c020, 0xa07010], colorEase: 'linear', maxParticles: 220,
    }, 99998);
  }

  waterTrail(x: number, y: number, count = 1) {
    this.drops.explode(count, x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4);
  }

  /** bắn tóe nước: vòng sóng nhỏ + giọt văng + bọt */
  waterHit(x: number, y: number, big = false) {
    const ring = this.scene.add.ellipse(x, y + 2, big ? 16 : 10, big ? 10 : 6, 0x8ad8ff, 0).setStrokeStyle(2, 0xe8fbff, 0.9).setDepth(99997);
    this.scene.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 260, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    this.splashDrops.explode(big ? 10 : 6, x, y);
    this.drops.explode(big ? 6 : 3, x, y);
    this.foamEm.explode(big ? 3 : 1, x, y);
  }

  waterSpray(x: number, y: number, angleDeg: number, count: number) {
    this.waterJet.ops.angle.loadConfig({ angle: { min: angleDeg - 4, max: angleDeg + 4 } });
    this.waterJet.explode(count, x, y);
  }

  foam(x: number, y: number, count = 1) {
    this.foamEm.explode(count, x, y);
  }

  /** vụ nổ nước lớn: cột nước bung, vòng sóng, giọt văng, bọt */
  splashExplosion(x: number, y: number, r: number) {
    const sc = this.scene;
    const flash = sc.add.ellipse(x, y, r, r * 0.7, 0xe8fbff, 0.8).setDepth(100003);
    sc.tweens.add({ targets: flash, scale: 1.6, alpha: 0, duration: 160, onComplete: () => flash.destroy() });
    for (const [k, c, w] of [[1, 0x3a9ae8, 4], [0.75, 0xbfefff, 2]] as const) {
      const ring = sc.add.ellipse(x, y, r * 2 * k, r * 1.5 * k, 0x6ac0ff, 0).setStrokeStyle(w, c, 1).setDepth(99997).setScale(0.2);
      sc.tweens.add({ targets: ring, scale: 1.1, alpha: 0, duration: 360, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    }
    this.waterSpout(x, y, 4);
    this.splashDrops.explode(Math.min(30, 10 + Math.round(r / 3)), x, y);
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r * 0.7;
      this.drops.explode(1, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7);
      if (i % 2 === 0) this.foamEm.explode(1, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7);
    }
  }

  /** vũng nước trên nền (lấp lánh, mờ dần sau ms) */
  puddle(x: number, y: number, r: number, ms: number) {
    const sc = this.scene;
    const g = sc.add.graphics().setDepth(-2960);
    g.fillStyle(0x2a70c0, 0.4).fillEllipse(x, y, r * 2, r * 1.2);
    g.fillStyle(0x5ab0f0, 0.35).fillEllipse(x - r * 0.1, y - r * 0.08, r * 1.5, r * 0.8);
    g.fillStyle(0xe8fbff, 0.5).fillEllipse(x - r * 0.35, y - r * 0.22, r * 0.5, r * 0.14);
    g.setScale(0.3);
    g.x = x * 0.7;
    g.y = y * 0.7;
    sc.tweens.add({ targets: g, scale: 1, x: 0, y: 0, duration: 180, ease: 'Back.out' });
    sc.tweens.add({ targets: g, alpha: 0, delay: ms * 0.7, duration: ms * 0.3, onComplete: () => g.destroy() });
  }

  /** cột nước phun lên từ mặt đất */
  waterSpout(x: number, y: number, h = 5) {
    const sc = this.scene;
    const outer = sc.add.image(x, y + 2, 'softglow').setOrigin(0.5, 0.92).setTint(0x3a8ae0).setDepth(y + 2100).setScale(1.6, 0.2).setAlpha(0.9);
    const inner = sc.add.image(x, y + 2, 'softglow').setOrigin(0.5, 0.92).setTint(0xe0f8ff).setDepth(y + 2101).setScale(0.7, 0.2);
    sc.tweens.add({ targets: outer, scaleY: h, duration: 120, ease: 'Back.out' });
    sc.tweens.add({ targets: inner, scaleY: h * 0.85, duration: 120, ease: 'Back.out' });
    sc.tweens.add({ targets: [outer, inner], alpha: 0, scaleX: 0.3, delay: 170, duration: 260, onComplete: () => { outer.destroy(); inner.destroy(); } });
    this.splashDrops.explode(3, x, y - 8);
  }

  /** vệt xoáy nước dọc đường lao + xoáy tròn tại điểm cuối (Xoay Tốc Độ) */
  waterStreaks(x1: number, y1: number, x2: number, y2: number) {
    const sc = this.scene;
    const g = sc.add.graphics().setDepth(100001);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    for (const off of [-5, 5]) {
      g.lineStyle(4, 0x3a9ae8, 0.45).lineBetween(x1 - uy * off, y1 + ux * off, x2 - uy * off * 0.5, y2 + ux * off * 0.5);
      g.lineStyle(1.5, 0xe8fbff, 0.9).lineBetween(x1 - uy * off + ux * len * 0.3, y1 + ux * off + uy * len * 0.3, x2 - uy * off * 0.5, y2 + ux * off * 0.5);
    }
    // xoáy: 3 cung tròn quanh điểm cuối
    for (let i = 0; i < 3; i++) {
      const r = 14 + i * 6;
      const a0 = i * 2.1;
      g.lineStyle(4 - i, i === 0 ? 0xe8fbff : 0x6ac0ff, 0.9 - i * 0.2);
      g.beginPath();
      g.arc(x2, y2, r, a0, a0 + Math.PI * 1.3);
      g.strokePath();
    }
    sc.tweens.add({ targets: g, alpha: 0, delay: 100, duration: 260, onComplete: () => g.destroy() });
    this.splashDrops.explode(8, x2, y2);
    this.foamEm.explode(2, x2, y2);
  }

  elecTrail(x: number, y: number, count = 1) {
    this.zapGlow.explode(count, x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4);
    if (Math.random() < 0.3) this.sparks.explode(1, x, y);
  }

  /** tia gấp khúc nhiều lớp giữa hai điểm (sét nảy, vệt điện) */
  jagged(x1: number, y1: number, x2: number, y2: number, color: number, core: number, width = 3, jitter = 10, fadeMs = 200, branches = 0) {
    const g = this.scene.add.graphics().setDepth(100002).setBlendMode(Phaser.BlendModes.ADD);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(3, Math.round(len / 10));
    const pts: [number, number][] = [[x1, y1]];
    const nx = -(y2 - y1) / (len || 1);
    const ny = (x2 - x1) / (len || 1);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const j = (Math.random() - 0.5) * jitter * 2;
      pts.push([x1 + (x2 - x1) * t + nx * j, y1 + (y2 - y1) * t + ny * j]);
    }
    pts.push([x2, y2]);
    const stroke = (p: [number, number][], w: number, c: number, a: number) => {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(p[0][0], p[0][1]);
      for (const [px, py] of p.slice(1)) g.lineTo(px, py);
      g.strokePath();
    };
    stroke(pts, width * 2.4, color, 0.3);
    stroke(pts, width, color, 0.85);
    stroke(pts, Math.max(1, width * 0.45), core, 1);
    for (let b = 0; b < branches; b++) {
      const k = 1 + Math.floor(Math.random() * (pts.length - 2));
      const [bx, by] = pts[k];
      const a = Math.atan2(y2 - y1, x2 - x1) + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6);
      const bl = 8 + Math.random() * 14;
      const mid: [number, number] = [bx + Math.cos(a) * bl * 0.5 + (Math.random() - 0.5) * 4, by + Math.sin(a) * bl * 0.5 + (Math.random() - 0.5) * 4];
      stroke([[bx, by], mid, [bx + Math.cos(a) * bl, by + Math.sin(a) * bl]], Math.max(1, width * 0.5), color, 0.8);
    }
    this.scene.tweens.add({ targets: g, alpha: 0, duration: fadeMs, onComplete: () => g.destroy() });
  }

  /** chớp điện khi trúng */
  zapHit(x: number, y: number, big = false) {
    const sc = this.scene;
    const flash = sc.add.circle(x, y, big ? 6 : 4, 0xfff6c0, 0.7).setDepth(100003).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: flash, scale: 2, alpha: 0, duration: 110, onComplete: () => flash.destroy() });
    this.zapGlow.explode(big ? 8 : 5, x, y);
    this.sparks.explode(big ? 8 : 4, x, y);
    for (let i = 0; i < (big ? 3 : 2); i++) {
      const a = Math.random() * Math.PI * 2;
      const l = 10 + Math.random() * 10;
      this.jagged(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 0xf8d030, 0xffffff, 1.5, 3, 140);
    }
  }

  zapSpray(x: number, y: number, angleDeg: number, count: number) {
    this.zapJet.ops.angle.loadConfig({ angle: { min: angleDeg - 5, max: angleDeg + 5 } });
    this.zapJet.explode(count, x, y);
  }

  /** nổ điện lớn: chớp trắng, tia tỏa tròn, tia lửa */
  zapExplosion(x: number, y: number, r: number) {
    const sc = this.scene;
    const flash = sc.add.ellipse(x, y, r * 0.8, r * 0.55, 0xfff2a0, 0.55).setDepth(100003).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 130, onComplete: () => flash.destroy() });
    const ring = sc.add.ellipse(x, y, r * 2, r * 1.4, 0xf8d030, 0).setStrokeStyle(3, 0xfff27a, 1).setDepth(99997).setScale(0.2);
    sc.tweens.add({ targets: ring, scale: 1.1, alpha: 0, duration: 280, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    const n = 5 + Math.round(r / 12);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const l = r * (0.6 + Math.random() * 0.5);
      this.jagged(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.7, 0xf8d030, 0xffffff, 2, 5, 220, 1);
    }
    this.zapGlow.explode(14, x, y);
    this.sparks.explode(14, x, y);
  }

  /** sét giáng từ trời xuống (dày, có nhánh) + chớp đất */
  skyBolt(x: number, y: number, color = 0xf8d030, core = 0xffffff, width = 4) {
    const top = y - 200;
    let px = x + (Math.random() - 0.5) * 30;
    let py = top;
    const segs: [number, number, number, number][] = [];
    while (py < y) {
      const ny = Math.min(y, py + 14 + Math.random() * 16);
      const nx = x + (Math.random() - 0.5) * 22 * ((y - ny) / 200 + 0.15);
      segs.push([px, py, nx, ny]);
      px = nx;
      py = ny;
    }
    const g = this.scene.add.graphics().setDepth(100004).setBlendMode(Phaser.BlendModes.ADD);
    for (const [w, c, a] of [[width * 3, color, 0.25], [width, color, 0.9], [Math.max(1.5, width * 0.45), core, 1]] as const) {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(segs[0][0], segs[0][1]);
      for (const s of segs) g.lineTo(s[2], s[3]);
      g.strokePath();
    }
    // nhánh
    for (let b = 0; b < 3; b++) {
      const s = segs[Math.floor(Math.random() * Math.max(1, segs.length - 2))];
      const dir = Math.random() < 0.5 ? -1 : 1;
      g.lineStyle(Math.max(1, width * 0.5), color, 0.8);
      g.lineBetween(s[2], s[3], s[2] + dir * (10 + Math.random() * 16), s[3] + 10 + Math.random() * 12);
    }
    this.scene.tweens.add({ targets: g, alpha: 0, delay: 60, duration: 220, onComplete: () => g.destroy() });
    const glow = this.scene.add.image(x, y, 'softglow').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(100003).setScale(4);
    this.scene.tweens.add({ targets: glow, scale: 7, alpha: 0, duration: 260, onComplete: () => glow.destroy() });
    this.zapGlow.explode(10, x, y);
    this.sparks.explode(10, x, y);
  }

  /** vết tĩnh điện trên nền: vòng mờ + tia nhỏ lóe lên lách tách trong ms */
  staticField(x: number, y: number, r: number, ms: number) {
    const sc = this.scene;
    const g = sc.add.graphics().setDepth(-2955);
    g.fillStyle(0x2a2410, 0.35).fillEllipse(x, y, r * 2, r * 1.2);
    g.lineStyle(1, 0xf8d030, 0.5).strokeEllipse(x, y, r * 2, r * 1.2);
    let next = 0;
    const tw = sc.tweens.addCounter({
      from: 0, to: 1, duration: ms,
      onUpdate: (t) => {
        const now = (t.getValue() ?? 0) * ms;
        if (now < next) return;
        next = now + 90 + Math.random() * 120;
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * r * 0.8;
        const cx = x + Math.cos(a) * d;
        const cy = y + Math.sin(a) * d * 0.6;
        const b = Math.random() * Math.PI * 2;
        this.jagged(cx, cy, cx + Math.cos(b) * 8, cy + Math.sin(b) * 5, 0xf8d030, 0xffffff, 1.2, 3, 120);
      },
      onComplete: () => g.destroy(),
    });
    sc.tweens.add({ targets: g, alpha: 0, delay: ms * 0.6, duration: ms * 0.4 });
    void tw;
  }

  /** vệt sét dọc đường lao (Tấn Công Nhanh): 2 tia gấp khúc song song + chớp ở điểm cuối */
  elecStreaks(x1: number, y1: number, x2: number, y2: number) {
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    for (const off of [-4, 4]) this.jagged(x1 + nx * off, y1 + ny * off, x2 + nx * off * 0.4, y2 + ny * off * 0.4, 0xf8d030, 0xffffff, 2, 4, 240);
    this.zapHit(x2 + ((x2 - x1) / len) * 10, y2 + ((y2 - y1) / len) * 10, true);
  }

  // ===================================================================== cỏ (bộ từ vựng grass) + vài hiệu ứng lửa lớn dùng cho Charizard

  private get leafBits() {
    return this.em('leafbits', 'leafpuff', {
      lifespan: { min: 420, max: 820 }, speed: { min: 18, max: 80 }, rotate: { min: 0, max: 360 }, scale: { start: 1.25, end: 0.5 }, alpha: { start: 1, end: 0 },
      gravityY: 36, maxParticles: 170,
    }, 99997);
  }
  private get petalBits() {
    return this.em('petalbits', 'petal', {
      lifespan: { min: 520, max: 980 }, speed: { min: 26, max: 100 }, rotate: { min: 0, max: 360 }, scale: { start: 1.1, end: 0.35 }, alpha: { start: 1, end: 0 },
      gravityY: 26, maxParticles: 150,
    }, 99998);
  }
  private get sporeBits() {
    return this.em('spores', 'softglow', {
      lifespan: { min: 700, max: 1300 }, speed: { min: 6, max: 26 }, scale: { start: 0.45, end: 1.5 }, alpha: { start: 0.55, end: 0 }, gravityY: -14,
      tint: [0xe0f8a0, 0xb8e070, 0xf4ffb8], maxParticles: 140,
    }, 99996);
  }
  private get leafJet() {
    return this.em('leafjet', 'leaf', {
      lifespan: { min: 280, max: 420 }, speed: { min: 260, max: 400 }, rotate: { min: 0, max: 360 }, scale: { start: 0.8, end: 1.2 }, alpha: { start: 1, end: 0 }, maxParticles: 200,
    }, 99998);
  }
  private get petalJet() {
    return this.em('petaljet', 'petal', {
      lifespan: { min: 300, max: 460 }, speed: { min: 280, max: 430 }, rotate: { min: 0, max: 360 }, scale: { start: 0.9, end: 1.3 }, alpha: { start: 1, end: 0 }, maxParticles: 160,
    }, 99998);
  }

  /** vệt lá nhỏ rơi sau đạn / dây leo (không ánh sáng cầu) */
  leafTrail(x: number, y: number, count = 1) {
    this.leafBits.explode(count, x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4);
  }

  /** lá vụn + vài nhát chém xanh mảnh khi trúng (không vòng tròn, không quầng sáng) */
  leafHit(x: number, y: number, big = false) {
    const sc = this.scene;
    const g = sc.add.graphics().setDepth(99997);
    const n = big ? 4 : 3;
    const a0 = Math.random() * Math.PI;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const l1 = (big ? 9 : 6) + Math.random() * 5;
      const l0 = 2;
      g.lineStyle(2, 0x2f7a2c, 0.9).lineBetween(x + Math.cos(a) * l0, y + Math.sin(a) * l0, x + Math.cos(a) * l1, y + Math.sin(a) * l1);
      g.lineStyle(1, 0xd8ffb0, 1).lineBetween(x + Math.cos(a) * l0, y + Math.sin(a) * l0, x + Math.cos(a) * l1, y + Math.sin(a) * l1);
    }
    sc.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
    this.leafBits.explode(big ? 9 : 5, x, y);
  }

  /** hạt dòng phun: lá + cánh hoa theo hướng angleDeg */
  leafSpray(x: number, y: number, angleDeg: number, count: number) {
    this.leafJet.ops.angle.loadConfig({ angle: { min: angleDeg - 6, max: angleDeg + 6 } });
    this.leafJet.explode(count, x, y);
    if (Math.random() < 0.5) {
      this.petalJet.ops.angle.loadConfig({ angle: { min: angleDeg - 8, max: angleDeg + 8 } });
      this.petalJet.explode(Math.max(1, Math.round(count / 2)), x, y);
    }
  }

  sporePuff(x: number, y: number, count = 1) {
    this.sporeBits.explode(count, x, y);
  }

  /** nổ cỏ: mảnh lá + cánh hoa bắn tỏa, đám bào tử mờ, vài vết gai trên nền – không quầng sáng / vòng tròn */
  bloomExplosion(x: number, y: number, r: number) {
    leafBurst(this.scene, x, y, r * 1.1, Math.min(16, 6 + Math.round(r / 6)), ['leafA', 'leafB', 'petalP'], 480, 0.8);
    this.leafBits.explode(Math.min(24, 8 + Math.round(r / 4)), x, y);
    this.petalBits.explode(Math.min(14, 4 + Math.round(r / 8)), x, y);
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r * 0.7;
      this.sporeBits.explode(1, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7);
    }
    this.debris.explode(4, x, y);
    if (r >= 30) groundCracks(this.scene, x, y, r * 0.8, 4, 1200);
  }

  /** mảng rêu / gai trên nền (mờ dần sau ms) */
  mossPatch(x: number, y: number, r: number, ms: number) {
    const sc = this.scene;
    const g = sc.add.graphics().setDepth(-2960);
    g.fillStyle(0x16381a, 0.5).fillEllipse(x, y, r * 2, r * 1.3);
    g.fillStyle(0x2f7a2c, 0.5).fillEllipse(x, y, r * 1.5, r * 0.95);
    g.fillStyle(0x6ac048, 0.35).fillEllipse(x - r * 0.1, y - r * 0.08, r * 0.9, r * 0.5);
    const n = 5 + Math.round(r / 6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const d = r * (0.35 + Math.random() * 0.5);
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d * 0.6;
      const h = 4 + Math.random() * 4;
      g.fillStyle(0x2a1a0c, 0.9).fillTriangle(px - 2, py, px + 2, py, px, py - h);
      g.fillStyle(0xb8e870, 0.9).fillTriangle(px - 0.8, py - h * 0.55, px + 0.8, py - h * 0.55, px, py - h);
    }
    g.setScale(0.3);
    g.x = x * 0.7;
    g.y = y * 0.7;
    sc.tweens.add({ targets: g, scale: 1, x: 0, y: 0, duration: 200, ease: 'Back.out' });
    sc.tweens.add({ targets: g, alpha: 0, delay: ms * 0.7, duration: ms * 0.3, onComplete: () => g.destroy() });
    this.sporeBits.explode(3, x, y);
  }

  /** rễ khổng lồ ngoằn ngoèo trồi lên từ mặt đất (h = chiều cao tương đối): nét dày chia đoạn có gai + vết nứt nền */
  rootSpike(x: number, y: number, h = 4) {
    const sc = this.scene;
    const H = h * 9;
    const w = 3 + h * 0.9;
    const g = sc.add.graphics().setPosition(x, y + 2).setDepth(y + 2100);
    const lean = (Math.random() - 0.5) * H * 0.7;
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= 8; i++) {
      const k = i / 8;
      pts.push(new Phaser.Math.Vector2(lean * k * k + Math.sin(k * 7 + x) * H * 0.07, -H * k));
    }
    for (let i = 0; i < 8; i++) {
      const k = i / 8;
      g.lineStyle(w * (1 - 0.82 * k) + 2, 0x1a0e06, 1).lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    }
    for (let i = 0; i < 8; i++) {
      const k = i / 8;
      g.lineStyle(w * (1 - 0.82 * k), 0x6a4422, 1).lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      g.lineStyle(Math.max(1, w * 0.3 * (1 - k)), 0xa87a44, 1).lineBetween(pts[i].x - w * 0.2, pts[i].y, pts[i + 1].x - w * 0.15, pts[i + 1].y);
    }
    // gai bên hông + mầm lá xanh ở đỉnh
    for (let i = 2; i < 8; i += 2) {
      const sd = i % 4 === 0 ? 1 : -1;
      const p = pts[i];
      g.fillStyle(0x1a0e06, 1).fillTriangle(p.x, p.y - 2, p.x, p.y + 2, p.x + sd * (6 + h), p.y - 4 - h * 0.6);
    }
    const tip = pts[8];
    g.fillStyle(0x3f9a3a, 1).fillTriangle(tip.x - 4, tip.y + 3, tip.x + 1, tip.y + 2, tip.x - 6, tip.y - 6);
    g.fillStyle(0x9ae070, 1).fillTriangle(tip.x + 4, tip.y + 3, tip.x - 1, tip.y + 2, tip.x + 6, tip.y - 6);
    g.setScale(1, 0.1);
    sc.tweens.add({ targets: g, scaleY: 1, duration: 130, ease: 'Back.out' });
    sc.tweens.add({ targets: g, alpha: 0, delay: 380, duration: 280, onComplete: () => g.destroy() });
    groundCracks(sc, x, y + 2, 10 + h * 3, 3, 900);
    this.debris.explode(2 + Math.round(h / 2), x, y);
    this.leafBits.explode(2 + Math.round(h / 2), x, y - 6);
    if (Math.random() < 0.5) this.sporeBits.explode(1, x, y - 10);
  }

  /** xung hút máu (Hạt Hút Máu): vài mảnh lá + hạt sáng nhỏ trôi cong từ địch về người dùng (thay tia điện) */
  drainPulse(x1: number, y1: number, x2: number, y2: number) {
    const sc = this.scene;
    for (let i = 0; i < 4; i++) {
      const leaf = i % 2 === 0;
      const im = sc.add.image(x1, y1, leaf ? 'leafpuff' : 'mote').setDepth(99999).setScale(leaf ? 1.4 : 1.6);
      if (!leaf) im.setTint(0xf4ffb0).setBlendMode(Phaser.BlendModes.ADD);
      const bend = (Math.random() - 0.5) * 22;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      sc.tweens.addCounter({
        from: 0, to: 1, duration: 300 + i * 70, delay: i * 45, ease: 'Sine.in',
        onUpdate: (tw) => {
          const k = tw.getValue() ?? 0;
          im.setPosition(x1 + dx * k + (-dy / len) * bend * Math.sin(k * Math.PI), y1 + dy * k + (dx / len) * bend * Math.sin(k * Math.PI)).setRotation(k * 8);
        },
        onComplete: () => im.destroy(),
      });
    }
  }

  /** hai dây leo cong dọc đường lao + vài nhát lá tại điểm cuối (K Bulbasaur) */
  vineStreaks(x1: number, y1: number, x2: number, y2: number) {
    const sc = this.scene;
    const g = sc.add.graphics().setDepth(100001);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    const nx = -uy;
    const ny = ux;
    for (const sg of [-1, 1]) {
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i <= 10; i++) {
        const k = i / 10;
        const off = Math.sin(k * Math.PI) * 6 * sg + Math.sin(k * 14) * 1.2;
        pts.push(new Phaser.Math.Vector2(x1 + (x2 - x1) * k + nx * off, y1 + (y2 - y1) * k + ny * off));
      }
      g.lineStyle(4, 0x2f7a2c, 0.8).strokePoints(pts, false);
      g.lineStyle(1.5, 0xc8f890, 1).strokePoints(pts, false);
    }
    sc.tweens.add({ targets: g, alpha: 0, delay: 80, duration: 240, onComplete: () => g.destroy() });
    this.leafHit(x2 + ux * 8, y2 + uy * 8, true);
  }

  /** dây leo cong từ (x1,y1) tới (x2,y2) vồng lên h px – sào nhảy */
  vineArc(x1: number, y1: number, x2: number, y2: number, h: number, color: number, core: number) {
    const sc = this.scene;
    const g = sc.add.graphics().setDepth(100002);
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const k = i / 16;
      pts.push(new Phaser.Math.Vector2(x1 + (x2 - x1) * k + Math.sin(k * 20) * 1.4, y1 + (y2 - y1) * k - Math.sin(k * Math.PI) * h));
    }
    g.lineStyle(5, color, 0.85).strokePoints(pts, false);
    g.lineStyle(2, core, 1).strokePoints(pts, false);
    for (let i = 3; i <= 13; i += 5) {
      const p = pts[i];
      g.fillStyle(0x78d060, 1).fillEllipse(p.x + 2, p.y - 2, 6, 3);
      g.fillStyle(0xd8ffb0, 1).fillEllipse(p.x + 1, p.y - 2.5, 3, 1.5);
    }
    sc.tweens.add({ targets: g, alpha: 0, delay: 120, duration: 300, onComplete: () => g.destroy() });
    pts.forEach((p, i) => { if (i % 3 === 0) this.leafBits.explode(1, p.x, p.y); });
  }

  /** ánh sáng nhỏ từ vòng quanh (cx, cy) bay vào tâm (Tia Mặt Trời gom nắng) */
  converge(cx: number, cy: number, r: number, color: number, ms = 360) {
    const a = Math.random() * Math.PI * 2;
    const d = r * (0.6 + Math.random() * 0.5);
    const g = this.scene.add.image(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 'softglow').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(99999).setScale(0.9);
    this.scene.tweens.add({ targets: g, x: cx, y: cy, scale: 0.15, alpha: 0.2, duration: ms, ease: 'Cubic.in', onComplete: () => g.destroy() });
  }

  /** đóa hoa khổng lồ nở trên nền: 2 lớp cánh NHỌN (đa giác), nhụy là chùm tia vàng, rồi tan thành cánh hoa */
  giantBloom(x: number, y: number, r: number, ms: number, c1: number, c2: number) {
    const sc = this.scene;
    const items: Phaser.GameObjects.GameObject[] = [];
    const layers: [number, number, number, number][] = [[10, 1, c1, 0.95], [10, 0.62, c2, 1]];
    layers.forEach(([n, k, c, al], li) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + li * 0.3;
        const L = r * 0.55 * k;
        const Wd = r * 0.13 * k;
        const g = sc.add.graphics().setDepth(-2700 + li).setPosition(x, y).setAlpha(0).setScale(0.1);
        // cánh nhọn: đa giác thuôn
        g.fillStyle(c, al).fillPoints([new Phaser.Math.Vector2(0, 0), new Phaser.Math.Vector2(L * 0.45, -Wd), new Phaser.Math.Vector2(L, 0), new Phaser.Math.Vector2(L * 0.45, Wd)], true);
        g.lineStyle(1.5, 0xffffff, 0.7).strokePoints([new Phaser.Math.Vector2(0, 0), new Phaser.Math.Vector2(L * 0.45, -Wd), new Phaser.Math.Vector2(L, 0), new Phaser.Math.Vector2(L * 0.45, Wd)], true);
        g.lineStyle(1, 0xffffff, 0.5).lineBetween(L * 0.1, 0, L * 0.85, 0);
        g.setRotation(Math.atan2(Math.sin(a) * 0.75, Math.cos(a)));
        sc.tweens.add({ targets: g, scale: 1, alpha: al, duration: ms * 0.6, ease: 'Back.out', delay: li * 90 + i * 14 });
        items.push(g);
      }
    });
    const core = sc.add.graphics().setPosition(x, y).setDepth(-2690).setScale(0.1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const L = r * 0.2 * (i % 2 ? 0.7 : 1);
      core.lineStyle(2, 0xffe05a, 1).lineBetween(0, 0, Math.cos(a) * L, Math.sin(a) * L * 0.75);
      core.fillStyle(0xfff6b0, 1).fillRect(Math.cos(a) * L - 1.5, Math.sin(a) * L * 0.75 - 1.5, 3, 3);
    }
    core.fillStyle(0xe0a020, 1).fillRect(-3, -2, 6, 4);
    sc.tweens.add({ targets: core, scale: 1, duration: ms * 0.6, ease: 'Back.out' });
    items.push(core);
    sc.tweens.add({ targets: items, alpha: 0, delay: ms, duration: 380, onComplete: () => items.forEach((o) => o.destroy()) });
    sc.time.delayedCall(ms, () => {
      leafBurst(sc, x, y, r * 1.4, 22, ['petalP', 'petalP', 'leafA'], 700, 1);
      this.petalBits.explode(18, x, y);
    });
  }

  // ----- lửa lớn (Charizard) / cào (Charmander)

  /** hình sao nhiều cánh nở ra rồi tan: nổ Đại Hỏa */
  starBurst(x: number, y: number, r: number, points: number, color: number, core: number) {
    const sc = this.scene;
    const make = (R: number, c: number, al: number, depth: number, add: boolean) => {
      const g = sc.add.graphics().setPosition(x, y).setDepth(depth);
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < points * 2; i++) {
        const a = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
        const rr = i % 2 === 0 ? R : R * 0.42;
        pts.push(new Phaser.Math.Vector2(Math.cos(a) * rr, Math.sin(a) * rr * 0.8));
      }
      g.fillStyle(c, al).fillPoints(pts, true);
      if (add) g.setBlendMode(Phaser.BlendModes.ADD);
      return g;
    };
    const outer = make(r, color, 0.85, 99997, false).setScale(0.2);
    const inner = make(r * 0.62, core, 0.95, 99999, true).setScale(0.2);
    sc.tweens.add({ targets: outer, scale: 1.15, rotation: 0.25, duration: 260, ease: 'Cubic.out' });
    sc.tweens.add({ targets: outer, alpha: 0, delay: 200, duration: 320, onComplete: () => outer.destroy() });
    sc.tweens.add({ targets: inner, scale: 1.05, rotation: -0.2, duration: 220, ease: 'Cubic.out' });
    sc.tweens.add({ targets: inner, alpha: 0, delay: 150, duration: 260, onComplete: () => inner.destroy() });
  }

  /** mảnh vỡ + tia lửa bắn tung */
  debrisBurst(x: number, y: number, count = 14) {
    this.debris.explode(count, x, y);
    this.sparks.explode(Math.round(count * 0.7), x, y);
    this.glow.explode(Math.round(count * 0.5), x, y);
  }

  /** vài nhát cào nhỏ màu sáng (Cào của Charmander): không lửa */
  scratchMarks(x: number, y: number, angle: number, n: number, len: number, color: number, core: number) {
    const sc = this.scene;
    const g = sc.add.graphics().setDepth(100001);
    const ca = Math.cos(angle + 0.9);
    const sa = Math.sin(angle + 0.9);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 5;
      const px = x + nx * off;
      const py = y + ny * off;
      g.lineStyle(3, color, 0.7).lineBetween(px - ca * len, py - sa * len, px + ca * len, py + sa * len);
      g.lineStyle(1, core, 1).lineBetween(px - ca * len * 0.9, py - sa * len * 0.9, px + ca * len * 0.9, py + sa * len * 0.9);
    }
    sc.tweens.add({ targets: g, alpha: 0, delay: 90, duration: 200, onComplete: () => g.destroy() });
    this.sparks.explode(3, x, y);
  }

  /** chữ lớn giữa trận (KO!) bật ra rồi tan */
  /** scene chứa hiệu ứng (cho các hàm vẽ riêng từng hệ) */
  get scn() {
    return this.scene;
  }

  bigLabel(x: number, y: number, label: string, color = '#ffe14a') {
    const t = this.scene.add.text(x, y, label, { fontFamily: FONT_SMALL, fontSize: '24px', color, stroke: '#8a1a08', strokeThickness: 4 })
      .setShadow(2, 2, '#1a0a00', 0, true, true).setOrigin(0.5).setDepth(100010).setScale(0.2);
    this.scene.tweens.add({ targets: t, scale: 1.25, duration: 160, ease: 'Back.out', onComplete: () => {
      this.scene.tweens.add({ targets: t, scale: 1, duration: 120 });
      this.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, delay: 650, duration: 380, onComplete: () => t.destroy() });
    } });
  }

  dustPuff(x: number, y: number, count = 5) {
    this.dust.explode(count, x, y);
  }

  damageNumber(x: number, y: number, amount: number, color = '#ffffff', big = false) {
    let n: DmgNumber;
    if (this.numbers.length >= CAPS.damageNumbers) {
      n = this.numbers.shift()!;
    } else {
      const t = this.scene.add.text(0, 0, '', { fontFamily: FONT_SMALL, fontSize: '10px', color });
      t.setShadow(1, 1, '#1a0a00', 0, false, true).setOrigin(0.5).setDepth(100001);
      n = { text: t, vy: 0, life: 0, maxLife: 0 };
    }
    n.text.setText(String(Math.round(amount))).setColor(color).setPosition(x + (Math.random() - 0.5) * 8, y).setAlpha(1).setVisible(true).setScale(big ? 2 : 1);
    n.vy = -40;
    n.life = 0;
    n.maxLife = 650;
    this.numbers.push(n);
  }

  floatingLabel(x: number, y: number, label: string, color: string) {
    const t = this.scene.add.text(x, y, label, { fontFamily: FONT_SMALL, fontSize: '10px', color })
      .setShadow(1, 1, '#1a0a00', 0, false, true).setOrigin(0.5).setDepth(100002);
    this.scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 1100, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  /** chớp sáng ở nòng: hình nêm theo hướng angle (rad) + quầng sáng */
  muzzleFlash(x: number, y: number, angle: number, color: number, size: number) {
    const sc = this.scene;
    const g = sc.add.graphics().setPosition(x, y).setRotation(angle).setDepth(100004);
    g.fillStyle(color, 0.85).fillTriangle(0, -size * 0.4, size * 1.7, 0, 0, size * 0.4);
    g.fillStyle(0xffffff, 0.95).fillTriangle(0, -size * 0.2, size * 1.0, 0, 0, size * 0.2);
    const glow = sc.add.image(x, y, 'softglow').setTint(color).setScale(size / 9).setDepth(100003).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: g, alpha: 0, scaleX: 1.5, duration: 140, onComplete: () => g.destroy() });
    sc.tweens.add({ targets: glow, alpha: 0, scale: (size / 9) * 1.8, duration: 200, onComplete: () => glow.destroy() });
  }

  /** vòng xung kích dẹt trên nền (đòn đập xuống): 2 vòng lan ra */
  ringBurst(x: number, y: number, r: number, color: number, color2: number, ms = 340) {
    const sc = this.scene;
    for (const [k, c, w] of [[1, color, 6], [0.82, color2, 3]] as const) {
      const ring = sc.add.ellipse(x, y, r * 2 * k, r * 1.5 * k, color, 0.12).setStrokeStyle(w, c, 1).setDepth(99996).setScale(0.15);
      sc.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: ms, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    }
  }

  /** cung bọt cong quanh (cx, cy) từ góc a0 → a1 (rad): đường chém xoay */
  foamArc(cx: number, cy: number, r: number, a0: number, a1: number, color: number, core: number) {
    const sc = this.scene;
    const g = sc.add.graphics().setDepth(100002);
    for (const [k, c, w, al] of [[1, color, 7, 0.5], [0.94, core, 3, 0.95], [1.12, core, 1.5, 0.6]] as const) {
      g.lineStyle(w, c, al).beginPath();
      g.arc(cx, cy, r * k, a0, a1);
      g.strokePath();
    }
    sc.tweens.add({ targets: g, alpha: 0, duration: 380, delay: 80, onComplete: () => g.destroy() });
  }

  shake(intensity: number, duration = 120) {
    const mult = getSettings().reducedShake ? 0.15 : 1;
    if (intensity * mult < 0.0005) return;
    this.scene.cameras.main.shake(duration, intensity * mult);
  }

  addTelegraph(t: Telegraph) {
    this.telegraphs.push(t);
  }

  clearTelegraphsOf(owner: unknown) {
    this.telegraphs = this.telegraphs.filter((t) => t.owner !== owner);
  }

  update(clock: number, dtMs: number) {
    // số sát thương
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.life += dtMs;
      n.text.y += (n.vy * dtMs) / 1000;
      n.vy += (60 * dtMs) / 1000;
      n.text.setAlpha(Math.max(0, 1 - Math.max(0, n.life - 300) / (n.maxLife - 300)));
      if (n.life >= n.maxLife) {
        n.text.destroy();
        this.numbers.splice(i, 1);
      }
    }

    // cảnh báo đòn đánh
    const g = this.telegraphGfx;
    g.clear();
    this.telegraphs = this.telegraphs.filter((t) => clock < t.end);
    for (const t of this.telegraphs) {
      const p = Phaser.Math.Clamp((clock - t.start) / (t.end - t.start), 0, 1);
      const blink = 0.35 + 0.25 * Math.sin(clock / 50);
      if (t.kind === 'circle') {
        g.fillStyle(t.color, 0.18 + 0.15 * p);
        g.fillCircle(t.x, t.y, t.r);
        g.fillStyle(t.color, 0.45);
        g.fillCircle(t.x, t.y, t.r * p);
        g.lineStyle(1, t.color, 0.6 + blink * 0.4);
        g.strokeCircle(t.x, t.y, t.r);
      } else if (t.kind === 'line') {
        const cos = Math.cos(t.angle);
        const sin = Math.sin(t.angle);
        const hw = t.width / 2;
        const pts = [
          new Phaser.Math.Vector2(t.x - sin * hw, t.y + cos * hw),
          new Phaser.Math.Vector2(t.x + sin * hw, t.y - cos * hw),
          new Phaser.Math.Vector2(t.x + cos * t.len + sin * hw, t.y + sin * t.len - cos * hw),
          new Phaser.Math.Vector2(t.x + cos * t.len - sin * hw, t.y + sin * t.len + cos * hw),
        ];
        g.fillStyle(t.color, 0.15 + 0.25 * p);
        g.fillPoints(pts, true);
        g.lineStyle(1, t.color, 0.5 + blink);
        g.strokePoints(pts, true);
      } else {
        g.fillStyle(t.color, 0.25 + blink * 0.5);
        g.fillCircle(t.target.x, t.target.y, t.r * (0.6 + p * 0.6));
      }
    }
  }

  destroy() {
    for (const n of this.numbers) n.text.destroy();
    this.numbers = [];
    this.telegraphs = [];
  }
}
