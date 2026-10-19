import Phaser from 'phaser';
import { CATCH, ENEMY_STATS, EnemyStats, RUSHER, STAGE_TUNING, STATS } from '../config/balance';
import { POKEMON, PokemonSpecies } from '../data/pokemon';
import type { StatusKind } from '../data/moves';
import type { BattleCtx } from './types';
import { PokemonSprite } from './PokemonSprite';
import { playSfx } from '../systems/sfx';
import { legendOf } from '../data/legendary';
import { tickEnemySkill } from './EnemySkills';

type State = 'move' | 'windup' | 'lunge' | 'recover';

export class Enemy {
  readonly species: PokemonSpecies;
  readonly stats: EnemyStats;
  readonly zone: Phaser.GameObjects.Zone;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly anim: PokemonSprite;
  protected shadow: Phaser.GameObjects.Image;

  hp: number;
  maxHp: number;
  readonly level: number;
  /** Pokémon của huấn luyện viên (hội quán) */
  readonly trainer: boolean;
  /** hệ số sát thương theo cấp */
  dmgMult: number;
  /** con đầu đàn (to, trâu, khó bắt) */
  readonly alpha: boolean;
  /** hệ số hồi chiêu của đòn đánh xa (độ khó) */
  rangedCdMult = 1;
  /** chiêu đặc trưng theo hệ (EnemySkills): lần tới + chỉ số luân phiên */
  nextSkillAt = 0;
  skillIdx = 0;
  /** tắt chiêu đặc trưng (ải đầu) */
  skillsOff = false;
  /** hệ số nghỉ giữa các đòn vồ / đào đất (Pokémon thủ lĩnh < 1: dồn dập hơn) */
  attackGapMult = 1;
  /** hệ số tốc độ chạy (Pokémon thủ lĩnh nhanh hơn) */
  speedMult = 1;
  private crown: Phaser.GameObjects.Image | null = null;
  private aura: Phaser.GameObjects.Ellipse | null = null;
  dead = false;
  isBoss = false;
  /** có thể thu phục (Pokémon hoang dã) */
  catchable = false;
  stunnedUntil = 0;
  /** Lạnh (hệ Băng): điểm cộng dồn, hết hạn sau chillUntil; đủ 3 → Đóng băng */
  chill = 0;
  chillUntil = 0;
  /** Độc cộng dồn (0–5): đủ 5 → Ăn mòn (nhận thêm sát thương) */
  toxic = 0;
  toxicUntil = 0;
  toxicDot = 0;
  /** Giác đấu – Va chạm: sau khi bị đánh văng, trong bangUntil nếu đâm địch khác thì cả hai chịu sát thương */
  bangUntil = 0;
  bangAmount = 0;
  bangHitAt = 0;
  get knockSpeed() {
    return this.kb.length();
  }
  stunUsed = false;
  /** số lần ném bóng hỏng (huyền thoại được thử lại vài lần) */
  catchTries = 0;
  private stars: Phaser.GameObjects.Image[] = [];
  /** đang nằm trong bóng (chờ kết quả bắt) */
  beingCaught = false;
  /** hình nộm Skill Lab: không tấn công, đứng yên hoặc trôi chậm theo dummyVel */
  dummy = false;
  readonly dummyVel = new Phaser.Math.Vector2();
  private slowUntil = 0;
  private slowMult = 1;
  /** Hệ số chịu đẩy lùi (0 = không bị đẩy) */
  protected knockbackMult = 1;
  /** trạng thái từ chiêu của người chơi: thời hạn + sát thương mỗi nhịp (Bỏng / Độc / Hạt) */
  status: Partial<Record<StatusKind, { until: number; power: number }>> = {};
  /** nhịp sát thương theo thời gian kế tiếp */
  dotNextAt = 0;
  private confuseDir = new Phaser.Math.Vector2();
  private confuseTurnAt = 0;
  /** đang ở dưới đất (Diglett) / tan biến (Ma): không bị nhắm, không va chạm */
  hidden = false;
  /** khói khi tan biến / hiện ra: Siêu Linh (Mewtwo...) dùng khói hồng, Ma dùng khói tím */
  private get phantomPuff() {
    return this.species.types.includes('psychic') && !this.species.types.includes('ghost') ? 'psypuff' : 'shadowpuff';
  }
  /** đi xuyên vật cản (Ma) */
  get phasing() {
    return this.stats.behavior === 'phantom';
  }
  private nextDustAt = 0;
  private strikeAt = { x: 0, y: 0 };

