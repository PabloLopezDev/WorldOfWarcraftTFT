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
  private modelSprite?: Phaser.GameObjects.Image;
  private avatarCircle?: Phaser.GameObjects.Graphics;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private manaBarFill!: Phaser.GameObjects.Graphics;
  private barsContainer!: Phaser.GameObjects.Container;
  private starText?: Phaser.GameObjects.Text;

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

    // Contact drop shadow beneath unit
    this.pedestal.fillStyle(0x000000, 0.5);
    this.pedestal.fillEllipse(0, 14, 52, 22);

    // Dark pedestal platform
    this.pedestal.fillStyle(0x0a1322, 0.85);
    this.pedestal.fillEllipse(0, 14, 44, 18);

    // Tactical team glowing border ring
    this.pedestal.lineStyle(2.5, ringColor, 0.95);
    this.pedestal.strokeEllipse(0, 14, 44, 18);

    // Outer subtle team glow
    this.pedestal.lineStyle(1.5, ringColor, 0.4);
    this.pedestal.strokeEllipse(0, 14, 50, 22);

    this.add(this.pedestal);

    // 2. Full-Body 3D Warcraft Isometric Character Model
    const modelTextureKey = this.unitData.modelKey || `model_${this.unitData.id}`;
    if (this.scene.textures.exists(modelTextureKey)) {
      this.modelSprite = this.scene.add.image(0, 15, modelTextureKey);
      this.modelSprite.setOrigin(0.5, 0.92); // Feet anchored to pedestal

      // Target character height fits within tactical isometric cell (approx 74px)
      const targetHeight = 74;
      const scale = targetHeight / this.modelSprite.height;
      this.modelSprite.setScale(scale);
      this.add(this.modelSprite);

      // Subtle breathing idle animation for an alive 3D battle look
      this.scene.tweens.add({
        targets: this.modelSprite,
        scaleY: scale * 1.035,
        y: 14.2,
        duration: 1700 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      // Fallback: Portrait Token if model texture is missing
      const portraitKey = `hero_${this.unitData.id}`;
      if (this.scene.textures.exists(portraitKey)) {
        const avatarImage = this.scene.add.image(0, -6, portraitKey);
        avatarImage.setDisplaySize(38, 38);
        this.add(avatarImage);
      } else {
        this.avatarCircle = this.scene.add.graphics();
        this.avatarCircle.fillStyle(this.unitData.color, 0.9);
        this.avatarCircle.fillCircle(0, -6, 18);
        this.add(this.avatarCircle);
      }

      // Golden Rim
      const tokenRim = this.scene.add.graphics();
      tokenRim.lineStyle(2.5, 0xdfba73, 0.95);
      tokenRim.strokeCircle(0, -6, 19);
      this.add(tokenRim);
    }

    // 3. Overhead Health & Mana Bars (Positioned above character model's head)
    this.barsContainer = this.scene.add.container(0, -58);

    // Star Level indicator
    if (this.starLevel > 1) {
      const starsStr = '★'.repeat(this.starLevel);
      this.starText = this.scene.add.text(0, -10, starsStr, {
        fontFamily: 'Cinzel, Georgia, serif',
        fontSize: '11px',
        color: this.starLevel === 3 ? '#facc15' : '#cbd5e1',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
      this.barsContainer.add(this.starText);
    }

    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x070b12, 0.9);
    barBg.fillRoundedRect(-22, -4, 44, 9, 2);
    barBg.lineStyle(1, 0x243249, 0.9);
    barBg.strokeRoundedRect(-22, -4, 44, 9, 2);
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
    this.hpBarFill.fillRect(-20, -3, width, 4);
  }

  public updateManaBar() {
    this.manaBarFill.clear();
    const ratio = Math.max(0, Math.min(1, this.mana / this.maxMana));
    const width = 40 * ratio;

    this.manaBarFill.fillStyle(0x38bdf8, 1);
    this.manaBarFill.fillRect(-20, 2, width, 2);
  }

  private setupInteractivity() {
    this.setSize(54, 76);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-27, -58, 54, 76),
      Phaser.Geom.Rectangle.Contains
    );

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
