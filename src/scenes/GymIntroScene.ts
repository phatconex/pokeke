// Mở màn trận hội quán (cả Tứ Thiên Vương / Shigeru): thủ lĩnh bước ra chào → ném Poké Ball tung Pokémon →
// người chơi chọn Pokémon (thẻ đội hình) → ném bóng → "Chiến đấu!". Trận đứng yên suốt đoạn này.
// Esc = bỏ qua; kiểm thử: dữ liệu trận { skipIntro: true }, window.__skipIntro = true, hoặc battle.skipIntro().
import Phaser from 'phaser';
import type { BattleScene } from './BattleScene';
import { TRAINER_SCALE } from './BattleScene';
import type { Fighter } from '../entities/Fighter';
import type { BallThrow } from '../fx/ballThrow';
import { materialize, throwPokeball, trainerThrowPose } from '../fx/ballThrow';
import { getGame } from '../game/state';
import { lang, t } from '../i18n';
import { typeLabel } from '../i18n/content';
import { TYPE_COLOR, PokemonType } from '../data/types';
import { playSfx } from '../systems/sfx';
import { COLORS, outlinedText, pixelPanel, text } from '../ui/style';
import { pokemonIcon } from '../ui/pokemonIcon';

const CHARS_PER_SEC = 60;
const BAR_H = 44;
/** lỗi nội bộ để thoát chuỗi async khi bỏ qua */
const SKIPPED = Symbol('skipped');

export class GymIntroScene extends Phaser.Scene {
  private battle!: BattleScene;
  private done = false;
  private finished = false;
  private leaderOut = false;
  private playerOut = false;
  private throwing: BallThrow | null = null;
  private trainerName = '';
  private leaderName = '';
  // ---- hộp thoại ----
  private dlg!: Phaser.GameObjects.Container;
  private dlgName!: Phaser.GameObjects.Text;
  private dlgBody!: Phaser.GameObjects.Text;
  private dlgMore!: Phaser.GameObjects.Text;
  private dlgPortraits: Record<'leader' | 'player', Phaser.GameObjects.GameObject[]> = { leader: [], player: [] };
  private lines: string[] = [];
  private lineIdx = 0;
  private full = '';
  private typed = 0;
  private waitingAdvance: (() => void) | null = null;
  private shownAt = 0;
  // ---- chọn Pokémon ----
  private chooseLayer: Phaser.GameObjects.Container | null = null;
  private cardsLayer: Phaser.GameObjects.Container | null = null;
  private sel = 0;
  private choosing: ((i: number) => void) | null = null;
  private bars: Phaser.GameObjects.Rectangle[] = [];
  private topTitle: Phaser.GameObjects.GameObject[] = [];

  /** 'intro' = mở màn hội quán · 'faint' = Pokémon vừa gục: thu hồi xong, chọn con tiếp theo rồi ném bóng */
  private mode: 'intro' | 'faint' = 'intro';

  constructor() {
    super('GymIntro');
  }

  init(data?: { mode?: 'intro' | 'faint' }) {
    this.mode = data?.mode ?? 'intro';
  }

