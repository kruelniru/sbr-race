// Private phone notes for a PC (no dependencies, so any engine module can use them).

/**
 * A phone alert for this PC (milestone 7a): queued now, shown with the round's
 * private update after the reveal (race.js syncShown), like the other alerts.
 */
export function addAlert(racer, level, title, text) {
  if (racer?.tier !== 'pc') return;
  (racer.pendingAlerts ??= []).push({ level, title, text });
}

/** A private line on this PC's phone (shown after the round's reveal). */
export function addHint(racer, text, ctx) {
  if (racer?.tier !== 'pc') return;
  (racer.hints ??= []).push({ text, stage: ctx?.stage?.id ?? 0, round: ctx?.roundLabel ?? '' });
  if (racer.hints.length > 12) racer.hints.splice(0, racer.hints.length - 12);
}
