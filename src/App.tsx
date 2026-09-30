import { useCallback, useEffect, useRef, useState } from 'react';
import AppHeader from './components/AppHeader';
import BoardView from './components/BoardView';
import {
  FLEET_SPEC,
  chooseShot,
  createEmptyBoard,
  createInitialGameState,
  fire,
  getShipCells,
  knowledgeFromShots,
  placeFleetRandomly,
  placeShip,
  removeShip,
  startBattle,
  type Coord,
  type Difficulty,
  type GameState,
} from './game';
import { buildGameRow, newMatchId, saveFinishedGame } from './lib/games';
import { getSupabase } from './lib/supabase';
import { useAuth } from './lib/useAuth';
import { clearGame, loadGame, saveGame } from './storage';
import BattleScreen from './screens/BattleScreen';
import MenuScreen from './screens/MenuScreen';
import PlacementScreen from './screens/PlacementScreen';
import ProfileScreen from './screens/ProfileScreen';
import ResultScreen from './screens/ResultScreen';

type Screen = 'menu' | 'placement' | 'battle' | 'result' | 'profile';

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
  const [matchId, setMatchId] = useState<string>(() => newMatchId());
  const [startedAtMs, setStartedAtMs] = useState<number>(() => Date.now());
  const [toast, setToast] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);
  const savedMatches = useRef<Set<string>>(new Set());
  const screenBeforeProfile = useRef<Screen>('menu');

  const { user, loading: authLoading } = useAuth();

  // Восстановление после перезагрузки: партия продолжается с того же места
  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      setGame(saved.state);
      setDifficulty(saved.difficulty);
      setMatchId(saved.matchId);
      setStartedAtMs(saved.startedAtMs);
      setScreen(screenForPhase(saved.state.phase));
      setHasSave(true);
    }
  }, []);

  // Сохранение после каждого изменения партии
  useEffect(() => {
    if (game) {
      saveGame(game, difficulty, matchId, startedAtMs);
      setHasSave(true);
    }
  }, [game, difficulty, matchId, startedAtMs]);

  // Переход на экран результата при завершении
  useEffect(() => {
    if (game?.phase === 'finished') {
      setScreen('result');
    }
  }, [game?.phase]);

  // Автоскрытие уведомления
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Автосейв завершённой партии в Supabase (один раз, идемпотентно по id).
  // Гостем — пропускаем. Ошибка сети игру не ломает, только уведомление.
  useEffect(() => {
    if (!game || game.phase !== 'finished' || !user) return;
    if (savedMatches.current.has(matchId)) return;
    const client = getSupabase();
    if (!client) return;
    savedMatches.current.add(matchId);
    const row = buildGameRow(matchId, game, difficulty, startedAtMs);
    saveFinishedGame(client, row).then((res) => {
      if (res.ok) {
        setToast({ text: 'Партия сохранена в профиль.', kind: 'ok' });
      } else {
        setToast({ text: res.errorRu ?? 'Не удалось сохранить партию.', kind: 'err' });
      }
    });
  }, [game, user, matchId, difficulty, startedAtMs]);

  // Ход компьютера с задержкой ~700 мс. ИИ видит только историю выстрелов.
  useEffect(() => {
    if (!game || game.phase !== 'battle' || game.currentPlayer !== 'computer') {
      return;
    }
    const t = window.setTimeout(() => {
      try {
        // Честно: только история выстрелов компьютера, без досок игрока
        const target = chooseShot(knowledgeFromShots(game.shots), difficulty);
        setGame(fire(game, target));
      } catch {
        // Нет доступных клеток или повтор — игнорируем, партия уже почти окончена
      }
    }, 700);
    return () => window.clearTimeout(t);
  }, [game, difficulty]);

  const startFresh = useCallback((g: GameState, next: Screen) => {
    setMatchId(newMatchId());
    setStartedAtMs(Date.now());
    setGame(g);
    setScreen(next);
  }, []);

  const handlePlay = useCallback(() => {
    startFresh(newPlacementGame(), 'placement');
  }, [startFresh]);

  const handleContinue = useCallback(() => {
    const saved = loadGame();
    if (saved) {
      setGame(saved.state);
      setDifficulty(saved.difficulty);
      setMatchId(saved.matchId);
      setStartedAtMs(saved.startedAtMs);
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
    startFresh(newQuickBattleGame(), 'battle');
  }, [startFresh]);

  const handleNewGame = useCallback(() => {
    clearGame();
    setGame(null);
    setHasSave(false);
    setMatchId(newMatchId());
    setStartedAtMs(Date.now());
    setScreen('menu');
  }, []);

  const handleBackToMenu = useCallback(() => {
    setScreen('menu');
  }, []);

  const handleProfile = useCallback(() => {
    screenBeforeProfile.current = screen === 'profile' ? 'menu' : screen;
    setScreen('profile');
  }, [screen]);

  const handleProfileBack = useCallback(() => {
    const prev = screenBeforeProfile.current;
    if (prev === 'profile') {
      setScreen('menu');
      return;
    }
    if ((prev === 'battle' || prev === 'placement' || prev === 'result') && !game) {
      setScreen('menu');
      return;
    }
    setScreen(prev);
  }, [game]);

  const handleHome = useCallback(() => {
    if (game) setScreen(screenForPhase(game.phase));
    else setScreen('menu');
  }, [game]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#020d1a] text-slate-200">
      <AppHeader
        user={user}
        authLoading={authLoading}
        onHome={handleHome}
        onProfile={handleProfile}
        screen={screen}
      />
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
        {screen === 'profile' && <ProfileScreen user={user} onBack={handleProfileBack} guestInput={game} />}
        {toast && (
          <div
            role="status"
            className={`fixed bottom-4 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl px-4 py-2 text-sm shadow-lg ${
              toast.kind === 'ok' ? 'bg-emerald-600 text-white' : 'bg-rose-700 text-white'
            }`}
          >
            {toast.text}
          </div>
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
