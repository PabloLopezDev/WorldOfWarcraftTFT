import Phaser from 'phaser';
import type { UnitData } from '../types';
import type { Board, TacticalTile } from '../game/Board';
import { Unit } from '../entities/Unit';
import { EventBus } from '../game/EventBus';

export class UnitManager {
  private scene: Phaser.Scene;
  private board: Board;
  private units: Map<string, Unit> = new Map();

  constructor(scene: Phaser.Scene, board: Board) {
    this.scene = scene;
    this.board = board;

    this.setupListeners();
  }

  private setupListeners() {
    EventBus.on('unit-purchased', (unitData: UnitData) => {
      this.spawnUnitOnBench(unitData);
    });

    EventBus.on('unit-swap-request', (data: { draggingUnit: Unit; targetTile: TacticalTile }) => {
      this.handleSwap(data.draggingUnit, data.targetTile);
    });
  }

  public spawnUnitOnBench(unitData: UnitData): Unit | null {
    const slot = this.board.findFirstEmptyBenchSlot();
    if (slot === -1) {
      EventBus.emit('game-notification', '¡El banco de reserva está lleno!');
      return null;
    }

    const unit = new Unit(this.scene, this.board, unitData, true, slot, -1, true);
    this.units.set(unit.id, unit);

    this.emitBenchUpdate();
    return unit;
  }

  public spawnEnemyUnit(unitData: UnitData, col: number, row: number): Unit | null {
    if (this.board.isOccupied(col, row)) return null;

    const unit = new Unit(this.scene, this.board, unitData, false, col, row, false);
    this.units.set(unit.id, unit);
    return unit;
  }

  private handleSwap(draggingUnit: Unit, targetTile: TacticalTile) {
    const targetUnitId = targetTile.occupiedBy;
    const targetUnit = targetUnitId ? this.units.get(targetUnitId) : null;

    if (!targetUnit) {
      draggingUnit.snapBack();
      return;
    }

    // Save origin properties of dragging unit
    const originCol = draggingUnit.gridCol;
    const originRow = draggingUnit.gridRow;
    const originIsBench = draggingUnit.isBench;
    const originBenchIndex = draggingUnit.benchIndex;

    const originPos = originIsBench
      ? this.board.getBenchWorldPosition(originBenchIndex)
      : this.board.getWorldPosition(originCol, originRow);

    // Clear both occupancies
    draggingUnit.clearCurrentOccupancy();
    targetUnit.clearCurrentOccupancy();

    // 1. Move target unit to dragging unit's origin
    targetUnit.isBench = originIsBench;
    targetUnit.benchIndex = originBenchIndex;
    targetUnit.gridCol = originCol;
    targetUnit.gridRow = originRow;
    targetUnit.snapTo(originPos.x, originPos.y, () => {
      targetUnit.registerOccupancy();
    });

    // 2. Move dragging unit to target tile
    draggingUnit.isBench = targetTile.isBench;
    draggingUnit.benchIndex = targetTile.isBench ? (targetTile.benchIndex ?? 0) : -1;
    draggingUnit.gridCol = targetTile.isBench ? -1 : targetTile.col;
    draggingUnit.gridRow = targetTile.isBench ? -1 : targetTile.row;
    draggingUnit.snapTo(targetTile.centerX, targetTile.centerY, () => {
      draggingUnit.registerOccupancy();
    });

    this.emitBenchUpdate();
  }

  public removeUnit(unitId: string) {
    const unit = this.units.get(unitId);
    if (!unit) return;

    unit.clearCurrentOccupancy();
    this.units.delete(unitId);
    unit.destroy();

    this.emitBenchUpdate();
  }

  public getBenchCount(): number {
    let count = 0;
    for (const unit of this.units.values()) {
      if (unit.isBench && unit.isPlayerOwned) count++;
    }
    return count;
  }

  public getBoardPlayerUnits(): Unit[] {
    const list: Unit[] = [];
    for (const unit of this.units.values()) {
      if (!unit.isBench && unit.isPlayerOwned) list.push(unit);
    }
    return list;
  }

  private emitBenchUpdate() {
    const count = this.getBenchCount();
    EventBus.emit('bench-count-updated', count);
  }

  public destroy() {
    for (const unit of this.units.values()) {
      unit.destroy();
    }
    this.units.clear();
  }
}
