import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { Board } from '../Board';

export class MainScene extends Phaser.Scene {
  public board!: Board;
  private bgImage!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    this.load.image('arena_background', '/arena_background.jpg');
  }

  create() {
    const { width, height } = this.scale;

    // 1. High Resolution Warcraft Floating Bastion Arena Artwork
    if (this.textures.exists('arena_background')) {
      this.bgImage = this.add.image(width / 2, height / 2, 'arena_background');
      this.bgImage.setOrigin(0.5);
      this.updateBackgroundScale(width, height);
    } else {
      // Fallback dark gradient if loading
      const g = this.add.graphics();
      g.fillGradientStyle(0x1e2f47, 0x223755, 0x0a0e17, 0x070a10, 1);
      g.fillRect(0, 0, width, height);
    }

    // 2. Subtle Vignette overlay to frame the central battlefield
    const vignette = this.add.graphics();
    vignette.fillStyle(0x05070d, 0.28);
    vignette.fillRect(0, 0, width, height);
    vignette.setDepth(1);

    // 3. Tactical 2.5D Board & Bench with perspective alignment
    this.board = new Board(this);

    // Window resize handler
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.updateBackgroundScale(gameSize.width, gameSize.height);
    });

    // Notify React
    EventBus.emit('current-scene-ready', this);
    EventBus.emit('board-ready', this.board);
  }

  private updateBackgroundScale(w: number, h: number) {
    if (!this.bgImage) return;
    this.bgImage.setPosition(w / 2, h / 2);
    const scaleX = w / this.bgImage.width;
    const scaleY = h / this.bgImage.height;
    const coverScale = Math.max(scaleX, scaleY);
    this.bgImage.setScale(coverScale);
  }
}
