// The game log export (host only, after the game ends): a readable,
// self-contained HTML page to share with friends, and the raw JSON for a
// reviewer. Both come from js/engine/game-log.js buildGameLog(state).
// Secret things are clearly marked as secret.

import { buildGameLog } from '../engine/game-log.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SECRET = '<span class="secret">secret</span>';

function fileBase(log) {
  const d = (log.exportedAt ?? '').slice(0, 10);
  return `sbr-race-${String(log.seed).replace(/[^\w-]/g, '')}-${d}${log.cheatsUsed ? '-CHEATS' : ''}`;
}

/** Start both downloads (HTML + JSON). Only when the race is over. */
export function exportGameLog(state) {
  if (!state.race?.over) return false;
  const log = buildGameLog(state);
  const base = fileBase(log);
  download(`${base}.html`, renderLogHtml(log), 'text/html');
  setTimeout(() => download(`${base}.json`, JSON.stringify(log, null, 2), 'application/json'), 400);
  return true;
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
}

/** The readable page. Pure string building (render-testable in Node). */
export function renderLogHtml(log) {
  const stages = [...new Set(log.rounds.map((r) => r.stage))];
  const out = [];
  out.push(`<header><h1>Steel Ball Run: the full game log</h1>
<p>Seed <code>${esc(log.seed)}</code> · started ${esc(log.createdAt ?? '?')} · exported ${esc(log.exportedAt)}</p>
${log.cheatsUsed ? `<p class="cheats">CHEATS USED in this game (${log.cheats.length}). See the list at the end.</p>` : '<p class="clean">No cheats were used.</p>'}
<details><summary>Settings</summary><pre>${esc(JSON.stringify(log.settings, null, 2))}</pre></details>
<p class="legend">Everything marked ${SECRET} never appeared on the stream.</p></header>`);

  out.push('<section><h2>The racers</h2><table><tr><th>Name</th><th>Personality</th><th>Mount</th><th>Finish</th><th>Points</th><th>Kills / spares / helps</th><th>Worthiness ' + SECRET + '</th><th>Stand ' + SECRET + '</th><th>Valentine ' + SECRET + '</th></tr>');
  for (const p of log.players) {
    out.push(`<tr><td>${esc(p.name)}${p.ai ? ' <small>(AI)</small>' : ''}</td><td>${esc(p.personality)}</td><td>${esc(p.mount)}</td>
<td>${p.status === 'racing' ? 'New York' : p.status === 'retired' ? 'retired' : `fell in Stage ${p.death?.stage}: ${esc(p.death?.secretCause ?? p.death?.cause)}${p.death?.secretBy ? `, by ${esc(p.death.secretBy)}` : p.death?.by ? `, by ${esc(p.death.by)}` : ''}`}</td>
<td>${p.points}</td><td>${p.kills} / ${p.spares} / ${p.helps}</td><td>${p.worthiness.start} → ${p.worthiness.end}</td>
<td>${p.stand ? `${esc(p.stand.name)} (${esc(p.stand.tier)}, ${esc(p.stand.source)})` : '-'}</td><td>${p.valentine ? `joined Stage ${p.valentine.stage}, ${esc(p.valentine.outcome ?? '')}` : '-'}</td></tr>`);
  }
  out.push('</table></section>');

  for (const st of stages) {
    const rounds = log.rounds.filter((r) => r.stage === st);
    out.push(`<section class="stage"><h2>Stage ${st}: ${esc(rounds[0]?.stageName ?? '')}</h2>`);
    for (const r of rounds) {
      out.push(`<h3>${esc(r.label)} <small>(round ${r.round})</small></h3>`);
      for (const w of log.choices.filter((c) => c.round === r.round)) {
        out.push(`<div class="choices"><h4>${w.kind === 'plan' ? 'Stage Plans' : 'Decisions'}</h4><ul>`);
        for (const x of w.prompts) {
          out.push(`<li>${x.secret ? SECRET + ' ' : ''}<b>${esc(x.player)}</b>: ${esc(x.title)}${w.kind === 'plan' ? '' : ` <span class="q">“${esc(x.text)}”</span>`} → <b>${esc(x.answer)}</b>${x.target ? ` (${esc(x.target)})` : ''}${x.buy ? ` · bought a ${esc(x.buy)} horse` : ''} <small>${x.by === 'auto' ? 'timed out: ★ picked' : x.by === 'ai' ? 'AI' : ''}</small></li>`);
        }
        out.push('</ul></div>');
      }
      out.push('<ul class="story">');
      for (const l of r.lines) out.push(`<li class="${l.where}${l.death ? ' death' : ''}">${l.where === 'meanwhile' ? '<small>meanwhile:</small> ' : l.where === 'side' ? '<small>side story:</small> ' : ''}${esc(l.text)}</li>`);
      out.push('</ul>');
      if (r.field) out.push(`<p class="field">${esc(r.field)}</p>`);
      if (r.fallen.length || r.fieldDead) out.push(`<p class="fallen">The Fallen: ${r.fallen.map((f) => `${esc(f.name)} (${esc(f.cause)}${f.by ? `, by ${esc(f.by)}` : ''})`).join('; ') || 'none named'}${r.fieldDead ? ` · ${r.fieldDead} from the field` : ''}</p>`);
      if (r.placements.length) out.push(`<p class="placements">Finish Line: ${r.placements.map((p) => `${p.rank}. ${esc(p.name)} (+${p.points})`).join(' · ')}</p>`);
      const votes = log.secret.deadVotes.filter((d) => d.round === r.round);
      for (const d of votes) out.push(`<p>${SECRET} The dead's vote: <b>${esc(d.category)}</b>${d.target ? ` for ${esc(d.target)}` : ''} · ${d.votes.map((v) => `${esc(v.voter)}: ${esc(v.category)}${v.target ? ` (${esc(v.target)})` : ''}`).join(', ')}</p>`);
    }
    // Secrets this stage.
    const s = log.secret;
    const rows = [];
    for (const p of log.players) for (const c of p.worthiness.changes.filter((x) => x.stage === st)) rows.push(`Worthiness: ${esc(p.name)} ${c.change > 0 ? '+' : ''}${c.change} (${c.from} → ${c.to}) · ${esc(c.round)}`);
    for (const e of s.stands.filter((x) => x.stage === st)) rows.push(`Stand: ${esc(e.who)} gained ${esc(e.stand)} (${esc(e.tier)}) from ${esc(e.source)}`);
    for (const e of s.corpse.filter((x) => x.stage === st)) rows.push(`Corpse: ${esc(e.part)} · ${esc(e.event)}${e.how ? ` (${esc(e.how)})` : ''}${e.from ? ` from ${esc(e.from)}` : ''}${e.to ? ` to ${esc(e.to)}` : ''}${e.band != null ? ` · Worthiness band ${e.band}+` : ''}`);
    for (const e of s.valentine.filter((x) => x.stage === st)) rows.push(`Valentine: ${esc(e.event)}${e.id ? ` · ${esc(e.id)}` : ''}${e.from ? ` · ${esc(e.from)}` : ''}${e.to ? ` → ${esc(e.to)}` : ''}${e.outcome ? ` · ${esc(e.outcome)}` : ''}`);
    for (const t of s.trades.filter((x) => x.stage === st)) rows.push(`Trade: ${esc(t.from)} → ${esc(t.to)}: ${esc(t.giveKind ?? t.give)}${t.ask ? ` for ${esc(t.ask)}` : ' (gift)'} · ${esc(t.outcome)}`);
    for (const f of s.fights.filter((x) => x.stage === st)) {
      const sc = f.scores;
      rows.push(`Fight (${esc(f.kind)}): ${esc(f.attacker)}${f.masked ? ' (masked)' : ''} vs ${esc(f.defender)} · ${esc(f.win)} / ${esc(f.defend)} → ${esc(f.outcome)}${sc ? ` · ${(sc.a.base + sc.a.roll).toFixed(1)} vs ${(sc.d.base + sc.d.roll).toFixed(1)} (bases ${sc.a.base.toFixed(1)} / ${sc.d.base.toFixed(1)})` : ''}`);
    }
    if (rows.length) out.push(`<details class="secrets" open><summary>${SECRET} What the stream didn't see in Stage ${st} (${rows.length})</summary><ul>${rows.map((x) => `<li>${x}</li>`).join('')}</ul></details>`);
    out.push('</section>');
  }

  out.push('<section><h2>The ending</h2>');
  if (log.finale?.ending) out.push(`<p><b>${esc(log.finale.ending.title)}</b>: ${esc(log.finale.ending.text)}</p>`);
  else out.push('<p>A normal ending.</p>');
  if (log.finale?.podium) out.push(`<p>Podium: ${log.finale.podium.map((p) => `${p.rank}. ${esc(p.name)} (${p.points})`).join(' · ')}</p>`);
  for (const e of log.finale?.epilogues ?? []) out.push(`<p><i>${esc(e.title)}</i>: ${esc(e.text)}</p>`);
  for (const a of log.finale?.awards ?? []) out.push(`<p>${esc(a.title)}: ${a.winners.map((w) => esc(w.name)).join(' & ') || '-'} (${esc(a.detail)})</p>`);
  if (log.secret.boss) out.push(`<p>${SECRET} The boss: ${esc(log.secret.boss.name)}${log.secret.boss.loveTrain ? ' (Love Train)' : ''}${log.secret.boss.joiner ? ', a Valentine joiner' : ''}</p>`);
  if (log.secret.fv) out.push(`<p>${SECRET} Funny Valentine: beaten ${log.secret.fv.beaten} time(s)${log.secret.fv.beatenBy ? ` (first by ${esc(log.secret.fv.beatenBy)})` : ''}${log.secret.fv.dead ? `, killed by ${log.secret.fv.killers.map(esc).join(' and ')}` : ''}${log.secret.fv.riders.length ? ` · rode with him: ${log.secret.fv.riders.map(esc).join(', ')}` : ''}</p>`);
  out.push('</section>');

  if (log.cheatsUsed) {
    out.push(`<section class="cheats"><h2>Cheats used</h2><ul>${log.cheats.map((c) => `<li>Round ${c.round ?? '?'}: ${esc(c.by)} used <b>${esc(c.action)}</b>${c.value != null ? ` (${esc(c.value)})` : ''} on ${esc(c.target ?? '-')}</li>`).join('')}</ul></section>`);
  }

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Steel Ball Run game log</title><style>
:root{color-scheme:light dark;--bg:#fbf7f0;--fg:#2a2118;--muted:#7a6a55;--line:#e3d8c6;--secret:#6c4d86;--death:#a1281b}
@media (prefers-color-scheme:dark){:root{--bg:#1b1511;--fg:#efe5d6;--muted:#b3a38c;--line:#3a2f25;--secret:#c9a6f0;--death:#ff9b8c}}
body{background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif;max-width:980px;margin:0 auto;padding:16px}
h1{margin:.2em 0}h2{border-bottom:2px solid var(--line);padding-bottom:4px;margin-top:2em}h3{margin:1.2em 0 .3em}h4{margin:.4em 0;color:var(--muted)}
table{border-collapse:collapse;width:100%;font-size:.9em;display:block;overflow-x:auto}td,th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
.secret{display:inline-block;font-size:.72em;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#fff;background:var(--secret);border-radius:4px;padding:0 5px}
.cheats{color:var(--death);font-weight:700}.clean{color:var(--muted)}.legend,.field,small{color:var(--muted)}
.story li.death{color:var(--death)}.story li.announce{font-style:italic}.story li.dead{color:var(--secret)}
.choices ul,.secrets ul{font-size:.92em}.q{color:var(--muted)}.secrets{border-left:3px solid var(--secret);padding-left:10px;margin:10px 0}
.fallen{color:var(--death)}code{font-size:.95em}
</style></head><body>${out.join('\n')}</body></html>`;
}
