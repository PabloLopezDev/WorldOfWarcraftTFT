import React from 'react';
import type { UnitData } from '../types';

interface ShopProps {
  units: UnitData[];
  gold: number;
  xp: number;
  level: number;
  onBuyUnit: (unit: UnitData, index: number) => void;
  onReroll: () => void;
  onBuyXp: () => void;
}

export const Shop: React.FC<ShopProps> = ({
  units,
  gold,
  xp,
  level: _level,
  onBuyUnit,
  onReroll,
  onBuyXp,
}) => {
  const getCostBorderClass = (cost: number) => {
    switch (cost) {
      case 1:
        return 'tier-1'; // Common (Gray/Bronze)
      case 2:
        return 'tier-2'; // Uncommon (Green)
      case 3:
        return 'tier-3'; // Rare (Blue)
      case 4:
        return 'tier-4'; // Epic (Purple)
      case 5:
        return 'tier-5'; // Legendary (Gold)
      default:
        return 'tier-1';
    }
  };

  const getFactionIcon = (faction: string) => {
    switch (faction) {
      case 'Alliance':
        return '🦁';
      case 'Horde':
        return '🩸';
      default:
        return '🌿';
    }
  };

  const getClassIcon = (className: string) => {
    switch (className) {
      case 'Warrior':
        return '⚔️';
      case 'Paladin':
        return '🛡️';
      case 'Mage':
        return '🔮';
      case 'Hunter':
        return '🏹';
      case 'Shaman':
        return '⚡';
      default:
        return '✨';
    }
  };

  return (
    <div className="hud-shop-container">
      {/* LEFT: REROLL / ACTUALIZAR TIENDA */}
      <div className="shop-left-panel">
        <div className="shop-label">
          <span className="trophy-icon">🏆</span> Tienda
        </div>
        <button
          className={`shop-reroll-btn ${gold < 2 ? 'disabled' : ''}`}
          onClick={onReroll}
          disabled={gold < 2}
        >
          <span className="reroll-icon">🔄</span>
          <div className="reroll-text">
            <span>Actualizar</span>
            <span className="cost-tag">🪙 2</span>
          </div>
        </button>
      </div>

      {/* CENTER: 5 UNIT CARDS */}
      <div className="shop-cards-deck">
        {units.map((unit, index) => {
          const borderClass = getCostBorderClass(unit.cost);
          const canAfford = gold >= unit.cost;

          return (
            <div
              key={`${unit.id}-${index}`}
              className={`shop-unit-card ${borderClass} ${!canAfford ? 'cant-afford' : ''}`}
              onClick={() => canAfford && onBuyUnit(unit, index)}
            >
              {/* Card Header */}
              <div className="card-top">
                <span className="unit-name">{unit.name}</span>
                <span className="unit-cost">🪙 {unit.cost}</span>
              </div>

              {/* Card Illustration / Portrait */}
              <div
                className="card-portrait"
                style={{
                  background: `radial-gradient(circle at 50% 40%, #${unit.color.toString(16).padStart(6, '0')}44 0%, #0a0e17 80%)`,
                }}
              >
                <div className="portrait-icon">{getClassIcon(unit.className)}</div>
              </div>

              {/* Card Traits / Synergies */}
              <div className="card-traits">
                <div className="trait-row">
                  <span className="trait-icon">{getFactionIcon(unit.faction)}</span>
                  <span className="trait-name">{unit.faction === 'Alliance' ? 'Alianza' : unit.faction === 'Horde' ? 'Horda' : 'Bestias'}</span>
                </div>
                <div className="trait-row">
                  <span className="trait-icon">{getClassIcon(unit.className)}</span>
                  <span className="trait-name">{unit.className}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* RIGHT: BUY XP & GOLD STATUS */}
      <div className="shop-right-panel">
        <div className="shop-economy-info">
          <div className="gold-indicator">
            <span className="gold-coin">🪙</span>
            <span className="gold-count">{gold}</span>
          </div>
          <div className="xp-indicator">
            <span className="xp-star">⭐</span>
            <span className="xp-count">{xp}/4 XP</span>
          </div>
        </div>

        <button
          className={`shop-buy-xp-btn ${gold < 4 ? 'disabled' : ''}`}
          onClick={onBuyXp}
          disabled={gold < 4}
        >
          <span>Comprar XP</span>
          <span className="cost-tag">🪙 4</span>
        </button>
      </div>

      {/* FAR RIGHT: DPS METER PLACEHOLDER */}
      <div className="shop-dps-meter">
        <div className="dps-header">⚔️ Daño infligido</div>
        <div className="dps-empty">--</div>
      </div>
    </div>
  );
};
