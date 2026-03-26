import React, { useState, useEffect, useRef, useCallback } from 'react';

// Constants
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const GAME_SPEED = 100;

const TRACKS = [
  { id: 1, title: "NULL_POINTER_EXCEPTION", artist: "SYS_ADMIN", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: 2, title: "MEMORY_LEAK", artist: "KERNEL_PANIC", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: 3, title: "SEGMENTATION_FAULT", artist: "ROOTKIT", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
];

type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number };

const generateFood = (snake: {x: number, y: number}[]) => {
  let newFood;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    const onSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    if (!onSnake) break;
  }
  return newFood;
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef<number>(0);

  // UI State synced from Game Loop
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  // Audio State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Mutable Game State (avoids React re-renders during loop)
  const gameState = useRef({
    snake: [...INITIAL_SNAKE],
    dir: { ...INITIAL_DIRECTION },
    nextDir: { ...INITIAL_DIRECTION },
    food: generateFood(INITIAL_SNAKE),
    particles: [] as Particle[],
    shake: 0,
    lastMoveTime: 0,
    lastTime: 0,
    score: 0,
    gameOver: false,
    started: false,
  });

  const resetGame = useCallback(() => {
    gameState.current = {
      ...gameState.current,
      snake: [...INITIAL_SNAKE],
      dir: { ...INITIAL_DIRECTION },
      nextDir: { ...INITIAL_DIRECTION },
      food: generateFood(INITIAL_SNAKE),
      particles: [],
      shake: 0,
      score: 0,
      gameOver: false,
      started: true,
    };
    setScore(0);
    setIsGameOver(false);
    setIsStarted(true);
  }, []);

  const spawnParticles = (x: number, y: number) => {
    for (let i = 0; i < 15; i++) {
      gameState.current.particles.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 500,
        maxLife: 500,
      });
    }
  };

  const update = useCallback((time: number) => {
    if (!gameState.current.lastTime) gameState.current.lastTime = time;
    const deltaTime = time - gameState.current.lastTime;
    gameState.current.lastTime = time;

    // Update Particles
    gameState.current.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= deltaTime;
    });
    gameState.current.particles = gameState.current.particles.filter(p => p.life > 0);

    // Update Shake
    if (gameState.current.shake > 0) {
      gameState.current.shake -= deltaTime * 0.05;
      if (gameState.current.shake < 0) gameState.current.shake = 0;
    }

    // Move Snake
    if (gameState.current.started && !gameState.current.gameOver) {
      if (time - gameState.current.lastMoveTime > GAME_SPEED) {
        gameState.current.lastMoveTime = time;
        const state = gameState.current;
        state.dir = state.nextDir;

        const head = state.snake[0];
        const newHead = { x: head.x + state.dir.x, y: head.y + state.dir.y };

        // Wall collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          state.gameOver = true;
          state.shake = 20;
          setIsGameOver(true);
        }
        // Self collision
        else if (state.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          state.gameOver = true;
          state.shake = 20;
          setIsGameOver(true);
        } else {
          state.snake.unshift(newHead);

          // Food collision
          if (newHead.x === state.food.x && newHead.y === state.food.y) {
            state.score += 10;
            state.shake = 10;
            spawnParticles(newHead.x, newHead.y);
            state.food = generateFood(state.snake);
            setScore(state.score);
            setHighScore(prev => Math.max(prev, state.score));
          } else {
            state.snake.pop();
          }
        }
      }
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  }, []);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();
    
    // Apply Shake
    if (gameState.current.shake > 0) {
      const dx = (Math.random() - 0.5) * gameState.current.shake;
      const dy = (Math.random() - 0.5) * gameState.current.shake;
      ctx.translate(dx, dy);
    }

    // Grid (Faint Cyan)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += CELL_SIZE) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
    }

    // Draw Food (Magenta)
    const food = gameState.current.food;
    ctx.fillStyle = '#FF00FF';
    ctx.shadowColor = '#FF00FF';
    ctx.shadowBlur = 10;
    // Glitch food occasionally
    if (Math.random() < 0.1) {
      ctx.fillRect(food.x * CELL_SIZE + (Math.random()*4-2), food.y * CELL_SIZE + (Math.random()*4-2), CELL_SIZE, CELL_SIZE);
    } else {
      ctx.fillRect(food.x * CELL_SIZE + 2, food.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }
    ctx.shadowBlur = 0;

    // Draw Snake (Cyan)
    gameState.current.snake.forEach((segment, i) => {
      ctx.fillStyle = i === 0 ? '#FFFFFF' : '#00FFFF';
      
      // Glitch effect on snake
      if (Math.random() < 0.05) {
        ctx.fillStyle = Math.random() > 0.5 ? '#FF00FF' : '#00FFFF';
        ctx.fillRect(segment.x * CELL_SIZE + (Math.random()*6-3), segment.y * CELL_SIZE + (Math.random()*6-3), CELL_SIZE, CELL_SIZE);
      } else {
        ctx.fillRect(segment.x * CELL_SIZE + 1, segment.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      }
    });

    // Draw Particles
    gameState.current.particles.forEach(p => {
      ctx.fillStyle = `rgba(255, 0, 255, ${p.life / p.maxLife})`;
      ctx.fillRect(p.x, p.y, 4, 4);
    });

    ctx.restore();
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      const state = gameState.current;

      if (!state.started && e.key === " ") {
        resetGame();
        return;
      }

      if (state.gameOver && e.key === " ") {
        resetGame();
        return;
      }

      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (state.dir.y !== 1) state.nextDir = { x: 0, y: -1 };
          break;
        case 'ArrowDown': case 's': case 'S':
          if (state.dir.y !== -1) state.nextDir = { x: 0, y: 1 };
          break;
        case 'ArrowLeft': case 'a': case 'A':
          if (state.dir.x !== 1) state.nextDir = { x: -1, y: 0 };
          break;
        case 'ArrowRight': case 'd': case 'D':
          if (state.dir.x !== -1) state.nextDir = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetGame]);

  // Audio Controls
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Audio error:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skipForward = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const skipBackward = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio error:", e));
      }
    }
  }, [currentTrackIndex]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#00FFFF] font-mono flex flex-col p-4 crt-flicker selection:bg-[#FF00FF]/50 selection:text-white">
      <div className="scanlines"></div>
      
      <audio ref={audioRef} src={TRACKS[currentTrackIndex].url} onEnded={skipForward} preload="auto" />

      {/* Header */}
      <header className="w-full max-w-5xl mx-auto mb-8 border-b-4 border-[#00FFFF] pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white glitch-text screen-tear" data-text="SNAKE_PROTOCOL">
            SNAKE_PROTOCOL
          </h1>
          <p className="text-[#FF00FF] mt-2 tracking-widest text-sm">SYS.VER.9.0.1 // UNAUTHORIZED_ACCESS</p>
        </div>
        <div className="hidden md:block text-right text-xs text-[#00FFFF]/50">
          <p>MEM: 0x00F4C2</p>
          <p>CPU: 99%</p>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row gap-8 items-center lg:items-start max-w-5xl w-full mx-auto justify-center z-10">
        
        {/* Left Panel: Stats & Audio */}
        <div className="flex flex-col gap-6 w-full max-w-sm order-2 lg:order-1">
          
          {/* Score Board */}
          <div className="border-4 border-[#00FFFF] bg-black p-4 relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[#00FFFF]/5 pointer-events-none"></div>
            <h2 className="text-[#FF00FF] border-b-2 border-[#FF00FF] pb-2 mb-4"> [ SCORE_REGISTRY ] </h2>
            
            <div className="flex justify-between items-center mb-2">
              <span>CURRENT_YIELD:</span>
              <span className="text-2xl text-white">{score}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>MAX_CAPACITY:</span>
              <span className="text-xl text-[#FF00FF]">{highScore}</span>
            </div>
          </div>

          {/* Audio Player */}
          <div className="border-4 border-[#FF00FF] bg-black p-4 relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[#FF00FF]/5 pointer-events-none"></div>
            <h2 className="text-[#00FFFF] border-b-2 border-[#00FFFF] pb-2 mb-4"> [ AUDIO_STREAM ] </h2>
            
            <div className="mb-4">
              <div className="text-xs text-[#FF00FF] mb-1">TRACK_{currentTrackIndex + 1}:</div>
              <div className="text-lg text-white truncate">{TRACKS[currentTrackIndex].title}</div>
              <div className="text-sm text-[#00FFFF]/70 truncate">BY: {TRACKS[currentTrackIndex].artist}</div>
            </div>

            <div className="flex items-center justify-between border-t-2 border-[#FF00FF]/30 pt-4">
              <button onClick={skipBackward} className="px-3 py-1 border-2 border-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-colors">
                [ &lt;&lt; ]
              </button>
              
              <button onClick={togglePlay} className="px-4 py-2 border-2 border-[#FF00FF] text-[#FF00FF] hover:bg-[#FF00FF] hover:text-black transition-colors font-bold">
                {isPlaying ? '[ PAUSE ]' : '[ PLAY ]'}
              </button>
              
              <button onClick={skipForward} className="px-3 py-1 border-2 border-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-colors">
                [ &gt;&gt; ]
              </button>
            </div>
            
            {/* Raw Visualizer */}
            <div className="flex items-end justify-between h-8 mt-4 gap-1">
              {[...Array(16)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-full bg-[#00FFFF] ${isPlaying ? 'animate-pulse' : 'opacity-30'}`}
                  style={{ 
                    height: isPlaying ? `${Math.max(10, Math.random() * 100)}%` : '10%',
                    animationDuration: `${0.1 + Math.random() * 0.3}s`
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Instructions */}
          <div className="border-2 border-dashed border-[#00FFFF]/50 p-4 text-sm text-[#00FFFF]/80">
            <p className="mb-2">&gt; INPUT_REQUIRED:</p>
            <p>&gt; USE [W,A,S,D] OR [ARROWS] TO NAVIGATE</p>
            <p>&gt; PRESS [SPACE] TO EXECUTE</p>
          </div>
        </div>

        {/* Right Panel: Canvas */}
        <div className="order-1 lg:order-2 relative w-full max-w-[500px] aspect-square">
          <div className="absolute -inset-2 bg-[#FF00FF] opacity-20 blur-lg animate-pulse pointer-events-none"></div>
          
          <div className="relative w-full h-full border-4 border-[#00FFFF] bg-black overflow-hidden">
            <canvas 
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="w-full h-full object-contain"
            />

            {/* Overlays */}
            {!isStarted && !isGameOver && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                <div className="glitch-text text-3xl mb-8 text-white" data-text="AWAITING_INPUT">AWAITING_INPUT</div>
                <button 
                  onClick={resetGame}
                  className="px-6 py-2 border-2 border-[#00FFFF] text-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-colors text-xl"
                >
                  [ INITIALIZE ]
                </button>
              </div>
            )}

            {isGameOver && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20">
                <div className="glitch-text text-4xl mb-4 text-[#FF00FF]" data-text="FATAL_ERROR">FATAL_ERROR</div>
                <p className="text-[#00FFFF] mb-8 text-lg">YIELD: {score}</p>
                <button 
                  onClick={resetGame}
                  className="px-6 py-2 border-2 border-[#FF00FF] text-[#FF00FF] hover:bg-[#FF00FF] hover:text-black transition-colors text-xl"
                >
                  [ REBOOT_SYSTEM ]
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
