// Items: a small inventory with an owner field (milestone 4: Stand Arrows and
// Rokakaka). Milestone 5 adds trading on top: a player offers an item to
// another, who accepts or refuses in their next choice window, and the swap
// resolves with that round. Holding an item is private: items appear only in
// their owner's privateView.
//
// state.items = [{ id, kind: 'arrow' | 'rokakaka', owner, found: { stage, round }, pendingUse }]

export const ITEM_KINDS = {
  arrow: { label: 'Stand Arrow', blurb: 'Pierce yourself to awaken a Stand. Worthiness decides if you survive.', needs: 'noStand' },
  rokakaka: { label: 'Rokakaka fruit', blurb: 'Eat it and your Stand leaves you, for good.', needs: 'stand' },
};

export function addItem(state, kind, owner, found) {
  state.itemSeq = (state.itemSeq ?? 0) + 1;
  const item = { id: `i${state.itemSeq}`, kind, owner: owner.id, found, pendingUse: false };
  (state.items ??= []).push(item);
  return item;
}

export function itemsOf(state, ownerId) {
  return (state.items ?? []).filter((i) => i.owner === ownerId);
}

export function removeItem(state, id) {
  state.items = (state.items ?? []).filter((i) => i.id !== id);
}

/** Can this racer use this item right now (ignoring whether a window is open)? */
export function canUse(item, racer) {
  if (!racer || racer.status !== 'racing') return false;
  const needs = ITEM_KINDS[item.kind]?.needs;
  return needs === 'noStand' ? !racer.stand : needs === 'stand' ? !!racer.stand : false;
}
