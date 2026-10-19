import Phaser from 'phaser';
import { BOSS, STATS, TRAINER } from '../config/balance';
import { t } from '../i18n';
import { Enemy } from './Enemy';
import type { BattleCtx } from './types';
import { playSfx } from '../systems/sfx';
import type { BossPattern } from './bossTypes';
import { CHAPTERS } from '../data/chapters';

/** leap: nhảy bổ tới chỗ người chơi khi bị thả diều quá lâu (chỉ boss của thủ lĩnh, xem BOSS.gapCloser) */
type BossAttack = 'rockSlide' | 'charge' | 'ring' | 'leap';

const CORE_PATTERNS: Record<string, BossPattern> = {
  onix: { type: 'rock', dropTexture: 'boulder', ringTexture: 'rockball', ringCount: 14, ringSpeed: 140, glow: 0xffa030, impact: 'dust' },
  starmie: { type: 'water', dropTexture: 'splash', ringTexture: 'starshot', ringCount: 18, ringSpeed: 170, glow: 0xf85888, impact: 'bubble' },
  // Raichu của Matis: sét giáng thay cho đá rơi, vòng tia điện, lao điện
  raichu: { type: 'electric', dropTexture: 'zap', ringTexture: 'zap', ringCount: 16, ringSpeed: 200, glow: 0xf8d030, impact: 'bolt' },
  // starter của Shigeru (đối thủ)
  ivysaur: { type: 'grass', dropTexture: 'leaf', ringTexture: 'leaf', ringCount: 14, ringSpeed: 170, glow: 0x78c850, impact: 'leaf' },
  venusaur: { type: 'grass', dropTexture: 'leaf', ringTexture: 'seed', ringCount: 18, ringSpeed: 180, glow: 0x78c850, impact: 'leaf' },
  charmeleon: { type: 'fire', dropTexture: 'fireball', ringTexture: 'fireball', ringCount: 14, ringSpeed: 180, glow: 0xf08030, impact: 'flame' },
  charizard: { type: 'fire', dropTexture: 'fireball', ringTexture: 'fireball', ringCount: 18, ringSpeed: 200, glow: 0xf08030, impact: 'flame' },
  wartortle: { type: 'water', dropTexture: 'splash', ringTexture: 'bubble', ringCount: 14, ringSpeed: 170, glow: 0x6890f0, impact: 'bubble' },
  blastoise: { type: 'water', dropTexture: 'splash', ringTexture: 'bubble', ringCount: 20, ringSpeed: 190, glow: 0x6890f0, impact: 'bubble' },
  // Jolteon (Shigeru gặp người chọn Pikachu): sét giáng, vòng tia điện dày và nhanh
  jolteon: { type: 'electric', dropTexture: 'zap', ringTexture: 'zap', ringCount: 18, ringSpeed: 220, glow: 0xf8d030, impact: 'bolt' },
};
const PATTERNS: Record<string, BossPattern> = Object.assign({}, CORE_PATTERNS, ...CHAPTERS.map((c) => c.bossPatterns ?? {}));
/** hạt bung ra khi đòn rơi chạm đất / khi lao */
const IMPACT_PUFF: Record<BossPattern['impact'], string> = {
  dust: 'dustpuff', bubble: 'bubblepuff', bolt: 'zappuff', flame: 'flamepuff', leaf: 'leafpuff', psy: 'psypuff', poison: 'poisonpuff', ice: 'icepuff', shadow: 'shadowpuff',
};
type BossState = 'chase' | 'telegraph' | 'charging' | 'leaping';