  protected state: State = 'move';
  protected stateUntil = 0;
  protected nextAttackAt = 0;
  protected lockedAngle = 0;
  /** cú vồ của rusher: tốc độ / thời gian lao, có phải cú phóng xa (có báo trước) không */
  private lungeSpeed = 0;
  private lungeMs = 260;
  private farLunge = false;
  protected kb = new Phaser.Math.Vector2();
  protected hitFlashUntil = 0;
  protected wobbleSeed = Math.random() * 1000;
  /** hướng nhìn mong muốn (đi đâu nhìn đó, khi tấn công thì nhìn mục tiêu) */
  protected look = new Phaser.Math.Vector2(0, 1);

  constructor(protected scene: Phaser.Scene, speciesId: string, x: number, y: number, clock: number, level = 5, trainer = false, alpha = false) {
    this.species = POKEMON[speciesId];
    this.stats = ENEMY_STATS[speciesId];
    this.level = level;
    this.trainer = trainer;
    this.dmgMult = STATS.enemyDamageAt(level);
    const trainerMult = this.stats.behavior === 'boss' ? STATS.trainerBossHpMult : STATS.trainerHpMult;
    this.hp = this.maxHp = Math.round(STATS.hpAt(this.stats.hp, level) * (trainer ? trainerMult : 1));
    this.alpha = alpha;
    const sizeMult = alpha ? STAGE_TUNING.alpha.scale : 1;
    const b = { w: Math.round(this.species.body.w * sizeMult), h: Math.round(this.species.body.h * sizeMult) };
    this.zone = scene.add.zone(x, y, b.w, b.h);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.shadow = scene.add.image(x, y, 'shadow').setDepth(-3500).setScale((b.w + 6) / 20, 1);
    this.anim = new PokemonSprite(scene, speciesId, (this.species.scale ?? 1) * sizeMult);
    if (alpha) {
      this.aura = scene.add.ellipse(x, y, b.w + 14, 9).setStrokeStyle(2, 0xff5040, 0.9).setFillStyle(0xff5040, 0.15).setDepth(-3550);
      this.crown = scene.add.image(x, y, 'icons', 'crown').setDepth(100004);
    }
    this.anim.loop('walk');
    if (this.stats.behavior === 'tank') this.knockbackMult = 0.3;
    // địch đánh xa không bắn ngay khi vừa xuất hiện
    this.nextAttackAt = clock + 1200 + Math.random() * 1200;
    // hiệu ứng xuất hiện
    this.anim.sprite.setAlpha(0);
    scene.tweens.add({ targets: this.anim.sprite, alpha: 1, duration: 300 });
  }

  get sprite() {
    return this.anim.sprite;
  }
  /** có thể bị nhắm / trúng đòn */
  get targetable() {
    return !this.dead && !this.beingCaught && !this.hidden;
  }
  get x() {
    return this.zone.x;
  }
  get y() {
    return this.zone.y;
  }
  get feetY() {
    return this.zone.y + this.zone.height / 2;
  }
  get radius() {
    return Math.max(this.zone.width, this.zone.height) / 2;
  }
  /** Đỉnh đầu (px thế giới) */
  get topY() {
    return this.feetY - this.anim.height;
  }
  /** Điểm giữa thân (để đạn trúng / số sát thương hiện ra) */
  get centerY() {
    return this.feetY - this.anim.height * 0.5;
  }

  hit(amount: number, dirX: number, dirY: number, force: number, clock: number, flinch = true) {
    if (this.dead || this.beingCaught) return;
    this.hp -= amount;
    this.hitFlashUntil = clock + 90;
    this.kb.x += dirX * force * this.knockbackMult;
    this.kb.y += dirY * force * this.knockbackMult;
    if (this.hp <= 0) {
      this.dead = true;
      this.clearStars();
      return;
    }
    if (!this.isBoss && flinch) this.anim.playOnce('hurt', 180, false);
    // máu thấp → choáng, có thể ném bóng (mỗi con chỉ choáng một lần)
    if (this.catchable && !this.stunUsed && this.hp / this.maxHp <= (legendOf(this.species.id) ? CATCH.legendStunHpRatio : CATCH.stunHpRatio)) this.stunForCatch(clock);
  }

