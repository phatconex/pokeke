// Bảng Cài đặt dạng thẻ (Sound / Graphics / Controls / Language / Account / About) – dùng ở menu chính.
import Phaser from 'phaser';
import { fmtNum, lang, setLang, t } from '../i18n';
import { cloudEnabled, currentUser, signOut } from '../systems/cloud';
import { playSfx } from '../systems/sfx';
import { AIM_MODES, cycleAimMode, getSettings, setSetting, toggleSetting } from '../systems/settings';
import { COLORS, icon, pixelPanel, text } from './style';

export type SettingsTab = 'sound' | 'graphics' | 'controls' | 'language' | 'account' | 'about';
const TABS: SettingsTab[] = ['sound', 'graphics', 'controls', 'language', 'account', 'about'];

export interface SettingsPanelOpts {
  onClose: () => void;
  /** đổi ngôn ngữ / đăng xuất → màn cần vẽ lại toàn bộ */
  onRebuild: (tab: SettingsTab) => void;
  /** mở màn Tài khoản */
  onAccount?: () => void;
  tab?: SettingsTab;
}

/** nút bo góc kiểu pixel (giống mẫu: nền xanh, viền sáng, chữ trắng) */
function pillButton(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void, active = false) {
  const g = scene.add.graphics();
  const draw = (hover: boolean) => {
    g.clear();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 2, y + 4, w, h, 10);
    g.fillStyle(active ? 0x3a5ab8 : hover ? 0x34479a : 0x2a3a82, 1).fillRoundedRect(x, y, w, h, 10);
    g.lineStyle(3, active ? 0xffd34a : 0x8a9ad8, 1).strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 9);
  };
  draw(false);
  const tx = text(scene, x + w / 2, y + h / 2, label, 12, '#ffffff').setOrigin(0.5);
  const hit = scene.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
  hit.on('pointerover', () => draw(true));
  hit.on('pointerout', () => draw(false));
  hit.on('pointerdown', onClick);
  return [g, tx, hit] as Phaser.GameObjects.GameObject[];
}

