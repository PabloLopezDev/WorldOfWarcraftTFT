import Phaser from 'phaser';

// Used to emit and listen to events between React components and Phaser scenes
export const EventBus = new Phaser.Events.EventEmitter();
