import Phaser from 'phaser';
import { POKEMON } from '../data/pokemon';
import { pixelFont } from '../ui/style';
import { t } from '../i18n';
import { SPRITE_SHEETS } from '../data/spriteSheets';
import { assetStatus, BOOT_ANIMS, finalizeSpecies, queueSheets, retryFailedSheets } from '../systems/spriteLoader';
import { generateFxTextures, generateWorldTextures } from '../art/textures';
import { generateGrassTextures } from '../art/grassArt';
import { generateIceTextures } from '../art/iceArt';
import { generateTypeTextures } from '../art/typeArt';
import { generateMoveTextures, generateTownTextures, generateTrainerTextures } from '../art/townArt';
import { generateIcons } from '../art/icons';

export { assetStatus };

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2 - 200, height / 2, 0, 16, 0xf08030).setOrigin(0, 0.5);
    this.add.rectangle(width / 2, height / 2, 404, 20).setStrokeStyle(2, 0xffffff);
    const f = pixelFont(24);
    this.add.text(width / 2, height / 2 - 40, t('common.loading'), { fontFamily: f.family, fontSize: `${f.px}px`, color: '#ffffff' }).setOrigin(0.5);
    this.load.on('progress', (v: number) => bar.setSize(400 * v, 16));

    // chỉ nạp sheet Đi + Đứng; sheet hành động nạp khi vào trận (systems/spriteLoader)
    queueSheets(this, Object.keys(SPRITE_SHEETS), BOOT_ANIMS);
  }

  create() {
    generateWorldTextures(this);
    generateFxTextures(this);
    generateMoveTextures(this);
    generateGrassTextures(this);
    generateIceTextures(this);
    generateTypeTextures(this);
    generateTownTextures(this);
    generateTrainerTextures(this);
    generateIcons(this);

    assetStatus.failed = [];
    finalizeSpecies(this, Object.keys(POKEMON));
    if (assetStatus.failed.length) {
      console.warn('[Pokeke] Dùng hình dự phòng cho:', assetStatus.failed.join(', '));
    }
    // sprite lỗi: thử tải lại vài lần trước khi vào menu (chỉ còn lỗi thật thì mới dùng hình dự phòng)
    retryFailedSheets(this, () => this.scene.start('Menu'));
  }

}