  create() {
    this.battle = this.scene.get('Battle') as BattleScene;
    const gym = this.battle.gymDef;
    this.done = false;
    this.finished = false;
    this.leaderOut = false;
    this.playerOut = false;
    this.throwing = null;
    this.chooseLayer = null;
    this.cardsLayer = null;
    this.choosing = null;
    this.waitingAdvance = null;
    this.dlgPortraits = { leader: [], player: [] };
    if (!gym || !this.battle.introActive) {
      this.scene.stop();
      return;
    }
    this.scene.bringToTop();
    this.leaderName = gym.leader;
    this.trainerName = getGame()?.trainer || 'Satoshi';
    this.sel = Math.max(0, this.battle.fighters.indexOf(this.battle.player));
    // HUD ẩn trong lúc mở màn (hiện lại khi bắt đầu đánh)
    this.scene.setVisible(false, 'Hud');
    const hud = this.scene.get('Hud');
    if (hud?.input) hud.input.enabled = false;

    const { width, height } = this.scale;
    // dải đen điện ảnh trên / dưới
    this.bars = [
      this.add.rectangle(0, -BAR_H, width, BAR_H, 0x000000).setOrigin(0).setDepth(40),
      this.add.rectangle(0, height, width, BAR_H, 0x000000).setOrigin(0).setDepth(40),
    ];
    this.tweens.add({ targets: this.bars[0], y: 0, duration: 350, ease: 'Quad.out' });
    this.tweens.add({ targets: this.bars[1], y: height - BAR_H, duration: 350, ease: 'Quad.out' });
    const title = text(this, width / 2, BAR_H / 2, gym.title, 20, COLORS.gold).setOrigin(0.5).setDepth(41).setAlpha(0);
    const skip = text(this, width - 18, BAR_H / 2, t('battle.intro.skip'), 10, '#c8d0f0').setOrigin(1, 0.5).setDepth(41).setAlpha(0);
    this.topTitle = [title, skip];
    this.tweens.add({ targets: this.topTitle, alpha: 1, duration: 300, delay: 250 });

    this.buildDialog();

    const kb = this.input.keyboard!;
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-SPACE', () => this.confirm());
    kb.on('keydown-ESC', () => this.skip());
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-A', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    kb.on('keydown-D', () => this.move(1));
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((k, i) => kb.on(`keydown-${k}`, () => this.pick(i)));
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!this.choosing) this.confirm();
    });
    this.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    // trận bị đóng giữa chừng → đóng luôn
    this.battle.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onBattleGone, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.battle.events.off(Phaser.Scenes.Events.SHUTDOWN, this.onBattleGone, this);
      this.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this);
      this.input.keyboard?.removeAllListeners();
      this.input.removeAllListeners();
    });

    if (this.mode === 'faint') {
      this.leaderOut = true;
      void this.runFaint().catch((e) => {
        if (e !== SKIPPED) throw e;
      });
      return;
    }
    if (this.battle.introSkipRequested) {
      this.skip();
      return;
    }
    void this.run().catch((e) => {
      if (e !== SKIPPED) throw e;
    });
  }

  private onBattleGone() {
    this.done = true;
    this.finished = true;
    this.scene.stop();
  }

  // ======================================================================= kịch bản

  private async run() {
    const b = this.battle;
    const gym = b.gymDef!;
    await this.wait(300);
    await this.walkIn();
    // lời chào: lần đầu đủ câu, đấu lại thì một câu ngắn
    const stageId = b.stage?.id ?? '';
    const cleared = !!getGame()?.stages[stageId]?.clears;
    const greet = cleared || !gym.intro.length ? [t('battle.intro.rematch', { leader: gym.leader })] : gym.intro;
    await this.say(greet);
    // thủ lĩnh ném bóng
    this.caption(gym.sendOut[0] ?? t('battle.enters', { name: gym.team[0]?.species ?? '' }));
    await this.wait(450);
    await this.step(new Promise<void>((r) => (this.throwing = b.leaderThrow(r))));
    this.throwing = null;
    const foe = b.introSendOut();
    this.leaderOut = true;
    await this.wait(1100);
    this.hideDialog();
    // chọn Pokémon
    const idx = await this.choose(foe?.species.name ?? '');
    // người chơi ném bóng
    const f = b.fighters[idx];
    this.caption(t('battle.intro.go', { trainer: this.trainerName, name: f.species.name }));
    await this.wait(450);
    await this.step(new Promise<void>((r) => (this.throwing = this.playerThrow(r))));
    this.throwing = null;
    this.sendFighter(idx);
    await this.wait(800);
    this.hideDialog();
    this.finish();
  }

  /** Pokémon vừa gục giữa trận hội quán: chọn con tiếp theo → ném bóng → đánh tiếp */
  private async runFaint() {
    const b = this.battle;
    const foe = b.gymFoe;
    await this.wait(250);
    const idx = await this.choose(foe?.species.name ?? '', t('battle.intro.chooseNext'));
    const f = b.fighters[idx];
    this.caption(t('battle.intro.go', { trainer: this.trainerName, name: f.species.name }));
    await this.wait(350);
    await this.step(new Promise<void>((r) => (this.throwing = this.playerThrow(r))));
    this.throwing = null;
    this.sendFighter(idx);
    await this.wait(600);
    this.hideDialog();
    this.finish();
  }

  /** chờ theo đồng hồ scene; bỏ qua giữa chừng → thoát chuỗi */
  private wait(ms: number) {
    return this.step(new Promise<void>((r) => this.time.delayedCall(ms, r)));
  }

  private async step<T>(p: Promise<T>): Promise<T> {
    if (this.done) throw SKIPPED;
    const v = await p;
    if (this.done) throw SKIPPED;
    return v;
  }

  /** Thủ lĩnh và người chơi bước vào từ hai mép sân */
  private walkIn() {
    const b = this.battle;
    const tw: Promise<void>[] = [];
    const walk = (s: Phaser.GameObjects.Sprite | null, fromX: number, dir: 'left' | 'right', frame: number) => {
      if (!s) return;
      const toX = s.x;
      s.x = fromX;
      const key = `${s.texture.key}-walk-${dir}`;
      if (b.anims.exists(key)) s.play(key);
      tw.push(new Promise<void>((r) => b.tweens.add({ targets: s, x: toX, duration: 700, ease: 'Sine.out', onComplete: () => { s.stop(); s.setFrame(frame); r(); } })));
    };
    walk(b.leaderSprite, b.cameras.main.worldView.right + 16, 'left', 3);
    walk(b.trainerSprite, b.cameras.main.worldView.x - 16, 'right', 6);
    return this.step(Promise.all(tw).then(() => undefined));
  }

  private playerThrow(onOpen: () => void): BallThrow {
    const b = this.battle;
    const s = b.trainerSprite;
    const from = s ? { x: s.x + 7 * TRAINER_SCALE, y: s.y - 17 * TRAINER_SCALE } : { x: b.cameras.main.worldView.x - 12, y: b.playerSpawn.y - 50 };
    if (s) trainerThrowPose(b, s, 1);
    return throwPokeball(b, b.fx, from, { x: b.playerSpawn.x, y: b.playerSpawn.y + 8 }, onOpen);
  }

  private sendFighter(idx: number) {
    const f = this.battle.introSendFighter(idx);
    this.playerOut = true;
    materialize(this.battle, f.anim.sprite);
    playSfx('swap');
  }

  /** Bỏ qua: đưa mọi thứ về trạng thái cuối rồi bắt đầu đánh */
  skip() {
    if (this.done) return;
    this.done = true;
    this.throwing?.cancel();
    this.throwing = null;
    const b = this.battle;
    for (const [s, frame] of [[b.leaderSprite, 3], [b.trainerSprite, 6]] as const) {
      if (!s) continue;
      b.tweens.killTweensOf(s);
      s.stop();
      s.setFrame(frame).setAngle(0);
      const pos = s === b.leaderSprite ? b.gymPos.leader : b.gymPos.trainer;
      s.setPosition(pos.x, pos.y);
    }
    if (!this.leaderOut) {
      b.introSendOut();
      this.leaderOut = true;
    }
    if (!this.playerOut) b.introSendFighter(this.sel);
    this.playerOut = true;
    this.hideDialog();
    this.closeChoose();
    this.finish();
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    this.done = true;
    this.scene.setVisible(true, 'Hud');
    const hud = this.scene.get('Hud');
    if (hud?.input) hud.input.enabled = true;
    this.battle.endIntro();
    const { height } = this.scale;
    this.tweens.add({ targets: this.topTitle, alpha: 0, duration: 200 });
    this.tweens.add({ targets: this.bars[0], y: -BAR_H, duration: 300, ease: 'Quad.in' });
    this.tweens.add({ targets: this.bars[1], y: height, duration: 300, ease: 'Quad.in', onComplete: () => this.scene.stop() });
  }

  // ======================================================================= phím

  private confirm() {
    if (this.done) return;
    if (this.choosing) {
      const cb = this.choosing;
      this.choosing = null;
      playSfx('select');
      this.closeChoose();
      cb(this.sel);
      return;
    }
    this.advance();
  }

  private move(d: number) {
    if (!this.choosing) return;
    const fs = this.battle.fighters;
    for (let i = 1; i <= fs.length; i++) {
      const j = (this.sel + d * i + fs.length * 4) % fs.length;
      if (!fs[j].dead) {
        if (j !== this.sel) {
          this.sel = j;
          playSfx('talk');
          this.renderCards();
        }
        return;
      }
    }
  }

  private pick(i: number) {
    if (!this.choosing) return;
    const f = this.battle.fighters[i];
    if (!f || f.dead) return;
    if (i === this.sel) return this.confirm();
    this.sel = i;
    playSfx('talk');
    this.renderCards();
  }

  // ======================================================================= hộp thoại

  private buildDialog() {
    const { width, height } = this.scale;
    const w = Math.min(1000, width - 200);
    const x = (width - w) / 2;
    const y = height - BAR_H - 168;
    const h = 150;
    const objs: Phaser.GameObjects.GameObject[] = [pixelPanel(this, x, y, w, h)];
    // khung chân dung bên trái
    objs.push(pixelPanel(this, x + 14, y + 14, 112, h - 28, { fill: 0x3a4a7a, border: 0xa8b6f0 }));
    const px = x + 70;
    const py = y + h - 20;
    for (const who of ['leader', 'player'] as const) {
      const key = who === 'leader' ? this.battle.leaderSprite?.texture.key : this.battle.trainerSprite?.texture.key;
      if (key && this.textures.exists(key)) {
        this.dlgPortraits[who].push(this.add.sprite(px, py, key, 0).setOrigin(0.5, 1).setScale(4));
      } else {
        // không có hình nhân vật: huy hiệu chữ cái đầu
        const name = who === 'leader' ? this.leaderName : this.trainerName;
        this.dlgPortraits[who].push(
          this.add.circle(px, py - 50, 36, 0x24305a).setStrokeStyle(3, 0xffd34a),
          ...outlinedText(this, px, py - 50, name.charAt(0).toUpperCase(), 36, '#ffd34a', '#1a1020', 3).all,
        );
      }
    }
    objs.push(...this.dlgPortraits.leader, ...this.dlgPortraits.player);
    const tx = x + 148;
    this.dlgName = text(this, tx, y + 20, '', 12, COLORS.gold);
    this.dlgBody = text(this, tx, y + 46, '', 24, '#ffffff', { wordWrap: { width: w - 148 - 34 }, lineSpacing: 6 });
    this.dlgMore = text(this, x + w - 30, y + h - 34, '▼', 12, COLORS.gold);
    this.tweens.add({ targets: this.dlgMore, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    objs.push(this.dlgName, this.dlgBody, this.dlgMore);
    this.dlg = this.add.container(0, 0, objs).setDepth(20).setVisible(false);
  }

  private showLine(line: string) {
    const m = /^([^:]{1,24}):\s(.+)$/.exec(line);
    const name = m ? m[1] : '';
    const isPlayer = name === this.trainerName;
    this.dlgPortraits.leader.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(!isPlayer));
    this.dlgPortraits.player.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(isPlayer));
    this.dlgName.setText(name);
    this.full = m ? m[2] : line;
    this.typed = 0;
    this.dlgBody.setText('');
    this.dlgMore.setVisible(false);
    this.shownAt = performance.now();
    if (!this.dlg.visible) {
      this.dlg.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.dlg, alpha: 1, duration: 150 });
    }
  }

  /** Nói lần lượt các câu; Enter/Space/click để sang câu kế */
  private say(lines: string[]) {
    return this.step(new Promise<void>((resolve) => {
      this.lines = lines;
      this.lineIdx = 0;
      this.waitingAdvance = resolve;
      this.showLine(lines[0]);
    }));
  }

  /** Dòng chú thích (không chờ phím) – vd. "Takeshi: Geodude, ra trận!" */
  private caption(line: string) {
    this.waitingAdvance = null;
    this.lines = [line];
    this.lineIdx = 0;
    this.showLine(line);
  }

  private hideDialog() {
    this.waitingAdvance = null;
    this.dlg?.setVisible(false);
  }

  private advance() {
    if (!this.waitingAdvance) return;
    if (performance.now() - this.shownAt < 120) return;
    if (this.typed < this.full.length) {
      this.typed = this.full.length;
      this.dlgBody.setText(this.full);
      this.dlgMore.setVisible(true);
      return;
    }
    playSfx('select');
    this.lineIdx++;
    if (this.lineIdx < this.lines.length) {
      this.showLine(this.lines[this.lineIdx]);
      return;
    }
    const cb = this.waitingAdvance;
    this.waitingAdvance = null;
    cb();
  }

  private tick(_t: number, delta: number) {
    if (!this.dlg?.visible || this.typed >= this.full.length) return;
    const before = Math.floor(this.typed);
    this.typed = Math.min(this.full.length, this.typed + (CHARS_PER_SEC * delta) / 1000);
    if (Math.floor(this.typed) !== before) {
      this.dlgBody.setText(this.full.slice(0, Math.floor(this.typed)));
      if (Math.floor(this.typed) % 4 === 0) playSfx('talk');
    }
    this.dlgMore.setVisible(this.typed >= this.full.length && !!this.waitingAdvance);
  }

  // ======================================================================= chọn Pokémon

  private choose(foeName: string, titleText = t('battle.intro.choose')) {
    const fs = this.battle.fighters;
    if (fs[this.sel]?.dead) this.sel = Math.max(0, fs.findIndex((f) => !f.dead));
    const { width, height } = this.scale;
    const layer = this.add.container(0, 0).setDepth(30);
    layer.add(this.add.rectangle(0, 0, width, height, 0x0b0f1e, 0.55).setOrigin(0));
    const title = outlinedText(this, width / 2, 140, titleText, 36, '#ffffff', '#1a1020', 3);
    layer.add(title.all);
    if (foeName) layer.add(text(this, width / 2, 188, this.mode === 'faint' ? t('battle.intro.chooseNextSub', { leader: this.leaderName, name: foeName }) : t('battle.intro.chooseSub', { leader: this.leaderName, name: foeName }), 12, '#ffd0a0').setOrigin(0.5));
    layer.add(text(this, width / 2, 560, t('battle.intro.chooseHint', { n: fs.length }), 10, '#c8d0f0').setOrigin(0.5));
    layer.setAlpha(0);
    this.tweens.add({ targets: layer, alpha: 1, duration: 200 });
    this.chooseLayer = layer;
    this.renderCards();
    playSfx('select');
    return this.step(new Promise<number>((r) => (this.choosing = r)));
  }

  private closeChoose() {
    this.choosing = null;
    this.chooseLayer?.destroy(true);
    this.cardsLayer?.destroy(true);
    this.chooseLayer = null;
    this.cardsLayer = null;
  }

  private renderCards() {
    this.cardsLayer?.destroy(true);
    const fs = this.battle.fighters;
    const { width } = this.scale;
    const n = fs.length;
    const gap = 24;
    const cw = Math.min(220, Math.floor((width - 160 - gap * (n - 1)) / n));
    const ch = 300;
    const top = 236;
    const x0 = width / 2 - (n * cw + (n - 1) * gap) / 2;
    const layer = this.add.container(0, 0).setDepth(31);
    fs.forEach((f, i) => layer.add(this.card(f, i, x0 + i * (cw + gap), top, cw, ch)));
    this.cardsLayer = layer;
  }

  private card(f: Fighter, i: number, x: number, y: number, w: number, h: number): Phaser.GameObjects.GameObject[] {
    const sel = i === this.sel;
    const dead = f.dead;
    const cx = x + w / 2;
    const out: Phaser.GameObjects.GameObject[] = [];
    out.push(pixelPanel(this, x, y, w, h, dead
      ? { fill: 0x2a2c3a, border: 0x6a6e80 }
      : sel ? { fill: 0x34479a, border: 0xffd34a } : { fill: 0x24305a, border: 0xc8d0f0 }));
    out.push(text(this, x + 18, y + 14, String(i + 1), 12, dead ? '#7a7e90' : COLORS.gold));
    // bệ đứng + sprite
    out.push(this.add.ellipse(cx, y + 116, 96, 22, 0x0b0f1e, dead ? 0.25 : 0.45));
    const spr = pokemonIcon(this, f.species.id, cx, y + 84, 60, sel && !dead);
    if (dead) spr.setTint(0x5a5a6a);
    out.push(spr);
    if (dead) out.push(text(this, cx, y + 116, t('battle.intro.fainted').toUpperCase(), 12, '#ff7a6a').setOrigin(0.5));
    // tên + cấp
    let name = text(this, cx, y + 148, f.species.name, 20, dead ? '#9a9eb0' : '#ffffff').setOrigin(0.5);
    if (name.width > w - 24) {
      name.destroy();
      name = text(this, cx, y + 148, f.species.name, 12, dead ? '#9a9eb0' : '#ffffff').setOrigin(0.5);
    }
    out.push(name);
    out.push(text(this, cx, y + 176, `Lv ${f.level}`, 12, dead ? '#7a7e90' : COLORS.gold).setOrigin(0.5));
    // thanh máu
    const bw = w - 44;
    const ratio = Phaser.Math.Clamp(f.hp / Math.max(1, f.maxHp), 0, 1);
    out.push(this.add.rectangle(cx, y + 202, bw + 4, 12, 0x0b0f1e));
    out.push(this.add.rectangle(cx - bw / 2, y + 202, bw, 8, 0x3a1a1a).setOrigin(0, 0.5));
    if (ratio > 0) out.push(this.add.rectangle(cx - bw / 2, y + 202, Math.max(2, bw * ratio), 8, ratio < 0.3 ? 0xff4040 : ratio < 0.6 ? 0xf8d030 : 0x60d060).setOrigin(0, 0.5));
    out.push(text(this, cx, y + 222, `${Math.ceil(f.hp)}/${f.maxHp}`, 10, dead ? '#7a7e90' : '#ffffff').setOrigin(0.5));
    // hệ
    const tags = f.species.types.map((ty) => this.typeTag(ty, dead));
    const total = tags.reduce((s, tg) => s + tg.w, 0) + (tags.length - 1) * 6;
    let tx = cx - total / 2;
    for (const tg of tags) {
      tg.r.setPosition(tx + tg.w / 2, y + 256);
      tg.t.setPosition(tx + tg.w / 2, y + 256);
      out.push(tg.r, tg.t);
      tx += tg.w + 6;
    }
    // mũi tên chọn
    if (sel && !dead) {
      const arrow = text(this, cx, y - 13, '▼', 20, COLORS.gold).setOrigin(0.5);
      this.tweens.add({ targets: arrow, y: y - 8, duration: 350, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      out.push(arrow);
    }
    // click: chọn, click lần nữa: tung ra
    const hit = this.add.rectangle(cx, y + h / 2, w, h, 0xffffff, 0.001);
    if (!dead) hit.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pick(i));
    out.push(hit);
    return out;
  }

  private typeTag(ty: PokemonType, dead: boolean) {
    const tt = text(this, 0, 0, typeLabel(ty).toUpperCase(), 10, '#ffffff').setOrigin(0.5);
    const w = Math.max(56, Math.ceil(tt.width) + 12);
    const r = this.add.rectangle(0, 0, w, lang() === 'en' ? 18 : 16, TYPE_COLOR[ty]).setStrokeStyle(2, 0x0b0f1e);
    if (dead) {
      r.setAlpha(0.4);
      tt.setAlpha(0.6);
    }
    return { r, t: tt, w };
  }
}
