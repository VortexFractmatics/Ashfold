import type { RegionDef, Tile } from "../types";
import { DOORS, NPCS, REGIONS } from "../data/world";
import { hash, rng } from "../engine/path";

export type Building = { x: number; y: number; w: number; h: number; roof: string; name?: string };
export type Prop = { x: number; y: number; kind: string };

export type MapData = {
  id: string;
  w: number;
  h: number;
  tiles: Tile[];
  buildings: Building[];
  props: Prop[];
  spawns: { x: number; y: number; who: string }[];
  fishKind: "shrimp" | "perch" | "eel" | "lobster" | "shark";
};

function idx(m: MapData, x: number, y: number) {
  return y * m.w + x;
}
function inb(m: MapData, x: number, y: number) {
  return x >= 0 && y >= 0 && x < m.w && y < m.h;
}
function set(m: MapData, x: number, y: number, t: Tile) {
  if (inb(m, x, y)) m.tiles[idx(m, x, y)] = t;
}
function get(m: MapData, x: number, y: number): Tile {
  return inb(m, x, y) ? m.tiles[idx(m, x, y)] : "wall";
}
function fill(m: MapData, x: number, y: number, w: number, h: number, t: Tile) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(m, x + i, y + j, t);
}
function rect(m: MapData, x: number, y: number, w: number, h: number, wall: Tile, floor: Tile) {
  fill(m, x, y, w, h, wall);
  fill(m, x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2), floor);
}
function scatter(m: MapData, t: Tile, n: number, rand: () => number, ok: (x: number, y: number) => boolean) {
  let g = 0;
  while (n > 0 && g++ < n * 20) {
    const x = 1 + Math.floor(rand() * (m.w - 2));
    const y = 1 + Math.floor(rand() * (m.h - 2));
    if (!ok(x, y)) continue;
    set(m, x, y, t);
    n--;
  }
}

const GROUND: Record<string, Tile> = {
  town: "grass", city: "plaza", woods: "grass", mine: "dirt", forge: "ash",
  coast: "sand", swamp: "swamp", bandit: "dirt", wild: "dirt", undead: "dirt",
  castle: "plaza", desert: "sand", north: "snow", dungeon: "floor", river: "grass",
  ruins: "dirt",
};

export function buildMap(id: string): MapData {
  const def = REGIONS[id];
  if (!def) throw new Error(id);
  const m: MapData = {
    id, w: def.w, h: def.h,
    tiles: new Array(def.w * def.h).fill(GROUND[def.kind] ?? "grass"),
    buildings: [], props: [], spawns: [],
    fishKind: def.kind === "coast" ? (id === "lanternspit" ? "lobster" : "perch") : id === "reedbarge" ? "eel" : "shrimp",
  };
  const rand = rng(hash(id + ":map"));
  if (def.indoor) indoor(m, def, rand);
  else if (id === "millwake") millwake(m, rand);
  else if (id === "greyhaven") greyhaven(m, rand);
  else outdoor(m, def, rand);
  for (const d of DOORS.filter((d) => d.from === id)) {
    set(m, d.x, d.y, "door");
  }
  for (const n of Object.values(NPCS)) {
    if (n.region !== id) continue;
    placeNpc(m, n.id, rand);
  }
  return m;
}

