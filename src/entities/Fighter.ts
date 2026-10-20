// Một Pokémon trong đội khi vào trận. Mỗi lúc chỉ 1 con "ra sân", các con khác ở dự bị.
// Máu được ghi thẳng vào PartyMember nên giữ nguyên giữa các lần đổi.
import { legendOf } from '../data/legendary';
import Phaser from 'phaser';
import { COMBAT, combatProfile, DASH, PLAYER, SKILL_UPGRADE } from '../config/balance';
import type { MoveDef } from '../data/moves';
import { POKEMON, PokemonSpecies, SkillSlot } from '../data/pokemon';
import { memberSkills, memberStats, PartyMember, SkillLockMode, xpToNext } from '../game/state';
import { PokemonSprite } from './PokemonSprite';
import { resolveSkill } from '../skills/kits';
import type { SkillSpec } from '../skills/types';

export interface DirInput {
  x: number;
  y: number;
}

export type SlotId = SkillSlot | 'dash';

export interface FighterSkill {
  slot: SkillSlot;
  /** chiêu đã áp nâng cấp */
  move: MoveDef;
  base: MoveDef;
  unlockLevel: number;
  unlocked: boolean;
  upgrade: number;
  /** chiêu đã phân giải theo loài + cấp (nguyên mẫu, tham số, năng lượng) – skills/kits.ts */
  spec: SkillSpec;
}

export class Fighter {
  species!: PokemonSpecies;
  readonly zone: Phaser.GameObjects.Zone;
  readonly body: Phaser.Physics.Arcade.Body;
  anim!: PokemonSprite;
  skills: FighterSkill[] = [];
  private shadow: Phaser.GameObjects.Image;
  private arrow: Phaser.GameObjects.Image;
  private marker: Phaser.GameObjects.Ellipse;
  private shield: Phaser.GameObjects.Image;

  maxHp = 1;
  power = 1;
  speed = 100;
  /** Phòng thủ (đã cộng Huấn luyện) và hệ số sát thương nhận vào tương ứng */
  def = 65;
  takenMult = 1;
  /** tỉ lệ chí mạng (×1.5) của Pokémon – cộng thêm với chí mạng riêng của chiêu */
  crit = 0;
  /** hệ số hồi chiêu (Phản xạ / loài nhanh trí) */
  cdMult = 1;
  /** hồi máu mỗi giây (HP/s) */
  regen = 0;
  private regenAcc = 0;
  /** hệ số EXP nhận được */
  xpMult = 1;
  onField = false;
  /** hệ số tốc độ do địa hình (vd. hồ nước ở Hội quán Cerulean) */
  zoneSlow = 1;

  /** Hướng quay (vector đơn vị) – theo hướng đi; quay về mục tiêu khi ra chiêu */
  readonly facing = new Phaser.Math.Vector2(0, 1);
  readonly moveDir = new Phaser.Math.Vector2(0, 0);
  /** Hướng chiêu sẽ bay tới – chỉ để vẽ mũi tên */
  readonly aimDir = new Phaser.Math.Vector2(0, 1);
  hasTarget = false;