/** Boss (Onix, Starmie...): 3 kiểu tấn công, đều có cảnh báo trước; hình và hệ đòn theo loài */
export class Boss extends Enemy {
  private bossState: BossState = 'chase';
  private current: BossAttack | null = null;
  private lastAttack: BossAttack | null = null;
  private stateEnd = 0;
  private slideTargets: { x: number; y: number }[] = [];
  private ringOffset = 0;
  private chargeHit = false;
  private ringsLeft = 0;
  private pattern: BossPattern;
  /** người chơi đứng xa liên tục từ lúc nào (0 = đang ở gần) – để nhảy bổ tới */
  private farSince = 0;
  private leapFrom = { x: 0, y: 0 };
  private leapTo = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number, clock: number, level = 9, trainer = false, speciesId = 'onix') {
    super(scene, speciesId, x, y, clock, level, trainer);
    this.pattern = PATTERNS[speciesId] ?? PATTERNS.onix;
    // loài vừa làm địch thường vừa làm boss: dùng máu boss riêng
    if (this.stats.bossHp) {
      const mult = trainer ? STATS.trainerBossHpMult : 1;
      this.hp = this.maxHp = Math.round(STATS.hpAt(this.stats.bossHp, level) * mult);
    }
    this.isBoss = true;
    this.knockbackMult = 0;
    this.body.pushable = false;
    this.nextAttackAt = clock + 2000;
  }

  /** đã báo "nổi giận" (boss của thủ lĩnh) */
  private enrageShown = false;

  get enraged() {
    return this.hp / this.maxHp <= (this.trainer ? TRAINER.enrage.hpRatio : BOSS.enrageHpRatio);
  }

  /** hệ số thời gian cảnh báo: boss thủ lĩnh nổi giận ra đòn nhanh hơn */
  private get teleMult() {
    return this.trainer && this.enraged ? TRAINER.enrage.telegraphMult : 1;
  }

  /** boss của thủ lĩnh vừa nổi giận: banner + rung + tiếng gầm (một lần) */
  private announceEnrage(ctx: BattleCtx) {
    this.enrageShown = true;
    ctx.host.events.emit('banner', t('battle.enraged', { name: this.species.name }));
    ctx.fx.shake(0.012, 380);
    ctx.fx.floatingLabel(this.x, this.topY - 14, '!!', '#ff5040');
    ctx.fx.puff(IMPACT_PUFF[this.pattern.impact], this.x, this.centerY, 14);
    playSfx('boss');
  }

  update(ctx: BattleCtx, dtMs: number) {
    const clock = ctx.clock;
    const p = ctx.targetFor(this.x, this.y) ?? { x: this.x, y: this.y + 1 };
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    let vx = 0;
    let vy = 0;
    if (this.trainer && this.enraged && !this.enrageShown && !this.dead) this.announceEnrage(ctx);
    const speed = this.stats.speed * (this.enraged ? (this.trainer ? TRAINER.enrage.speedMult : 1.3) : 1);

    if (this.bossState === 'chase') {
      if (dist > 40) {
        vx = (dx / dist) * speed;
        vy = (dy / dist) * speed;
      }
      // boss thủ lĩnh bị thả diều (người chơi đứng xa quá lâu) → nhảy bổ tới, không cần chờ hết nhịp nghỉ
      const gc = BOSS.gapCloser;
      if (this.trainer && dist > gc.farDist) {
        if (!this.farSince) this.farSince = clock;
      } else {
        this.farSince = 0;
      }
      if (this.farSince && clock - this.farSince >= gc.farMs) this.beginLeap(ctx);
      else if (clock >= this.nextAttackAt) this.beginAttack(ctx);
    } else if (this.bossState === 'leaping') {
      const k = Phaser.Math.Clamp(1 - (this.stateEnd - clock) / BOSS.gapCloser.leapMs, 0, 1);
      // bay theo đường thẳng tới điểm đáp, thân nảy lên theo hình cung
      this.body.reset(Phaser.Math.Linear(this.leapFrom.x, this.leapTo.x, k), Phaser.Math.Linear(this.leapFrom.y, this.leapTo.y, k));
      if (clock >= this.stateEnd) this.landLeap(ctx);
    } else if (this.bossState === 'telegraph') {
      // vẫn trườn chậm khi gọi đá rơi, đứng yên khi chuẩn bị lao/bắn vòng
      if (this.current === 'rockSlide') {
        vx = (dx / dist) * speed * 0.4;
        vy = (dy / dist) * speed * 0.4;
      }
      if (clock >= this.stateEnd) this.release(ctx);
    } else if (this.bossState === 'charging') {
      vx = Math.cos(this.lockedAngle) * BOSS.charge.speed;
      vy = Math.sin(this.lockedAngle) * BOSS.charge.speed;
      if (!this.chargeHit) {
        for (const f of ctx.aliveFighters()) {
          if (Phaser.Math.Distance.Between(f.x, f.y, this.x, this.y) < this.radius + 10) {
            this.chargeHit = true;
            ctx.damageFighter(f, BOSS.charge.damage * this.dmgMult, this.x, this.y, this.pattern.type);
          }
        }
      }
      if (clock - this.lastDust > 50) {
        this.lastDust = clock;
        if (this.pattern.impact === 'dust') ctx.fx.dustPuff(this.x, this.y + 10, 4);
        else ctx.fx.puff(IMPACT_PUFF[this.pattern.impact], this.x, this.y + 6, 3);
      }
      if (clock >= this.stateEnd) this.finishAttack(clock);
    }

    this.state = this.bossState === 'telegraph' && this.current !== 'rockSlide' ? 'windup' : 'move';
    // hướng nhìn: lao/gồng thì theo hướng lao, còn lại nhìn người chơi hoặc hướng đi
    if (this.bossState === 'charging' || (this.bossState === 'telegraph' && this.current === 'charge')) {
      this.look.set(Math.cos(this.lockedAngle), Math.sin(this.lockedAngle));
    } else if (vx * vx + vy * vy > 100 && this.bossState === 'chase') {
      this.look.set(vx, vy);
    } else {
      this.look.set(dx, dy);
    }
    if (this.bossState === 'leaping') {
      // vị trí đặt thẳng bằng body.reset; vẽ lại rồi nâng thân theo cung nhảy
      this.body.setVelocity(0, 0);
      this.syncVisual(clock, dtMs);
      const k = Phaser.Math.Clamp(1 - (this.stateEnd - clock) / BOSS.gapCloser.leapMs, 0, 1);
      this.anim.sprite.y -= Math.sin(k * Math.PI) * 26;
    } else {
      this.applyVelocity(vx, vy, dtMs, this.bossState !== 'charging');
      this.syncVisual(clock, dtMs);
    }
    // nổi giận: ánh đỏ nhấp nháy (khi không có màu trạng thái / chớp trúng đòn)
    if (this.enrageShown && !this.anim.sprite.isTinted) this.anim.sprite.setTint(Math.floor(clock / 160) % 2 ? 0xff8a80 : 0xffc8c0);
  }

  private lastDust = 0;

  private beginAttack(ctx: BattleCtx) {
    const clock = ctx.clock;
    const options: BossAttack[] = (['rockSlide', 'charge', 'ring'] as BossAttack[]).filter((a) => a !== this.lastAttack);
    const atk = options[Math.floor(Math.random() * options.length)];
    this.current = atk;
    this.lastAttack = atk;
    this.bossState = 'telegraph';
    const p = ctx.targetFor(this.x, this.y) ?? { x: this.x, y: this.y + 60 };
    playSfx('warn');

    if (atk === 'rockSlide') {
      const cfg = BOSS.rockSlide;
      const count = cfg.count + (this.enraged ? (this.trainer ? TRAINER.enrage.extraDrops : 3) : 0);
      this.stateEnd = clock + cfg.telegraphMs * this.teleMult;
      this.slideTargets = [{ x: p.x, y: p.y }];
      for (let i = 1; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 20 + Math.random() * cfg.spread;
        this.slideTargets.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r });
      }
      this.faceAngle(Math.atan2(dy0(p, this), dx0(p, this)));
      this.anim.playOnce('attack', cfg.telegraphMs * this.teleMult + 150);
      for (const t of this.slideTargets) {
        ctx.fx.addTelegraph({ kind: 'circle', x: t.x, y: t.y, r: cfg.radius, start: clock, end: this.stateEnd, color: 0xff4030, owner: this });
      }
    } else if (atk === 'charge') {
      const cfg = BOSS.charge;
      this.stateEnd = clock + cfg.telegraphMs * this.teleMult;
      this.lockedAngle = Math.atan2(p.y - this.y, p.x - this.x);
      this.faceAngle(this.lockedAngle);
      // gồng người rung lắc trước khi lao
      this.anim.playOnce('charge', cfg.telegraphMs * this.teleMult);
      const len = (cfg.speed * cfg.durationMs) / 1000;
      ctx.fx.addTelegraph({ kind: 'line', x: this.x, y: this.y, angle: this.lockedAngle, len, width: this.species.body.w + 8, start: clock, end: this.stateEnd, color: 0xff4030, owner: this });
    } else {
      const cfg = BOSS.ring;
      this.stateEnd = clock + cfg.telegraphMs * this.teleMult;
      this.ringsLeft = this.enraged ? 2 : 1;
      this.faceAngle(Math.atan2(dy0(p, this), dx0(p, this)));
      this.anim.playOnce('shoot', cfg.telegraphMs * this.teleMult + 200);
      ctx.fx.addTelegraph({ kind: 'glow', target: this.zone, r: 30, start: clock, end: this.stateEnd, color: this.pattern.glow, owner: this });
    }
  }

  /** Nhảy bổ: vòng đỏ tại chỗ người chơi, gồng người rồi nhảy tới đáp xuống (sát thương vùng) */
  private beginLeap(ctx: BattleCtx) {
    const clock = ctx.clock;
    const cfg = BOSS.gapCloser;
    const p = ctx.targetFor(this.x, this.y);
    this.farSince = 0;
    if (!p) return;
    this.current = 'leap';
    this.bossState = 'telegraph';
    this.stateEnd = clock + cfg.telegraphMs * this.teleMult;
    this.leapTo = { x: p.x, y: p.y };
    this.faceAngle(Math.atan2(p.y - this.y, p.x - this.x));
    this.anim.playOnce('charge', cfg.telegraphMs * this.teleMult);
    ctx.fx.addTelegraph({ kind: 'circle', x: p.x, y: p.y, r: cfg.radius, start: clock, end: this.stateEnd, color: 0xff4030, owner: this });
    ctx.fx.floatingLabel(this.x, this.topY - 10, '!', '#ff5040');
    playSfx('warn');
  }

  private landLeap(ctx: BattleCtx) {
    const cfg = BOSS.gapCloser;
    this.body.reset(this.leapTo.x, this.leapTo.y);
    if (this.pattern.impact === 'dust') ctx.fx.dustPuff(this.x, this.feetY, 14);
    else ctx.fx.puff(IMPACT_PUFF[this.pattern.impact], this.x, this.feetY, 12);
    ctx.fx.shake(0.01, 220);
    playSfx('hit');
    for (const f of ctx.aliveFighters()) {
      if (Phaser.Math.Distance.Between(f.x, f.y, this.leapTo.x, this.leapTo.y) <= cfg.radius + 4) {
        ctx.damageFighter(f, cfg.damage * this.dmgMult, this.x, this.y, this.pattern.type);
      }
    }
    this.finishAttack(ctx.clock);
  }

  private release(ctx: BattleCtx) {
    const clock = ctx.clock;
    if (this.current === 'leap') {
      this.bossState = 'leaping';
      this.leapFrom = { x: this.x, y: this.y };
      this.stateEnd = clock + BOSS.gapCloser.leapMs;
      playSfx('dash');
      return;
    }
    if (this.current === 'rockSlide') {
      const cfg = BOSS.rockSlide;
      for (const t of this.slideTargets) {
        this.dropBoulder(ctx, t.x, t.y);
        for (const f of ctx.aliveFighters()) {
          if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= cfg.radius + 4) {
            ctx.damageFighter(f, cfg.damage * this.dmgMult, t.x, t.y, this.pattern.type);
          }
        }
      }
      ctx.fx.shake(0.006, 160);
      this.finishAttack(clock);
    } else if (this.current === 'charge') {
      this.bossState = 'charging';
      this.chargeHit = false;
      this.stateEnd = clock + BOSS.charge.durationMs;
      playSfx('dash');
      ctx.fx.shake(0.004, 200);
    } else {
      const cfg = BOSS.ring;
      const pt = this.pattern;
      for (let i = 0; i < pt.ringCount; i++) {
        const a = this.ringOffset + (i / pt.ringCount) * Math.PI * 2;
        const shot = ctx.enemyShots.spawn(pt.ringTexture, this.x, this.centerY, Math.cos(a) * pt.ringSpeed, Math.sin(a) * pt.ringSpeed, 5, cfg.damage * this.dmgMult, 3000, 8);
        shot.type = pt.type;
      }
      this.ringOffset += Math.PI / pt.ringCount;
      playSfx('boss');
      ctx.fx.shake(0.004, 120);
      this.ringsLeft--;
      if (this.ringsLeft > 0) {
        this.stateEnd = clock + 450;
        this.anim.playOnce('shoot', 600);
        ctx.fx.addTelegraph({ kind: 'glow', target: this.zone, r: 26, start: clock, end: this.stateEnd, color: this.pattern.glow, owner: this });
      } else {
        this.finishAttack(clock);
      }
    }
  }

  private dropBoulder(ctx: BattleCtx, x: number, y: number) {
    if (this.pattern.impact === 'bolt') {
      ctx.fx.lightning(x, y);
      return;
    }
    const img = ctx.host.add.image(x, y - 70, this.pattern.dropTexture).setDepth(y + 5).setOrigin(0.5, 1);
    ctx.host.tweens.add({
      targets: img,
      y: y + 6,
      duration: 110,
      ease: 'Quad.in',
      onComplete: () => {
        if (this.pattern.impact === 'dust') ctx.fx.dustPuff(x, y, 8);
        else ctx.fx.puff(IMPACT_PUFF[this.pattern.impact], x, y, 8);
        ctx.host.tweens.add({ targets: img, alpha: 0, delay: 250, duration: 250, onComplete: () => img.destroy() });
      },
    });
  }

  private finishAttack(clock: number) {
    if (this.anim.action === 'charge') this.anim.cancelOneShot();
    this.bossState = 'chase';
    this.current = null;
    const gap = this.trainer ? (this.enraged ? TRAINER.enrage.gapMult : TRAINER.bossGapMult) : this.enraged ? 0.6 : 1;
    this.nextAttackAt = clock + BOSS.attackGapMs * gap;
  }
}

const dx0 = (p: { x: number }, e: { x: number }) => p.x - e.x;
const dy0 = (p: { y: number }, e: { y: number }) => p.y - e.y;
