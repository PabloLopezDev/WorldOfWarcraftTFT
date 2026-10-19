import Phaser from 'phaser';
import type { BoardTileInfo, TileZone } from '../types';
import { EventBus } from './EventBus';

export interface PerspectiveVertex {
  x: number;
  y: number;
}

export interface TacticalTile {
  col: number;
  row: number;
  zone: TileZone;
  isBench: boolean;
  benchIndex?: number;
  centerX: number;
  centerY: number;
  vertices?: [PerspectiveVertex, PerspectiveVertex, PerspectiveVertex, PerspectiveVertex]; // TL, TR, BR, BL
  width: number;
  height: number;
  occupiedBy: string | null;
  interactiveZone: Phaser.GameObjects.Zone;
}

export class Board {
  public static readonly COLS = 8;
  public static readonly ROWS = 8; // 0..3: Enemy (Red), 4..7: Player (Blue)
  public static readonly BENCH_SLOTS = 8;

  private scene: Phaser.Scene;
  private tiles: Map<string, TacticalTile> = new Map();
  private benchTiles: TacticalTile[] = [];

  // Graphics layers
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private highlightGraphics!: Phaser.GameObjects.Graphics;

  private activeHoverKey: string | null = null;
  private selectedKey: string | null = null;

  // Dynamic layout values
  private centerX = 0;
  private boardStartY = 0;
  private boardHeight = 360;
  private topWidth = 680;
  private bottomWidth = 860;

