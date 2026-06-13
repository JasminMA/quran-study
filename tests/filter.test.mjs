import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { findGroupsVariable, filterGroups } from './helpers/core.mjs';

const _req = createRequire(import.meta.url);
const _dir = dirname(fileURLToPath(import.meta.url));
const rawData = _req(resolve(_dir, '../assets/data/quran-openings.json'));
const data = rawData.map(d => ({ s: d.s, a: d.a, sn: d.sn, conn: d.c, words: d.w }));

// ── helper ────────────────────────────────────────────────────────────
function v(s, a, conn, ...words) { return { s, a, sn: 'test', conn, words }; }

const hasConn = (g, k) => g.verses.some(vv => vv.conn === k);
const FREE_KEYS = ['thumma', 'aw', 'bal', 'lakin', 'am', 'alaa'];

// ── §5a — similarity filter (findGroupsVariable threshold) ────────────

describe('similarity filter — minShared threshold', () => {
  // Synthetic data with groups at sharedWords 1, 2, and 3
  const synth = [
    v(1, 1, 'waw',  'أ', 'ب', 'ج', 'د', 'ه'),
    v(1, 2, 'fa',   'أ', 'ب', 'ج', 'د', 'ه'),  // shares 5 with 1:1
    v(2, 1, 'waw',  'أ', 'ب', 'ج', 'X', 'Y'),
    v(2, 2, 'none', 'أ', 'ب', 'ج', 'P', 'Q'),  // shares 3 with 2:1
    v(3, 1, 'waw',  'أ', 'ب', 'Z'),
    v(3, 2, 'fa',   'أ', 'ب', 'W'),             // shares 2 with 3:1
    v(4, 1, 'waw',  'X'),
    v(4, 2, 'none', 'X'),                        // shares 1 with 4:1
  ];

  it('minShared=1 finds groups at all word counts', () => {
    const g = findGroupsVariable(synth, 1);
    assert.ok(g.some(x => x.sharedWords >= 1));
    assert.ok(g.some(x => x.sharedWords >= 2));
    assert.ok(g.some(x => x.sharedWords >= 3));
  });

  it('minShared=2 produces no group with sharedWords < 2', () => {
    const g = findGroupsVariable(synth, 2);
    assert.ok(g.every(x => x.sharedWords >= 2));
  });

  it('minShared=3 produces no group with sharedWords < 3', () => {
    const g = findGroupsVariable(synth, 3);
    assert.ok(g.every(x => x.sharedWords >= 3));
  });

  it('a 1-word group present in minShared=1 is absent from minShared=2', () => {
    const at1 = findGroupsVariable(synth, 1);
    const at2 = findGroupsVariable(synth, 2);
    const oneWordGroups = at1.filter(g => g.sharedWords === 1);
    assert.ok(oneWordGroups.length > 0, 'synthetic data must have a 1-word group');
    assert.ok(!at2.some(g => g.sharedWords === 1), '1-word groups must not appear at minShared=2');
  });

  it('minShared=2 count ≤ minShared=1 count', () => {
    const at1 = findGroupsVariable(synth, 1);
    const at2 = findGroupsVariable(synth, 2);
    assert.ok(at2.length <= at1.length);
  });
});

// ── §5b — connector filter (filterGroups) ────────────────────────────

describe('filterGroups() — connector filter', () => {
  // Build a controlled group set
  const makeGroup = (sw, ...members) => ({
    sharedWords: sw,
    verses: members.map(([conn]) => ({ s: 1, a: 1, sn:'x', conn, words: [] })),
  });

  const groups = [
    makeGroup(3, ['waw'], ['fa']),           // waw+fa
    makeGroup(2, ['waw'], ['none']),          // waw+none
    makeGroup(2, ['fa'],  ['none']),          // fa+none
    makeGroup(2, ['thumma'], ['waw']),        // other+waw
    makeGroup(1, ['alaa'], ['none']),         // other+none
    makeGroup(2, ['waw'], ['fa'], ['none']),  // all three
  ];

  it('"all" returns all groups unchanged', () => {
    assert.equal(filterGroups(groups, 'all').length, groups.length);
  });

  it('"waw-fa" returns only groups with both waw and fa', () => {
    const r = filterGroups(groups, 'waw-fa');
    assert.ok(r.length > 0, 'must find at least one waw-fa group');
    assert.ok(r.every(g => hasConn(g,'waw') && hasConn(g,'fa')));
  });

  it('"waw-none" returns only groups with both waw and none', () => {
    const r = filterGroups(groups, 'waw-none');
    assert.ok(r.every(g => hasConn(g,'waw') && hasConn(g,'none')));
  });

  it('"fa-none" returns only groups with both fa and none', () => {
    const r = filterGroups(groups, 'fa-none');
    assert.ok(r.every(g => hasConn(g,'fa') && hasConn(g,'none')));
  });

  it('"other" returns only groups with at least one FREE connector', () => {
    const r = filterGroups(groups, 'other');
    assert.ok(r.every(g => FREE_KEYS.some(k => hasConn(g, k))));
  });

  it('a waw+fa-only group does NOT appear in "other"', () => {
    const wawFaOnly = [makeGroup(3, ['waw'], ['fa'])];
    assert.equal(filterGroups(wawFaOnly, 'other').length, 0);
  });

  it('empty input returns empty array', () => {
    assert.deepEqual(filterGroups([], 'waw-fa'), []);
    assert.deepEqual(filterGroups([], 'all'), []);
  });
});

// ── §5c — scope consistency: per-surah النساء ⊆ whole-Quran ──────────

describe('scope consistency — per-surah النساء ⊆ whole-Quran (at verse-pair level)', () => {
  const nisaData   = data.filter(d => d.s === 4);
  const nisaGroups  = findGroupsVariable(nisaData, 2);
  const quranGroups = findGroupsVariable(data, 2);

  it('per-surah run finds at least one group for النساء', () => {
    assert.ok(nisaGroups.length > 0, 'النساء per-surah run must produce groups');
  });

  it('every verse-pair from nisaGroups co-appears in some quranGroups group', () => {
    const violations = [];
    for (const nisaGroup of nisaGroups) {
      // Check every pair of verses in this group
      for (let i = 0; i < nisaGroup.verses.length; i++) {
        for (let j = i + 1; j < nisaGroup.verses.length; j++) {
          const v1 = nisaGroup.verses[i];
          const v2 = nisaGroup.verses[j];
          const inQuran = quranGroups.some(g => {
            const refs = new Set(g.verses.map(vv => vv.s + ':' + vv.a));
            return refs.has(v1.s + ':' + v1.a) && refs.has(v2.s + ':' + v2.a);
          });
          if (!inQuran) {
            violations.push(`(${v1.s}:${v1.a}, ${v2.s}:${v2.a}) in nisaGroups but not co-grouped in quranGroups`);
          }
        }
      }
    }
    assert.equal(violations.length, 0,
      `${violations.length} verse-pair(s) from nisaGroups not found in quranGroups:\n` +
      violations.slice(0, 5).join('\n'));
  });
});
