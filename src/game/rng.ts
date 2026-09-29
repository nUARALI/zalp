/**
 * Детерминированный ГПСЧ для тестов и случайной расстановки.
 * mulberry32 — маленький, быстрый, сериализуемый через seed.
 */

/** Создать функцию rng() => [0, 1) из числового seed. */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Нормализовать аргумент в rng-функцию: число -> seeded, функция -> как есть, иначе Math.random. */
export function normalizeRng(
  seedOrRng?: number | (() => number),
): () => number {
  if (typeof seedOrRng === 'function') return seedOrRng;
  if (typeof seedOrRng === 'number') return createSeededRng(seedOrRng);
  return Math.random;
}
