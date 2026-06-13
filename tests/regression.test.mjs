import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { findGroupsVariable, MAX_WORDS } from './helpers/core.mjs';

const _req = createRequire(import.meta.url);
const _dir = dirname(fileURLToPath(import.meta.url));

const rawData  = _req(resolve(_dir, '../assets/data/quran-openings.json'));
const fixtures = _req(resolve(_dir, 'helpers/fixtures.json'));

// Build unified data records from JSON
const data = rawData.map(d => ({ s: d.s, a: d.a, sn: d.sn, conn: d.c, words: d.w }));

// ── helpers ──────────────────────────────────────────────────────────

// Return the group from `groups` whose member set exactly matches the
// fixture's members (by s:a pairs, order-independent).
function findFixtureGroup(groups, fixture) {
  const wantSig = fixture.members.map(m => `${m.s}:${m.a}`).sort().join(',');
  return groups.find(g => {
    const gotSig = g.verses.map(v => `${v.s}:${v.a}`).sort().join(',');
    return gotSig === wantSig;
  });
}

// Check that two specific (s,a) pairs both appear in the same group
function groupContainsBoth(groups, m1, m2) {
  return groups.some(g => {
    const refs = new Set(g.verses.map(v => `${v.s}:${v.a}`));
    return refs.has(`${m1.s}:${m1.a}`) && refs.has(`${m2.s}:${m2.a}`);
  });
}

// ── whole-Quran end-to-end ────────────────────────────────────────────

describe('whole-Quran end-to-end', () => {
  // Run once and reuse across tests in this describe
  const t0 = Date.now();
  const groupsAt1 = findGroupsVariable(data, 1);
  const elapsed = Date.now() - t0;
  console.log(`  [perf] findGroupsVariable(6236, minShared=1): ${elapsed}ms`);

  it('completes without error and returns results', () => {
    assert.ok(Array.isArray(groupsAt1));
    assert.ok(groupsAt1.length > 0, 'must find at least one group');
    assert.ok(groupsAt1.length < 6236, 'must not return more groups than ayat');
  });

  it('is deterministic — two consecutive runs produce identical results', () => {
    const groupsAt1b = findGroupsVariable(data, 1);
    assert.equal(groupsAt1b.length, groupsAt1.length,
      'second run must return same group count');
    for (let i = 0; i < groupsAt1.length; i++) {
      const a = groupsAt1[i], b = groupsAt1b[i];
      assert.equal(a.sharedWords, b.sharedWords);
      assert.equal(a.verses.length, b.verses.length);
      assert.equal(a.verses[0].s, b.verses[0].s);
      assert.equal(a.verses[0].a, b.verses[0].a);
    }
  });

  it('monotonicity: stricter minShared yields fewer or equal groups', () => {
    const at2 = findGroupsVariable(data, 2);
    const at3 = findGroupsVariable(data, 3);
    assert.ok(at2.length <= groupsAt1.length, 'minShared=2 must not exceed minShared=1');
    assert.ok(at3.length <= at2.length,       'minShared=3 must not exceed minShared=2');
  });

  it('no group has sharedWords > MAX_WORDS (5)', () => {
    assert.ok(groupsAt1.every(g => g.sharedWords <= MAX_WORDS),
      'sharedWords must never exceed MAX_WORDS');
  });
});

// ── regression fixtures ───────────────────────────────────────────────

describe('regression — waw ↔ none pair (1:2 vs 37:182, الحمد لله رب العلمين)', () => {
  const fix = fixtures.wawNone;
  const groups = findGroupsVariable(data, fix.sharedWords);

  it('group exists with correct sharedWords', () => {
    const g = findFixtureGroup(groups, fix);
    assert.ok(g, `group not found for fixture wawNone (stem: ${fix.stem.join(' ')})`);
    assert.equal(g.sharedWords, fix.sharedWords);
  });

  it('group members have mixed waw/none connectors', () => {
    const g = findFixtureGroup(groups, fix);
    const conns = new Set(g.verses.map(v => v.conn));
    assert.ok(conns.has('waw'),  'group must contain a waw verse');
    assert.ok(conns.has('none'), 'group must contain a none verse');
  });
});