  /** choáng để ném bóng (sao quay trên đầu) */
  stunForCatch(clock: number) {
    if (this.dead) return;
    this.stunUsed = true;
    this.stunnedUntil = clock + CATCH.stunMs;
    this.state = 'move';
    this.kb.set(0, 0);
    this.clearStars();
    for (let i = 0; i < 3; i++) this.stars.push(this.scene.add.image(this.x, this.topY, 'dizzy').setDepth(100005));
    this.status = {};
  }

  /** Gây trạng thái. Boss không bị Tê liệt / Rối loạn mà chỉ bị chậm. Trả về true nếu là trạng thái mới. */
  applyStatus(kind: StatusKind, ms: number, clock: number, power = 0): boolean {
    if (this.dead || this.beingCaught || this.isStunned(clock)) return false;
    if (this.isBoss && (kind === 'paralyze' || kind === 'confuse' || kind === 'sleep' || kind === 'freeze')) {
      this.applySlow(0.6, ms, clock);
      return false;
    }
    const cur = this.status[kind];
    const fresh = !cur || cur.until <= clock;
    this.status[kind] = { until: Math.max(fresh ? 0 : cur!.until, clock + ms), power: Math.max(power, fresh ? 0 : cur!.power) };
    if (kind === 'paralyze' || kind === 'confuse' || kind === 'sleep' || kind === 'freeze') {
      // bị khống chế thì hủy đòn đang lấy đà
      this.state = 'move';
      this.nextAttackAt = Math.max(this.nextAttackAt, clock + ms + 400);
    }
    if ((kind === 'burn' || kind === 'poison' || kind === 'seed') && this.dotNextAt < clock) this.dotNextAt = clock + 500;
    return fresh;
  }

  hasStatus(kind: StatusKind, clock: number) {
    const st = this.status[kind];
    return !!st && st.until > clock;
  }

  /** đang bị khống chế (choáng thu phục / Tê liệt / Rối loạn) → không gây sát thương va chạm */
  disabled(clock: number) {
    return this.hidden || this.isStunned(clock) || this.hasStatus('paralyze', clock) || this.hasStatus('sleep', clock) || this.hasStatus('freeze', clock) || this.hasStatus('confuse', clock);
  }

  isStunned(clock: number) {
    return clock < this.stunnedUntil;
  }

  /** Làm chậm: nếu đang bị chậm thì giữ hiệu ứng mạnh hơn / lâu hơn. Boss chịu chậm ít hơn. */
  applySlow(mult: number, ms: number, clock: number) {
    const m = this.isBoss ? Math.max(mult, 0.7) : mult;
    const active = clock < this.slowUntil;
    this.slowMult = active ? Math.min(this.slowMult, m) : m;
    this.slowUntil = Math.max(active ? this.slowUntil : 0, clock + ms);
  }

  private clearStars() {
    for (const st of this.stars) st.destroy();
    this.stars = [];
  }

  /** Gọi khi con này vừa gây sát thương va chạm cho người chơi */
  onContactHit(px: number, py: number) {
    this.look.set(px - this.x, py - this.y);
    this.anim.setDirFromVector(this.look.x, this.look.y);
    this.anim.playOnce('attack', 380, false);
  }

  get xpYield() {
    return STATS.xpYield(this.stats.xp, this.level);
  }