  readyAt: Record<SlotId, number> = { J: 0, K: 0, L: 0, U: 0, dash: 0 };
  /** năng lượng chung (COMBAT.energy): mỗi ô chiêu tốn spec.cost, hồi liên tục; không đủ thì không ra chiêu */
  energy: number = COMBAT.energy.max;
  energyMax: number = COMBAT.energy.max;
  /** hệ số hồi năng lượng (huyền thoại > 1) */
  regenMult = 1;
  /** chậm sau khi ra chiêu (COMBAT.castSlow) – lướt thì hết chậm */
  private castSlowUntil = 0;
  private castSlowMult = 1;
  private dashUntil = 0;
  private dashSpeed: number = DASH.speed;
  private dashDir = new Phaser.Math.Vector2();
  /** Đào Đất: đang ở dưới đất (ẩn, bất tử) */
  burrowUntil = 0;
  /** Xoay Tốc Độ: đang xoay */
  spinUntil = 0;
  spinMove: MoveDef | null = null;
  /** Thu Nhỏ: tỉ lệ né, Thủ Mai: hệ số phản đòn (cùng thời hạn guardUntil) */
  evade = 0;
  reflect = 0;
  /** Liên Trảm / Lăn Tròn: số lần dùng liền nhau */
  stackCount = 0;
  stackAt = 0;
  stackId = '';
  /** bị làm chậm bởi bẫy sân (bào tử, băng...) */
  private extSlowUntil = 0;
  private extSlowMult = 1;
  /** năng lượng tuyệt chiêu 0..1 (phím I) */
  ultCharge = 0;
  /** đang đứng trên sàn băng: trôi theo quán tính */
  onIce = false;
  private iceVel = new Phaser.Math.Vector2();
  /** lực đẩy từ bên ngoài (gió giật), giảm dần */
  readonly push = new Phaser.Math.Vector2();
  /** đang dùng chiêu hình quạt: đi chậm lại, khóa hướng */
  sprayUntil = 0;
  sprayMove: MoveDef | null = null;
  invulnUntil = 0;
  /** chiêu tự cường hóa: nhận sát thương × guardMult tới guardUntil */
  /** đang chờ bóng bật mở (đổi Pokémon): ẩn hình tới lúc con xuất hiện */
  summoning = false;
  guardUntil = 0;
  guardMult = 1;
  private lastGhostAt = 0;
  private stepTimer = 0;
  private fainted = false;
  /** gọi mỗi bước chân (để tạo bụi) */
  onStep?: (x: number, y: number) => void;

  /** lockMode: 'earned' (ải, thử thách) · 'level' (Sinh tồn – luật cũ theo cấp) · 'free' (Skill Lab) */
  constructor(private scene: Phaser.Scene, readonly member: PartyMember, x: number, y: number, readonly lockMode: SkillLockMode = 'earned') {
    this.zone = scene.add.zone(x, y, 12, 9);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.marker = scene.add.ellipse(x, y, 18, 7).setStrokeStyle(1, 0xffd34a, 0.9).setDepth(-3600);
    this.shadow = scene.add.image(x, y, 'shadow').setDepth(-3500).setScale(0.8, 1);
    this.arrow = scene.add.image(x, y, 'arrow').setAlpha(0.9).setDepth(-3400);
    this.shield = scene.add.image(x, y, 'shield').setDepth(100000).setVisible(false);
    this.setSpecies(member.speciesId);
    this.setOnField(false);
  }

  /** Đổi loài (dùng khi khởi tạo; tiến hóa diễn ra ngoài trận) */
  private setSpecies(id: string) {
    this.species = POKEMON[id];
    this.anim?.destroy();
    this.anim = new PokemonSprite(this.scene, id, this.species.scale ?? 1);
    this.anim.loop('idle');
    this.body.setSize(this.species.body.w, this.species.body.h);
    this.zone.setSize(this.species.body.w, this.species.body.h);
    this.refreshStats();
  }

  get x() {
    return this.zone.x;
  }
  get y() {
    return this.zone.y;
  }
  get feetY() {
    return this.zone.y + this.species.body.h / 2;
  }
  /** điểm giữa thân, nơi bắn đạn ra */
  get chestY() {
    return this.feetY - this.anim.height * 0.45;
  }
  get hp() {
    return this.member.hp;
  }
  get level() {
    return this.member.level;
  }
  get xp() {
    return this.member.xp;
  }
  get xpToNext() {
    return xpToNext(this.member.level);
  }
  get dead() {
    return this.member.hp <= 0;
  }
  get isDashing() {
    return this.dashUntil > 0;
  }
  isBurrowed(clock: number) {
    return clock < this.burrowUntil;
  }
  isSpinning(clock: number) {
    return clock < this.spinUntil;
  }