/** thanh trượt 0..1 */
function slider(scene: Phaser.Scene, x: number, y: number, w: number, value: number, onChange: (v: number) => void, onDone: () => void) {
  const g = scene.add.graphics();
  const knob = scene.add.rectangle(0, y, 22, 22, 0xffd34a).setStrokeStyle(3, 0x1a1020).setInteractive({ useHandCursor: true, draggable: true });
  const pct = text(scene, x + w + 18, y, '', 12, '#ffffff').setOrigin(0, 0.5);
  const set = (v: number) => {
    v = Phaser.Math.Clamp(v, 0, 1);
    g.clear();
    g.fillStyle(0x0b0f1e, 1).fillRoundedRect(x, y - 6, w, 12, 6);
    g.fillStyle(0xffd34a, 0.55).fillRoundedRect(x, y - 6, Math.max(12, w * v), 12, 6);
    knob.x = x + w * v;
    pct.setText(`${Math.round(v * 100)}%`);
    onChange(v);
  };
  set(value);
  knob.on('drag', (_p: Phaser.Input.Pointer, dx: number) => set((dx - x) / w));
  knob.on('dragend', onDone);
  const track = scene.add.rectangle(x + w / 2, y, w, 26, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
  track.on('pointerdown', (p: Phaser.Input.Pointer) => {
    set((p.x - x) / w);
    onDone();
  });
  return [g, track, knob, pct] as Phaser.GameObjects.GameObject[];
}

export function openSettingsPanel(scene: Phaser.Scene, opts: SettingsPanelOpts): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const root = scene.add.container(0, 0).setDepth(1000);
  let tab: SettingsTab = opts.tab ?? 'sound';

  const build = () => {
    root.removeAll(true);
    const s = getSettings();
    const px = width / 2 - 430;
    const py = height / 2 - 240;
    const W = 860;
    const H = 480;
    root.add(scene.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive());
    root.add(pixelPanel(scene, px, py, W, H, { fill: 0x2a3a82, border: 0xf4f1e6 }));
    root.add(text(scene, px + 40, py + 34, t('settings.title'), 33, '#ffffff'));
    root.add(pillButton(scene, px + W - 150, py + 30, 110, 46, t('settings.close'), () => opts.onClose()));

    // thẻ
    let tx = px + 40;
    for (const tb of TABS) {
      const label = t(`settings.tab.${tb}`);
      // đo độ rộng chữ thật để thẻ không tràn khung
      const probe = text(scene, 0, 0, label, 12, '#ffffff');
      const w = Math.max(92, Math.ceil(probe.width) + 30);
      probe.destroy();
      root.add(pillButton(scene, tx, py + 98, w, 44, label, () => {
        tab = tb;
        playSfx('talk');
        build();
      }, tab === tb));
      tx += w + 10;
    }
    root.add(text(scene, px + 40, py + 176, t(`settings.tab.${tab}`), 22, COLORS.gold));
    const cx = px + 160;
    const cy = py + 236;
    const row = (label: string, ic: string | null, y: number) => {
      if (ic) root.add(icon(scene, cx, y, ic, 2));
      root.add(text(scene, cx + 26, y, label, 12, '#ffffff').setOrigin(0, 0.5));
    };

    if (tab === 'sound') {
      row(t('settings.music'), 'sound', cy);
      root.add(slider(scene, cx + 200, cy, 340, s.musicVolume, (v) => setSetting('musicVolume', v), () => playSfx('select')));
      row(t('settings.effects'), 'sound', cy + 60);
      root.add(slider(scene, cx + 200, cy + 60, 340, s.sfxVolume, (v) => setSetting('sfxVolume', v), () => playSfx('pickup')));
      root.add(pillButton(scene, cx, cy + 110, 200, 48, s.muted ? t('settings.unmuteAll') : t('settings.muteAll'), () => {
        toggleSetting('muted');
        playSfx('select');
        opts.onRebuild(tab);
        build();
      }, s.muted));
    } else if (tab === 'graphics') {
      row(t('settings.shake'), null, cy);
      root.add(pillButton(scene, cx + 260, cy - 22, 220, 44, s.reducedShake ? t('settings.shakeReduced') : t('settings.shakeNormal'), () => {
        toggleSetting('reducedShake');
        playSfx('select');
        build();
      }));
      row(t('settings.fullscreen'), null, cy + 64);
      root.add(pillButton(scene, cx + 260, cy + 42, 220, 44, scene.scale.isFullscreen ? t('settings.on') : t('settings.off'), () => {
        scene.scale.toggleFullscreen();
        scene.time.delayedCall(150, build);
      }));
    } else if (tab === 'controls') {
      row(t('settings.aim'), null, cy - 6);
      root.add(pillButton(scene, cx + 260, cy - 28, 220, 44, t(`settings.aim.${s.aimMode}`), () => {
        cycleAimMode();
        playSfx('select');
        build();
      }));
      void AIM_MODES;
      const keys: [string, string][] = [
        ['WASD / ←↑→↓', t('settings.key.move')], ['J K L U', t('settings.key.skills')], ['I', t('settings.key.ult')],
        ['Space', t('settings.key.dash')], ['1 2 3', t('settings.key.switch')], ['F', t('settings.key.potion')],
        ['E / Q', t('settings.key.ball')], ['Esc', t('settings.key.pause')],
      ];
      keys.forEach(([k, d], i) => {
        const x = cx - 40 + (i % 2) * 380;
        const y = cy + 50 + Math.floor(i / 2) * 32;
        root.add(text(scene, x, y, k, 12, COLORS.gold).setOrigin(0, 0.5));
        root.add(text(scene, x + 140, y, d, 12, '#ffffff').setOrigin(0, 0.5));
      });
    } else if (tab === 'language') {
      row(t('settings.language'), 'book', cy);
      (['en', 'vi'] as const).forEach((l, i) => {
        root.add(pillButton(scene, cx + 260 + i * 180, cy - 24, 160, 48, l === 'en' ? 'English' : 'Tiếng Việt', () => {
          if (lang() === l) return;
          setLang(l);
          playSfx('select');
          opts.onRebuild(tab);
        }, lang() === l));
      });
      root.add(text(scene, cx, cy + 60, t('settings.languageNote'), 11, '#c8d0f0').setOrigin(0, 0.5));
    } else if (tab === 'account') {
      const u = currentUser();
      if (!cloudEnabled) {
        row(t('settings.accountOff'), 'lock', cy);
      } else if (!u) {
        row(t('settings.guest'), 'people', cy);
        root.add(pillButton(scene, cx, cy + 40, 260, 48, t('settings.signIn'), () => opts.onAccount?.()));
      } else {
        root.add(scene.add.sprite(cx + 20, cy + 26, `trainer-${u.avatar}`, 0).setScale(3).setOrigin(0.5, 1));
        root.add(text(scene, cx + 60, cy - 12, u.trainerName, 22, COLORS.gold));
        root.add(text(scene, cx + 60, cy + 18, u.email, 11, '#c8d0f0'));
        root.add(pillButton(scene, cx, cy + 64, 240, 48, t('settings.manageAccount'), () => opts.onAccount?.()));
        root.add(pillButton(scene, cx + 260, cy + 64, 180, 48, t('settings.signOut'), () => {
          void signOut().then(() => {
            playSfx('select');
            opts.onRebuild(tab);
          });
        }));
      }
    } else {
      root.add(text(scene, cx, cy - 10, 'Pokeke · v0.6', 22, '#ffffff').setOrigin(0, 0.5));
      root.add(text(scene, cx, cy + 30, t('settings.about1'), 11, '#c8d0f0').setOrigin(0, 0.5));
      root.add(text(scene, cx, cy + 56, t('settings.about2'), 11, '#c8d0f0').setOrigin(0, 0.5));
      root.add(text(scene, cx, cy + 82, t('settings.about3', { n: fmtNum(139) }), 11, '#c8d0f0').setOrigin(0, 0.5));
    }
  };
  build();
  return root;
}
