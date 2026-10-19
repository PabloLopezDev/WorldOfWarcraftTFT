import { useState } from 'react';
import { GameContainer } from './components/GameContainer';
import { HUD } from './components/HUD';
import type { PlayerState } from './types';
import './App.css';

export function App() {
  const [player, setPlayer] = useState<PlayerState>({
    hp: 100,
    maxHp: 100,
    gold: 12,
    level: 2,
    xp: 2,
    round: 1,
  });

  return (
    <div className="game-root">
      {/* Fullscreen Phaser Canvas Game Engine */}
      <GameContainer />

      {/* Reactive High Fantasy HUD Layer */}
      <HUD player={player} onUpdatePlayer={setPlayer} />
    </div>
  );
}

export default App;