  /** Tính lại chỉ số & chiêu theo cấp (gọi sau khi lên cấp) */
  refreshStats() {
    const st = memberStats(this.member);
    // huyền thoại: thanh năng lượng lớn + hồi nhanh
    const lg = legendOf(this.species.id);
    const prevMax = this.energyMax;
    this.energyMax = lg?.energyMax ?? COMBAT.energy.max;
    this.regenMult = lg ? lg.regenPerSec / 8 : 1;
    if (this.energy === prevMax && prevMax !== this.energyMax) this.energy = this.energyMax;
    this.maxHp = st.maxHp;
    this.power = st.power;
    this.speed = st.speed;
    this.def = st.def;
    this.takenMult = st.takenMult;
    this.crit = st.crit;
    this.cdMult = st.cdMult;
    this.regen = st.regen;
    this.xpMult = st.xpMult;
    if (this.member.hp > this.maxHp) this.member.hp = this.maxHp;
    this.skills = memberSkills(this.member, this.lockMode).map((s) => {
      const spec = resolveSkill(this.member.speciesId, this.member.level, s.slot, s.move);
      // nâng cấp chiêu giảm năng lượng (SKILL_UPGRADE.energy), tối thiểu 1
      const cut = SKILL_UPGRADE.energy[Math.min(s.upgrade, SKILL_UPGRADE.energy.length - 1)] ?? 0;
      if (cut && spec.cost > 0) spec.cost = Math.max(1, spec.cost - cut);
      return { ...s, spec };
    });
  }

  skill(slot: SkillSlot): FighterSkill | undefined {
    return this.skills.find((s) => s.slot === slot);
  }

  /** Ra sân tại (x, y) hoặc về dự bị (ẩn, không va chạm) */
  setOnField(on: boolean, x?: number, y?: number) {
    this.onField = on;
    this.burrowUntil = 0;
    this.spinUntil = 0;
    if (on && x !== undefined && y !== undefined) this.body.reset(x, y);
    this.body.enable = on;
    this.body.setVelocity(0, 0);
    this.anim.sprite.setVisible(on);
    this.shadow.setVisible(on);
    this.marker.setVisible(on && !this.dead);
    this.arrow.setVisible(on && !this.dead);
    if (!on) this.shield.setVisible(false);
    if (on && !this.dead) {
      this.anim.cancelOneShot();
      this.fainted = false;
      this.body.checkCollision.none = false;
    }
  }

  isInvulnerable(clock: number) {
    return clock < this.invulnUntil;
  }

  cooldownLeft(id: SlotId, clock: number) {
    return Math.max(0, this.readyAt[id] - clock);
  }

  cooldownTotal(id: SlotId) {
    if (id === 'dash') return DASH.cooldownMs;
    return (this.skill(id)?.move.cooldownMs ?? 1000) * this.cdMult;
  }

  ready(id: SlotId, clock: number) {
    if (this.dead || !this.onField || clock < this.readyAt[id]) return false;
    if (id === 'dash') return true;
    return !!this.skill(id)?.unlocked;
  }

  use(id: SlotId, clock: number, mult = 1) {
    this.readyAt[id] = clock + this.cooldownTotal(id) * mult;
  }

  /** năng lượng cần cho ô chiêu (theo SkillSpec) */
  skillCost(slot: SkillSlot): number {
    return this.skill(slot)?.spec.cost ?? 0;
  }

  canAfford(slot: SkillSlot): boolean {
    return this.energy >= this.skillCost(slot);
  }

  spendEnergy(slot: SkillSlot, clock: number) {
    this.energy = Math.max(0, this.energy - this.skillCost(slot));
    const prof = combatProfile();
    // J (đòn thường) chỉ ngừng hồi rất ngắn – nếu không, giữ J sẽ không bao giờ hồi (cạn ~4,8s thay vì ~7s)
    this.energyPauseUntil = clock + (slot === 'J' ? prof.jRegenPauseMs : prof.regenPauseMs);
  }

