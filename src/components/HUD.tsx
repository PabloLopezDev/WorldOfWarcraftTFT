import React from 'react';
import type { PlayerState } from '../types';

interface HUDProps {
  player: PlayerState;
  onStartRound?: () => void;
}

export const HUD: React.FC<HUDProps> = ({ player, onStartRound }) => {
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

      {/* RIGHT SIDE PANEL: PLAYERS LEADERBOARD */}
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
      </aside>

      {/* BOTTOM CONTROLS PLACEHOLDER FOR ETAPA 1 */}
      <footer className="hud-bottom-bar">
        <div className="hud-panel bottom-status">
          <div className="stage-note">
            <span className="gold-text">ETAPA 1 ACTIVA:</span> Arquitectura base React + TypeScript + Phaser 3 lista.
          </div>
          <button className="wow-btn start-round-btn" onClick={onStartRound}>
            ⚔️ COMENZAR RONDA (PREVIEW)
          </button>
        </div>
      </footer>
    </div>
  );
};
