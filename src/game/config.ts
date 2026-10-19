import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

export const createGameConfig = (parent: HTMLElement): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  backgroundColor: '#070a10',
  render: {
    antialias: true,
    roundPixels: true,
    powerPreference: 'high-performance',
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
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
