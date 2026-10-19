import { useState } from 'react';
import { GameContainer } from './components/GameContainer';
import { HUD } from './components/HUD';
import type { PlayerState } from './types';
import './App.css';

export function App() {
  const [player, setPlayer] = useState<PlayerState>({
    hp: 100,
    maxHp: 100,
    gold: 10,
    level: 1,
    xp: 0,
    round: 1,
  });

  const handleStartRound = () => {
    setPlayer((prev) => ({
      ...prev,
      gold: prev.gold + 5,
      round: prev.round + 1,
    }));
  };

  return (
    <div className="game-root">
      <HUD player={player} onStartRound={handleStartRound} />
      <main className="game-center">
        <GameContainer />
      </main>
    </div>
  );
}

export default App;
