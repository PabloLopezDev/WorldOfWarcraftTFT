import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../game/config';
import { ThreeSceneManager } from '../three/ThreeSceneManager';

interface GameContainerProps {
  onGameReady?: (game: Phaser.Game) => void;
}

export const GameContainer: React.FC<GameContainerProps> = ({ onGameReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Clean any residual children
    containerRef.current.innerHTML = '';

    const config = createGameConfig(containerRef.current);
    const game = new Phaser.Game(config);
    gameRef.current = game;

    if (threeCanvasRef.current) {
      ThreeSceneManager.getInstance().init(threeCanvasRef.current);
    }

    if (onGameReady) {
      onGameReady(game);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onGameReady]);

  return (
    <div className="canvas-stack-wrapper">
      <div ref={containerRef} className="phaser-canvas-container" />
      <canvas ref={threeCanvasRef} className="three-canvas-layer" />
    </div>
  );
};

