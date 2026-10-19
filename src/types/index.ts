export type UnitClass =
  | 'Warrior'
  | 'Paladin'
  | 'Mage'
  | 'Hunter'
  | 'Rogue'
  | 'Shaman'
  | 'Druid'
  | 'Warlock'
  | 'Priest'
  | 'DeathKnight'
  | 'Boss';

export type UnitFaction = 'Alliance' | 'Horde' | 'Scourge' | 'Neutral' | 'Elemental';

export type UnitState = 'IDLE' | 'TARGETING' | 'MOVING' | 'ATTACKING' | 'CASTING' | 'DEAD';

export interface AbilityData {
  id: string;
  name: string;
  description: string;
  manaCost: number;
  damage?: number;
  heal?: number;
  aoe?: boolean;
}

export interface UnitStats {
  hp: number;
  maxHp: number;
  damage: number;
  attackSpeed: number; // Attacks per second
  range: number;       // Grid distance (1 = melee)
  armor: number;       // Physical reduction %
  mana: number;
  maxMana: number;
}

export interface UnitData {
  id: string;
  name: string;
  cost: number;
  className: UnitClass;
  faction: UnitFaction;
  stats: UnitStats;
  ability: AbilityData;
  icon?: string;
  color: number; // Hex color for stylized placeholder rendering
}

export type GridPosition = {
  col: number; // 0 to 7
  row: number; // 0 to 7 (0-3: Enemy, 4-7: Player)
};

export type GamePhase = 'PREPARATION' | 'COMBAT' | 'ROUND_END' | 'GAME_OVER';

export interface PlayerState {
  hp: number;
  maxHp: number;
  gold: number;
  level: number;
  xp: number;
  round: number;
}

export type TileZone = 'ENEMY' | 'PLAYER' | 'BENCH';

export interface BoardTileInfo {
  col: number;
  row: number; // For bench, row can be -1 or specific bench index
  zone: TileZone;
  isBench: boolean;
  benchIndex?: number;
  isOccupied: boolean;
  unitId?: string | null;
}

