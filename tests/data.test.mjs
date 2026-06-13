import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const _dir  = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(_dir, '../assets/data/quran-openings.json');

const raw  = readFileSync(JSON_PATH);
const data = JSON.parse(raw);

const VALID_CONNECTORS = new Set(['none','waw','fa','thumma','aw','bal','lakin','am','alaa']);

// Ayah counts per surah as present in quran-openings.json (alquran.cloud Uthmani counting)
const SURAH_COUNTS = [
  7,286,200,176,120,165,206,75,129,109,
  123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,
  34,30,73,54,45,83,182,88,75,85,
  54,53,89,59,37,35,38,29,18,45,
  60,49,62,55,78,96,29,22,24,13,
  14,11,11,18,12,12,30,52,52,44,
  28,28,20,56,40,31,50,40,46,42,
  29,19,36,25,22,17,19,26,30,20,
  15,21,11,8,8,19,5,8,8,11,
  11,8,3,9,5,4,7,3,6,3,
  5,4,5,6
];

describe('quran-openings.json — encoding', () => {
  it('no UTF-8 BOM (first 3 bytes are [ { ")', () => {
    assert.equal(raw[0], 0x5B); // [
    assert.equal(raw[1], 0x7B); // {
    assert.equal(raw[2], 0x22); // "
  });
});

describe('quran-openings.json — count', () => {
  it('exactly 6236 entries', () => {
    assert.equal(data.length, 6236);
  });
});

describe('quran-openings.json — (s, a) uniqueness and completeness', () => {
  it('no duplicate (s, a) pairs', () => {
    const seen = new Set(data.map(d => `${d.s}:${d.a}`));
    assert.equal(seen.size, 6236);
  });

  it('surah numbers span 1–114 with no gaps', () => {
    const surahs = new Set(data.map(d => d.s));
    for (let s = 1; s <= 114; s++) {
      assert.ok(surahs.has(s), `surah ${s} missing from data`);
    }
    assert.equal(surahs.size, 114);
  });

  it('ayah numbers within each surah run from 1 to the expected total', () => {
    const bySurah = new Map();
    for (const d of data) {
      if (!bySurah.has(d.s)) bySurah.set(d.s, []);
      bySurah.get(d.s).push(d.a);
    }
    for (let s = 1; s <= 114; s++) {
      const ayahs = bySurah.get(s).slice().sort((a, b) => a - b);
      const expected = SURAH_COUNTS[s - 1];
      assert.equal(ayahs.length, expected,
        `surah ${s}: expected ${expected} ayahs, got ${ayahs.length}`);
      assert.equal(ayahs[0], 1, `surah ${s}: first ayah must be 1`);
      assert.equal(ayahs[ayahs.length - 1], expected,
        `surah ${s}: last ayah must be ${expected}`);
      // No gaps
      for (let i = 0; i < ayahs.length; i++) {
        assert.equal(ayahs[i], i + 1, `surah ${s}: gap at ayah position ${i + 1}`);
      }
    }
  });
});

describe('quran-openings.json — field types and values', () => {
  it('every entry has s (number), a (number), sn (non-empty string), c (string), w (array)', () => {
    for (const d of data) {
      assert.equal(typeof d.s, 'number', `s not a number at ${d.s}:${d.a}`);
      assert.equal(typeof d.a, 'number', `a not a number at ${d.s}:${d.a}`);
      assert.equal(typeof d.sn, 'string', `sn not a string at ${d.s}:${d.a}`);
      assert.ok(d.sn.length > 0, `sn empty at ${d.s}:${d.a}`);
      assert.equal(typeof d.c, 'string', `c not a string at ${d.s}:${d.a}`);
      assert.ok(Array.isArray(d.w), `w not an array at ${d.s}:${d.a}`);
    }
  });

  it('every c value is one of the 9 valid connector keys', () => {
    for (const d of data) {
      assert.ok(VALID_CONNECTORS.has(d.c),
        `invalid connector "${d.c}" at ${d.s}:${d.a}`);
    }
  });

  it('every w has length 0–5', () => {
    for (const d of data) {
      assert.ok(d.w.length >= 0 && d.w.length <= 5,
        `w.length=${d.w.length} out of range at ${d.s}:${d.a}`);
    }
  });

  it('no empty strings inside w', () => {
    for (const d of data) {
      for (const word of d.w) {
        assert.ok(word.length > 0, `empty string in w at ${d.s}:${d.a}`);
      }
    }
  });

  it('no null or undefined inside w', () => {
    for (const d of data) {
      for (const word of d.w) {
        assert.notEqual(word, null);
        assert.notEqual(word, undefined);
      }
    }
  });
});

describe('quran-openings.json — connector/words consistency', () => {
  it('waw entries: w[0] is never a bare single "و"', () => {
    const bad = data.filter(d => d.c === 'waw' && d.w[0] === 'و');
    assert.equal(bad.length, 0,
      `${bad.length} waw entries have w[0]="و" (connector not stripped)`);
  });

  it('fa entries: w[0] is never a bare single "ف"', () => {
    const bad = data.filter(d => d.c === 'fa' && d.w[0] === 'ف');
    assert.equal(bad.length, 0);
  });

  it('thumma entries: w[0] is never "ثم"', () => {
    const bad = data.filter(d => d.c === 'thumma' && d.w[0] === 'ثم');
    assert.equal(bad.length, 0);
  });

  it('alaa entries: w[0] is never "ألا"', () => {
    const bad = data.filter(d => d.c === 'alaa' && d.w[0] === 'ألا');
    assert.equal(bad.length, 0);
  });
});

describe('quran-openings.json — connector distribution snapshot', () => {
  const dist = {};
  for (const d of data) dist[d.c] = (dist[d.c] || 0) + 1;

  const expected = {
    none: 3073, waw: 2215, fa: 698, thumma: 105,
    am: 61, bal: 37, aw: 24, alaa: 18, lakin: 5,
  };

  for (const [key, count] of Object.entries(expected)) {
    it(`connector "${key}" count = ${count}`, () => {
      assert.equal(dist[key] ?? 0, count,
        `"${key}": expected ${count}, got ${dist[key] ?? 0} — JSON may have been regenerated`);
    });
  }
});
