# Залп — Морской бой для Narxoz Incubator

Веб-игра «Морской бой» 10x10. Рабочее название «Залп».

## Правила

- Поле 10x10, флот: 1x4, 2x3, 3x2, 4x1.
- Корабли не касаются друг друга (даже по диагонали).
- Попал — ходишь снова.
- После потопления соседние клетки автоматически помечаются как промахи.
- Повторный выстрел в клетку запрещён.

## Архитектура

- Вся игровая логика — чистый TypeScript в `src/game/`, без React и DOM.
- Состояние — JSON-сериализуемый объект, пригоден для LocalStorage и Supabase.
- ИИ соперника использует только историю выстрелов, а не расположение кораблей игрока.
- Логика покрыта тестами Vitest (`npm test`).

## Команды

- `npm run dev` — запуск в разработке
- `npm test` — тесты движка
- `npm run build` — сборка

## Использованные технологии

- [React](https://react.dev/) — UI-библиотека
- [Vite](https://vite.dev/) + [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) — сборка и dev-сервер
- [TypeScript](https://www.typescriptlang.org/) — типизация
- [Tailwind CSS](https://tailwindcss.com/) + [@tailwindcss/vite](https://tailwindcss.com/docs/installation/using-vite) — стили, тёмная морская тема
- [Vitest](https://vitest.dev/) — тесты игровой логики
