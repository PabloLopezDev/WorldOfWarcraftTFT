import Phaser from 'phaser';
import type { BoardTileInfo, TileZone } from '../types';
import { EventBus } from './EventBus';

export interface TacticalTile {
  col: number;
  row: number;
  zone: TileZone;
  isBench: boolean;
  benchIndex?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  occupiedBy: string | null;
  interactiveZone: Phaser.GameObjects.Zone;
}

export class Board {
  public static readonly COLS = 8;
  public static readonly ROWS = 8; // 0..3: Enemy (Red), 4..7: Player (Blue)
  public static readonly BENCH_SLOTS = 8;

  // Board geometry on 1920x1080 canvas
  public static readonly TILE_W = 100;
  public static readonly TILE_H = 62;
  public static readonly TILE_GAP = 6;

  private scene: Phaser.Scene;
  private tiles: Map<string, TacticalTile> = new Map();
  private benchTiles: TacticalTile[] = [];

  // Graphics layers for ultra-smooth 60fps performance
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private highlightGraphics!: Phaser.GameObjects.Graphics;

  private activeHoverKey: string | null = null;
  private selectedKey: string | null = null;

  // Origins
  private startX = 0;
  private startY = 0;
  private benchStartX = 0;
  private benchStartY = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.calculateLayout();
    this.createStaticLayers();
    this.createTacticalTiles();
  }

  private calculateLayout() {
    const totalW = Board.COLS * (Board.TILE_W + Board.TILE_GAP) - Board.TILE_GAP;
    this.startX = (1920 - totalW) / 2 + Board.TILE_W / 2;
    this.startY = 140; // Fits perfectly below top HUD

    // Bench positioned right under the board
    const benchTotalW = Board.BENCH_SLOTS * (Board.TILE_W + Board.TILE_GAP) - Board.TILE_GAP;
    this.benchStartX = (1920 - benchTotalW) / 2 + Board.TILE_W / 2;
    this.benchStartY = this.startY + Board.ROWS * (Board.TILE_H + Board.TILE_GAP) + 36;
  }

  private createStaticLayers() {
    this.boardGraphics = this.scene.add.graphics();
    this.highlightGraphics = this.scene.add.graphics();
    this.highlightGraphics.setDepth(5);

    const totalW = Board.COLS * (Board.TILE_W + Board.TILE_GAP) - Board.TILE_GAP;
    const totalH = Board.ROWS * (Board.TILE_H + Board.TILE_GAP) - Board.TILE_GAP;
    const centerX = 1920 / 2;
    const centerY = this.startY + totalH / 2 - Board.TILE_H / 2;

    const g = this.boardGraphics;

    // 1. Bastion Stone Platform Base
    g.fillStyle(0x0c0f17, 0.95);
    g.fillRoundedRect(centerX - totalW / 2 - 24, centerY - totalH / 2 - 20, totalW + 48, totalH + 40, 12);
    g.lineStyle(3, 0x4a3a22, 0.9);
    g.strokeRoundedRect(centerX - totalW / 2 - 24, centerY - totalH / 2 - 20, totalW + 48, totalH + 40, 12);

    // Subtle inner gold rim
    g.lineStyle(1, 0x9e7f3b, 0.4);
    g.strokeRoundedRect(centerX - totalW / 2 - 21, centerY - totalH / 2 - 17, totalW + 42, totalH + 34, 10);

    // 2. Render all 64 Tiles in single batch
    for (let row = 0; row < Board.ROWS; row++) {
      const isPlayer = row >= 4;
      const y = this.startY + row * (Board.TILE_H + Board.TILE_GAP);

      for (let col = 0; col < Board.COLS; col++) {
        const x = this.startX + col * (Board.TILE_W + Board.TILE_GAP);

        if (!isPlayer) {
          // ENEMY RED SLATE TILE
          g.fillStyle(0x281216, 0.88);
          g.fillRoundedRect(x - Board.TILE_W / 2, y - Board.TILE_H / 2, Board.TILE_W, Board.TILE_H, 6);
          g.lineStyle(1.5, 0x5a232b, 0.7);
          g.strokeRoundedRect(x - Board.TILE_W / 2, y - Board.TILE_H / 2, Board.TILE_W, Board.TILE_H, 6);
          // Red stone texture accents
          g.lineStyle(1, 0x3d171d, 0.5);
          g.strokeRect(x - Board.TILE_W / 2 + 3, y - Board.TILE_H / 2 + 3, Board.TILE_W - 6, Board.TILE_H - 6);
        } else {
          // PLAYER BLUE SLATE TILE
          g.fillStyle(0x111c2e, 0.88);
          g.fillRoundedRect(x - Board.TILE_W / 2, y - Board.TILE_H / 2, Board.TILE_W, Board.TILE_H, 6);
          g.lineStyle(1.5, 0x243e69, 0.7);
          g.strokeRoundedRect(x - Board.TILE_W / 2, y - Board.TILE_H / 2, Board.TILE_W, Board.TILE_H, 6);
          // Blue stone texture accents
          g.lineStyle(1, 0x182a47, 0.5);
          g.strokeRect(x - Board.TILE_W / 2 + 3, y - Board.TILE_H / 2 + 3, Board.TILE_W - 6, Board.TILE_H - 6);
        }
      }
    }

    // 3. Central Divide & Alliance Crest Watermark
    const dividerY = this.startY + 4 * (Board.TILE_H + Board.TILE_GAP) - Board.TILE_GAP / 2 - Board.TILE_H / 2;

    // Glowing border divider
    g.lineStyle(3, 0xdfba73, 0.75);
    g.lineBetween(centerX - totalW / 2, dividerY, centerX + totalW / 2, dividerY);

    // Center Alliance Lion Shield watermark on the floor
    this.createAllianceCrestWatermark(centerX, dividerY);

    // 4. Bench Stone Frame (Banco)
    const benchW = Board.BENCH_SLOTS * (Board.TILE_W + Board.TILE_GAP) - Board.TILE_GAP;
    const benchCenterY = this.benchStartY;

    g.fillStyle(0x0c0f17, 0.92);
    g.fillRoundedRect(centerX - benchW / 2 - 20, benchCenterY - Board.TILE_H / 2 - 18, benchW + 40, Board.TILE_H + 34, 10);
    g.lineStyle(2, 0x3d301c, 0.85);
    g.strokeRoundedRect(centerX - benchW / 2 - 20, benchCenterY - Board.TILE_H / 2 - 18, benchW + 40, Board.TILE_H + 34, 10);

    // Bench Slots
    for (let i = 0; i < Board.BENCH_SLOTS; i++) {
      const bx = this.benchStartX + i * (Board.TILE_W + Board.TILE_GAP);
      g.fillStyle(0x131920, 0.9);
      g.fillRoundedRect(bx - Board.TILE_W / 2, benchCenterY - Board.TILE_H / 2, Board.TILE_W, Board.TILE_H, 6);
      g.lineStyle(1.5, 0x2c3b4a, 0.65);
      g.strokeRoundedRect(bx - Board.TILE_W / 2, benchCenterY - Board.TILE_H / 2, Board.TILE_W, Board.TILE_H, 6);
    }

    // Bench Header Text
    this.scene.add.text(centerX - benchW / 2 - 8, benchCenterY - Board.TILE_H / 2 - 12, 'Banco (0/8)', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '13px',
      color: '#dfba73',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
  }

  private createAllianceCrestWatermark(centerX: number, centerY: number) {
    const watermark = this.scene.add.graphics();
    watermark.setDepth(1);
    watermark.setAlpha(0.28);

    // Draw stylized Lion Shield emblem in center
    watermark.lineStyle(3, 0x60a5fa, 0.8);
    watermark.fillStyle(0x1e3a8a, 0.2);

    // Shield outline
    watermark.beginPath();
    watermark.moveTo(centerX - 45, centerY - 45);
    watermark.lineTo(centerX + 45, centerY - 45);
    watermark.lineTo(centerX + 45, centerY);
    watermark.lineTo(centerX, centerY + 50);
    watermark.lineTo(centerX - 45, centerY);
    watermark.closePath();
    watermark.fillPath();
    watermark.strokePath();

    // Inner lion silhouette / sword runes
    watermark.lineStyle(2, 0x93c5fd, 0.7);
    watermark.strokeCircle(centerX, centerY - 10, 18);
    watermark.lineBetween(centerX, centerY - 32, centerX, centerY + 32);
    watermark.lineBetween(centerX - 18, centerY - 15, centerX + 18, centerY - 15);
  }

  private createTacticalTiles() {
    // 64 Board tiles using lightweight hit Zones (zero DOM/Tween lag!)
    for (let row = 0; row < Board.ROWS; row++) {
      const isPlayer = row >= 4;
      const zoneType: TileZone = isPlayer ? 'PLAYER' : 'ENEMY';
      const y = this.startY + row * (Board.TILE_H + Board.TILE_GAP);

      for (let col = 0; col < Board.COLS; col++) {
        const x = this.startX + col * (Board.TILE_W + Board.TILE_GAP);
        const zone = this.scene.add.zone(x, y, Board.TILE_W, Board.TILE_H);
        zone.setRectangleDropZone(Board.TILE_W, Board.TILE_H);
        zone.setInteractive({ useHandCursor: true });
        zone.setDepth(6);

        const key = `${col},${row}`;
        const tile: TacticalTile = {
          col,
          row,
          zone: zoneType,
          isBench: false,
          x,
          y,
          width: Board.TILE_W,
          height: Board.TILE_H,
          occupiedBy: null,
          interactiveZone: zone,
        };

        zone.on('pointerover', () => this.onTileOver(key, tile));
        zone.on('pointerout', () => this.onTileOut(key));
        zone.on('pointerdown', () => this.onTileClick(key, tile));

        this.tiles.set(key, tile);
      }
    }

    // 8 Bench tiles
    for (let i = 0; i < Board.BENCH_SLOTS; i++) {
      const x = this.benchStartX + i * (Board.TILE_W + Board.TILE_GAP);
      const y = this.benchStartY;
      const zone = this.scene.add.zone(x, y, Board.TILE_W, Board.TILE_H);
      zone.setRectangleDropZone(Board.TILE_W, Board.TILE_H);
      zone.setInteractive({ useHandCursor: true });
      zone.setDepth(6);

      const key = `bench_${i}`;
      const tile: TacticalTile = {
        col: i,
        row: -1,
        zone: 'BENCH',
        isBench: true,
        benchIndex: i,
        x,
        y,
        width: Board.TILE_W,
        height: Board.TILE_H,
        occupiedBy: null,
        interactiveZone: zone,
      };

      zone.on('pointerover', () => this.onTileOver(key, tile));
      zone.on('pointerout', () => this.onTileOut(key));
      zone.on('pointerdown', () => this.onTileClick(key, tile));

      this.benchTiles.push(tile);
    }
  }

  private onTileOver(key: string, tile: TacticalTile) {
    this.activeHoverKey = key;
    this.redrawHighlights();

    const info: BoardTileInfo = {
      col: tile.col,
      row: tile.row,
      zone: tile.zone,
      isBench: tile.isBench,
      benchIndex: tile.benchIndex,
      isOccupied: tile.occupiedBy !== null,
      unitId: tile.occupiedBy,
    };
    EventBus.emit('tile-hover', info);
  }

  private onTileOut(key: string) {
    if (this.activeHoverKey === key) {
      this.activeHoverKey = null;
      this.redrawHighlights();
      EventBus.emit('tile-out');
    }
  }

  private onTileClick(key: string, tile: TacticalTile) {
    this.selectedKey = key;
    this.redrawHighlights();

    const info: BoardTileInfo = {
      col: tile.col,
      row: tile.row,
      zone: tile.zone,
      isBench: tile.isBench,
      benchIndex: tile.benchIndex,
      isOccupied: tile.occupiedBy !== null,
      unitId: tile.occupiedBy,
    };
    EventBus.emit('tile-selected', info);
  }

  private redrawHighlights() {
    const hg = this.highlightGraphics;
    hg.clear();

    // Draw Selected Tile
    if (this.selectedKey) {
      const tile = this.getTileByKey(this.selectedKey);
      if (tile) {
        const color = tile.zone === 'ENEMY' ? 0xf87171 : 0x60a5fa;
        hg.lineStyle(3, color, 1);
        hg.strokeRoundedRect(tile.x - tile.width / 2, tile.y - tile.height / 2, tile.width, tile.height, 6);
      }
    }

    // Draw Hovered Tile
    if (this.activeHoverKey && this.activeHoverKey !== this.selectedKey) {
      const tile = this.getTileByKey(this.activeHoverKey);
      if (tile) {
        const color = tile.zone === 'ENEMY' ? 0xef4444 : tile.zone === 'BENCH' ? 0x4ade80 : 0xdfba73;
        hg.lineStyle(2.5, color, 0.95);
        hg.strokeRoundedRect(tile.x - tile.width / 2, tile.y - tile.height / 2, tile.width, tile.height, 6);
        hg.fillStyle(color, 0.12);
        hg.fillRoundedRect(tile.x - tile.width / 2, tile.y - tile.height / 2, tile.width, tile.height, 6);
      }
    }
  }

  private getTileByKey(key: string): TacticalTile | null {
    if (key.startsWith('bench_')) {
      const idx = parseInt(key.replace('bench_', ''), 10);
      return this.benchTiles[idx] || null;
    }
    return this.tiles.get(key) || null;
  }

  // --- Public APIs for Units & Drag & Drop ---

  public getTile(col: number, row: number): TacticalTile | null {
    return this.tiles.get(`${col},${row}`) || null;
  }

  public getBenchTile(index: number): TacticalTile | null {
    return this.benchTiles[index] || null;
  }

  public getWorldPosition(col: number, row: number): { x: number; y: number } {
    const tile = this.getTile(col, row);
    return tile ? { x: tile.x, y: tile.y } : { x: 0, y: 0 };
  }

  public getBenchWorldPosition(index: number): { x: number; y: number } {
    const tile = this.getBenchTile(index);
    return tile ? { x: tile.x, y: tile.y } : { x: 0, y: 0 };
  }

  public isPlayerZone(row: number): boolean {
    return row >= 4 && row < Board.ROWS;
  }

  public isEnemyZone(row: number): boolean {
    return row >= 0 && row < 4;
  }

  public setOccupied(col: number, row: number, unitId: string | null) {
    const tile = this.getTile(col, row);
    if (tile) tile.occupiedBy = unitId;
  }

  public setBenchOccupied(index: number, unitId: string | null) {
    const tile = this.getBenchTile(index);
    if (tile) tile.occupiedBy = unitId;
  }

  public isOccupied(col: number, row: number): boolean {
    const tile = this.getTile(col, row);
    return tile ? tile.occupiedBy !== null : true;
  }
}