  update(ctx: BattleCtx, dtMs: number) {
    if (this.beingCaught) {
      this.body.setVelocity(0, 0);
      return;
    }
    if (ctx.clock < this.stunnedUntil) {
      this.body.setVelocity(0, 0);
      this.anim.loop('idle');
      this.syncVisual(ctx.clock, dtMs);
      const t = ctx.clock / 160;
      this.stars.forEach((st, i) => st.setPosition(this.x + Math.cos(t + i * 2.1) * 9, this.topY - 3 + Math.sin(t + i * 2.1) * 3));
      return;
    }
    if (this.stars.length) this.clearStars();
    if (this.hasStatus('paralyze', ctx.clock) || this.hasStatus('sleep', ctx.clock) || this.hasStatus('freeze', ctx.clock)) {
      this.applyVelocity(0, 0, dtMs);
      this.anim.loop('idle');
      this.syncVisual(ctx.clock, dtMs);
      return;
    }
    if (this.hasStatus('confuse', ctx.clock)) {
      // đi lung tung, không tấn công
      if (ctx.clock >= this.confuseTurnAt) {
        const a = Math.random() * Math.PI * 2;
        this.confuseDir.set(Math.cos(a), Math.sin(a));
        this.confuseTurnAt = ctx.clock + 350 + Math.random() * 300;
      }
      const sp = this.stats.speed * 0.7;
      this.look.copy(this.confuseDir);
      this.applyVelocity(this.confuseDir.x * sp, this.confuseDir.y * sp, dtMs);
      this.syncVisual(ctx.clock, dtMs);
      return;
    }
    if (this.dummy) {
      if (this.dummyVel.lengthSq() > 0) this.look.copy(this.dummyVel).normalize();
      this.applyVelocity(this.dummyVel.x, this.dummyVel.y, dtMs);
      this.syncVisual(ctx.clock, dtMs);
      return;
    }
    const p = ctx.targetFor(this.x, this.y);
    if (!p) {
      this.applyVelocity(0, 0, dtMs);
      this.syncVisual(ctx.clock, dtMs);
      return;
    }
    tickEnemySkill(this, ctx, p);
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    let vx = 0;
    let vy = 0;
    const s = this.stats;
    const clock = ctx.clock;

    switch (s.behavior) {
      case 'tank': {
        vx = nx * s.speed;
        vy = ny * s.speed;
        break;
      }
      case 'rusher': {
        if (this.state === 'move') {
          // tiến lại theo đường zigzag
          const wob = Math.sin(clock / 180 + this.wobbleSeed) * 0.6;
          vx = (nx - ny * wob) * s.speed;
          vy = (ny + nx * wob) * s.speed;
          if (dist < RUSHER.lungeMaxDist && clock >= this.nextAttackAt) {
            // gần: vồ ngắn như cũ · xa (lungeMinDist..lungeMaxDist): chớp trắng + vạch đỏ rồi phóng vút tới
            // → người chơi thả diều ở tầm trung phải lướt / né ngang chứ không chạy thẳng mãi được
            this.farLunge = dist >= RUSHER.lungeMinDist;
            const wind = this.farLunge ? RUSHER.windupMs : 260;
            this.lungeMs = this.farLunge ? RUSHER.lungeMs : 260;
            // hoang dã: trần tốc độ thấp hơn, và cú vồ xa không bị chậm theo speedMult (vẫn tới đúng vạch báo)
            this.lungeSpeed = this.farLunge
              ? (this.trainer ? Math.min(RUSHER.maxSpeed, ((dist + RUSHER.overshoot) / RUSHER.lungeMs) * 1000)
                : Math.min(RUSHER.wildMaxSpeed, ((dist + RUSHER.overshoot) / RUSHER.lungeMs) * 1000) / Math.max(0.1, this.speedMult))
              : s.speed * 2.3;
            this.state = 'windup';
            this.stateUntil = clock + wind;
            this.lockedAngle = Math.atan2(dy, dx);
            this.faceAngle(this.lockedAngle);
            // co người lấy đà rồi vồ: cả animation tấn công kéo dài hết windup + lunge
            this.anim.playOnce('attack', wind + this.lungeMs);
            if (this.farLunge) {
              const len = (this.lungeSpeed * this.speedMult * this.lungeMs) / 1000;
              ctx.fx.addTelegraph({ kind: 'line', x: this.x, y: this.y, angle: this.lockedAngle, len, width: this.zone.width + 8, start: clock, end: this.stateUntil, color: 0xff6040, owner: this });
              playSfx('warn');
            }
          }
        } else if (this.state === 'windup') {
          if (clock >= this.stateUntil) {
            this.state = 'lunge';
            this.stateUntil = clock + this.lungeMs;
            if (this.farLunge) ctx.fx.dustPuff(this.x, this.feetY, 5);
          }
        } else if (this.state === 'lunge') {
          vx = Math.cos(this.lockedAngle) * this.lungeSpeed;
          vy = Math.sin(this.lockedAngle) * this.lungeSpeed;
          if (this.farLunge && clock >= this.nextDustAt) {
            this.nextDustAt = clock + 50;
            ctx.fx.dustPuff(this.x, this.feetY, 2);
          }
          if (clock >= this.stateUntil) {
            this.state = 'move';
            this.farLunge = false;
            this.nextAttackAt = clock + (1400 + Math.random() * 600) * this.attackGapMult;
          }
        }
        break;
      }
      case 'ranged': {
        if (this.state === 'move') {
          const pref = s.preferredRange ?? 150;
          const strafe = Math.sin(clock / 900 + this.wobbleSeed) > 0 ? 1 : -1;
          if (dist > pref + 30) {
            vx = nx * s.speed;
            vy = ny * s.speed;
          } else if (dist < pref - 30) {
            vx = -nx * s.speed;
            vy = -ny * s.speed;
          } else {
            vx = -ny * s.speed * 0.6 * strafe;
            vy = nx * s.speed * 0.6 * strafe;
          }
          if (clock >= this.nextAttackAt && dist < 260) {
            const tele = s.rangedTelegraphMs ?? 600;
            this.state = 'windup';
            this.stateUntil = clock + tele;
            this.lockedAngle = Math.atan2(dy, dx);
            this.faceAngle(this.lockedAngle);
            this.anim.playOnce('shoot', tele + 150);
            // dấu hiệu báo trước: vòng sáng tím + vạch ngắm
            ctx.fx.addTelegraph({ kind: 'glow', target: { x: this.x, y: this.feetY }, r: 8, start: clock, end: this.stateUntil, color: 0xc070ff, owner: this });
            ctx.fx.addTelegraph({ kind: 'line', x: this.x, y: this.y, angle: this.lockedAngle, len: 120, width: 6, start: clock, end: this.stateUntil, color: 0xc070ff, owner: this });
            playSfx('warn');
          }
        } else if (this.state === 'windup' && clock >= this.stateUntil) {
          const sp = s.rangedProjectileSpeed ?? 150;
          const shot = ctx.enemyShots.spawn(s.rangedTexture ?? 'poison', this.x, this.centerY, Math.cos(this.lockedAngle) * sp, Math.sin(this.lockedAngle) * sp, 4, (s.rangedDamage ?? 8) * this.dmgMult, 2600, 6);
          shot.type = this.species.types.includes('poison') ? 'poison' : this.species.types[0];
          this.state = 'move';
          this.nextAttackAt = clock + (s.rangedCooldownMs ?? 2500) * this.rangedCdMult * (0.85 + Math.random() * 0.3);
        }
        break;
      }
      case 'burrow': {
        // dưới đất: lần theo người chơi, cuộn bụi; tới nơi thì báo vòng đỏ rồi trồi lên
        if (this.state === 'move') {
          this.hidden = true;
          vx = nx * s.speed;
          vy = ny * s.speed;
          if (clock >= this.nextDustAt) {
            this.nextDustAt = clock + 140;
            ctx.fx.dustPuff(this.x, this.feetY, 2);
          }
          if ((dist < 26 || clock >= this.nextAttackAt + 2500) && clock >= this.nextAttackAt) {
            this.state = 'windup';
            this.stateUntil = clock + 600;
            this.strikeAt = { x: p.x, y: p.y };
            ctx.fx.addTelegraph({ kind: 'circle', x: p.x, y: p.y + 4, r: 26, start: clock, end: this.stateUntil, color: 0xc08040, owner: this });
            playSfx('warn');
          }
        } else if (this.state === 'windup') {
          // đào tới đúng chỗ đã đánh dấu
          const tx = this.strikeAt.x - this.x;
          const ty = this.strikeAt.y - this.y;
          const td = Math.hypot(tx, ty) || 1;
          if (td > 4) {
            vx = (tx / td) * Math.min(s.speed * 2, td * 8);
            vy = (ty / td) * Math.min(s.speed * 2, td * 8);
          }
          if (clock >= this.stateUntil) {
            this.hidden = false;
            this.state = 'recover';
            this.stateUntil = clock + 1700;
            this.anim.playOnce('attack', 450);
            ctx.fx.dustPuff(this.x, this.feetY, 12);
            ctx.fx.shake(0.004, 120);
            for (const f of ctx.aliveFighters()) {
              if (Math.hypot(f.x - this.strikeAt.x, f.y - this.strikeAt.y) < 30) ctx.damageFighter(f, s.contactDamage * 1.5 * this.dmgMult, this.x, this.y, this.species.types[0]);
            }
          }
        } else if (clock >= this.stateUntil) {
          // nhô lên một lúc (lúc này mới đánh được) rồi chui xuống lại
          this.state = 'move';
          this.nextAttackAt = clock + (900 + Math.random() * 700) * this.attackGapMult;
          ctx.fx.dustPuff(this.x, this.feetY, 8);
        }
        break;
      }
      case 'phantom': {
        // Ma: trôi xuyên vật cản; định kỳ tan biến, hiện ra cạnh người chơi rồi bắn
        const r = s.preferredRange ?? 120;
        if (this.state === 'move') {
          this.hidden = false;
          this.anim.sprite.setAlpha(0.75 + Math.sin(clock / 200) * 0.15);
          const strafe = Math.sin(clock / 700 + this.wobbleSeed) > 0 ? 1 : -1;
          if (dist > r + 30) {
            vx = nx * s.speed;
            vy = ny * s.speed;
          } else {
            vx = -ny * s.speed * 0.7 * strafe;
            vy = nx * s.speed * 0.7 * strafe;
          }
          if (clock >= this.nextAttackAt) {
            this.state = 'recover';
            this.stateUntil = clock + 700;
            this.hidden = true;
            ctx.fx.puff(this.phantomPuff, this.x, this.centerY, 8);
          }
        } else if (this.state === 'recover') {
          if (clock >= this.stateUntil) {
            // hiện ra ở một điểm quanh người chơi, lấy đà bắn
            const a = Math.random() * Math.PI * 2;
            this.body.reset(p.x + Math.cos(a) * r * 0.8, p.y + Math.sin(a) * r * 0.6);
            this.hidden = false;
            ctx.fx.puff(this.phantomPuff, this.x, this.centerY, 8);
            const tele = s.rangedTelegraphMs ?? 550;
            this.state = 'windup';
            this.stateUntil = clock + tele;
            this.lockedAngle = Math.atan2(p.y - this.y, p.x - this.x);
            this.faceAngle(this.lockedAngle);
            this.anim.playOnce('shoot', tele + 150);
            ctx.fx.addTelegraph({ kind: 'line', x: this.x, y: this.y, angle: this.lockedAngle, len: 120, width: 6, start: clock, end: this.stateUntil, color: 0x9a70e0, owner: this });
          }
        } else if (this.state === 'windup' && clock >= this.stateUntil) {
          const sp = s.rangedProjectileSpeed ?? 170;
          const shot = ctx.enemyShots.spawn(s.rangedTexture ?? 'shadowball', this.x, this.centerY, Math.cos(this.lockedAngle) * sp, Math.sin(this.lockedAngle) * sp, 5, (s.rangedDamage ?? 10) * this.dmgMult, 2600, 6);
          shot.type = this.species.types[0];
          this.state = 'move';
          this.nextAttackAt = clock + (s.rangedCooldownMs ?? 2600) * this.rangedCdMult * (0.85 + Math.random() * 0.3);
        }
        break;
      }
      case 'bomber': {
        // lao tới; áp sát thì phát sáng rồi tự nổ (của thủ lĩnh: chỉ khi còn dưới nửa máu)
        const canBlow = !this.trainer || this.hp / this.maxHp < 0.5;
        if (this.state === 'move') {
          vx = nx * s.speed;
          vy = ny * s.speed;
          if (canBlow && dist < 48 && clock >= this.nextAttackAt) {
            this.state = 'windup';
            this.stateUntil = clock + 800;
            this.anim.playOnce('charge', 800);
            ctx.fx.addTelegraph({ kind: 'circle', x: this.x, y: this.y, r: 50, start: clock, end: this.stateUntil, color: 0xff3030, owner: this });
            playSfx('warn');
          }
        } else if (this.state === 'windup' && clock >= this.stateUntil) {
          ctx.fx.sparkBurst(this.x, this.centerY, 24);
          ctx.fx.puff('flamepuff', this.x, this.centerY, 14);
          ctx.fx.shake(0.012, 260);
          playSfx('thunder');
          for (const f of ctx.aliveFighters()) {
            if (Math.hypot(f.x - this.x, f.y - this.y) < 54) ctx.damageFighter(f, s.contactDamage * 2.6 * this.dmgMult, this.x, this.y, this.species.types[0]);
          }
          // tự gục sau khi nổ (BattleScene dọn và tính EXP)
          this.hp = 0;
          this.dead = true;
          this.clearStars();
          return;
        }
        break;
      }
      default:
        break;
    }

    // không chui vào giữa người chơi: bỏ thành phần tiến lại khi đã áp sát
    const stopDist = this.radius + 7;
    if (dist < stopDist && this.state !== 'lunge') {
      const toward = vx * nx + vy * ny;
      if (toward > 0) {
        vx -= toward * nx;
        vy -= toward * ny;
      }
    }

    // đi đâu nhìn đó; đứng yên hoặc đang ra đòn thì nhìn người chơi / hướng đòn
    if (this.state === 'move') {
      if (vx * vx + vy * vy > 100) this.look.set(vx, vy);
      else this.look.set(dx, dy);
    }

    this.applyVelocity(vx, vy, dtMs);
    this.syncVisual(clock, dtMs);
  }

