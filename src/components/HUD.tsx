import React, { useEffect, useState } from 'react';
import type { PlayerState, BoardTileInfo } from '../types';
import { EventBus } from '../game/EventBus';

interface HUDProps {
  player: PlayerState;
  onStartRound?: () => void;
}

export const HUD: React.FC<HUDProps> = ({ player, onStartRound }) => {
  const [activeTile, setActiveTile] = useState<BoardTileInfo | null>(null);

  useEffect(() => {
    const handleTileHover = (tile: BoardTileInfo) => {
      setActiveTile(tile);
    };

    const handleTileOut = () => {
      // Keep selected tile or null
    };

    const handleTileSelected = (tile: BoardTileInfo) => {
      setActiveTile(tile);
    };

    EventBus.on('tile-hover', handleTileHover);
    EventBus.on('tile-out', handleTileOut);
    EventBus.on('tile-selected', handleTileSelected);

    return () => {
      EventBus.off('tile-hover', handleTileHover);
      EventBus.off('tile-out', handleTileOut);
      EventBus.off('tile-selected', handleTileSelected);
    };
  }, []);

  return (
    <div className="game-hud">
      {/* TOP BAR */}
      <header className="hud-top-bar">
        <div className="hud-panel stat-box hp-box">
          <span className="icon">❤️</span>
          <span className="value">{player.hp} / {player.maxHp} HP</span>
        </div>

        <div className="hud-panel round-indicator">
          <span className="round-badge">⚔️ RONDA {player.round} ⚔️</span>
          <span className="phase-text">FASE DE PREPARACIÓN</span>
        </div>

        <div className="hud-panel stat-box gold-level-box">
          <div className="stat-pill gold">
            <span className="icon">🪙</span>
            <span className="value">{player.gold} ORO</span>
          </div>
          <div className="stat-pill level">
            <span className="icon">⭐</span>
            <span className="value">NIVEL {player.level}</span>
          </div>
        </div>
      </header>

      {/* RIGHT SIDE PANEL: PLAYERS LEADERBOARD & TILE INSPECTOR */}
      <aside className="hud-right-panel hud-panel">
        <div className="panel-header">
          <h3>JUGADORES</h3>
        </div>
        <ul className="players-list">
          <li className="player-row active">
            <span className="rank">1.</span>
            <span className="name">Tú</span>
            <span className="hp">❤️ {player.hp}</span>
          </li>
          <li className="player-row">
            <span className="rank">2.</span>
            <span className="name">Thrall</span>
            <span className="hp">❤️ 100</span>
          </li>
          <li className="player-row">
            <span className="rank">3.</span>
            <span className="name">Arthas</span>
            <span className="hp">❤️ 100</span>
          </li>
          <li className="player-row">
            <span className="rank">4.</span>
            <span className="name">Jaina</span>
            <span className="hp">❤️ 100</span>
          </li>
        </ul>

        {/* TILE INSPECTOR */}
        <div className="tile-inspector">
          <div className="inspector-title">CASILLA TÁCTICA</div>
          {activeTile ? (
            <div className={`tile-detail ${activeTile.zone.toLowerCase()}`}>
              <div className="tile-coords">
                {activeTile.isBench
                  ? `Banco Slot #${(activeTile.benchIndex ?? 0) + 1}`
                  : `Columna ${activeTile.col + 1}, Fila ${activeTile.row + 1}`}
              </div>
              <div className="tile-zone-badge">
                {activeTile.zone === 'PLAYER' && '🛡️ ZONA ALIADA (PERMITIDO)'}
                {activeTile.zone === 'ENEMY' && '⚔️ ZONA ENEMIGA (RESTRINGIDO)'}
                {activeTile.zone === 'BENCH' && '📦 BANCO DE RESERVA'}
              </div>
            </div>
          ) : (
            <div className="tile-detail empty">
              Pasa el cursor sobre una casilla del tablero
            </div>
          )}
        </div>
      </aside>

      {/* BOTTOM CONTROLS */}
      <footer className="hud-bottom-bar">
        <div className="hud-panel bottom-status">
          <div className="stage-note">
            <span className="gold-text">ETAPA 2 ACTIVA:</span> Tablero táctico 8x4 jugador / 8x4 enemigo + Banco de 8 espacios.
          </div>
          <button className="wow-btn start-round-btn" onClick={onStartRound}>
            ⚔️ COMENZAR RONDA (PREVIEW)
          </button>
        </div>
      </footer>
    </div>
  );
};
