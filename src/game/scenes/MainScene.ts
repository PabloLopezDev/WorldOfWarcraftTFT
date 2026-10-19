import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { Board } from '../Board';

export class MainScene extends Phaser.Scene {
  public board!: Board;

  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    const { width, height } = this.scale;

    // 1. Lush Fantasy Floating Citadel Environment
    this.createEnvironment(width, height);

    // 2. Pillars, Torches and Banners
    this.createArenaArchitecture(width);

    // 3. Tactical 2.5D Board & Bench
    this.board = new Board(this);

    // Listen to window resize to adjust responsive layout
    this.scale.on('resize', () => {
      // Clean reload on major resize if needed
    });

    // Notify React
    EventBus.emit('current-scene-ready', this);
    EventBus.emit('board-ready', this.board);
  }

  private createEnvironment(width: number, height: number) {
    const g = this.add.graphics();

    // 1. Sky Gradient: Soft mystical dusk (deep twilight blue to warm horizon)
    g.fillGradientStyle(0x1e2f47, 0x223755, 0x0a0e17, 0x070a10, 1);
    g.fillRect(0, 0, width, height);

    // 2. Soft Ambient Sky Clouds (Mist drifting)
    g.fillStyle(0x334a6d, 0.15);
    g.fillCircle(width * 0.2, 140, 220);
    g.fillCircle(width * 0.8, 120, 250);
    g.fillCircle(width * 0.5, 80, 180);

    // 3. Distant Floating Islands (Dalaran / Nagrand floating rocks)
    // Left distant floating island with green moss
    this.createFloatingIsland(g, 100, 220, 180, 120, 0x182433, 0x2e4a2a);
    // Right distant floating island with stone spires
    this.createFloatingIsland(g, width - 110, 240, 200, 130, 0x16202e, 0x243e22);

    // 4. Midground Citadel Walls (Stone Bastion Terrace Base)
    g.fillStyle(0x0a0e16, 0.98);
    g.fillRoundedRect(width * 0.1, 80, width * 0.8, height - 160, 24);
    g.lineStyle(2, 0x2c3b4f, 0.5);
    g.strokeRoundedRect(width * 0.1, 80, width * 0.8, height - 160, 24);

    // Lush Green Foliage & Vines along the fortress ramparts (matching reference image)
    this.createFoliageAccents(g, width);
  }

  private createFloatingIsland(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    w: number,
    h: number,
    stoneColor: number,
    grassColor: number
  ) {
    // Rocky bottom tapering downward
    g.fillStyle(stoneColor, 0.9);
    g.beginPath();
    g.moveTo(cx - w / 2, cy);
    g.lineTo(cx - w * 0.3, cy + h * 0.8);
    g.lineTo(cx, cy + h);
    g.lineTo(cx + w * 0.25, cy + h * 0.7);
    g.lineTo(cx + w / 2, cy);
    g.closePath();
    g.fillPath();

    // Top lush green grass layer
    g.fillStyle(grassColor, 0.95);
    g.beginPath();
    g.moveTo(cx - w / 2 - 8, cy);
    g.lineTo(cx - w * 0.2, cy - 14);
    g.lineTo(cx + w * 0.2, cy - 12);
    g.lineTo(cx + w / 2 + 8, cy);
    g.lineTo(cx + w * 0.3, cy + 8);
    g.lineTo(cx - w * 0.3, cy + 10);
    g.closePath();
    g.fillPath();
  }

  private createFoliageAccents(g: Phaser.GameObjects.Graphics, width: number) {
    // Left terrace ivy & pine branches
    g.fillStyle(0x1e3a1e, 0.8);
    g.fillCircle(width * 0.12, 180, 24);
    g.fillCircle(width * 0.11, 220, 28);
    g.fillCircle(width * 0.13, 270, 32);

    g.fillStyle(0x2d5a2d, 0.85);
    g.fillCircle(width * 0.12, 175, 16);
    g.fillCircle(width * 0.11, 215, 20);
    g.fillCircle(width * 0.13, 265, 22);

    // Right terrace ivy & foliage
    g.fillStyle(0x1e3a1e, 0.8);
    g.fillCircle(width * 0.88, 190, 26);
    g.fillCircle(width * 0.89, 235, 30);
    g.fillCircle(width * 0.87, 280, 34);

    g.fillStyle(0x2d5a2d, 0.85);
    g.fillCircle(width * 0.88, 185, 18);
    g.fillCircle(width * 0.89, 230, 22);
    g.fillCircle(width * 0.87, 275, 24);
  }

  private createArenaArchitecture(width: number) {
    const centerX = width / 2;
    const arenaW = 900;
    const leftColX = centerX - arenaW / 2 - 35;
    const rightColX = centerX + arenaW / 2 + 35;
    const pillarY = 220;
    const pillarH = 360;

    const g = this.add.graphics();

    // 1. Carved Bastion Columns
    // Left Pillar
    g.fillStyle(0x141b25, 0.98);
    g.fillRoundedRect(leftColX - 24, pillarY, 48, pillarH, 8);
    g.lineStyle(2, 0x4a3a22, 0.9);
    g.strokeRoundedRect(leftColX - 24, pillarY, 48, pillarH, 8);

    // Right Pillar
    g.fillStyle(0x141b25, 0.98);
    g.fillRoundedRect(rightColX - 24, pillarY, 48, pillarH, 8);
    g.lineStyle(2, 0x4a3a22, 0.9);
    g.strokeRoundedRect(rightColX - 24, pillarY, 48, pillarH, 8);

    // 2. Hanging Alliance Banners (with golden lion emblem)
    this.createAllianceBanner(leftColX, pillarY + 50);
    this.createAllianceBanner(rightColX, pillarY + 50);

    // 3. Fire Braziers (Burning torches with flickering light)
    this.createFireBrazier(leftColX, pillarY - 14);
    this.createFireBrazier(rightColX, pillarY - 14);
  }

  private createAllianceBanner(x: number, y: number) {
    const b = this.add.graphics();
    const w = 34;
    const h = 105;

    // Blue velvet banner cloth
    b.fillStyle(0x163763, 0.95);
    b.beginPath();
    b.moveTo(x - w / 2, y);
    b.lineTo(x + w / 2, y);
    b.lineTo(x + w / 2, y + h - 14);
    b.lineTo(x, y + h);
    b.lineTo(x - w / 2, y + h - 14);
    b.closePath();
    b.fillPath();

    // Gold braided fringe border
    b.lineStyle(2, 0xdfba73, 0.9);
    b.strokePath();

    // Golden Lion Medallion
    b.fillStyle(0xdfba73, 0.95);
    b.fillCircle(x, y + 28, 8);
    b.lineStyle(1.5, 0x78561f, 0.8);
    b.strokeCircle(x, y + 28, 8);
  }

  private createFireBrazier(x: number, y: number) {
    const g = this.add.graphics();

    // Stone / Iron Cauldron
    g.fillStyle(0x2a1c12, 1);
    g.fillRoundedRect(x - 20, y, 40, 16, 5);
    g.lineStyle(2, 0xdfba73, 0.95);
    g.strokeRoundedRect(x - 20, y, 40, 16, 5);

    // Burning glowing coals
    g.fillStyle(0xd9480f, 1);
    g.fillCircle(x, y + 3, 11);

    // Dynamic fire light aura illuminating surrounding stone
    const fireAura = this.add.circle(x, y - 10, 36, 0xff922b, 0.22);
    this.tweens.add({
      targets: fireAura,
      alpha: 0.08,
      scale: 1.35,
      duration: 700 + Math.random() * 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Flickering Flame Core
    const flameCore = this.add.circle(x, y - 6, 9, 0xffd43b, 0.9);
    this.tweens.add({
      targets: flameCore,
      scaleX: 0.75,
      scaleY: 1.25,
      y: y - 10,
      duration: 350 + Math.random() * 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