  protected faceAngle(a: number) {
    this.look.set(Math.cos(a), Math.sin(a));
    this.anim.setDirFromVector(this.look.x, this.look.y);
  }

  /** scaled = false: vận tốc cố định (vd. cú lao của boss khớp vạch cảnh báo) */
  protected applyVelocity(vx: number, vy: number, dtMs: number, scaled = true) {
    if (scaled && this.speedMult !== 1) {
      vx *= this.speedMult;
      vy *= this.speedMult;
    }
    if (this.slowUntil > 0) {
      const now = (this.scene as unknown as { clock?: number }).clock ?? 0;
      if (now < this.slowUntil) {
        vx *= this.slowMult;
        vy *= this.slowMult;
      } else {
        this.slowUntil = 0;
      }
    }
    // nếu đang kẹt vào vật cản thì trượt sang ngang
    const t = this.body.touching;
    if (!t.none && (vx || vy)) {
      const side = Math.sin(this.wobbleSeed) > 0 ? 1 : -1;
      vx += -vy * 0.8 * side;
      vy += vx * 0.8 * side;
    }
    this.body.setVelocity(vx + this.kb.x, vy + this.kb.y);
    const decay = Math.exp(-dtMs / 90);
    this.kb.scale(decay);
    if (this.kb.lengthSq() < 1) this.kb.set(0, 0);
  }