describe('regression — waw ↔ fa cluster (الذين ءامنوا وعملوا الصلحت, 10 members)', () => {
  const fix = fixtures.wawFa;
  const groups = findGroupsVariable(data, fix.sharedWords);

  it('group exists with correct sharedWords=4 and 10 members', () => {
    const g = findFixtureGroup(groups, fix);
    assert.ok(g, `group not found for fixture wawFa (stem: ${fix.stem.join(' ')})`);
    assert.equal(g.sharedWords, fix.sharedWords);
    assert.equal(g.verses.length, fix.members.length);
  });

  it('group contains both waw and fa members', () => {
    const g = findFixtureGroup(groups, fix);
    const conns = new Set(g.verses.map(v => v.conn));
    assert.ok(conns.has('waw'), 'must have waw');
    assert.ok(conns.has('fa'),  'must have fa');
  });
});

describe('regression — three-member group (الحمد لله, 3 members)', () => {
  const fix = fixtures.threeMemb;
  const groups = findGroupsVariable(data, fix.sharedWords);

  it('group exists with ≥3 members', () => {
    const g = findFixtureGroup(groups, fix);
    assert.ok(g, `group not found for fixture threeMemb (stem: ${fix.stem.join(' ')})`);
    assert.ok(g.verses.length >= 3);
  });
});

describe('regression — maximum 5-word prefix (الذين ينقضون عهد الله من)', () => {
  const fix = fixtures.fiveWords;
  const groups = findGroupsVariable(data, 1);

  it('group exists with sharedWords=5', () => {
    const g = findFixtureGroup(groups, fix);
    assert.ok(g, `group not found for fixture fiveWords`);
    assert.equal(g.sharedWords, 5);
  });
});

describe('regression — cross-surah group involving النساء', () => {
  const fix = fixtures.crossNisa;
  const groups = findGroupsVariable(data, fix.sharedWords);

  it('group exists and includes s:4 members', () => {
    const g = findFixtureGroup(groups, fix);
    assert.ok(g, `crossNisa group not found`);
    const nisaMembers = g.verses.filter(v => v.s === 4);
    assert.ok(nisaMembers.length > 0, 'group must include at least one verse from surah 4');
  });

  it('group includes members from multiple surahs', () => {
    const g = findFixtureGroup(groups, fix);
    const surahs = new Set(g.verses.map(v => v.s));
    assert.ok(surahs.size > 1, 'must span more than one surah');
  });
});

describe('regression — 1-word group (بشر, 3 members)', () => {
  const fix = fixtures.oneWord;
  const groups = findGroupsVariable(data, 1);

  it('group exists with sharedWords=1', () => {
    const g = findFixtureGroup(groups, fix);
    assert.ok(g, `oneWord group not found (stem: ${fix.stem[0]})`);
    assert.equal(g.sharedWords, 1);
  });
});

describe('regression — negative invariant: every group has ≥2 distinct connectors', () => {
  const groups = findGroupsVariable(data, 1);

  it('no group contains members all sharing the same connector', () => {
    const violators = groups.filter(g => {
      const conns = new Set(g.verses.map(v => v.conn));
      return conns.size < 2;
    });
    assert.equal(violators.length, 0,
      `${violators.length} group(s) have only one connector type — mixed connectors are required`);
  });

  it('4:3 and 4:35 (both waw) do NOT appear in a waw-only group together', () => {
    // They may appear in a group with a third fa/none verse — that is correct.
    // The failure case is a group whose only connector is waw that contains both.
    const badGroup = groups.find(g => {
      const refs = new Set(g.verses.map(v => v.s + ':' + v.a));
      const conns = new Set(g.verses.map(v => v.conn));
      return refs.has('4:3') && refs.has('4:35') && conns.size === 1;
    });
    assert.equal(badGroup, undefined,
      '4:3 and 4:35 must not appear in a same-connector-only group');
  });
});