function placeNpc(m: MapData, who: string, rand: () => number) {
  if (m.spawns.some((s) => s.who === who)) return;
  if (who === "ora_salt" && m.id === "millwake") {
    m.spawns.push({ x: 9, y: 30, who });
    return;
  }
  if (who === "mill_hand" && m.id === "millwake") {
    m.spawns.push({ x: 16, y: 19, who });
    return;
  }
  if (who === "pale_hermit" && m.id === "paleroad") {
    m.spawns.push({ x: 28, y: 20, who });
    return;
  }
  if (who === "bell_drowned" && m.id === "sunkenyard") {
    m.spawns.push({ x: 32, y: 22, who });
    return;
  }
  if (who === "scribe_fallen" && m.id === "kingsfall") {
    m.spawns.push({ x: 32, y: 22, who });
    return;
  }
  if (who === "voss_tally" && m.id === "greyhaven") {
    m.spawns.push({ x: 22, y: 18, who });
    return;
  }
  if (who === "ren_rooftop" && m.id === "greyhaven") {
    m.spawns.push({ x: 34, y: 16, who });
    return;
  }
  if (who === "under_voice" && m.id === "underkiln") {
    m.spawns.push({ x: 28, y: 18, who });
    return;
  }
  if (who === "keeper_depth" && m.id === "deepvault") {
    m.spawns.push({ x: 32, y: 20, who });
    return;
  }
  const spots: { x: number; y: number }[] = [];
  for (let y = 2; y < m.h - 2; y++) {
    for (let x = 2; x < m.w - 2; x++) {
      const t = get(m, x, y);
      if (t === "floor" || t === "plaza" || t === "path" || t === "dock") spots.push({ x, y });
    }
  }
  const s = spots[Math.floor(rand() * Math.max(1, spots.length))] ?? { x: (m.w / 2) | 0, y: (m.h / 2) | 0 };
  m.spawns.push({ x: s.x, y: s.y, who });
}

function millwake(m: MapData, rand: () => number) {
  fill(m, 0, 0, m.w, m.h, "grass");
  // river west
  for (let y = 0; y < m.h; y++) {
    const w = 6 + Math.floor(Math.sin(y * 0.18) * 1.5);
    fill(m, 0, y, w, 1, "water");
    if (y > 12) set(m, w, y, "dock");
    if (y % 3 === 0) set(m, w + 1, y, "reeds");
  }
  fill(m, 6, 26, 6, 8, "dock");
  for (let x = 8; x <= 12; x++) set(m, x, 28 + ((x + 1) % 2), "fish");
  // roads
  fill(m, 26, 0, 4, m.h, "path"); // north-south
  fill(m, 8, 20, m.w - 8, 4, "path"); // east-west
  fill(m, 26, 38, 4, 4, "path");
  // plaza
  fill(m, 20, 14, 16, 14, "plaza");
  fill(m, 24, 17, 8, 8, "plaza");
  m.props.push({ x: 28, y: 21, kind: "well" });
  // mill building west of plaza — south wall sits on the bible door at 15,18
  stampBuilding(m, 12, 13, 7, 6, "#6a5040", "Hada's Mill");
  set(m, 15, 18, "door");
  set(m, 13, 15, "range");
  m.spawns.push({ x: 16, y: 19, who: "mill_hand" });
  // inn east — south wall on bible door 38,19
  stampBuilding(m, 35, 14, 7, 6, "#5a4038", "The Spare Room");
  set(m, 38, 19, "door");
  // houses
  stampBuilding(m, 18, 6, 6, 5, "#5a4840", "Cottage");
  stampBuilding(m, 32, 6, 6, 5, "#4a4038", "Cottage");
  stampBuilding(m, 42, 24, 6, 5, "#504840", "Cottage");
  stampBuilding(m, 16, 30, 6, 5, "#4a4038", "Cottage");
  // stalls
  set(m, 22, 18, "stall");
  set(m, 33, 18, "stall");
  set(m, 24, 24, "crate");
  set(m, 32, 24, "crate");
  // shrine + bank booth near mill
  set(m, 20, 16, "shrine");
  set(m, 31, 16, "bank");
  set(m, 34, 22, "range");
  set(m, 21, 22, "anvil");
  // a few trees in reach of the plaza so the mill's first job is not a hike
  set(m, 40, 20, "tree");
  set(m, 41, 24, "tree");
  set(m, 39, 26, "tree");
  set(m, 19, 28, "tree");
  set(m, 17, 24, "willow");
  set(m, 16, 22, "tree");
  // trees NE and SE, not plaza
  scatter(m, "tree", 28, rand, (x, y) => get(m, x, y) === "grass" && (x > 40 || y < 10 || y > 32));
  scatter(m, "oak", 6, rand, (x, y) => get(m, x, y) === "grass" && x > 42);
  scatter(m, "willow", 4, rand, (x, y) => get(m, x, y) === "grass" && x < 18 && y > 8);
  scatter(m, "flax", 8, rand, (x, y) => get(m, x, y) === "grass" && x > 40 && y > 28);
  fill(m, 44, 8, 8, 6, "farm");
  scatter(m, "hops", 4, rand, (x, y) => get(m, x, y) === "grass");
  // cows field
  fill(m, 40, 28, 10, 8, "dirt");
  m.props.push({ x: 44, y: 31, kind: "fence" });
  // lanterns along plaza
  m.props.push({ x: 21, y: 15, kind: "lamp" }, { x: 34, y: 15, kind: "lamp" }, { x: 21, y: 26, kind: "lamp" }, { x: 34, y: 26, kind: "lamp" });
}

