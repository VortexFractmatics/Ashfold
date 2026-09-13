export const SKILLS = [
  "attack",
  "strength",
  "defence",
  "hitpoints",
  "ranged",
  "prayer",
  "magic",
  "woodcutting",
  "mining",
  "fishing",
  "cooking",
  "firemaking",
  "smithing",
  "crafting",
  "thieving",
  "agility",
  "slayer",
  "farming",
  "fletching",
  "herblore",
  "runecraft",
  "hunter",
  "construction",
  "sailing",
  "brewing",
  "masonry",
] as const;

export type SkillId = (typeof SKILLS)[number];

export type WearSlot = "weapon" | "shield" | "head" | "body" | "legs" | "neck";

export type Stance = "accurate" | "aggressive" | "defensive";

export type PrayerId = "protect" | "strength" | "restore" | "smite";

export type EntityKind = "player" | "npc" | "creature" | "worker" | "caravan";

export type Tile =
  | "grass"
  | "path"
  | "plaza"
  | "floor"
  | "dirt"
  | "farm"
  | "sand"
  | "ice"
  | "swamp"
  | "dock"
  | "shrine"
  | "bank"
  | "bed"
  | "anvil"
  | "furnace"
  | "range"
  | "vat"
  | "altar"
  | "grave"
  | "stairs"
  | "water"
  | "deep"
  | "wall"
  | "tree"
  | "oak"
  | "yew"
  | "willow"
  | "maple"
  | "flax"
  | "clay"
  | "stone"
  | "copper"
  | "tin"
  | "iron"
  | "coal"
  | "mithril"
  | "adamant"
  | "runite"
  | "mushroom"
  | "trap"
  | "lava"
  | "snow"
  | "ash"
  | "reeds"
  | "crystal"
  | "hops"
  | "fish"
  | "door"
  | "bridge"
  | "stall"
  | "crate";

export type ItemDef = {
  id: string;
  name: string;
  slot: WearSlot | null;
  stack: boolean;
  gp: number;
  atk: number;
  str: number;
  def: number;
  heal: number;
  need?: { skill: SkillId; level: number };
  examine: string;
};

export type Stack = { id: string; qty: number };

export type CreatureDef = {
  id: string;
  name: string;
  hp: number;
  atk: number;
  str: number;
  def: number;
  xp: number;
  aggressive: boolean;
  homes: string[];
  drops: { id: string; p: number; n?: number }[];
  hue: string;
  size: number;
};

export type NpcDef = {
  id: string;
  name: string;
  role: "quest" | "shop" | "bank" | "tutor" | "slayer";
  region: string;
  sprite?: string;
  hair: string;
  cloth: string;
  accent: string;
  read: string;
  idle: string[];
  shop?: string;
};

export type QuestDef = {
  id: string;
  name: string;
  difficulty: string;
  region: string;
  giver: string;
  needs: string[];
  blurb: string;
  steps: QuestStep[];
  payXp: Partial<Record<SkillId, number>>;
  payItems: Record<string, number>;
  unlock?: string[];
};

export type QuestStep =
  | { kind: "talk"; said: string[] }
  | { kind: "bring"; item: string; qty: number; said: string[] }
  | { kind: "give"; item: string; qty: number; said: string[] }
  | { kind: "kill"; creature?: string; qty: number; said: string[] }
  | { kind: "bury"; item: string; qty: number; said: string[] }
  | { kind: "choice"; prompt: string; a: string; b: string; saidA: string[]; saidB: string[] }
  | { kind: "sleep" }
  | { kind: "deposit"; gp: number }
  | { kind: "harvest"; tile: Tile; qty: number; said: string[] };

export type Recipe = {
  out: string;
  n: number;
  skill: SkillId;
  lvl: number;
  station: "ground" | "range" | "furnace" | "anvil" | "vat";
  from: Record<string, number>;
  xp: number;
  burn?: number;
};

export type Harvest = {
  tile: Tile;
  skill: SkillId;
  lvl: number;
  ticks: number;
  xp: number;
  tool?: "hatchet" | "pickaxe" | "net" | "rod" | "harpoon";
  yield: string;
  yqty: number;
};

export type RegionDef = {
  id: string;
  name: string;
  kind: string;
  danger: number;
  w: number;
  h: number;
  n?: string;
  e?: string;
  s?: string;
  wdir?: string;
  blurb: string;
  wealth: number;
  produces: string[];
  indoor?: boolean;
};

export type DoorDef = { from: string; x: number; y: number; into: string; lx: number; ly: number };

export type ShopDef = { id: string; keeper: string; stock: { id: string; qty: number; gp: number }[] };
