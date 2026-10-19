import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { Board } from '../Board';

export class MainScene extends Phaser.Scene {
  public board!: Board;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Preload stage for future unit sprites and audio
  }

  create() {
    const { width, height } = this.scale;

    // Dark fantasy arena stone background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0c0f16);

    // Subtle arena perimeter glow
    const borderDecor = this.add.graphics();
    borderDecor.lineStyle(2, 0x3d301c, 0.8);
    borderDecor.strokeRect(10, 10, width - 20, height - 20);

    // Corner decorative metal brackets
    const bracketSize = 16;
    borderDecor.lineStyle(3, 0xdfba73, 0.7);
    // Top-left
    borderDecor.moveTo(10, 10 + bracketSize);
    borderDecor.lineTo(10, 10);
    borderDecor.lineTo(10 + bracketSize, 10);
    // Top-right
    borderDecor.moveTo(width - 10 - bracketSize, 10);
    borderDecor.lineTo(width - 10, 10);
    borderDecor.lineTo(width - 10, 10 + bracketSize);
    // Bottom-left
    borderDecor.moveTo(10, height - 10 - bracketSize);
    borderDecor.lineTo(10, height - 10);
    borderDecor.lineTo(10 + bracketSize, height - 10);
    // Bottom-right
    borderDecor.moveTo(width - 10 - bracketSize, height - 10);
    borderDecor.lineTo(width - 10, height - 10);
    borderDecor.lineTo(width - 10, height - 10 - bracketSize);
    borderDecor.strokePath();

    // Create the tactical 8x8 Board + Bench
    this.board = new Board(this);

    // Notify React that Phaser scene and Board are ready
    EventBus.emit('current-scene-ready', this);
    EventBus.emit('board-ready', this.board);
  }

  update() {
    // Main loop logic
  }
}