function greyhaven(m: MapData, rand: () => number) {
  fill(m, 0, 0, m.w, m.h, "grass");
  fill(m, 8, 6, m.w - 16, m.h - 12, "plaza");
  fill(m, 26, 0, 4, m.h, "path");
  fill(m, 0, 20, m.w, 4, "path");
  // walls
  for (let x = 8; x < m.w - 8; x++) {
    set(m, x, 6, "wall");
    set(m, x, m.h - 7, "wall");
  }
  for (let y = 6; y < m.h - 6; y++) {
    set(m, 8, y, "wall");
    set(m, m.w - 9, y, "wall");
  }
  fill(m, 26, 6, 4, 2, "path");
  fill(m, 26, m.h - 8, 4, 2, "path");
  fill(m, 8, 20, 2, 4, "path");
  fill(m, m.w - 10, 20, 2, 4, "path");
  stampBuilding(m, 14, 10, 9, 7, "#4a4a58", "Warden's Offices");
  set(m, 18, 16, "door");
  stampBuilding(m, 34, 10, 8, 6, "#5a4038", "Counting House");
  stampBuilding(m, 14, 26, 7, 6, "#4a4038", "Inn");
  stampBuilding(m, 36, 26, 8, 6, "#3a3a48", "Barracks");
  set(m, 22, 22, "bank");
  set(m, 30, 18, "shrine");
  set(m, 24, 24, "stall");
  set(m, 32, 24, "stall");
  set(m, 28, 28, "range");
  scatter(m, "tree", 10, rand, (x, y) => get(m, x, y) === "grass");
  m.props.push({ x: 28, y: 20, kind: "fountain" });
  m.props.push({ x: 16, y: 20, kind: "lamp" }, { x: 40, y: 20, kind: "lamp" });
}