  /** ra chiêu xong thì ngừng hồi năng lượng tới mốc này (combatProfile().regenPauseMs) */
  energyPauseUntil = 0;

  regenEnergy(dtMs: number, clock: number) {
    if (clock < this.energyPauseUntil) return;
    if (this.energy < this.energyMax) this.energy = Math.min(this.energyMax, this.energy + (combatProfile().regenPerSec * this.regenMult * dtMs) / 1000);
  }

  /** Chậm lại ngắn sau khi ra chiêu (lấy hiệu ứng mạnh hơn nếu đang chậm) */
  applyCastSlow(mult: number, ms: number, clock: number) {
    const active = clock < this.castSlowUntil;
    this.castSlowMult = active ? Math.min(this.castSlowMult, mult) : mult;
    this.castSlowUntil = Math.max(this.castSlowUntil, clock + ms);
  }

  startDash(clock: number) {
    // lướt theo hướng di chuyển; đứng yên thì theo hướng quay
    const dir = this.moveDir.lengthSq() > 0 ? this.moveDir : this.facing;
    this.dashDir.copy(dir).normalize();
    this.dashSpeed = DASH.speed;
    this.dashUntil = clock + DASH.durationMs;
    this.invulnUntil = Math.max(this.invulnUntil, clock + DASH.invulnMs);
    this.sprayUntil = 0;
    this.castSlowUntil = 0;
    this.anim.cancelOneShot();
    this.use('dash', clock);
  }

  /** Lao tới theo hướng dir một quãng dist trong ms (Tấn Công Nhanh, Húc Sừng...), bất tử khi lao */
  startLunge(dir: Phaser.Math.Vector2, dist: number, ms: number, clock: number) {
    this.dashDir.copy(dir).normalize();
    // giữ hướng về mục tiêu khi đang lao
    this.sprayUntil = Math.max(this.sprayUntil, clock + ms);
    this.dashSpeed = (dist / ms) * 1000;
    this.dashUntil = clock + ms;
    this.invulnUntil = Math.max(this.invulnUntil, clock + ms + 60);
  }

  startBurrow(ms: number, clock: number) {
    this.burrowUntil = clock + ms;
    this.invulnUntil = Math.max(this.invulnUntil, clock + ms + 80);
    this.sprayUntil = 0;
  }

  startSpin(m: MoveDef, clock: number) {
    this.spinUntil = clock + (m.spinMs ?? 1200);
    this.spinMove = m;
    this.sprayUntil = 0;
  }

  /** Quay người về một hướng (khi ra chiêu về phía mục tiêu) */
  faceTo(x: number, y: number) {
    if (x === 0 && y === 0) return;
    this.facing.set(x, y).normalize();
    this.anim.setDirFromVector(this.facing.x, this.facing.y);
  }

  playMove(m: MoveDef) {
    this.anim.setDirFromVector(this.facing.x, this.facing.y);
    this.anim.playOnce(m.anim, m.animMs);
  }

  /** Chiêu hình quạt: đứng tấn trong sprayMs */
  startSpray(m: MoveDef, clock: number) {
    this.sprayUntil = clock + (m.sprayMs ?? 300);
    this.sprayMove = m;
    this.playMove(m);
  }

  /** Chiêu tự cường hóa */
  startGuard(m: MoveDef, clock: number) {
    this.guardUntil = clock + (m.buffMs ?? 3000);
    this.guardMult = m.guard ?? 1;
    this.evade = m.evade ?? 0;
    this.reflect = m.reflect ?? 0;
    this.playMove(m);
  }

