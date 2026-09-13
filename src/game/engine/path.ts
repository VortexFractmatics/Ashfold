import type { Tile } from "../types";

export const BLOCKED = new Set<Tile>([
  "wall", "deep", "lava", "water",
  "tree", "oak", "yew", "willow", "maple",
]);
export const SLOW = new Set<Tile>(["swamp", "reeds"]);
export const SLIDE = new Set<Tile>(["ice"]);
export const WATERISH = new Set<Tile>(["water", "deep", "dock", "bridge", "fish", "reeds"]);

export function walkable(t: Tile): boolean {
  return !BLOCKED.has(t);
}

type Node = { x: number; y: number; g: number; f: number; px: number; py: number };

export function astar(
  walk: (x: number, y: number) => boolean,
  w: number,
  h: number,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  cap = 2400,
): { x: number; y: number }[] | null {
  if (sx === tx && sy === ty) return [];
  if (!walk(tx, ty) || !walk(sx, sy)) return null;
  const key = (x: number, y: number) => y * w + x;
  const open: Node[] = [{ x: sx, y: sy, g: 0, f: Math.abs(tx - sx) + Math.abs(ty - sy), px: -1, py: -1 }];
  const came = new Map<number, Node>();
  const best = new Map<number, number>();
  best.set(key(sx, sy), 0);
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  let steps = 0;
  while (open.length && steps++ < cap) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur.x, cur.y);
    if (came.has(ck) && (came.get(ck)!.g <= cur.g)) continue;
    came.set(ck, cur);
    if (cur.x === tx && cur.y === ty) {
      const path: { x: number; y: number }[] = [];
      let n: Node | undefined = cur;
      while (n && (n.x !== sx || n.y !== sy)) {
        path.push({ x: n.x, y: n.y });
        n = came.get(key(n.px, n.py));
      }
      path.reverse();
      return path;
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || !walk(nx, ny)) continue;
      const g = cur.g + 1;
      const nk = key(nx, ny);
      if (g >= (best.get(nk) ?? 1e9)) continue;
      best.set(nk, g);
      open.push({ x: nx, y: ny, g, f: g + Math.abs(tx - nx) + Math.abs(ty - ny), px: cur.x, py: cur.y });
    }
  }
  return null;
}

export function los(
  walk: (x: number, y: number) => boolean,
  x0: number, y0: number, x1: number, y1: number,
): boolean {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (let i = 0; i < 80; i++) {
    if (x === x1 && y === y1) return true;
    if (!(x === x0 && y === y0) && !walk(x, y)) return false;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return false;
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 2246822519);
    s = Math.imul(s ^ (s >>> 13), 3266489917);
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}
