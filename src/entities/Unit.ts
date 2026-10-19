import Phaser from 'phaser';
import type { UnitData } from '../types';
import type { Board, TacticalTile } from '../game/Board';
import { EventBus } from '../game/EventBus';

export class Unit extends Phaser.GameObjects.Container {
  public id: string;
  public unitData: UnitData;
  public hp: number;
  public maxHp: number;
  public mana: number;
  public maxMana: number;
  public starLevel = 1;

  public isPlayerOwned: boolean;
  public isBench: boolean;
  public benchIndex: number;
  public gridCol: number;
  public gridRow: number;

  private board: Board;

  // Visual sub-elements
  private pedestal!: Phaser.GameObjects.Graphics;
  private avatarCircle!: Phaser.GameObjects.Graphics;
  private avatarImage?: Phaser.GameObjects.Image;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private manaBarFill!: Phaser.GameObjects.Graphics;
  private barsContainer!: Phaser.GameObjects.Container;

  // Drag tracking state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private originCol = 0;
  private originRow = 0;
  private originIsBench = false;
  private originBenchIndex = 0;

  constructor(
    scene: Phaser.Scene,
    board: Board,
    unitData: UnitData,
    isBench: boolean,
    colOrBenchIndex: number,
    row = -1,
    isPlayerOwned = true
  ) {
    // Calculate initial world position
    let initialPos = { x: 0, y: 0 };
    if (isBench) {
      initialPos = board.getBenchWorldPosition(colOrBenchIndex);
    } else {
      initialPos = board.getWorldPosition(colOrBenchIndex, row);
    }

    super(scene, initialPos.x, initialPos.y);

    this.board = board;
    this.unitData = unitData;
    this.id = `unit_${unitData.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    this.hp = unitData.stats.hp;
    this.maxHp = unitData.stats.maxHp;
    this.mana = unitData.stats.mana;
    this.maxMana = unitData.stats.maxMana;

    this.isBench = isBench;
    this.benchIndex = isBench ? colOrBenchIndex : -1;
    this.gridCol = isBench ? -1 : colOrBenchIndex;
    this.gridRow = isBench ? -1 : row;
    this.isPlayerOwned = isPlayerOwned;

    this.createVisuals();
    this.setupInteractivity();

    this.updateDepthByRow();
    scene.add.existing(this);

    // Register occupancy on board
    this.registerOccupancy();
  }

  private createVisuals() {
    // 1. Base Pedestal Ring (Perspective ellipse on the ground)
    this.pedestal = this.scene.add.graphics();
    const ringColor = this.isPlayerOwned ? 0x3b82f6 : 0xef4444;

    this.pedestal.fillStyle(0x0a1220, 0.7);
    this.pedestal.fillEllipse(0, 16, 44, 20);
    this.pedestal.lineStyle(2.5, ringColor, 0.95);
    this.pedestal.strokeEllipse(0, 16, 44, 20);

    // Glowing ground light
    this.pedestal.lineStyle(1.5, ringColor, 0.4);
    this.pedestal.strokeEllipse(0, 16, 50, 24);

    this.add(this.pedestal);

    // 2. Character Portrait Token / Avatar
    const textureKey = `hero_${this.unitData.id}`;
    if (this.scene.textures.exists(textureKey)) {
      this.avatarImage = this.scene.add.image(0, -6, textureKey);
      this.avatarImage.setDisplaySize(38, 38);

      // Circular mask
      const maskShape = this.scene.make.graphics();
      maskShape.fillCircle(this.x, this.y - 6, 18);
      // Mask will be handled or framed with border
      this.add(this.avatarImage);
    } else {
      // Stylized class token
      this.avatarCircle = this.scene.add.graphics();
      this.avatarCircle.fillStyle(this.unitData.color, 0.9);
      this.avatarCircle.fillCircle(0, -6, 18);
      this.add(this.avatarCircle);
    }

    // Golden / Steel Token Rim
    const tokenRim = this.scene.add.graphics();
    tokenRim.lineStyle(2.5, 0xdfba73, 0.95);
    tokenRim.strokeCircle(0, -6, 19);
    tokenRim.lineStyle(1, 0x000000, 0.7);
    tokenRim.strokeCircle(0, -6, 20);
    this.add(tokenRim);

    // 3. Overhead Health & Mana Bars
    this.barsContainer = this.scene.add.container(0, -32);

    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x0a0e17, 0.9);
    barBg.fillRoundedRect(-22, -6, 44, 9, 2);
    barBg.lineStyle(1, 0x222a38, 0.8);
    barBg.strokeRoundedRect(-22, -6, 44, 9, 2);
    this.barsContainer.add(barBg);

    // HP Fill (Green)
    this.hpBarFill = this.scene.add.graphics();
    this.barsContainer.add(this.hpBarFill);

    // Mana Fill (Cyan/Blue)
    this.manaBarFill = this.scene.add.graphics();
    this.barsContainer.add(this.manaBarFill);

    this.updateHealthBar();
    this.updateManaBar();

    this.add(this.barsContainer);
  }

  public updateHealthBar() {
    this.hpBarFill.clear();
    const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));
    const width = 40 * ratio;

    this.hpBarFill.fillStyle(0x22c55e, 1);
    this.hpBarFill.fillRect(-20, -5, width, 4);
  }

  public updateManaBar() {
    this.manaBarFill.clear();
    const ratio = Math.max(0, Math.min(1, this.mana / this.maxMana));
    const width = 40 * ratio;

    this.manaBarFill.fillStyle(0x38bdf8, 1);
    this.manaBarFill.fillRect(-20, 0, width, 2);
  }

  private setupInteractivity() {
    this.setSize(48, 54);
    this.setInteractive({ draggable: true, useHandCursor: true });

    this.scene.input.setDraggable(this);

    this.on('dragstart', this.onDragStart, this);
    this.on('drag', this.onDrag, this);
    this.on('dragend', this.onDragEnd, this);
  }

  private onDragStart() {
    if (!this.isPlayerOwned) return;

    this.isDragging = true;
    this.dragStartX = this.x;
    this.dragStartY = this.y;
    this.originCol = this.gridCol;
    this.originRow = this.gridRow;
    this.originIsBench = this.isBench;
    this.originBenchIndex = this.benchIndex;

    // Pop animation & depth to top
    this.setDepth(150);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 120,
      ease: 'Back.easeOut',
    });

    EventBus.emit('unit-drag-start', this);
  }

  private onDrag(pointer: Phaser.Input.Pointer) {
    if (!this.isDragging) return;

    this.setPosition(pointer.x, pointer.y - 10);

    // Query prospective tile under pointer
    const tile = this.board.getTileAtWorld(pointer.x, pointer.y);
    const isValid = tile ? (tile.zone === 'PLAYER' || tile.zone === 'BENCH') : false;

    this.board.highlightDragTarget(tile, isValid);
  }

  private onDragEnd(pointer: Phaser.Input.Pointer) {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.board.clearDragHighlight();

    const targetTile = this.board.getTileAtWorld(pointer.x, pointer.y);
    const isValid = targetTile ? (targetTile.zone === 'PLAYER' || targetTile.zone === 'BENCH') : false;

    if (isValid && targetTile) {
      this.handlePlacement(targetTile);
    } else {
      // Invalid drop: snap back to origin
      this.snapBack();
    }

    // Reset scale
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 160,
      ease: 'Quad.easeOut',
    });
  }

  private handlePlacement(targetTile: TacticalTile) {
    // Check if target is already occupied by another unit
    if (targetTile.occupiedBy && targetTile.occupiedBy !== this.id) {
      // Swapping will be coordinated by UnitManager
      EventBus.emit('unit-swap-request', {
        draggingUnit: this,
        targetTile,
      });
      return;
    }

    // Target is free: move cleanly to target
    this.clearCurrentOccupancy();

    if (targetTile.isBench) {
      this.isBench = true;
      this.benchIndex = targetTile.benchIndex ?? 0;
      this.gridCol = -1;
      this.gridRow = -1;
    } else {
      this.isBench = false;
      this.benchIndex = -1;
      this.gridCol = targetTile.col;
      this.gridRow = targetTile.row;
    }

    // Snap to tile center
    this.scene.tweens.add({
      targets: this,
      x: targetTile.centerX,
      y: targetTile.centerY,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.registerOccupancy();
        this.updateDepthByRow();
      },
    });

    EventBus.emit('unit-placed', this);
  }

  public snapTo(x: number, y: number, onComplete?: () => void) {
    this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration: 140,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.updateDepthByRow();
        if (onComplete) onComplete();
      },
    });
  }

  public snapBack() {
    this.scene.tweens.add({
      targets: this,
      x: this.dragStartX,
      y: this.dragStartY,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.isBench = this.originIsBench;
        this.benchIndex = this.originBenchIndex;
        this.gridCol = this.originCol;
        this.gridRow = this.originRow;
        this.registerOccupancy();
        this.updateDepthByRow();
      },
    });
  }

  public clearCurrentOccupancy() {
    if (this.isBench) {
      this.board.setBenchOccupied(this.benchIndex, null);
    } else if (this.gridCol >= 0 && this.gridRow >= 0) {
      this.board.setOccupied(this.gridCol, this.gridRow, null);
    }
  }

  public registerOccupancy() {
    if (this.isBench) {
      this.board.setBenchOccupied(this.benchIndex, this.id);
    } else if (this.gridCol >= 0 && this.gridRow >= 0) {
      this.board.setOccupied(this.gridCol, this.gridRow, this.id);
    }
  }

  public updateDepthByRow() {
    if (this.isBench) {
      this.setDepth(25);
    } else {
      this.setDepth(20 + this.gridRow * 2);
    }
  }
}