  /** walkScale: tốc độ animation bước chân */
  protected syncVisual(clock: number, dtMs: number, walkScale = 1) {
    const speed = this.body.velocity.length();
    const moving = speed > 5;
    if (!this.anim.busy) this.anim.setDirFromVector(this.look.x, this.look.y);
    if (moving) this.anim.loop('walk', walkScale * Phaser.Math.Clamp(speed / Math.max(30, this.stats.speed), 0.6, 2.5));
    else this.anim.loop('idle');
    this.anim.place(this.zone.x, this.feetY, moving, dtMs);
    if (clock < this.hitFlashUntil) this.anim.sprite.setTintFill(0xffffff);
    // lấy đà phóng xa: chớp trắng / đỏ
    else if (this.farLunge && this.state === 'windup') this.anim.sprite.setTintFill(Math.floor(clock / 70) % 2 ? 0xffffff : 0xff8060);
    else if (this.hasStatus('paralyze', clock)) this.anim.sprite.setTint(Math.floor(clock / 90) % 2 ? 0xfff08a : 0xffffff);
    else if (this.hasStatus('sleep', clock)) this.anim.sprite.setTint(0xb8c8ff);
    else if (this.hasStatus('freeze', clock)) this.anim.sprite.setTint(0x9ae8ff);
    else if (this.hasStatus('burn', clock)) this.anim.sprite.setTint(0xffb08a);
    else if (this.hasStatus('poison', clock)) this.anim.sprite.setTint(0xdcaaff);
    else if (this.hasStatus('confuse', clock)) this.anim.sprite.setTint(0xffc8ec);
    else this.anim.sprite.clearTint();
    this.anim.sprite.setVisible(!this.hidden);
    this.shadow.setPosition(this.zone.x, this.feetY).setTint(this.hidden ? 0x6a4a28 : 0xffffff);
    this.aura?.setPosition(this.zone.x, this.feetY);
    this.crown?.setPosition(Math.round(this.zone.x), Math.round(this.topY - 10));
  }

  destroy() {
    this.clearStars();
    this.crown?.destroy();
    this.aura?.destroy();
    this.anim.destroy();
    this.shadow.destroy();
    this.zone.destroy();
  }
}

/** Áp độ khó của chế độ bản đồ ải lên một đối thủ */
export function applyStageTuning(e: Enemy, hpMult: number, dmgMult: number, rangedCdMult: number) {
  const a = e.alpha ? STAGE_TUNING.alpha : null;
  e.maxHp = Math.round(e.maxHp * hpMult * (a ? a.hpMult : 1));
  e.hp = e.maxHp;
  e.dmgMult *= dmgMult * (a ? a.dmgMult : 1);
  e.rangedCdMult = rangedCdMult;
}
