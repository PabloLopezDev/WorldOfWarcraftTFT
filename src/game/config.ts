import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

export const createGameConfig = (parent: HTMLElement): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  width: 800,
  height: 520,
  parent,
  backgroundColor: '#0a0d14',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [MainScene],
});
