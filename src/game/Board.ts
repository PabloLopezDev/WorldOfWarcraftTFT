import Phaser from 'phaser';
import type { BoardTileInfo, TileZone } from '../types';
import { EventBus } from './EventBus';

export interface TileObject {
  col: number;
  row: number;
  zone: TileZone;
  isBench: boolean;
  benchIndex?: number;
  container: Phaser.GameObjects.Container;
  bgRect: Phaser.GameObjects.Rectangle;
  borderRect: Phaser.GameObjects.Rectangle;
  highlightGlow: Phaser.GameObjects.Graphics;
  occupiedBy: string | null;
}

export class Board {
  public static readonly COLS = 8;
  public static readonly ROWS = 8; // 0..3: Enemy, 4..7: Player
  public static readonly BENCH_SLOTS = 8;

  public static readonly TILE_WIDTH = 58;
  public static readonly TILE_HEIGHT = 54;
  public static readonly TILE_GAP = 5;

  private scene: Phaser.Scene;
  private tiles: Map<string, TileObject> = new Map();
  private benchTiles: TileObject[] = [];
  private selectedTileKey: string | null = null;

  // Board layout origin
  private startX = 0;
  private startY = 0;
  private benchStartY = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.calculateLayout();
    this.createDecorations();
    this.createGrid();
    this.createBench();
  }

  private calculateLayout() {
    const totalBoardWidth = Board.COLS * (Board.TILE_WIDTH + Board.TILE_GAP) - Board.TILE_GAP;
    this.startX = (this.scene.scale.width - totalBoardWidth) / 2 + Board.TILE_WIDTH / 2;
    this.startY = 60; // Top margin for labels
    this.benchStartY = this.startY + Board.ROWS * (Board.TILE_HEIGHT + Board.TILE_GAP) + 32;
  }

  private createDecorations() {
    const { width } = this.scene.scale;
    const totalBoardWidth = Board.COLS * (Board.TILE_WIDTH + Board.TILE_GAP) - Board.TILE_GAP;
    const centerX = width / 2;

    // Background tactical frame behind the board
    const boardHeight = Board.ROWS * (Board.TILE_HEIGHT + Board.TILE_GAP) + 20;
    const boardBg = this.scene.add.rectangle(
      centerX,
      this.startY + boardHeight / 2 - Board.TILE_HEIGHT / 2 - 5,
      totalBoardWidth + 30,
      boardHeight + 20,
      0x0a0d14,
      0.9
    );
    boardBg.setStrokeStyle(2, 0x4a3b1f, 0.8);

    // Top Header: ENEMY ZONE
    this.scene.add.text(centerX, this.startY - 38, 'TERRITORIO ENEMIGO', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '13px',
      color: '#e57373',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Divider Line between Enemy (rows 0-3) and Player (rows 4-7)
    const dividerY = this.startY + 4 * (Board.TILE_HEIGHT + Board.TILE_GAP) - Board.TILE_GAP / 2 - 2;

    // Glowing Divider
    const dividerGlow = this.scene.add.graphics();
    dividerGlow.lineStyle(4, 0xdfba73, 0.35);
    dividerGlow.lineBetween(centerX - totalBoardWidth / 2 - 10, dividerY, centerX + totalBoardWidth / 2 + 10, dividerY);

    const dividerLine = this.scene.add.graphics();
    dividerLine.lineStyle(2, 0xf6d87e, 0.9);
    dividerLine.lineBetween(centerX - totalBoardWidth / 2, dividerY, centerX + totalBoardWidth / 2, dividerY);

    // Center divider badge
    const badgeBg = this.scene.add.rectangle(centerX, dividerY, 170, 18, 0x141824, 0.95);
    badgeBg.setStrokeStyle(1, 0xdfba73, 0.8);
    this.scene.add.text(centerX, dividerY, '⚔️ FRENTE DE COMBATE ⚔️', {
      fontFamily: 'Cinzel, serif',
      fontSize: '10px',
      color: '#dfba73',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Player Zone Label
    const playerZoneLabelY = dividerY + 14;
    this.scene.add.text(centerX, playerZoneLabelY + (Board.ROWS - 4) * (Board.TILE_HEIGHT + Board.TILE_GAP) + 12, 'TU TERRITORIO (DESPLIEGUE ALIADO)', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '12px',
      color: '#60a5fa',
      fontStyle: 'bold',
      letterSpacing: 1.5,
    }).setOrigin(0.5);

    // Bench Header
    this.scene.add.text(centerX, this.benchStartY - 30, 'BANCO DE RESERVA', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '12px',
      color: '#4ade80',
      fontStyle: 'bold',
      letterSpacing: 1.5,
    }).setOrigin(0.5);
  }

  private createGrid() {
    for (let row = 0; row < Board.ROWS; row++) {
      const isPlayer = row >= 4;
      const zone: TileZone = isPlayer ? 'PLAYER' : 'ENEMY';

      for (let col = 0; col < Board.COLS; col++) {
        const x = this.startX + col * (Board.TILE_WIDTH + Board.TILE_GAP);
        const y = this.startY + row * (Board.TILE_HEIGHT + Board.TILE_GAP);

        const tile = this.createTileObject(x, y, col, row, zone, false);
        const key = `${col},${row}`;
        this.tiles.set(key, tile);
      }
    }
  }

  private createBench() {
    for (let i = 0; i < Board.BENCH_SLOTS; i++) {
      const x = this.startX + i * (Board.TILE_WIDTH + Board.TILE_GAP);
      const y = this.benchStartY;

      const tile = this.createTileObject(x, y, i, -1, 'BENCH', true, i);
      this.benchTiles.push(tile);
    }
  }

  private createTileObject(
    x: number,
    y: number,
    col: number,
    row: number,
    zone: TileZone,
    isBench: boolean,
    benchIndex?: number
  ): TileObject {
    const container = this.scene.add.container(x, y);

    // Base colors according to zone
    let fillColor = 0x131722;
    let strokeColor = 0x2a364f;
    let baseAlpha = 0.75;

    if (zone === 'ENEMY') {
      fillColor = 0x1a1215;
      strokeColor = 0x4a2228;
      baseAlpha = 0.7;
    } else if (zone === 'PLAYER') {
      fillColor = 0x121a29;
      strokeColor = 0x2c436b;
      baseAlpha = 0.8;
    } else if (zone === 'BENCH') {
      fillColor = 0x141b17;
      strokeColor = 0x274332;
      baseAlpha = 0.85;
    }

    // Outer border
    const borderRect = this.scene.add.rectangle(0, 0, Board.TILE_WIDTH, Board.TILE_HEIGHT, strokeColor);
    borderRect.setStrokeStyle(1, strokeColor, 0.9);

    // Inner tile body
    const bgRect = this.scene.add.rectangle(0, 0, Board.TILE_WIDTH - 2, Board.TILE_HEIGHT - 2, fillColor, baseAlpha);

    // Subtle runic corner markers
    const runeGraphics = this.scene.add.graphics();
    runeGraphics.lineStyle(1, strokeColor, 0.6);
    const halfW = Board.TILE_WIDTH / 2 - 4;
    const halfH = Board.TILE_HEIGHT / 2 - 4;
    // Top-left corner
    runeGraphics.moveTo(-halfW, -halfH + 4);
    runeGraphics.lineTo(-halfW, -halfH);
    runeGraphics.lineTo(-halfW + 4, -halfH);
    // Bottom-right corner
    runeGraphics.moveTo(halfW, halfH - 4);
    runeGraphics.lineTo(halfW, halfH);
    runeGraphics.lineTo(halfW - 4, halfH);
    runeGraphics.strokePath();

    // Highlight glow layer (hidden by default)
    const highlightGlow = this.scene.add.graphics();
    highlightGlow.setVisible(false);

    // Tile coordinate/slot label for subtle orientation
    const slotLabel = isBench ? `B${col + 1}` : `${col + 1},${row + 1}`;
    const labelText = this.scene.add.text(0, Board.TILE_HEIGHT / 2 - 8, slotLabel, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '8px',
      color: zone === 'ENEMY' ? '#5a3d42' : zone === 'PLAYER' ? '#3d5272' : '#3d5f48',
    }).setOrigin(0.5);

    container.add([borderRect, bgRect, runeGraphics, highlightGlow, labelText]);

    // Setup interactivity
    container.setSize(Board.TILE_WIDTH, Board.TILE_HEIGHT);
    container.setInteractive({ useHandCursor: true });

    const tileObj: TileObject = {
      col,
      row,
      zone,
      isBench,
      benchIndex,
      container,
      bgRect,
      borderRect,
      highlightGlow,
      occupiedBy: null,
    };

    // Events
    container.on('pointerover', () => this.handleTileHover(tileObj));
    container.on('pointerout', () => this.handleTileOut(tileObj));
    container.on('pointerdown', () => this.handleTileClick(tileObj));

    return tileObj;
  }

  private handleTileHover(tile: TileObject) {
    const isPlayerHalf = tile.zone === 'PLAYER' || tile.zone === 'BENCH';
    const glowColor = isPlayerHalf ? 0xdfba73 : 0xef4444; // Gold for valid, Red for enemy

    tile.highlightGlow.clear();
    tile.highlightGlow.lineStyle(3, glowColor, 1);
    tile.highlightGlow.strokeRect(
      -Board.TILE_WIDTH / 2,
      -Board.TILE_HEIGHT / 2,
      Board.TILE_WIDTH,
      Board.TILE_HEIGHT
    );
    tile.highlightGlow.setVisible(true);

    // Subtle scale up animation on hover
    this.scene.tweens.killTweensOf(tile.container);
    this.scene.tweens.add({
      targets: tile.container,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 100,
      ease: 'Quad.easeOut',
    });

    const tileInfo: BoardTileInfo = {
      col: tile.col,
      row: tile.row,
      zone: tile.zone,
      isBench: tile.isBench,
      benchIndex: tile.benchIndex,
      isOccupied: tile.occupiedBy !== null,
      unitId: tile.occupiedBy,
    };

    EventBus.emit('tile-hover', tileInfo);
  }

  private handleTileOut(tile: TileObject) {
    const key = tile.isBench ? `bench_${tile.benchIndex}` : `${tile.col},${tile.row}`;
    const isSelected = this.selectedTileKey === key;

    if (!isSelected) {
      tile.highlightGlow.setVisible(false);
      this.scene.tweens.killTweensOf(tile.container);
      this.scene.tweens.add({
        targets: tile.container,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 120,
        ease: 'Quad.easeOut',
      });
    }

    EventBus.emit('tile-out');
  }

  private handleTileClick(tile: TileObject) {
    const key = tile.isBench ? `bench_${tile.benchIndex}` : `${tile.col},${tile.row}`;

    // Deselect previous tile if any
    if (this.selectedTileKey && this.selectedTileKey !== key) {
      const prevTile = this.getTileByKey(this.selectedTileKey);
      if (prevTile) {
        prevTile.highlightGlow.setVisible(false);
        prevTile.container.setScale(1.0);
      }
    }

    this.selectedTileKey = key;

    // Draw active selected border (cyan/gold)
    const isPlayerZone = tile.zone === 'PLAYER' || tile.zone === 'BENCH';
    const selectColor = isPlayerZone ? 0x60a5fa : 0xf87171;

    tile.highlightGlow.clear();
    tile.highlightGlow.lineStyle(3, selectColor, 1);
    tile.highlightGlow.strokeRect(
      -Board.TILE_WIDTH / 2,
      -Board.TILE_HEIGHT / 2,
      Board.TILE_WIDTH,
      Board.TILE_HEIGHT
    );
    tile.highlightGlow.setVisible(true);

    const tileInfo: BoardTileInfo = {
      col: tile.col,
      row: tile.row,
      zone: tile.zone,
      isBench: tile.isBench,
      benchIndex: tile.benchIndex,
      isOccupied: tile.occupiedBy !== null,
      unitId: tile.occupiedBy,
    };

    EventBus.emit('tile-selected', tileInfo);
  }

  private getTileByKey(key: string): TileObject | null {
    if (key.startsWith('bench_')) {
      const idx = parseInt(key.replace('bench_', ''), 10);
      return this.benchTiles[idx] || null;
    }
    return this.tiles.get(key) || null;
  }

  // --- Public API for units and placement ---

  public getTile(col: number, row: number): TileObject | null {
    return this.tiles.get(`${col},${row}`) || null;
  }

  public getBenchTile(index: number): TileObject | null {
    return this.benchTiles[index] || null;
  }

  public getWorldPosition(col: number, row: number): { x: number; y: number } {
    return {
      x: this.startX + col * (Board.TILE_WIDTH + Board.TILE_GAP),
      y: this.startY + row * (Board.TILE_HEIGHT + Board.TILE_GAP),
    };
  }

  public getBenchWorldPosition(index: number): { x: number; y: number } {
    return {
      x: this.startX + index * (Board.TILE_WIDTH + Board.TILE_GAP),
      y: this.benchStartY,
    };
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