  /** lookAt: hướng nhìn ép buộc (ngắm chuột / nhìn mục tiêu) */
  update(clock: number, dtMs: number, move: DirInput, lookAt: DirInput | null = null) {
    if (!this.onField) return;
    if (this.dead) {
      this.body.setVelocity(0, 0);
      this.syncVisual(clock, dtMs, false);
      return;
    }
    this.moveDir.set(move.x, move.y);
    if (this.moveDir.lengthSq() > 0) this.moveDir.normalize(); // đi chéo không nhanh hơn
    // Hồi máu theo thời gian (Quang hợp / loài tự hồi) – chỉ con đang ra sân
    if (this.regen > 0 && this.member.hp < this.maxHp) {
      this.regenAcc += (this.regen * dtMs) / 1000;
      if (this.regenAcc >= 1) {
        const n = Math.floor(this.regenAcc);
        this.regenAcc -= n;
        this.heal(n);
      }
    } else {
      this.regenAcc = 0;
    }

    if (clock >= this.sprayUntil) {
      if (lookAt && (lookAt.x !== 0 || lookAt.y !== 0)) this.facing.set(lookAt.x, lookAt.y).normalize();
      else if (this.moveDir.lengthSq() > 0) this.facing.copy(this.moveDir);
    }

    if (this.dashUntil > 0 && clock >= this.dashUntil) this.dashUntil = 0;
    if (this.dashUntil > 0) {
      this.body.setVelocity(this.dashDir.x * this.dashSpeed, this.dashDir.y * this.dashSpeed);
      this.iceVel.set(this.dashDir.x * this.speed, this.dashDir.y * this.speed);
      if (clock - this.lastGhostAt > 30 && !this.isBurrowed(clock)) {
        this.lastGhostAt = clock;
        this.spawnGhost();
      }
    } else {
      const spray = clock < this.sprayUntil ? this.sprayMove?.moveSlow ?? 0.4 : 1;
      const slow = Math.min(spray, clock < this.castSlowUntil ? this.castSlowMult : 1);
      // xoay tít / dưới đất: chạy nhanh hơn và không bị hồ nước làm chậm
      const boost = this.isSpinning(clock) ? 1.35 : this.isBurrowed(clock) ? 1.15 : 1;
      const ext = clock < this.extSlowUntil ? this.extSlowMult : 1;
      const sp = this.speed * slow * boost * ext * (boost > 1 ? 1 : this.zoneSlow);
      let vx = this.moveDir.x * sp;
      let vy = this.moveDir.y * sp;
      if (this.onIce) {
        // sàn băng: vận tốc đuổi theo hướng bấm rất chậm → trượt
        const k = 1 - Math.exp(-dtMs / 420);
        this.iceVel.x += (vx - this.iceVel.x) * k;
        this.iceVel.y += (vy - this.iceVel.y) * k;
        vx = this.iceVel.x;
        vy = this.iceVel.y;
      } else {
        this.iceVel.set(vx, vy);
      }
      this.body.setVelocity(vx + this.push.x, vy + this.push.y);
      this.push.scale(Math.exp(-dtMs / 260));
      if (this.push.lengthSq() < 4) this.push.set(0, 0);
    }

    const moving = this.moveDir.lengthSq() > 0 || this.isDashing;
    this.syncVisual(clock, dtMs, moving);
  }

