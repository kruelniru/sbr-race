#!/usr/bin/env node
// Set the secret cheat menu's PIN. Run it on your own computer:
//
//   node tools/set-cheat-pin.js
//
// It asks for the PIN twice (digits only; nothing is shown as you type), then
// writes ONLY its SHA-256 hash into js/config.js (CHEAT_PIN_HASH). The PIN
// itself is never written anywhere. Commit and push js/config.js afterwards.
// To turn the cheat menu off, set CHEAT_PIN_HASH back to ''.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SALT = 'sbr-cheat-v1:'; // must match js/engine/cheats.js PIN_SALT
const CONFIG = join(dirname(fileURLToPath(import.meta.url)), '..', 'js', 'config.js');

/** Read a line without echoing it (falls back to a visible prompt where raw mode isn't available). */
function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    if (!stdin.isTTY) {
      let buf = '';
      stdin.setEncoding('utf8');
      stdin.once('data', (d) => { buf += d; resolve(buf.split(/\r?\n/)[0]); });
      return;
    }
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (ch) => {
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode(false); stdin.pause(); stdin.off('data', onData);
        process.stdout.write('\n');
        resolve(value);
      } else if (ch === '\u0003') { // Ctrl+C
        process.stdout.write('\n'); process.exit(1);
      } else if (ch === '\u007f' || ch === '\b') {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

const pin = await askHidden('New cheat PIN (digits only): ');
if (!/^\d{4,12}$/.test(pin)) {
  console.error('The PIN must be 4 to 12 digits. Nothing was changed.');
  process.exit(1);
}
const again = await askHidden('Type it again: ');
if (again !== pin) {
  console.error("The two PINs don't match. Nothing was changed.");
  process.exit(1);
}
const hash = createHash('sha256').update(SALT + pin, 'utf8').digest('hex');
const src = readFileSync(CONFIG, 'utf8');
const line = /export const CHEAT_PIN_HASH = '[0-9a-f]*';/;
if (!line.test(src)) {
  console.error('Could not find CHEAT_PIN_HASH in js/config.js. Nothing was changed.');
  process.exit(1);
}
writeFileSync(CONFIG, src.replace(line, `export const CHEAT_PIN_HASH = '${hash}';`));
console.log('Done. js/config.js now holds only the hash of your PIN.');
console.log('Commit and push it:  git add js/config.js && git commit -m "Set the cheat PIN" && git push');
