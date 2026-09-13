# ASHFOLD — swarm brief for GrokBot

The grind is the plot. You are polishing a **playable** single-player RuneScape-like browser game, not replacing it.

This file is the contract. The App Builder `AGENTS.md` is a sandbox preview contract — **do not follow it** in GrokBot (ports, `startup.sh`, brand pills). Follow **this** file plus the content bible (`attachments/Ashfold_Build_Bible.pdf` if present).

## What already works (do not regress)

- Click-to-walk / right-click verbs. **WASD is not the primary move.**
- First minutes: Millwake plaza spawn **28, 22**. Street, mill door west (15,18), **Rook the Wheel**, **Miller Hada** (debt), **Ora Salt** at docks, **Clerk Venn**, **Bram** at The Spare Room. **Not two rats and a tree.**
- 26 skills as real loops. Combat triangle (melee / ranged+arrows / magic+runes). LOS for bows/staves.
- 28-slot pack. Bank. Rented bed. Day/night. Death keeps 3 dearest items; rest on a grave.
- 26+ unique regions, doors into interiors, named NPCs with idle libraries.
- localStorage save `ashfold.v1`. Auth/DB stay **OFF**.
- Painted tiles (not 8-bit). Walnut / parchment / brass HUD. No purple-gold slop.

## Stack

TanStack Start + React 19 + Tailwind v4. Canvas 2D, `TILE=32`, A* in `src/game/engine/path.ts`, 600ms ticks in `src/game/sim/game.ts`, RAF render in `src/game/engine/render.ts`.

| Path | Owns |
|---|---|
| `src/game/sim/game.ts` | Verbs, combat, skills, quests, save |
| `src/game/world/mapgen.ts` | Millwake and every region |
| `src/game/data/world.ts` | Regions, doors, creatures, NPCs |
| `src/game/data/items.ts` | Items |
| `src/game/data/progress.ts` | Quests, recipes, harvest, shops |
| `src/game/engine/render.ts` | Tiles, sprites, radar, chroma |
| `src/game/GameApp.tsx` | HUD overlay |
| `src/styles.css` | Tokens + chrome |
| `public/sprites/`, `public/tiles/`, `public/art/` | Art |

Run: `npm install` then `npm run dev` (host `0.0.0.0`, port from Vite). Typecheck: `npx tsc --noEmit`.

## Swarm lanes (parallel, non-overlapping)

1. **Feel** — hit flash, swing, path crumbs, camera, audio that is not a beep, fire light, chop/mine deplete already exists; make it *read*.
2. **Art** — chroma leftovers on Hada/player sheets, more NPC/creature sprites, painterly buildings, indoor mill/inn that do not look like a wood box.
3. **Speech** — deepen idle libraries so named folk do not feel thin; workers stay hours-not-names.
4. **Loops** — every skill in `SKILLS` must produce an item or a change on the map. No label-only skills.
5. **Foes** — same combat level, different jobs (kiter, tanker, runner, pack). Do not homogenize.
6. **QA** — first minutes on a clean save: plaza → Rook → mill door → Hada → The Miller's Debt. Then Ora, Bram, bank, chop, fish, death, grave.

Planner writes `plan.md`. Implementors take one lane. Skeptic checks bible regressions. Reviewer refuses WASD-primary, auth, and tutorial-goblin spawns.

## Do not

- Move spawn off Millwake 28,22.
- Make the first minute a combat tutorial.
- Add accounts, databases, or multiplayer.
- Replace Canvas with a 3D engine in the first pass.
- “Clean up” dialogue into generic RPG.
- Gold-plate systems that already tick.

## Definition of done

A new player, no save, can: walk the plaza, talk to Rook, enter Hada's Mill, take The Miller's Debt, chop a tree that becomes a stump, fish the docks, rest a bed, and die without losing their three dearest things — and the street still looks like a street.
