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

    // 1. Sky & Floating Island Environment
    this.createEnvironment(width, height);

    // 2. Pillars, Banners and Braziers (Left & Right)
    this.createArenaDecorations(width);

    // 3. Tactical Board (8x8 + Bench)
    this.board = new Board(this);

    // Notify React
    EventBus.emit('current-scene-ready', this);
    EventBus.emit('board-ready', this.board);
  }

  private createEnvironment(width: number, height: number) {
    const g = this.add.graphics();

    // Sky gradient (dusk fantasy clouds)
    g.fillGradientStyle(0x1a2638, 0x1a2638, 0x080a10, 0x080a10, 1);
    g.fillRect(0, 0, width, height);

    // Distant floating island silhouettes in the background
    g.fillStyle(0x0e141f, 0.6);
    // Far left citadel silhouette
    g.beginPath();
    g.moveTo(40, 260);
    g.lineTo(120, 200);
    g.lineTo(160, 220);
    g.lineTo(240, 280);
    g.lineTo(180, 360);
    g.lineTo(60, 340);
    g.closePath();
    g.fillPath();

    // Far right castle spire
    g.beginPath();
    g.moveTo(width - 240, 280);
    g.lineTo(width - 180, 180);
    g.lineTo(width - 160, 180);
    g.lineTo(width - 110, 270);
    g.lineTo(width - 50, 350);
    g.lineTo(width - 220, 360);
    g.closePath();
    g.fillPath();
  }

  private createArenaDecorations(width: number) {
    const g = this.add.graphics();
    const centerX = width / 2;
    const boardTotalW = Board.COLS * (Board.TILE_W + Board.TILE_GAP) - Board.TILE_GAP;

    const leftColX = centerX - boardTotalW / 2 - 70;
    const rightColX = centerX + boardTotalW / 2 + 70;

    // Stone Pillars Left & Right
    const pillarY = 260;
    const pillarH = 340;

    // Left Pillar
    g.fillStyle(0x151b24, 0.95);
    g.fillRoundedRect(leftColX - 25, pillarY, 50, pillarH, 8);
    g.lineStyle(2, 0x3b311e, 0.85);
    g.strokeRoundedRect(leftColX - 25, pillarY, 50, pillarH, 8);

    // Right Pillar
    g.fillStyle(0x151b24, 0.95);
    g.fillRoundedRect(rightColX - 25, pillarY, 50, pillarH, 8);
    g.lineStyle(2, 0x3b311e, 0.85);
    g.strokeRoundedRect(rightColX - 25, pillarY, 50, pillarH, 8);

    // Alliance Banners (Hanging on pillars)
    this.createBanner(leftColX, pillarY + 60, true);
    this.createBanner(rightColX, pillarY + 60, false);

    // Fire Braziers / Torches atop the stone columns
    this.createBrazier(leftColX, pillarY - 10);
    this.createBrazier(rightColX, pillarY - 10);
  }

  private createBanner(x: number, y: number, _isLeft: boolean) {
    const banner = this.add.graphics();
    const bannerW = 32;
    const bannerH = 90;

    // Blue Alliance fabric
    banner.fillStyle(0x16345c, 0.9);
    banner.beginPath();
    banner.moveTo(x - bannerW / 2, y);
    banner.lineTo(x + bannerW / 2, y);
    banner.lineTo(x + bannerW / 2, y + bannerH - 12);
    banner.lineTo(x, y + bannerH);
    banner.lineTo(x - bannerW / 2, y + bannerH - 12);
    banner.closePath();
    banner.fillPath();

    // Gold trim
    banner.lineStyle(2, 0xdfba73, 0.8);
    banner.strokePath();

    // Little Lion symbol in gold
    banner.fillStyle(0xdfba73, 0.9);
    banner.fillCircle(x, y + 26, 7);
  }

  private createBrazier(x: number, y: number) {
    const g = this.add.graphics();

    // Golden / Bronze cauldron
    g.fillStyle(0x382813, 1);
    g.fillRoundedRect(x - 18, y, 36, 14, 4);
    g.lineStyle(2, 0xdfba73, 0.9);
    g.strokeRoundedRect(x - 18, y, 36, 14, 4);

    // Inner glowing coals
    g.fillStyle(0xe65100, 1);
    g.fillCircle(x, y + 2, 10);

    // Animated flame core with pulsing light
    const flameGlow = this.add.circle(x, y - 6, 14, 0xffa000, 0.45);
    this.tweens.add({
      targets: flameGlow,
      alpha: 0.15,
      scaleX: 1.3,
      scaleY: 1.4,
      y: y - 10,
      duration: 600 + Math.random() * 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const firePoint = this.add.circle(x, y - 4, 7, 0xffeb3b, 0.8);
    this.tweens.add({
      targets: firePoint,
      scale: 0.7,
      duration: 350 + Math.random() * 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
