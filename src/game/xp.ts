const TABLE: number[] = (() => {
  const t = [0];
  let acc = 0;
  for (let i = 1; i < 99; i++) {
    acc += Math.floor(i + 300 * Math.pow(2, i / 7)) / 4;
    t.push(Math.floor(acc));
  }
  return t;
})();

export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.min(99, Math.floor(level)));
  return TABLE[l - 1] ?? 0;
}

export function levelFromXp(xp: number): number {
  let lo = 1;
  let hi = 99;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi + 1) / 2);
    if (xpForLevel(mid) <= xp) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function combatLevel(s: Record<string, number>): number {
  const atk = levelFromXp(s.attack);
  const str = levelFromXp(s.strength);
  const def = levelFromXp(s.defence);
  const hp = levelFromXp(s.hitpoints);
  const pray = levelFromXp(s.prayer);
  const ranged = levelFromXp(s.ranged);
  const mage = levelFromXp(s.magic);
  const base = 0.25 * (def + hp + Math.floor(pray / 2));
  const melee = 0.325 * (atk + str);
  const rng = 0.325 * Math.floor(ranged * 1.5);
  const mag = 0.325 * Math.floor(mage * 1.5);
  return Math.max(3, Math.floor(base + Math.max(melee, rng, mag)));
}
