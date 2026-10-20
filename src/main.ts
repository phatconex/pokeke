import Phaser from 'phaser';
import { GAME } from './config/balance';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { BattleScene } from './scenes/BattleScene';
import { SkillLabScene } from './scenes/SkillLabScene';
import { HudScene } from './scenes/HudScene';
import { GymIntroScene } from './scenes/GymIntroScene';
import { TutorialScene } from './scenes/TutorialScene';
import { RegionSelectScene } from './scenes/RegionSelectScene';
import { StarterSelectScene } from './scenes/StarterSelectScene';
import { StageMapScene } from './scenes/StageMapScene';
import { TeamScene } from './scenes/TeamScene';
import { EvolutionScene } from './scenes/EvolutionScene';
import { PokedexScene } from './scenes/PokedexScene';
import { PokemonCenterScene } from './scenes/PokemonCenterScene';
import { AccountScene } from './scenes/AccountScene';
import { CharacterScene } from './scenes/CharacterScene';
import { CreditsScene } from './scenes/CreditsScene';
import { initCloud } from './systems/cloud';
import { getGame } from './game/state';
import { installErrorReporting, touchWarning } from './systems/errorReport';

/** Chờ font pixel tải xong trước khi tạo chữ (tối đa 3 giây; lỗi thì dùng font dự phòng) */
async function loadFonts() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('12px PixelUI'), document.fonts.load('10px PixelUISmall'), document.fonts.load('8px PixelLogo'), document.fonts.load('11px Pixelify')]),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch {
    /* dùng font dự phòng */
  }
}

function startGame() {
  installErrorReporting();
  touchWarning();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME.width,
    height: GAME.height,
    backgroundColor: '#0d1a10',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false, gravity: { x: 0, y: 0 } },
    },
    input: { mouse: { preventDefaultWheel: false } },
    // ô nhập HTML (form đăng nhập / đăng ký) nằm đè lên canvas, co giãn theo màn hình
    dom: { createContainer: true },
    scene: [BootScene, MenuScene, RegionSelectScene, StarterSelectScene, StageMapScene, TeamScene, EvolutionScene, PokedexScene, PokemonCenterScene, AccountScene, CharacterScene, BattleScene, HudScene, GymIntroScene, SkillLabScene, TutorialScene, CreditsScene],
  });

  // Hỗ trợ kiểm thử thủ công / tự động trong chế độ development
  if (import.meta.env.DEV) {
    Object.assign(window, { __game: game, __getGame: getGame });
  }
}

// chờ font + khôi phục phiên đăng nhập (tối đa 3 giây, mất mạng vẫn vào game được)
void Promise.all([loadFonts(), Promise.race([initCloud(), new Promise((r) => setTimeout(r, 3000))])]).then(startGame);