function outdoor(m: MapData, def: RegionDef, rand: () => number) {
  const ground = GROUND[def.kind] ?? "grass";
  fill(m, 0, 0, m.w, m.h, ground);
  // roads to edges
  const cx = (m.w / 2) | 0, cy = (m.h / 2) | 0;
  fill(m, cx - 1, 0, 3, m.h, "path");
  fill(m, 0, cy - 1, m.w, 3, "path");
  if (def.kind === "woods") {
    scatter(m, "tree", 70, rand, (x, y) => get(m, x, y) === "grass" && Math.abs(x - cx) > 2 && Math.abs(y - cy) > 2);
    scatter(m, "oak", 18, rand, (x, y) => get(m, x, y) === "grass");
    if (def.id === "greenrest") scatter(m, "yew", 6, rand, (x, y) => get(m, x, y) === "grass" && y < 12);
    scatter(m, "willow", 8, rand, (x, y) => get(m, x, y) === "grass");
    scatter(m, "flax", 12, rand, (x, y) => get(m, x, y) === "grass");
    scatter(m, "trap", 6, rand, (x, y) => get(m, x, y) === "grass");
    fill(m, cx - 6, cy - 5, 12, 10, "dirt");
    fill(m, cx - 4, cy - 3, 8, 6, "plaza");
  }
  if (def.kind === "mine") {
    fill(m, 0, 0, m.w, m.h, "dirt");
    fill(m, cx - 1, 0, 3, m.h, "path");
    fill(m, 0, cy - 1, m.w, 3, "path");
    for (let i = 0; i < 18; i++) {
      const x = 3 + Math.floor(rand() * (m.w - 8));
      const y = 3 + Math.floor(rand() * (m.h - 8));
      fill(m, x, y, 3 + (rand() * 4) | 0, 2 + (rand() * 3) | 0, "wall");
    }
    scatter(m, "copper", 14, rand, (x, y) => get(m, x, y) === "dirt");
    scatter(m, "tin", 12, rand, (x, y) => get(m, x, y) === "dirt");
    scatter(m, "iron", def.id === "ironveil" ? 16 : 6, rand, (x, y) => get(m, x, y) === "dirt");
    scatter(m, "coal", 8, rand, (x, y) => get(m, x, y) === "dirt");
    scatter(m, "stone", 10, rand, (x, y) => get(m, x, y) === "dirt");
    scatter(m, "clay", 8, rand, (x, y) => get(m, x, y) === "dirt");
    fill(m, cx - 5, 10, 10, 8, "plaza");
  }
  if (def.kind === "forge") {
    fill(m, 0, 0, m.w, m.h, "ash");
    fill(m, cx - 1, 0, 3, m.h, "path");
    scatter(m, "lava", 16, rand, (x, y) => Math.abs(x - cx) > 3);
    scatter(m, "coal", 10, rand, (x, y) => get(m, x, y) === "ash");
    scatter(m, "iron", 6, rand, (x, y) => get(m, x, y) === "ash");
    fill(m, 34, 14, 14, 12, "plaza");
    set(m, 36, 16, "furnace");
    set(m, 38, 16, "furnace");
    set(m, 36, 18, "anvil");
    set(m, 38, 18, "anvil");
  }
  if (def.kind === "coast") {
    fill(m, 0, Math.floor(m.h * 0.55), m.w, m.h, "water");
    fill(m, 0, Math.floor(m.h * 0.5), m.w, 3, "sand");
    fill(m, 12, Math.floor(m.h * 0.48), 14, 4, "dock");
    for (let x = 4; x < m.w - 4; x += 3) set(m, x, Math.floor(m.h * 0.52), "fish");
    fill(m, 10, 8, 16, 12, "plaza");
    scatter(m, "tree", 8, rand, (x, y) => get(m, x, y) === "sand" || get(m, x, y) === "grass");
  }
  if (def.kind === "swamp") {
    fill(m, 0, 0, m.w, m.h, "swamp");
    fill(m, cx - 1, 0, 3, m.h, "path");
    scatter(m, "water", 40, rand, (x, y) => Math.abs(x - cx) > 2);
    scatter(m, "deep", 12, rand, (x, y) => get(m, x, y) === "water");
    scatter(m, "reeds", 20, rand, (x, y) => get(m, x, y) === "swamp");
    scatter(m, "mushroom", 10, rand, (x, y) => get(m, x, y) === "swamp");
    scatter(m, "tree", 16, rand, (x, y) => get(m, x, y) === "swamp");
    fill(m, cx - 5, cy - 4, 10, 8, "dirt");
  }
  if (def.kind === "bandit") {
    fill(m, 0, 0, m.w, m.h, "dirt");
    fill(m, cx - 2, 0, 5, m.h, "path");
    fill(m, 0, cy - 2, m.w, 5, "path");
    stampBuilding(m, cx - 6, 10, 10, 8, "#3a2a28", "Cut Hall");
    scatter(m, "tree", 12, rand, (x, y) => get(m, x, y) === "dirt");
    scatter(m, "crate", 8, rand, (x, y) => get(m, x, y) === "dirt");
    m.props.push({ x: cx, y: cy + 4, kind: "fire" });
  }
  if (def.kind === "wild") {
    scatter(m, "tree", 20, rand, (x, y) => get(m, x, y) === "dirt" || get(m, x, y) === "grass");
    scatter(m, "grave", 12, rand, (x, y) => get(m, x, y) === "dirt");
    scatter(m, "stone", 10, rand, (x, y) => true);
    scatter(m, "shrine", 2, rand, (x, y) => get(m, x, y) === "path" || get(m, x, y) === "dirt");
  }
  if (def.kind === "undead") {
    fill(m, 0, 0, m.w, m.h, "dirt");
    scatter(m, "grave", 28, rand, (x, y) => Math.abs(x - cx) > 2);
    scatter(m, "water", def.id === "sunkenyard" ? 40 : 8, rand, () => true);
    fill(m, cx - 6, cy - 5, 12, 10, "plaza");
    set(m, cx, cy, "shrine");
    scatter(m, "tree", 8, rand, (x, y) => get(m, x, y) === "dirt");
  }
  if (def.kind === "castle") {
    fill(m, 10, 8, m.w - 20, m.h - 16, "plaza");
    rect(m, 18, 12, 20, 16, "wall", "plaza");
    fill(m, cx - 1, 12, 3, 2, "path");
    stampBuilding(m, cx - 5, 14, 10, 8, "#4a4a58", "Keep");
  }
  if (def.kind === "desert") {
    fill(m, 0, 0, m.w, m.h, "sand");
    fill(m, cx - 1, 0, 3, m.h, "path");
    scatter(m, "stone", 10, rand, (x, y) => get(m, x, y) === "sand");
    scatter(m, "crystal", def.id === "glassmere" ? 10 : 2, rand, (x, y) => get(m, x, y) === "sand");
    fill(m, cx - 6, cy - 5, 12, 10, "plaza");
  }
  if (def.kind === "north") {
    fill(m, 0, 0, m.w, m.h, "snow");
    fill(m, cx - 1, 0, 3, m.h, "path");
    scatter(m, "ice", 30, rand, (x, y) => Math.abs(x - cx) > 2);
    scatter(m, "water", def.id === "moonwell" ? 12 : 4, rand, (x, y) => get(m, x, y) === "ice" || get(m, x, y) === "snow");
    fill(m, cx - 5, cy - 4, 10, 8, "plaza");
    if (def.id === "moonwell") {
      fill(m, cx - 3, cy - 3, 6, 6, "water");
      set(m, cx, cy, "altar");
    }
  }
  if (def.kind === "dungeon") {
    fill(m, 0, 0, m.w, m.h, "wall");
    fill(m, 2, 2, m.w - 4, m.h - 4, "floor");
    for (let i = 0; i < 12; i++) {
      fill(m, 4 + Math.floor(rand() * (m.w - 10)), 4 + Math.floor(rand() * (m.h - 10)), 2 + (rand() * 6) | 0, 2, "wall");
    }
    scatter(m, "lava", 10, rand, (x, y) => get(m, x, y) === "floor");
    scatter(m, "coal", 8, rand, (x, y) => get(m, x, y) === "floor");
    if (def.id === "deepvault") scatter(m, "runite", 6, rand, (x, y) => get(m, x, y) === "floor");
    if (def.id === "underkiln") {
      scatter(m, "mithril", 4, rand, (x, y) => get(m, x, y) === "floor");
      set(m, cx, 10, "furnace");
    }
  }
  if (def.kind === "river") {
    for (let y = 0; y < m.h; y++) fill(m, 0, y, 10 + Math.floor(Math.sin(y * 0.12) * 2), 1, "water");
    fill(m, 8, 16, 12, 6, "dock");
    for (let y = 4; y < m.h - 4; y += 3) set(m, 9, y, "fish");
    scatter(m, "reeds", 20, rand, (x, y) => get(m, x, y) === "grass" && x < 16);
    fill(m, 14, 10, 12, 10, "plaza");
    scatter(m, "willow", 8, rand, (x, y) => get(m, x, y) === "grass");
  }
  if (def.kind === "ruins") {
    fill(m, 0, 0, m.w, m.h, "dirt");
    for (let i = 0; i < 10; i++) {
      const x = 6 + Math.floor(rand() * (m.w - 16));
      const y = 6 + Math.floor(rand() * (m.h - 16));
      rect(m, x, y, 6 + (rand() * 6) | 0, 5 + (rand() * 5) | 0, "wall", "floor");
    }
    fill(m, cx - 8, cy - 6, 16, 12, "plaza");
    scatter(m, "grave", 8, rand, (x, y) => get(m, x, y) === "dirt");
  }
  if (def.kind === "city" && def.id === "crowmarch") {
    fill(m, 8, 8, m.w - 16, m.h - 16, "plaza");
    stampBuilding(m, 26, 24, 10, 8, "#2a2a38", "Marshal's Hall");
    scatter(m, "stall", 8, rand, (x, y) => get(m, x, y) === "plaza");
  }
  if (def.kind === "town") {
    fill(m, cx - 6, cy - 5, 12, 10, "plaza");
    scatter(m, "tree", 16, rand, (x, y) => get(m, x, y) === "grass");
  }
  // hall plaza
  const door = DOORS.find((d) => d.from === def.id && REGIONS[d.into]?.indoor);
  if (door) {
    fill(m, door.x - 3, door.y - 3, 7, 6, "plaza");
    set(m, door.x, door.y, "door");
    stampBuilding(m, door.x - 3, door.y - 5, 7, 6, roofFor(def.kind), def.name + " Hall");
  }
  // amenity tiles
  if (!def.indoor) {
    set(m, cx + 3, cy + 2, "shrine");
    if (def.kind === "town" || def.kind === "city" || def.kind === "forge") set(m, cx - 3, cy + 2, "range");
    if (def.kind === "forge" || def.kind === "mine") set(m, cx + 2, cy - 2, "anvil");
    if (def.kind === "town" || def.kind === "woods") {
      fill(m, 4, 4, 6, 4, "farm");
    }
  }
}

