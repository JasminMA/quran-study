// Run: node tests/helpers/gen-fixtures.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const _req = createRequire(import.meta.url);
const _dir = dirname(fileURLToPath(import.meta.url));

const { findGroupsVariable } = _req(resolve(_dir, '../../assets/js/awail-core.js'));
const raw = _req(resolve(_dir, '../../assets/data/quran-openings.json'));

const data = raw.map(d => ({ s: d.s, a: d.a, sn: d.sn, conn: d.c, words: d.w }));

const groups = findGroupsVariable(data, 1);
console.log('Total groups at minShared=1:', groups.length);

const hasConn = (g, k) => g.verses.some(v => v.conn === k);
const connSet = (g) => new Set(g.verses.map(v => v.conn));

// Category pickers
const wawNone   = groups.find(g => hasConn(g,'waw') && hasConn(g,'none') && !hasConn(g,'fa') && g.sharedWords >= 2);
const wawFa     = groups.find(g => hasConn(g,'waw') && hasConn(g,'fa') && g.sharedWords >= 3);
const threeMemb = groups.find(g => g.verses.length >= 3 && connSet(g).size >= 2);
const fiveWords = groups.find(g => g.sharedWords === 5);
const crossNisa = groups.find(g => { const ss=new Set(g.verses.map(v=>v.s)); return ss.has(4) && ss.size > 1; });
const oneWord   = groups.find(g => g.sharedWords === 1);

const picks = { wawNone, wawFa, threeMemb, fiveWords, crossNisa, oneWord };

for (const [name, g] of Object.entries(picks)) {
  if (!g) { console.log(name + ': NOT FOUND'); continue; }
  console.log('\n' + name + ':');
  console.log('  sharedWords=' + g.sharedWords + '  members=' + g.verses.length);
  for (const v of g.verses) {
    console.log('    s:' + v.s + ' a:' + v.a + ' conn:' + v.conn + '  w:' + v.words.join('|'));
  }
}

// Negative example: two النساء verses with same connector
// Find the first pair within s=4 that shares 2+ words with the SAME connector
const nisaData = data.filter(d => d.s === 4);
let negPair = null;
outer: for (let i = 0; i < nisaData.length; i++) {
  for (let j = i+1; j < nisaData.length; j++) {
    const a = nisaData[i], b = nisaData[j];
    if (a.conn !== b.conn || a.conn === 'none') continue;
    const shared = a.words.filter((w,k) => w === b.words[k]);
    let prefix = 0;
    for (let k=0; k<Math.min(a.words.length,b.words.length); k++) {
      if (a.words[k]===b.words[k]) prefix++; else break;
    }
    if (prefix >= 2) { negPair = [a,b]; break outer; }
  }
}
if (negPair) {
  console.log('\nnegative (same-connector pair that must NOT group):');
  negPair.forEach(v => console.log('  s:'+v.s+' a:'+v.a+' conn:'+v.conn+' w:'+v.words.join('|')));
}

// Serialize picks for fixtures.json
const fixture = {};
for (const [name, g] of Object.entries(picks)) {
  if (!g) continue;
  fixture[name] = {
    sharedWords: g.sharedWords,
    members: g.verses.map(v => ({ s: v.s, a: v.a, conn: v.conn })),
    stem: g.verses[0].words.slice(0, g.sharedWords),
  };
}
if (negPair) {
  fixture.negative = negPair.map(v => ({ s: v.s, a: v.a, conn: v.conn }));
}

const outPath = resolve(_dir, 'fixtures.json');
writeFileSync(outPath, JSON.stringify(fixture, null, 2), 'utf8');
console.log('\nWrote fixtures to', outPath);
