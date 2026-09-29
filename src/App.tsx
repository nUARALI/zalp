import { useCallback, useEffect, useState } from 'react';
import BoardView from './components/BoardView';
import {
  FLEET_SPEC,
  chooseAiShot,
  createEmptyBoard,
  createInitialGameState,
  fire,
  getShipCells,
  placeFleetRandomly,
  placeShip,
  removeShip,
  startBattle,
  type Coord,
  type Difficulty,
  type GameState,
} from './game';
import { clearGame, loadGame, saveGame } from './storage';
import BattleScreen from './screens/BattleScreen';
import MenuScreen from './screens/MenuScreen';
import PlacementScreen from './screens/PlacementScreen';
import ResultScreen from './screens/ResultScreen';

type Screen = 'menu' | 'placement' | 'battle' | 'result';

function screenForPhase(phase: GameState['phase']): Screen {
  if (phase === 'placement') return 'placement';
  if (phase === 'battle') return 'battle';
  return 'result';
}

function newPlacementGame(): GameState {
  const base = createInitialGameState();
  const computer = placeFleetRandomly();
  return {
    ...base,
    boards: { ...base.boards, computer: computer.board },
    fleets: { ...base.fleets, computer: computer.ships },
  };
}

function newQuickBattleGame(): GameState {
  const base = createInitialGameState();
  const player = placeFleetRandomly();
  const computer = placeFleetRandomly();
  const withFleets: GameState = {
    ...base,
    boards: { player: player.board, computer: computer.board },
    fleets: { player: player.ships, computer: computer.ships },
  };
  return startBattle(withFleets);
}

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [horizontal, setHorizontal] = useState(true);
  const [screen, setScreen] = useState<Screen>('menu');
  const [hasSave, setHasSave] = useState(false);

  // Восстановление после перезагрузки: партия продолжается с того же места
  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      setGame(saved.state);
      setDifficulty(saved.difficulty);
      setScreen(screenForPhase(saved.state.phase));
      setHasSave(true);
    }
  }, []);

  // Сохранение после каждого изменения партии
  useEffect(() => {
    if (game) {
      saveGame(game, difficulty);
      setHasSave(true);
    }
  }, [game, difficulty]);

  // Переход на экран результата при завершении
  useEffect(() => {
    if (game?.phase === 'finished') {
      setScreen('result');
    }
  }, [game?.phase]);

  // Ход компьютера с задержкой ~700 мс. ИИ видит только историю выстрелов.
  useEffect(() => {
    if (!game || game.phase !== 'battle' || game.currentPlayer !== 'computer') {
      return;
    }
    const t = window.setTimeout(() => {
      try {
        const target = chooseAiShot(game.shots, difficulty);
        setGame(fire(game, target));
      } catch {
        // Нет доступных клеток или повтор — игнорируем, партия уже почти окончена
      }
    }, 700);
    return () => window.clearTimeout(t);
  }, [game, difficulty]);

  const handlePlay = useCallback(() => {
    const g = newPlacementGame();
    setGame(g);
    setScreen('placement');
  }, []);

  const handleContinue = useCallback(() => {
    const saved = loadGame();
    if (saved) {
      setGame(saved.state);
      setDifficulty(saved.difficulty);
      setScreen(screenForPhase(saved.state.phase));
    } else if (game) {
      setScreen(screenForPhase(game.phase));
    }
  }, [game]);

  const handlePlace = useCallback(
    (c: Coord) => {
      if (!game || game.phase !== 'placement') return;
      const nextLength = FLEET_SPEC[game.fleets.player.length];
      if (nextLength === undefined) return;
      try {
        const cells = getShipCells(c, nextLength, horizontal);
        const res = placeShip(game.boards.player, game.fleets.player, cells);
        setGame({
          ...game,
          boards: { ...game.boards, player: res.board },
          fleets: { ...game.fleets, player: res.ships },
        });
      } catch {
        // недопустимая позиция — подсветка уже показала красным
      }
    },
    [game, horizontal],
  );

  const handleRemoveAt = useCallback(
    (c: Coord) => {
      if (!game || game.phase !== 'placement') return;
      const ship = game.fleets.player.find((s) =>
        s.cells.some((cell) => cell.x === c.x && cell.y === c.y),
      );
      if (!ship) return;
      const res = removeShip(game.boards.player, game.fleets.player, ship.id);
      setGame({
        ...game,
        boards: { ...game.boards, player: res.board },
        fleets: { ...game.fleets, player: res.ships },
      });
    },
    [game],
  );

  const handleRandom = useCallback(() => {
    if (!game) return;
    const rnd = placeFleetRandomly();
    setGame({
      ...game,
      boards: { ...game.boards, player: rnd.board },
      fleets: { ...game.fleets, player: rnd.ships },
    });
  }, [game]);

  const handleReset = useCallback(() => {
    if (!game) return;
    setGame({
      ...game,
      boards: { ...game.boards, player: createEmptyBoard() },
      fleets: { ...game.fleets, player: [] },
    });
  }, [game]);

  const handleToBattle = useCallback(() => {
    if (!game) return;
    try {
      const next = startBattle(game);
      setGame(next);
      setScreen('battle');
    } catch {
      // флот не готов — кнопка должна быть disabled, это страховка
    }
  }, [game]);

  const handleShoot = useCallback(
    (c: Coord) => {
      if (!game || game.phase !== 'battle' || game.currentPlayer !== 'player') {
        return;
      }
      try {
        setGame(fire(game, c));
      } catch {
        // повторный выстрел — игнорируем
      }
    },
    [game],
  );

  const handleSurrender = useCallback(() => {
    if (!game) return;
    setGame({ ...game, phase: 'finished', winner: 'computer' });
  }, [game]);

  const handleRematch = useCallback(() => {
    const g = newQuickBattleGame();
    setGame(g);
    setScreen('battle');
  }, []);

  const handleNewGame = useCallback(() => {
    clearGame();
    setGame(null);
    setHasSave(false);
    setScreen('menu');
  }, []);

  const handleBackToMenu = useCallback(() => {
    setScreen('menu');
  }, []);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#020d1a] text-slate-200">
      <div className="mx-auto w-full max-w-3xl">
        {screen === 'menu' && (
          <MenuScreen
            difficulty={difficulty}
            onDifficulty={setDifficulty}
            onPlay={handlePlay}
            hasSave={hasSave || game !== null}
            onContinue={handleContinue}
          />
        )}
        {screen === 'placement' && game && (
          <PlacementScreen
            game={game}
            horizontal={horizontal}
            onToggleRotate={() => setHorizontal((h) => !h)}
            onPlace={handlePlace}
            onRemoveAt={handleRemoveAt}
            onRandom={handleRandom}
            onReset={handleReset}
            onToBattle={handleToBattle}
            onBack={handleBackToMenu}
          />
        )}
        {screen === 'battle' && game && (
          <BattleScreen game={game} onShoot={handleShoot} onSurrender={handleSurrender} />
        )}
        {screen === 'result' && game && (
          <ResultScreen game={game} onRematch={handleRematch} onNewGame={handleNewGame} />
        )}
        {/* Страховка: превью доски никогда не должно вызывать скролл на 375px */}
        {import.meta.env.DEV && (
          <div className="hidden">
            <BoardView board={createEmptyBoard()} label="dev" />
          </div>
        )}
      </div>
    </div>
  );
}