  private syncVisual(clock: number, dtMs: number, moving: boolean) {
    const a = this.anim;
    const burrowed = this.isBurrowed(clock) && !this.dead;
    a.sprite.setVisible(this.onField && !burrowed && !this.summoning);
    if (!this.dead && this.isSpinning(clock)) {
      // xoay vòng qua 8 hướng
      const t = clock / 45;
      a.setDirFromVector(Math.cos(t), Math.sin(t));
      a.loop('idle');
    } else if (!this.dead) {
      if (!a.busy) a.setDirFromVector(this.facing.x, this.facing.y);
      const ts = this.isDashing ? 2.2 : this.speed / 115;
      if (moving) a.loop('walk', clock < this.sprayUntil ? 0.6 : ts);
      else a.loop('idle');
    }
    a.place(this.zone.x, this.feetY, moving, dtMs);

    if (moving && !this.isDashing && !this.dead) {
      this.stepTimer -= dtMs;
      if (this.stepTimer <= 0) {
        this.stepTimer = 230 * (115 / this.speed);
        this.onStep?.(this.zone.x, this.feetY);
      }
    } else {
      this.stepTimer = 60;
    }

    this.shadow.setPosition(this.zone.x, this.feetY);
    this.marker.setPosition(this.zone.x, this.feetY);
    const ax = this.zone.x + this.aimDir.x * 15;
    const ay = this.zone.y + this.aimDir.y * 12;
    this.arrow.setPosition(ax, ay).setRotation(Math.atan2(this.aimDir.y, this.aimDir.x)).setAlpha(this.hasTarget ? 1 : 0.6);

    const guarded = clock < this.guardUntil && !this.dead && this.guardMult < 1;
    this.shield.setVisible(guarded).setPosition(this.zone.x, this.chestY).setAlpha(0.6 + Math.sin(clock / 80) * 0.3);

    if (this.isInvulnerable(clock) && !this.isDashing && !this.dead) {
      a.sprite.setAlpha(Math.floor(clock / 70) % 2 === 0 ? 0.35 : 1);
    } else if (clock < this.guardUntil && this.evade > 0 && !this.dead) {
      a.sprite.setAlpha(0.55);
    } else {
      a.sprite.setAlpha(1);
    }
    this.shadow.setScale(burrowed ? 1.3 : 0.8, burrowed ? 1.4 : 1);
  }

  private spawnGhost() {
    const s = this.anim.sprite;
    const g = this.scene.add.image(s.x, s.y, s.texture.key, s.frame.name)
      .setScale(s.scaleX, s.scaleY)
      .setTintFill(0xffd34a)
      .setAlpha(0.5)
      .setDepth(s.depth - 1);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
  }

  /** Trả về sát thương thực nhận (0 nếu đang bất tử) */
  /** Bẫy sân làm chậm (lấy hiệu ứng mạnh hơn nếu đang bị chậm) */
  applySlow(mult: number, ms: number, clock: number) {
    const active = clock < this.extSlowUntil;
    this.extSlowMult = active ? Math.min(this.extSlowMult, mult) : mult;
    this.extSlowUntil = Math.max(this.extSlowUntil, clock + ms);
  }

  isSlowed(clock: number) {
    return clock < this.extSlowUntil;
  }

  /** Thu Nhỏ: có né được đòn này không */
  tryEvade(clock: number) {
    return clock < this.guardUntil && this.evade > 0 && Math.random() < this.evade;
  }

  takeDamage(amount: number, clock: number): number {
    if (this.dead || !this.onField || this.isInvulnerable(clock)) return 0;
    // Phòng thủ: takenMult ≈ 1 với loài có Phòng thủ trung bình ở cấp này (xem data/stats.ts DEFENSE)
    const dmg = Math.max(1, Math.round(amount * this.takenMult * (clock < this.guardUntil ? this.guardMult : 1)));
    this.member.hp = Math.max(0, this.member.hp - dmg);
    this.invulnUntil = clock + PLAYER.hurtInvulnMs;
    if (this.member.hp <= 0) this.lieDown();
    else if (!this.anim.busy) this.anim.playOnce('hurt', 220);
    return dmg;
  }

  heal(amount: number) {
    if (this.dead) return;
    this.member.hp = Math.min(this.maxHp, this.member.hp + amount);
  }

  /** Kiệt sức: nằm xuống, không còn va chạm */
  private lieDown() {
    if (this.fainted) return;
    this.fainted = true;
    this.body.setVelocity(0, 0);
    this.body.checkCollision.none = true;
    this.arrow.setVisible(false);
    this.marker.setVisible(false);
    this.shield.setVisible(false);
    this.sprayUntil = 0;
    this.spinUntil = 0;
    this.burrowUntil = 0;
    this.anim.sprite.setVisible(true);
    this.anim.playOnce('faint', 700);
  }

  destroy() {
    this.anim.destroy();
    this.shadow.destroy();
    this.arrow.destroy();
    this.marker.destroy();
    this.shield.destroy();
    this.zone.destroy();
  }
}
