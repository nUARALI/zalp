import type { Coord, ShotResult } from '../types';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Сложная',
};

/** Один выстрел компьютера, известный ИИ. */
export interface AIShot {
  at: Coord;
  result: ShotResult;
}

/**
 * Знания ИИ — ТОЛЬКО история выстрелов компьютера и их результаты.
 * Никаких досок, флотов и координат кораблей игрока здесь нет.
 */
export interface AIKnowledge {
  shots: AIShot[];
}

/** Параметр ГПСЧ: seed, функция или undefined (Math.random). */
export type RngParam = number | (() => number) | undefined;

export function emptyKnowledge(): AIKnowledge {
  return { shots: [] };
}
