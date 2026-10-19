import Phaser from 'phaser';
import { EventBus } from '../EventBus';

export class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Stage 1: Basic setup and preload
  }

  create() {
    const { width, height } = this.scale;

    // Dark fantasy background gradient / rectangle
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f1118);

    // Subtle grid lines to confirm Phaser rendering correctly
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x2a354b, 0.4);
    for (let x = 0; x < width; x += 40) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 40) {
      graphics.moveTo(0, y);
      graphics.lineTo(width, y);
    }
    graphics.strokePath();

    // Title banner in Phaser
    this.add.text(width / 2, height / 2 - 40, 'WARCRAFT AUTO-BATTLER', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '28px',
      color: '#f6d87e',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 15, 'Etapa 1: Motor Phaser 3 + React Conectado', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#8ab4f8',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Glowing indicator pulse
    const circle = this.add.circle(width / 2, height / 2 + 60, 8, 0x4ade80);
    this.tweens.add({
      targets: circle,
      alpha: 0.2,
      scale: 1.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Notify React that Phaser scene is fully ready
    EventBus.emit('current-scene-ready', this);
  }

  update() {
    // Main game loop update
  }
}
