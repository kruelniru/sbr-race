// Stage Plan lookups. Data lives in data/plans.js.
import PLANS from '../../data/plans.js';

const BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p]));

export function getPlan(id) {
  return BY_ID[id] ?? null;
}

/** The racer's Stage Plan this stage (PCs only; others have none). */
export function planOf(racer) {
  return racer?.plan ? BY_ID[racer.plan] ?? null : null;
}

/** Plans a racer can pick in this stage (enabled, stage allowed). */
export function plansFor(stage) {
  return PLANS.filter((p) => p.enabled && (!p.stages || p.stages.includes(stage.id)));
}
