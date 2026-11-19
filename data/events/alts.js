// Alternative texts for the most repeated event lines (milestone 7d), keyed by
// event id. Each alternative has the same roles, effects and tags as the
// original. The engine picks the least-used text, and each text is used at
// most rules.lineCap times a game (js/engine/events.js).
//
// Runners can be the focus of any event that doesn't ask for a horse, so
// those lines never mention the focus's own horse, saddle, spurs or gallop.
export default {
  'common-good-rhythm': [
    '{a} settles into an easy pace and eats up the miles.',
    "The trail is kind to {a} today. {a.They} make{a:s} good time.",
    '{a} keeps a steady pace from dawn to dusk and passes three riders without trying.',
    '{a} finds the right line through the scrub and stays on it all afternoon.',
    'Everything goes right for {a} for once: good ground, good weather, good time.',
  ],
  'common-wrong-fork': [
    'Someone has turned a trail marker around, and {a} loses an hour finding the way back.',
    'Fresh tracks lead {a} the wrong way for an hour.',
    'A washed-out sign sends {a} down the wrong valley.',
    "A road on {a}'s map turns out to be a dead end.",
    '{a} gets turned around in the fog and has to double back at noon.',
  ],
  'common-thrown-shoe': [
    '{a.horse} pulls up lame on a stone, and {a} walks the next few miles.',
    '{a} spends an hour picking a stone out of {a.horse}\'s hoof.',
    '{a.horse} loses a shoe in the mud, and {a} is a long way from the nearest smithy.',
    '{a.horse} balks at a creek, and {a} loses an hour coaxing it across.',
    'A loose shoe on {a.horse} costs {a} the morning.',
  ],
  'common-ride-past': [
    '{b} is stuck in a ditch, calling out. {a} keeps going.',
    '{a} sees {b} sitting hurt by the trail and looks the other way.',
    '{b} asks {a} for water. {a} does not stop.',
    '{b} waves both arms from a broken wagon. {a} pretends not to see.',
    '{a} hears {b} shouting for help from the ravine and rides on.',
  ],
  'common-pair-ride': [
    '{a} and {b} keep each other company for a stretch, arguing about the weather.',
    '{a} falls in beside {b} for a few hours. Neither says much, and both seem glad of it.',
    '{a} and {b} trade jokes and jerky across twenty miles of nothing.',
    '{a} and {b} share the road for an afternoon and swap rumors about the leaders.',
    '{a} rides alongside {b} for a while, comparing maps.',
  ],
  'common-saddle-sore': [
    '{a} has been in the saddle so long {a.their} knees have forgotten how to bend.',
    '{a} stands in the stirrups for an hour just to feel something else.',
    'Every mile hurts for {a} today.',
    '{a} is too stiff to mount without help this morning.',
    "{a} winces at every step {a.horse} takes.",
  ],
  'common-help-thrown': [
    '{a} stops to help {b}, who has taken a bad fall, and sets the shoulder back in place.',
    '{a} finds {b} pinned under a fallen horse and digs {b.them} out.',
    '{a} shares bandages with {b}, who has a gashed leg and no supplies.',
    '{a} waits with {b}, who is badly hurt, until a wagon comes by.',
    '{a} carries {b}, thrown and dazed, to the nearest farmhouse.',
  ],
  'common-shortcut': [
    '{a} cuts across a dry riverbed that the others go around, and gains half a day.',
    'A shepherd shows {a} a pass that is on no map. It saves hours.',
    '{a} gambles on an old mining road, and it pays off.',
    '{a} takes a goat track over the ridge and comes out well ahead.',
    "{a} follows a hunch and a hawk's flight line, and finds a faster way through.",
  ],
  'common-cheering-town': [
    'Children run alongside {a} through a little town, shouting {a.their} name.',
    'A brass band strikes up as {a} comes through Main Street.',
    'A farmer and his whole family wave flags at {a} from a fence.',
    'Someone at a crossroads hands {a} a fresh pie and a cheer.',
    'A saloon empties out to see {a} go by.',
  ],
  'common-neck-and-neck': [
    '{a} and {b} trade the lead all morning until {a} finally pulls clear.',
    '{a} and {b} are side by side for an hour. {a} blinks last.',
    '{b} pushes the pace hard, but {a} hangs on and slips past at the river.',
    '{a} catches {b} on a long climb and leaves {b.them} on the descent.',
    '{a} and {b} race for the same water hole. {a} gets there first.',
  ],
  'common-spare-robber': [
    '{b} pulls a knife on {a} at a creek. {a} disarms {b.them} and sends {b.them} off with a warning.',
    '{b} tries to hold {a} up on a narrow pass. {a} takes the gun and lets {b.them} go.',
    '{a} catches {b} going through {a.their} pack, and lets {b.them} leave with nothing but a lecture.',
    '{b} jumps {a} from behind a rock and loses. {a} lets {b.them} limp away.',
    '{b} draws on {a} in a saloon. {a} is faster, and lets it go.',
  ],
  'common-night-sleep': [
    '{a} sleeps under a sky full of stars.',
    '{a} beds down in a dry wash and sleeps like a stone.',
    '{a} falls asleep before the fire is even lit.',
    '{a} spends the night listening to coyotes and counting the miles left.',
    '{a} sleeps in a barn, and is gone before the farmer wakes.',
  ],
  'common-river-crossing': [
    '{a} spots a sandbar and crosses the river without getting wet.',
    "{a} finds a ferryman who doesn't charge much and crosses first.",
    '{a} wades the river at the narrows while the others look for a bridge.',
    '{a} crosses on an old railway trestle, and makes up time.',
    'The river is low where {a} reaches it. {a} is across in minutes.',
  ],
  'common-sabotage': [
    "{a} loosens the girth on {b}'s saddle while {b.they} water{b:s} {b.their} horse. {b} loses an hour.",
    "{a} spooks {b}'s horse at a water stop, and it bolts for a mile.",
    "{a} swaps a good horseshoe nail in {b}'s kit for a bent one. {b} loses an hour at the smithy.",
    "{a} hides {b}'s bridle while {b.they} sleep{b:s}. {b} loses half a morning.",
  ],
  'finish-final-gallop': [
    '{a} drives {a.horse} hard over the last miles.',
    '{a} gives {a.horse} its head for the run to the line.',
    "{a} leans low over {a.horse}'s neck and pushes for the finish.",
    '{a.horse} finds one more gear for {a} in the final stretch.',
    '{a} asks {a.horse} for everything at the end.',
  ],
  'common-pair-campfire': [
    '{a} and {b} cook beans over the same fire and keep their guns in sight.',
    '{a} and {b} make camp together and take turns keeping watch.',
    '{a} shares coffee with {b} at a campfire. Nobody mentions the race.',
    '{a} and {b} spend the night swapping stories about home.',
    '{a} and {b} share a fire and a bottle, and part friends by morning.',
  ],
  'common-ambush-wounded': [
    '{b} takes a shot at {a} from the brush. It clips {a.their} arm.',
    '{b} opens fire on {a} at a water hole. {a} rides off bleeding.',
    "A bullet from {b}'s rifle grazes {a}'s leg before {a.they} can get clear.",
    '{b} fires at {a} from a rooftop as {a.they} pass{a:es} through town. The shot finds {a.their} shoulder.',
  ],
  'finish-fades': [
    '{a} runs out of strength in the last miles.',
    '{a} pays for the early pace and slows to a crawl near the line.',
    '{a} has nothing left at the end.',
    '{a} loses three places in the final hour.',
    '{a} hits a wall before the finish and limps in.',
  ],
  'common-sprint-win': [
    '{a} takes the sprint prize at a town checkpoint.',
    '{a} wins a dash between two mile markers and the purse that goes with it.',
    '{a} beats everyone to a county line and collects the bonus.',
    "{a} is first to the sponsor's flag and claims the prize.",
  ],
  'common-save-dragged': [
    "{b}'s horse bolts with {b.them} hung up in the stirrup. {a} grabs the reins and stops it.",
    '{b} is thrown and dragged toward a ravine until {a} cuts {b.them} loose.',
    "{a} catches {b}'s runaway horse a few yards before the cliff edge.",
    "{b}'s boot is caught and {b.their} horse is spooked. {a} gets there in time.",
  ],
};
