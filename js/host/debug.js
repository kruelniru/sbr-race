// Host-only debug tools (open host.html?debug=1). Debug bots are ordinary AI
// racers; these buttons are just quicker ways to add and clear them.

/** Adds up to `count` AI racers. */
export function addBots(lobby, count) {
  return lobby.addAiRacers(count);
}

export function removeBots(lobby) {
  lobby.removeAllAi();
}
