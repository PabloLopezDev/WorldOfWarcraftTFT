import React, { useEffect, useState } from 'react';
import type { PlayerState, BoardTileInfo, UnitData } from '../types';
import { EventBus } from '../game/EventBus';
import { Shop } from './Shop';
import { INITIAL_UNITS } from '../data/units';

interface HUDProps {
  player: PlayerState;
  onUpdatePlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
}

export const HUD: React.FC<HUDProps> = ({ player, onUpdatePlayer }) => {
  const [activeTile, setActiveTile] = useState<BoardTileInfo | null>(null);
  const [shopUnits, setShopUnits] = useState<UnitData[]>(INITIAL_UNITS.slice(0, 5));

  useEffect(() => {
    const handleTileHover = (tile: BoardTileInfo) => setActiveTile(tile);
    const handleTileOut = () => {};
    const handleTileSelected = (tile: BoardTileInfo) => setActiveTile(tile);

    EventBus.on('tile-hover', handleTileHover);
    EventBus.on('tile-out', handleTileOut);
    EventBus.on('tile-selected', handleTileSelected);

    return () => {
      EventBus.off('tile-hover', handleTileHover);
      EventBus.off('tile-out', handleTileOut);
      EventBus.off('tile-selected', handleTileSelected);
    };
  }, []);

  const handleReroll = () => {
    if (player.gold < 2) return;
    onUpdatePlayer((prev) => ({ ...prev, gold: prev.gold - 2 }));
    // Shuffle or regenerate 5 units
    const shuffled = [...INITIAL_UNITS].sort(() => 0.5 - Math.random());
    setShopUnits(shuffled.slice(0, 5));
  };

  const handleBuyXp = () => {
    if (player.gold < 4) return;
    onUpdatePlayer((prev) => {
      const newXp = prev.xp + 4;
      if (newXp >= 4) {
        return {
          ...prev,
          gold: prev.gold - 4,
          level: prev.level + 1,
          xp: newXp - 4,
        };
      }
      return { ...prev, gold: prev.gold - 4, xp: newXp };
    });
  };

  const handleBuyUnit = (unit: UnitData, index: number) => {
    if (player.gold < unit.cost) return;

    onUpdatePlayer((prev) => ({ ...prev, gold: prev.gold - unit.cost }));

    // Empty slot in shop
    setShopUnits((prev) => {
      const copy = [...prev];
      // Keep empty or placeholder
      return copy.filter((_, i) => i !== index);
    });

    // Notify Phaser game bus
    EventBus.emit('unit-purchased', unit);
  };

  return (
    <div className="game-hud-overlay">
      {/* 1. TOP BAR */}
      <header className="hud-top-bar-ref">
        {/* Alliance Crest & HP */}
        <div className="top-left-group">
          <div className="alliance-shield-badge">
            <span className="crest-lion">🦁</span>
          </div>
          <div className="player-hp-pill">
            <span className="hp-heart">❤️</span>
            <span className="hp-value">{player.hp}</span>
          </div>
        </div>

        {/* Center Stage & Economy Pill */}
        <div className="top-center-pill">
          <span className="stage-round">1-3</span>
          <span className="swords-icon">⚔️</span>
          <span className="gold-pill">🪙 {player.gold}</span>
          <span className="level-pill">⭐ Nivel {player.level}</span>
          <button className="settings-btn" title="Ajustes">⚙️</button>
        </div>

        {/* Right Top Status (Placeholder) */}
        <div className="top-right-group">
          <button className="gold-hud-btn" onClick={() => onUpdatePlayer((prev) => ({ ...prev, gold: prev.gold + 5 }))}>
            +5 🪙 (Test)
          </button>
        </div>
      </header>

      {/* 2. LEFT PANEL: SYNERGIES */}
      <aside className="hud-left-synergies">
        <div className="synergy-row">
          <div className="synergy-icon alliance">🦁</div>
          <div className="synergy-info">
            <div className="synergy-title">Alianza</div>
            <div className="synergy-tiers">
              <span className="active-tier">2</span>
              <span className="tier-steps">2 / 4 / 6</span>
            </div>
          </div>
        </div>

        <div className="synergy-row">
          <div className="synergy-icon warrior">⚔️</div>
          <div className="synergy-info">
            <div className="synergy-title">Guerreros</div>
            <div className="synergy-tiers">
              <span className="active-tier">2</span>
              <span className="tier-steps">2 / 4 / 6</span>
            </div>
          </div>
        </div>

        <div className="synergy-row">
          <div className="synergy-icon mage">🔮</div>
          <div className="synergy-info">
            <div className="synergy-title">Hechicero</div>
            <div className="synergy-tiers">
              <span className="active-tier">1</span>
              <span className="tier-steps">3</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 3. RIGHT PANEL: PLAYERS LEADERBOARD */}
      <aside className="hud-right-players">
        <div className="player-score-card active-user">
          <div className="player-avatar-ring">👤</div>
          <div className="player-meta">
            <span className="player-name">Tú</span>
            <span className="player-health">100</span>
          </div>
        </div>

        <div className="player-score-card">
          <div className="player-avatar-ring orc">🪓</div>
          <div className="player-meta">
            <span className="player-name">Thrall</span>
            <span className="player-health">82</span>
          </div>
        </div>

        <div className="player-score-card">
          <div className="player-avatar-ring knight">🛡️</div>
          <div className="player-meta">
            <span className="player-name">Arthas</span>
            <span className="player-health">76</span>
          </div>
        </div>

        <div className="player-score-card">
          <div className="player-avatar-ring jaina">✨</div>
          <div className="player-meta">
            <span className="player-name">Jaina</span>
            <span className="player-health">63</span>
          </div>
        </div>

        {/* Tactical tile mini status */}
        {activeTile && (
          <div className="hud-tile-tooltip">
            <span className="tooltip-zone">
              {activeTile.zone === 'PLAYER' && '🟦 Tu Territorio'}
              {activeTile.zone === 'ENEMY' && '🟥 Territorio Enemigo'}
              {activeTile.zone === 'BENCH' && '🟩 Banco'}
            </span>
            <span className="tooltip-coords">
              {activeTile.isBench ? `Slot #${(activeTile.benchIndex ?? 0) + 1}` : `${activeTile.col + 1}, ${activeTile.row + 1}`}
            </span>
          </div>
        )}
      </aside>

      {/* 4. BOTTOM BAR: SHOP */}
      <footer className="hud-bottom-shop-bar">
        <Shop
          units={shopUnits}
          gold={player.gold}
          xp={player.xp}
          level={player.level}
          onBuyUnit={handleBuyUnit}
          onReroll={handleReroll}
          onBuyXp={handleBuyXp}
        />
      </footer>
    </div>
  );
};
