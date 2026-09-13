# Paste this as the first GrokBot message

/goal Shine ASHFOLD. Read GROKBOT.md, then the content bible (`attachments/Ashfold_Build_Bible.pdf`). Do not regress click-to-walk or the Millwake first minutes.

You are polishing a **playable** single-player RuneScape-like browser game named ASHFOLD (subtitle: The Long Work). The grind is the plot.

## Frozen (fail the goal if you break these)

- Click-to-walk and right-click / long-press verbs. WASD is not primary.
- Spawn: Millwake plaza **28, 22**. First minute is a street, a door, a name — **not two rats and a tree**.
- Mill door west (15, 18) → Miller Hada (debt). Rook the Wheel points at that door. Ora Salt at the docks. Clerk Venn / bank. Bram at The Spare Room (east).
- 26 skills as real loops. Combat triangle. 28-slot pack. Bank. Bed. Day/night. Death keeps 3 dearest items; rest on a grave.
- Auth and database stay OFF. localStorage save `ashfold.v1`.
- Painted (not 8-bit). Walnut / parchment / brass. No purple-gold slop.

## Lanes (parallel after plan.md)

1. **Feel** — combat juice, audio, fires, camera, chop/mine that *reads*
2. **Art** — magenta leftovers on sprites, more NPC/creature sheets, painterly interiors
3. **Speech** — deeper named idle libraries; workers stay hours-not-names
4. **Loops** — every skill in `SKILLS` must change the world or the pack
5. **Foes** — same combat level, different jobs (kite / tank / run / pack)
6. **QA** — clean save: plaza → Rook → mill door → Hada → The Miller's Debt, then Ora, Bram, bank, chop-to-stump, fish, bed, death keeps 3

Planner writes `plan.md`. Implementors take one lane. Skeptic checks bible regressions. Reviewer refuses WASD-primary, auth, and tutorial-goblin spawns.

## Stack

TanStack Start + React 19 + Tailwind v4. Canvas 2D. Core:

- `src/game/sim/game.ts` — verbs, combat, skills, quests, save
- `src/game/world/mapgen.ts` — maps
- `src/game/data/{world,items,progress}.ts` — continent, items, quests
- `src/game/engine/{render,path,audio}.ts` — draw, A*, sound
- `src/game/GameApp.tsx` + `src/styles.css` — HUD

Run: `npm install` && `npm run dev`. Typecheck: `npx tsc --noEmit`.

## Done

A new player still starts on a street, a door, and a name — and the street looks like a town someone lives in.
