import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findGroupsVariable, MAX_WORDS } from './helpers/core.mjs';

// ── test data builder ─────────────────────────────────────────────────
function v(s, a, conn, words) {
  return { s, a, sn: 'test', conn, words };
}

// Shorthand: make words array from a string, splitting on spaces
function w(...words) { return words; }

describe('findGroupsVariable() — basic group formation', () => {
  it('two verses sharing 3 words with different connectors → 1 group', () => {
    const data = [
      v(1, 1, 'waw',  w('إذا', 'قيل', 'لهم', 'لا', 'تفسدوا')),
      v(1, 2, 'fa',   w('إذا', 'قيل', 'لهم', 'آمنا', 'قالوا')),
      v(1, 3, 'none', w('نحن', 'المصلحون', 'في', 'الأرض', 'كله')),
    ];
    const groups = findGroupsVariable(data, 2);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].sharedWords, 3);
    assert.equal(groups[0].verses.length, 2);
  });

  it('minShared higher than actual shared words → 0 groups', () => {
    const data = [
      v(1, 1, 'waw',  w('إذا', 'قيل', 'لهم')),
      v(1, 2, 'fa',   w('إذا', 'قيل', 'لهم')),
    ];
    assert.equal(findGroupsVariable(data, 4).length, 0);
  });

  it('single verse → 0 groups', () => {
    const data = [ v(1, 1, 'waw', w('إذا', 'قيل', 'لهم')) ];
    assert.equal(findGroupsVariable(data, 1).length, 0);
  });

  it('empty data → 0 groups, no error', () => {
    assert.equal(findGroupsVariable([], 1).length, 0);
  });
});

describe('findGroupsVariable() — mixed-connector requirement', () => {
  it('two verses with same prefix but same connector → 0 groups', () => {
    const data = [
      v(1, 1, 'waw', w('إذا', 'قيل', 'لهم')),
      v(1, 2, 'waw', w('إذا', 'قيل', 'لهم')),
    ];
    assert.equal(findGroupsVariable(data, 1).length, 0);
  });

  it('waw + none → 1 group', () => {
    const data = [
      v(1, 1, 'waw',  w('إذا', 'قيل', 'لهم')),
      v(1, 2, 'none', w('إذا', 'قيل', 'لهم')),
    ];
    assert.equal(findGroupsVariable(data, 1).length, 1);
  });

  it('three verses waw/fa/none with same prefix → 1 group with 3 members', () => {
    const data = [
      v(1, 1, 'waw',  w('إذا', 'قيل', 'لهم')),
      v(1, 2, 'fa',   w('إذا', 'قيل', 'لهم')),
      v(1, 3, 'none', w('إذا', 'قيل', 'لهم')),
    ];
    const groups = findGroupsVariable(data, 1);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].verses.length, 3);
  });
});

describe('findGroupsVariable() — de-duplication (longest prefix wins)', () => {
  it('pair sharing 5 words: only 1 group emitted at sharedWords=5', () => {
    const data = [
      v(1, 1, 'waw',  w('إذا', 'قيل', 'لهم', 'لا', 'تفسدوا')),
      v(1, 2, 'none', w('إذا', 'قيل', 'لهم', 'لا', 'تفسدوا')),
    ];
    const groups = findGroupsVariable(data, 1);
    assert.equal(groups.length, 1, 'must not emit duplicate groups for the same verse-pair');
    assert.equal(groups[0].sharedWords, 5);
  });

  it('de-duplicated: same {A,B} sig not repeated at lower n values', () => {
    const data = [
      v(2, 1, 'fa',   w('إذا', 'قيل', 'لهم', 'لا', 'تفسدوا')),
      v(2, 2, 'none', w('إذا', 'قيل', 'لهم', 'لا', 'تفسدوا')),
    ];
    // minShared=1 → iterates n=5,4,3,2,1; group should appear only at n=5
    const groups = findGroupsVariable(data, 1);
    const sigs = groups.map(g =>
      g.verses.map(vv => vv.s + ':' + vv.a).sort().join(',')
    );
    const unique = new Set(sigs);
    assert.equal(unique.size, sigs.length, 'each verse-set signature must appear at most once');
  });
});