function indoor(m: MapData, def: RegionDef, rand: () => number) {
  fill(m, 0, 0, m.w, m.h, "wall");
  fill(m, 1, 1, m.w - 2, m.h - 2, "floor");
  if (def.id === "mill_hall") {
    fill(m, 2, 2, m.w - 4, m.h - 4, "floor");
    set(m, 4, 4, "bank");
    set(m, 16, 4, "range");
    set(m, 5, 8, "crate");
    set(m, 14, 8, "crate");
    m.props.push({ x: 10, y: 5, kind: "wheel" });
    m.spawns.push({ x: 10, y: 7, who: "miller_hada" });
    m.spawns.push({ x: 4, y: 5, who: "clerk_venn" });
  }
  if (def.id === "mill_inn") {
    set(m, 4, 4, "bed");
    set(m, 6, 4, "bed");
    set(m, 14, 4, "range");
    set(m, 8, 6, "vat");
    m.props.push({ x: 10, y: 5, kind: "table" });
  }
  if (def.id === "mill_cellar") {
    fill(m, 1, 1, m.w - 2, m.h - 2, "dirt");
    scatter(m, "crate", 6, rand, (x, y) => get(m, x, y) === "dirt");
    scatter(m, "mushroom", 4, rand, (x, y) => get(m, x, y) === "dirt");
  }
  if (def.id === "grey_hall") {
    set(m, 4, 4, "bank");
    set(m, 18, 4, "bank");
    m.props.push({ x: 12, y: 6, kind: "desk" });
  }
  if (def.kind === "forge") {
    set(m, 5, 5, "furnace");
    set(m, 7, 5, "anvil");
  }
  if (def.id.startsWith("in_") || def.id === "grey_hall" || def.id === "mill_hall" || def.id === "mill_inn") {
    set(m, 3, 3, "bed");
    if (def.kind !== "undead") set(m, m.w - 4, 3, "range");
    if (def.kind === "woods") set(m, 5, 6, "vat");
  }
  if (def.id === "in_hallowfen") set(m, 10, 5, "shrine");
  if (def.id === "in_moonwell") set(m, 10, 5, "altar");
}

function stampBuilding(m: MapData, x: number, y: number, w: number, h: number, roof: string, name?: string) {
  fill(m, x, y, w, h, "wall");
  fill(m, x + 1, y + 1, w - 2, h - 2, "floor");
  m.buildings.push({ x, y, w, h, roof, name });
}

function roofFor(kind: string): string {
  if (kind === "woods") return "#3a5a32";
  if (kind === "coast" || kind === "river") return "#3a4a58";
  if (kind === "forge") return "#5a3030";
  if (kind === "mine") return "#4a4a48";
  if (kind === "castle" || kind === "city") return "#3a3a4a";
  if (kind === "swamp") return "#3a4a32";
  if (kind === "desert") return "#8a6a40";
  if (kind === "north") return "#6a7a88";
  if (kind === "bandit") return "#3a2a28";
  return "#5a4038";
}

const cache = new Map<string, MapData>();
export function mapOf(id: string): MapData {
  let m = cache.get(id);
  if (!m) {
    m = buildMap(id);
    cache.set(id, m);
  }
  return m;
}

export function setTile(m: MapData, x: number, y: number, t: Tile) {
  set(m, x, y, t);
}

export function tileAt(m: MapData, x: number, y: number): Tile {
  return get(m, x | 0, y | 0);
}
