import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const _req = createRequire(import.meta.url);
const _dir = dirname(fileURLToPath(import.meta.url));
const { findGroupsVariable } = _req(resolve(_dir, '../../assets/js/awail-core.js'));
const raw = _req(resolve(_dir, '../../assets/data/quran-openings.json'));
const data = raw.map(d => ({ s: d.s, a: d.a, sn: d.sn, conn: d.c, words: d.w }));
const groups = findGroupsVariable(data, 1);
// Find any group containing both 4:3 and 4:35
const found = groups.filter(g => {
  const refs = new Set(g.verses.map(v => v.s+':'+v.a));
  return refs.has('4:3') && refs.has('4:35');
});
console.log('Groups containing both 4:3 and 4:35:', found.length);
found.forEach(g => {
  console.log('sharedWords:', g.sharedWords, 'members:', g.verses.length);
  g.verses.forEach(v => console.log('  s:'+v.s+' a:'+v.a+' conn:'+v.conn+' w:'+v.words.join('|')));
});