describe('findGroupsVariable() — three-verse nested subsets', () => {
  it('A,B share 5 words; A,B,C share 2 words → 2 distinct groups', () => {
    const data = [
      v(3, 1, 'waw',  w('إذا', 'قيل', 'لهم', 'لا', 'تفسدوا')),
      v(3, 2, 'none', w('إذا', 'قيل', 'لهم', 'لا', 'تفسدوا')),
      v(3, 3, 'fa',   w('إذا', 'قيل', 'ءامنوا', 'كما', 'آمن')),
    ];
    const groups = findGroupsVariable(data, 1);
    assert.equal(groups.length, 2, 'should get {A,B} at 5 words AND {A,B,C} at 2 words');
    const byWords = Object.fromEntries(groups.map(g => [g.sharedWords, g]));
    assert.ok(byWords[5], 'group at sharedWords=5 must exist');
    assert.ok(byWords[2], 'group at sharedWords=2 must exist');
    assert.equal(byWords[5].verses.length, 2);
    assert.equal(byWords[2].verses.length, 3);
  });
});

describe('findGroupsVariable() — word-split edge cases', () => {
  it('words array with no empty strings', () => {
    // Simulate what the loader does: split on /\s+/ + filter(Boolean)
    const raw = '  إذا  قيل  ';
    const words = raw.split(/\s+/).filter(Boolean).slice(0, MAX_WORDS);
    assert.deepEqual(words, ['إذا', 'قيل']);
    assert.ok(!words.includes(''), 'no empty strings in words array');
  });

  it('verse with empty words array participates in no groups', () => {
    const data = [
      v(4, 1, 'waw',  []),
      v(4, 2, 'none', w('إذا', 'قيل')),
    ];
    assert.equal(findGroupsVariable(data, 1).length, 0);
  });

  it('verse with fewer words than minShared is skipped', () => {
    const data = [
      v(4, 1, 'waw',  w('إذا')),        // only 1 word
      v(4, 2, 'none', w('إذا', 'قيل')), // 2 words
    ];
    // minShared=2: verse 4:1 has only 1 word, can't contribute to a 2-word group
    assert.equal(findGroupsVariable(data, 2).length, 0);
  });
});

describe('findGroupsVariable() — MAX_WORDS cap', () => {
  it('no group has sharedWords > MAX_WORDS (5)', () => {
    const data = [
      v(5, 1, 'waw',  w('أ', 'ب', 'ج', 'د', 'ه')),
      v(5, 2, 'none', w('أ', 'ب', 'ج', 'د', 'ه')),
    ];
    const groups = findGroupsVariable(data, 1);
    assert.ok(groups.every(g => g.sharedWords <= MAX_WORDS),
      'sharedWords must not exceed MAX_WORDS');
  });
});

describe('findGroupsVariable() — sort order', () => {
  it('groups sorted by (s, a) of first verse ascending (checks multi-group order)', () => {
    // Two distinct groups; insert data in reverse order to prove sort is not insertion-order
    const data = [
      v(10, 1, 'waw',  w('كلمة', 'أخرى', 'هنا')),
      v(10, 2, 'fa',   w('كلمة', 'أخرى', 'هنا')),
      v(2,  3, 'waw',  w('إذا', 'قيل', 'لهم')),
      v(2,  4, 'none', w('إذا', 'قيل', 'لهم')),
    ];
    const groups = findGroupsVariable(data, 1);
    assert.equal(groups.length, 2);
    // The group whose first-verse surah is smaller must come first
    const s0 = Math.min(...groups[0].verses.map(vv => vv.s));
    const s1 = Math.min(...groups[1].verses.map(vv => vv.s));
    assert.ok(s0 <= s1, 'groups must be ordered by earliest surah ascending');
  });

  it('two distinct groups ordered by surah of their first verse', () => {
    const data = [
      v(10, 1, 'waw',  w('كلمة', 'أخرى', 'هنا')),
      v(10, 2, 'fa',   w('كلمة', 'أخرى', 'هنا')),
      v(2,  3, 'waw',  w('إذا', 'قيل', 'لهم')),
      v(2,  4, 'none', w('إذا', 'قيل', 'لهم')),
    ];
    const groups = findGroupsVariable(data, 1);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].verses[0].s, 2);
    assert.equal(groups[1].verses[0].s, 10);
  });
});
