# ASHFOLD — The Long Work

Single-player mill-town game. Click to walk. Verb menus. 26 skills. Combat triangle.

Spawn is Millwake plaza — mill door, miller with a debt, fishwife, bank clerk, a bed.

## Source

- `src/game/sim/game.ts` — simulation, combat, harvest, save
- `src/game/engine/` — pathfinding, render, audio
- `src/game/data/` — items, world, quests, skills
- `src/game/world/mapgen.ts` — regions and tiles
- `src/game/GameApp.tsx` — HUD
- `src/game/types.ts` / `xp.ts` — types and XP table

TanStack Start, React 19, Canvas 2D. Save is `localStorage` key `ashfold.v1`.

```bash
npm install
npm run dev
```