  private benchStartY = 0;
  private benchWidth = 840;
  private benchSlotW = 96;
  private benchSlotH = 56;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.calculateLayout();
    this.createStaticBoard();
    this.createBench();
    this.createInteractiveZones();
  }

  private calculateLayout() {
    const { width, height } = this.scene.scale;
    this.centerX = width / 2;

    // Center board vertically between top bar (~60px) and bottom shop (~160px)
    const availableH = height - 220;
    this.boardHeight = Math.min(Math.max(availableH * 0.65, 300), 400);

    // Responsive widths
    const maxAllowedW = Math.min(width - 340, 920);
    this.bottomWidth = Math.max(maxAllowedW, 680);
    this.topWidth = this.bottomWidth * 0.8;

    this.boardStartY = 75 + (availableH - this.boardHeight - 80) / 2;
    this.benchStartY = this.boardStartY + this.boardHeight + 38;

    this.benchWidth = this.bottomWidth;
    this.benchSlotW = (this.benchWidth - 7 * 6) / 8;
    this.benchSlotH = Math.min(this.boardHeight * 0.16, 56);
  }

  // Calculate 2.5D perspective grid intersection
  private getGridPoint(colFrac: number, rowFrac: number): PerspectiveVertex {
    // Non-linear depth spacing for natural foreshortening
    const depthT = rowFrac * 0.72 + (rowFrac * rowFrac) * 0.28;
    const y = this.boardStartY + depthT * this.boardHeight;
    const currentW = this.topWidth + depthT * (this.bottomWidth - this.topWidth);
    const x = this.centerX - currentW / 2 + colFrac * currentW;
    return { x, y };
  }

  private createStaticBoard() {
    this.boardGraphics = this.scene.add.graphics();
    this.highlightGraphics = this.scene.add.graphics();
    this.highlightGraphics.setDepth(10);

    const g = this.boardGraphics;
    g.clear();

    // 1. Bastion Stone Arena Base (Trapezoid with 3D depth bevel)
    const pTL = this.getGridPoint(-0.04, -0.04);
    const pTR = this.getGridPoint(1.04, -0.04);
    const pBR = this.getGridPoint(1.04, 1.04);
    const pBL = this.getGridPoint(-0.04, 1.04);

    // Stone rim drop shadow / 3D front edge
    const bevelDepth = 14;
    g.fillStyle(0x06080d, 0.95);
    g.beginPath();
    g.moveTo(pBL.x, pBL.y);
    g.lineTo(pBR.x, pBR.y);
    g.lineTo(pBR.x, pBR.y + bevelDepth);
    g.lineTo(pBL.x, pBL.y + bevelDepth);
    g.closePath();
    g.fillPath();

    // Stone Arena Base fill
    g.fillStyle(0x0b0e15, 0.96);
    g.beginPath();
    g.moveTo(pTL.x, pTL.y);
    g.lineTo(pTR.x, pTR.y);
    g.lineTo(pBR.x, pBR.y);
    g.lineTo(pBL.x, pBL.y);
    g.closePath();
    g.fillPath();

    // Stone Frame Gold / Bronze Trim
    g.lineStyle(3, 0x4a3b22, 0.95);
    g.strokePath();

    g.lineStyle(1.5, 0xd4af37, 0.4);
    const innerTL = this.getGridPoint(-0.02, -0.02);
    const innerTR = this.getGridPoint(1.02, -0.02);
    const innerBR = this.getGridPoint(1.02, 1.02);
    const innerBL = this.getGridPoint(-0.02, 1.02);
    g.beginPath();
    g.moveTo(innerTL.x, innerTL.y);
    g.lineTo(innerTR.x, innerTR.y);
    g.lineTo(innerBR.x, innerBR.y);
    g.lineTo(innerBL.x, innerBL.y);
    g.closePath();
    g.strokePath();

    // 2. Render all 64 Perspective Tiles
    for (let row = 0; row < Board.ROWS; row++) {
      const isPlayer = row >= 4;

      for (let col = 0; col < Board.COLS; col++) {
        const cTL = this.getGridPoint(col / Board.COLS, row / Board.ROWS);
        const cTR = this.getGridPoint((col + 1) / Board.COLS, row / Board.ROWS);
        const cBR = this.getGridPoint((col + 1) / Board.COLS, (row + 1) / Board.ROWS);
        const cBL = this.getGridPoint(col / Board.COLS, (row + 1) / Board.ROWS);

        // Tile body
        if (!isPlayer) {
          // ENEMY RED STONE SLATE
          const shade = ((col + row) % 2 === 0) ? 0x2e1318 : 0x250f13;
          g.fillStyle(shade, 0.92);
          this.fillPerspectiveQuad(g, cTL, cTR, cBR, cBL, 1.5);
          g.lineStyle(1.5, 0x54212a, 0.75);
          this.strokePerspectiveQuad(g, cTL, cTR, cBR, cBL, 1.5);

          // Subtle stone texture inner inset
          g.lineStyle(1, 0x3d171d, 0.4);
          this.strokePerspectiveQuad(g, cTL, cTR, cBR, cBL, 4);
        } else {
          // PLAYER BLUE STONE SLATE
          const shade = ((col + row) % 2 === 0) ? 0x122033 : 0x0e1929;
          g.fillStyle(shade, 0.92);
          this.fillPerspectiveQuad(g, cTL, cTR, cBR, cBL, 1.5);
          g.lineStyle(1.5, 0x24426b, 0.75);
          this.strokePerspectiveQuad(g, cTL, cTR, cBR, cBL, 1.5);

          // Subtle stone texture inner inset
          g.lineStyle(1, 0x182d49, 0.4);
          this.strokePerspectiveQuad(g, cTL, cTR, cBR, cBL, 4);
        }
      }
    }

    // 3. Central Divide & Alliance Crest Watermark
    const divLeft = this.getGridPoint(0, 0.5);
    const divRight = this.getGridPoint(1, 0.5);

    // Glowing Divider Beam
    g.lineStyle(4, 0xdfba73, 0.4);
    g.lineBetween(divLeft.x - 4, divLeft.y, divRight.x + 4, divRight.y);
    g.lineStyle(2, 0xf6d87e, 0.9);
    g.lineBetween(divLeft.x, divLeft.y, divRight.x, divRight.y);

    // Draw Alliance Lion Crest watermark on stone
    this.createAllianceCrestWatermark(this.centerX, (divLeft.y + divRight.y) / 2);
  }

  private fillPerspectiveQuad(
    g: Phaser.GameObjects.Graphics,
    tl: PerspectiveVertex,
    tr: PerspectiveVertex,
    br: PerspectiveVertex,
    bl: PerspectiveVertex,
    inset = 0
  ) {
    g.beginPath();
    g.moveTo(tl.x + inset, tl.y + inset);
    g.lineTo(tr.x - inset, tr.y + inset);
    g.lineTo(br.x - inset, br.y - inset);
    g.lineTo(bl.x + inset, bl.y - inset);
    g.closePath();
    g.fillPath();
  }

  private strokePerspectiveQuad(
    g: Phaser.GameObjects.Graphics,
    tl: PerspectiveVertex,
    tr: PerspectiveVertex,
    br: PerspectiveVertex,
    bl: PerspectiveVertex,
    inset = 0
  ) {
    g.beginPath();
    g.moveTo(tl.x + inset, tl.y + inset);
    g.lineTo(tr.x - inset, tr.y + inset);
    g.lineTo(br.x - inset, br.y - inset);
    g.lineTo(bl.x + inset, bl.y - inset);
    g.closePath();
    g.strokePath();
  }

  private createAllianceCrestWatermark(cx: number, cy: number) {
    const wm = this.scene.add.graphics();
    wm.setDepth(2);
    wm.setAlpha(0.3);

    wm.lineStyle(3, 0x60a5fa, 0.8);
    wm.fillStyle(0x1d4ed8, 0.15);

    // Shield
    wm.beginPath();
    wm.moveTo(cx - 50, cy - 40);
    wm.lineTo(cx + 50, cy - 40);
    wm.lineTo(cx + 50, cy + 5);
    wm.lineTo(cx, cy + 52);
    wm.lineTo(cx - 50, cy + 5);
    wm.closePath();
    wm.fillPath();
    wm.strokePath();

    // Lion Emblem outline
    wm.lineStyle(2, 0x93c5fd, 0.75);
    wm.strokeCircle(cx, cy - 8, 20);
    wm.lineBetween(cx, cy - 30, cx, cy + 32);
    wm.lineBetween(cx - 20, cy - 12, cx + 20, cy - 12);
  }

  private createBench() {
    const g = this.boardGraphics;
    const benchY = this.benchStartY;
    const benchW = this.benchWidth;

    // Bench Container Frame
    g.fillStyle(0x0a0e16, 0.94);
    g.fillRoundedRect(this.centerX - benchW / 2 - 14, benchY - 14, benchW + 28, this.benchSlotH + 28, 8);
    g.lineStyle(2, 0x3d301c, 0.85);
    g.strokeRoundedRect(this.centerX - benchW / 2 - 14, benchY - 14, benchW + 28, this.benchSlotH + 28, 8);

    // Bench Slots
    const slotGap = 6;
    const totalSlotsW = Board.BENCH_SLOTS * this.benchSlotW + (Board.BENCH_SLOTS - 1) * slotGap;
    const startX = this.centerX - totalSlotsW / 2 + this.benchSlotW / 2;

    for (let i = 0; i < Board.BENCH_SLOTS; i++) {
      const bx = startX + i * (this.benchSlotW + slotGap);
      g.fillStyle(0x121822, 0.9);
      g.fillRoundedRect(bx - this.benchSlotW / 2, benchY - this.benchSlotH / 2, this.benchSlotW, this.benchSlotH, 6);
      g.lineStyle(1.5, 0x243242, 0.7);
      g.strokeRoundedRect(bx - this.benchSlotW / 2, benchY - this.benchSlotH / 2, this.benchSlotW, this.benchSlotH, 6);
    }

    // Header Label: Banco (0/8)
    this.scene.add.text(this.centerX - benchW / 2 - 4, benchY - 26, 'Banco (0/8)', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '13px',
      color: '#dfba73',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0, 0.5);
  }

  private createInteractiveZones() {
    // 64 Board Tiles
    for (let row = 0; row < Board.ROWS; row++) {
      const isPlayer = row >= 4;
      const zoneType: TileZone = isPlayer ? 'PLAYER' : 'ENEMY';

      for (let col = 0; col < Board.COLS; col++) {
        const cTL = this.getGridPoint(col / Board.COLS, row / Board.ROWS);
        const cTR = this.getGridPoint((col + 1) / Board.COLS, row / Board.ROWS);
        const cBR = this.getGridPoint((col + 1) / Board.COLS, (row + 1) / Board.ROWS);
        const cBL = this.getGridPoint(col / Board.COLS, (row + 1) / Board.ROWS);

        const cx = (cTL.x + cTR.x + cBR.x + cBL.x) / 4;
        const cy = (cTL.y + cTR.y + cBR.y + cBL.y) / 4;
        const w = (cTR.x - cTL.x + cBR.x - cBL.x) / 2;
        const h = (cBL.y - cTL.y + cBR.y - cTR.y) / 2;

        const zone = this.scene.add.zone(cx, cy, w, h);
        zone.setRectangleDropZone(w, h);
        zone.setInteractive({ useHandCursor: true });
        zone.setDepth(12);

        const key = `${col},${row}`;
        const tile: TacticalTile = {
          col,
          row,
          zone: zoneType,
          isBench: false,
          centerX: cx,
          centerY: cy,
          vertices: [cTL, cTR, cBR, cBL],
          width: w,
          height: h,
          occupiedBy: null,
          interactiveZone: zone,
        };

        zone.on('pointerover', () => this.onTileOver(key, tile));
        zone.on('pointerout', () => this.onTileOut(key));
        zone.on('pointerdown', () => this.onTileClick(key, tile));

        this.tiles.set(key, tile);
      }
    }

    // 8 Bench Slots
    const slotGap = 6;
    const totalSlotsW = Board.BENCH_SLOTS * this.benchSlotW + (Board.BENCH_SLOTS - 1) * slotGap;
    const startX = this.centerX - totalSlotsW / 2 + this.benchSlotW / 2;

    for (let i = 0; i < Board.BENCH_SLOTS; i++) {
      const bx = startX + i * (this.benchSlotW + slotGap);
      const by = this.benchStartY;

      const zone = this.scene.add.zone(bx, by, this.benchSlotW, this.benchSlotH);
      zone.setRectangleDropZone(this.benchSlotW, this.benchSlotH);
      zone.setInteractive({ useHandCursor: true });
      zone.setDepth(12);

      const key = `bench_${i}`;
      const tile: TacticalTile = {
        col: i,
        row: -1,
        zone: 'BENCH',
        isBench: true,
        benchIndex: i,
        centerX: bx,
        centerY: by,
        width: this.benchSlotW,
        height: this.benchSlotH,
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

    // 1. Draw Selected Tile
    if (this.selectedKey) {
      const tile = this.getTileByKey(this.selectedKey);
      if (tile) {
        const color = tile.zone === 'ENEMY' ? 0xf87171 : 0x60a5fa;
        if (tile.vertices) {
          const [tl, tr, br, bl] = tile.vertices;
          hg.lineStyle(3.5, color, 1);
          this.strokePerspectiveQuad(hg, tl, tr, br, bl, 1);
          hg.fillStyle(color, 0.22);
          this.fillPerspectiveQuad(hg, tl, tr, br, bl, 1);
        } else {
          hg.lineStyle(3, color, 1);
          hg.strokeRoundedRect(tile.centerX - tile.width / 2, tile.centerY - tile.height / 2, tile.width, tile.height, 6);
        }
      }
    }

    // 2. Draw Hovered Tile
    if (this.activeHoverKey && this.activeHoverKey !== this.selectedKey) {
      const tile = this.getTileByKey(this.activeHoverKey);
      if (tile) {
        const color = tile.zone === 'ENEMY' ? 0xef4444 : tile.zone === 'BENCH' ? 0x4ade80 : 0xdfba73;
        if (tile.vertices) {
          const [tl, tr, br, bl] = tile.vertices;
          hg.lineStyle(2.5, color, 0.95);
          this.strokePerspectiveQuad(hg, tl, tr, br, bl, 1);
          hg.fillStyle(color, 0.2);
          this.fillPerspectiveQuad(hg, tl, tr, br, bl, 1);
        } else {
          hg.lineStyle(2.5, color, 0.95);
          hg.strokeRoundedRect(tile.centerX - tile.width / 2, tile.centerY - tile.height / 2, tile.width, tile.height, 6);
          hg.fillStyle(color, 0.16);
          hg.fillRoundedRect(tile.centerX - tile.width / 2, tile.centerY - tile.height / 2, tile.width, tile.height, 6);
        }
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
    return tile ? { x: tile.centerX, y: tile.centerY } : { x: 0, y: 0 };
  }

  public getBenchWorldPosition(index: number): { x: number; y: number } {
    const tile = this.getBenchTile(index);
    return tile ? { x: tile.centerX, y: tile.centerY } : { x: 0, y: 0 };
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
