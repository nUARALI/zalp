import type { Coord, PlayerId, Ship, ShotRecord, ShotResult } from '../types';

/** Вход тренера: только данные партии (история + флоты). Никакого React/DOM. */
export interface CoachInput {
  shots: ShotRecord[];
  fleets: Record<PlayerId, Ship[]>;
}

/** Один потопленный (или нет) корабль противника в метриках. */
export interface SunkInfo {
  shipId: number;
  length: number;
  /** Порядковый номер выстрела игрока, потопившего корабль (1-based), или null. */
  sunkOnShot: number | null;
  /** Лишние выстрелы при добивании сверх минимума (длина − 1 интервал). */
  extraShots: number;
}

/** Упущенное добивание: после попадания выстрел ушёл в другое место. */
export interface MissedFinish {
  /** Порядковый номер выстрела игрока (1-based). */
  moveNumber: number;
  at: Coord;
  result: ShotResult;
}

/** Ключевой момент: охота мимо сильной клетки по карте плотностей. */
export interface KeyMoment {
  moveNumber: number;
  chosen: Coord;
  chosenScore: number;
  better: Coord;
  betterScore: number;
  why: string;
}

export interface CoachMetrics {
  totalShots: number;
  hits: number;
  accuracy: number;
  sunk: SunkInfo[];
  sunkCount: number;
  longestStreak: number;
  extraFinishing: number;
  huntShots: number;
  huntEven: number;
  huntEvenShare: number;
  missedFinishes: number;
}

/** JSON-сериализуемый разбор партии. */
export interface CoachAnalysis {
  /** heatmap[y][x]: порядковый номер выстрела игрока (1-based) или null. */
  heatmap: (number | null)[][];
  /** resultMap[y][x]: результат выстрела игрока или null. */
  resultMap: (ShotResult | null)[][];
  metrics: CoachMetrics;
  missed: MissedFinish[];
  keyMoments: KeyMoment[];
  tips: string[];
  sunkShipIds: number[];
}
