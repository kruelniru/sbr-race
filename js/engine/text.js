// Event text templates. Content files write sentences with tokens; this fills
// them in so they read right for he/she/they.
//
// Every token names a ROLE from the event (e.g. racer, other, agent):
//
//   {racer}            the racer's name                  -> "Kruel"
//   {racer.they}       subject pronoun                    -> "she" / "they"
//   {racer.them}       object pronoun                     -> "her" / "them"
//   {racer.their}      possessive adjective               -> "her" / "their"
//   {racer.theirs}     possessive pronoun                 -> "hers" / "theirs"
//   {racer.themself}   reflexive                          -> "herself" / "themself"
//   Capitalize the first letter to capitalize the word: {racer.They}, {racer.Their}
//
//   {racer:is/are}     verb agreement with the PRONOUN    -> "is" (she) / "are" (they)
//   {racer:s}          shorthand for {racer:s/}           -> "ride{racer:s}" = "rides" / "ride"
//   {racer:es}         shorthand for {racer:es/}          -> "push{racer:es}" = "pushes" / "push"
//
// Use verb agreement only right after a pronoun. After a name it's always
// singular: "{racer} rides", but "{racer.they} ride{racer:s}".
//
// Example:
//   "{racer} spots {other} collapsed by the trail. {racer.They} {racer:is/are} out of water."
//
// An unknown role or token renders as ⟦...⟧ (and warns) so mistakes are easy to spot.

import PRONOUNS from '../../data/pronouns.js';

const TOKEN = /\{([a-zA-Z_][\w]*)(?:([.:])([^}]*))?\}/g;
const FORMS = ['they', 'them', 'their', 'theirs', 'themself'];

/**
 * @param {string} template
 * @param {Record<string, {name:string, pronouns:string}>} roles
 */
export function render(template, roles) {
  return template.replace(TOKEN, (whole, role, sep, rest) => {
    const who = roles[role];
    if (!who) return unknown(whole, `no role "${role}"`);
    const p = PRONOUNS[who.pronouns] ?? PRONOUNS.they;

    if (!sep) return who.name;

    if (sep === '.') {
      const lower = rest.charAt(0).toLowerCase() + rest.slice(1);
      if (!FORMS.includes(lower)) return unknown(whole, `unknown pronoun form "${rest}"`);
      const word = p[lower];
      return rest.charAt(0) === rest.charAt(0).toUpperCase() ? capitalize(word) : word;
    }

    // sep === ':'  verb agreement
    let singular, plural;
    if (rest.includes('/')) [singular, plural] = rest.split('/');
    else if (rest === 's' || rest === 'es') [singular, plural] = [rest, ''];
    else return unknown(whole, `verb agreement needs "singular/plural", got "${rest}"`);
    return p.plural ? plural : singular;
  });
}

/** Capitalizes the first letter of a sentence after rendering, if needed. */
export function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Check a template without rendering it, for content tests.
 * Returns a list of problems (empty if fine).
 */
export function lintTemplate(template, allowedRoles) {
  const problems = [];
  for (const m of template.matchAll(TOKEN)) {
    const [whole, role, sep, rest] = m;
    if (!allowedRoles.includes(role)) problems.push(`${whole}: role "${role}" not in [${allowedRoles.join(', ')}]`);
    if (sep === '.' && !FORMS.includes(rest.charAt(0).toLowerCase() + rest.slice(1))) problems.push(`${whole}: unknown pronoun form`);
    if (sep === ':' && !rest.includes('/') && rest !== 's' && rest !== 'es') problems.push(`${whole}: bad verb agreement`);
  }
  const stray = template.replace(TOKEN, '').match(/[{}]/);
  if (stray) problems.push('stray brace in template');
  return problems;
}

function unknown(whole, why) {
  console.warn(`[text] ${why} in ${whole}`);
  return `⟦${whole.slice(1, -1)}⟧`;
}
