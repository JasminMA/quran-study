import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from './helpers/core.mjs';

// ── helpers ──────────────────────────────────────────────────────────
// Build a string from explicit Unicode code points so test intent is
// unambiguous regardless of how the source file is saved/displayed.
function u(...codepoints) {
  return String.fromCodePoint(...codepoints);
}

// Fathah, kasrah, dammah
const FATHAH    = 0x064E;
const KASRAH    = 0x0650;
const DAMMAH    = 0x064F;
const SHADDA    = 0x0651;
const SUKUN     = 0x0652;
const FATHATAN  = 0x064B;
const DAMMATAN  = 0x064C;
const KASRATAN  = 0x064D;
const SUP_ALEF  = 0x0670; // Arabic Letter Superscript Alef
const ALEF_WASLA = 0x0671; // ٱ
const ALEF       = 0x0627; // ا
// Quranic annotation marks
const MARK_D6   = 0x06D6;
const MARK_D9   = 0x06D9; // Arabic End of Ayah
const MARK_DE   = 0x06DE; // رُبُّ الْحِزْب ۞
const MARK_ED   = 0x06ED;

// Arabic letters used in tests (bare, no diacritics)
const W  = 0x0648; // و
const A  = 0x0627; // ا
const L  = 0x0644; // ل
const H  = 0x0647; // ه
const F  = 0x0641; // ف
const B  = 0x0628; // ب
const M  = 0x0645; // م
const I  = 0x0625; // إ
const DH = 0x0630; // ذ

describe('normalize() — tashkeel stripping', () => {
  it('strips fathah (U+064E) and kasrah (U+0650)', () => {
    // وَإِذَا  → وإذا
    const input = u(W, FATHAH, I, KASRAH, DH, FATHAH, A);
    assert.equal(normalize(input), u(W, I, DH, A));
  });

  it('strips dammah (U+064F)', () => {
    // وُ → و
    assert.equal(normalize(u(W, DAMMAH)), u(W));
  });

  it('strips tanwin dammah (U+064C)', () => {
    // وٌ → و
    assert.equal(normalize(u(W, DAMMATAN)), u(W));
  });

  it('strips kasratan (U+064D)', () => {
    assert.equal(normalize(u(W, KASRATAN)), u(W));
  });

  it('strips fathatan (U+064B)', () => {
    assert.equal(normalize(u(W, FATHATAN)), u(W));
  });

  it('strips shadda (U+0651)', () => {
    // لَكِنَّ → لكن  (shadda on ن)
    const LKN = [0x0644, FATHAH, 0x0643, KASRAH, 0x0646, SHADDA];
    assert.equal(normalize(u(...LKN)), u(0x0644, 0x0643, 0x0646));
  });

  it('strips sukun (U+0652)', () => {
    assert.equal(normalize(u(W, SUKUN)), u(W));
  });
});

describe('normalize() — Arabic base letters must NOT be stripped', () => {
  it('preserves الله (4 letters)', () => {
    const word = u(ALEF, L, L, H);
    const result = normalize(word);
    assert.equal(result, word);
    assert.equal(result.length, 4, 'الله must be exactly 4 characters');
  });

  it('preserves فبما (bare letters)', () => {
    const word = u(F, B, M, ALEF);
    assert.equal(normalize(word), word);
  });

  it('preserves وإذا (bare letters)', () => {
    const word = u(W, I, DH, ALEF);
    assert.equal(normalize(word), word);
  });

  it('length of normalize("الله") is exactly 4', () => {
    assert.equal(normalize(u(ALEF, L, L, H)).length, 4);
  });
});

describe('normalize() — superscript alef (U+0670)', () => {
  it('strips superscript alef embedded in a word', () => {
    // هٰذا → هذا
    const input  = u(H, SUP_ALEF, DH, ALEF);
    const expect = u(H, DH, ALEF);
    assert.equal(normalize(input), expect);
  });

  it('strips superscript alef combined with other diacritics', () => {
    // الرَّحْمٰنِ → الرحمن
    const input = u(ALEF, L, 0x0631, SHADDA, FATHAH, 0x062D, SUKUN, M, SUP_ALEF, 0x0646, KASRAH);
    assert.equal(normalize(input), u(ALEF, L, 0x0631, 0x062D, M, 0x0646));
  });
});

describe('normalize() — alef variants', () => {
  it('converts alef wasla (U+0671) to regular alef (U+0627)', () => {
    // ٱللَّهِ → الله
    const input  = u(ALEF_WASLA, L, L, SHADDA, H, KASRAH);
    const expect = u(ALEF, L, L, H);
    assert.equal(normalize(input), expect);
  });
});

describe('normalize() — Quranic annotation marks (U+06D6–U+06ED)', () => {
  it('strips U+06D9 (Arabic End of Ayah marker)', () => {
    // صرطۙ → صرط
    const S   = 0x0635; const R = 0x0631; const T = 0x0637;
    const input  = u(S, FATHAH, R, FATHAH, T, MARK_D9);
    const expect = u(S, R, T);
    assert.equal(normalize(input), expect);
  });

  it('strips U+06DE (رُبُّ الْحِزْب mark ۞) when embedded', () => {
    const input  = u(M, FATHAH, 0x0646, MARK_DE);
    const expect = u(M, 0x0646);
    assert.equal(normalize(input), expect);
  });

  it('strips U+06D6 (first Quranic annotation mark)', () => {
    assert.equal(normalize(u(W, MARK_D6)), u(W));
  });

  it('strips U+06ED (last Quranic annotation mark)', () => {
    assert.equal(normalize(u(W, MARK_ED)), u(W));
  });
});

describe('normalize() — muqatta\'at', () => {
  it('الم with Quranic marks normalizes to "الم" (length 3)', () => {
    // Uthmani الم uses small high marks; simulate with tashkeel on each letter
    const MADDAH = 0x0653;
    const alm = u(ALEF, L, M, MADDAH);
    const result = normalize(alm);
    assert.equal(result, u(ALEF, L, M));
    assert.equal(result.length, 3);
  });

  it('كهيعص with marks normalizes to "كهيعص" (length 5)', () => {
    const K = 0x0643; const Y = 0x064A; const AIN = 0x0639; const SAD = 0x0635;
    const MADDAH = 0x0653;
    // Each letter has a Quranic mark
    const input = u(K, MADDAH, H, SUP_ALEF, Y, SUP_ALEF, AIN, MADDAH, SAD, MADDAH);
    const result = normalize(input);
    assert.equal(result, u(K, H, Y, AIN, SAD));
    assert.equal(result.length, 5);
  });

  it('عسق normalizes to "عسق" (length 3)', () => {
    const AIN = 0x0639; const SIN = 0x0633; const QAF = 0x0642;
    const MADDAH = 0x0653;
    const input = u(AIN, MADDAH, SIN, MADDAH, QAF, MADDAH);
    assert.equal(normalize(input), u(AIN, SIN, QAF));
  });
});

describe('normalize() — whitespace', () => {
  it('collapses double space to single', () => {
    assert.equal(normalize('وإذا  قيل'), 'وإذا قيل');
  });

  it('trims leading whitespace', () => {
    assert.equal(normalize('  وإذا'), 'وإذا');
  });

  it('trims trailing whitespace', () => {
    assert.equal(normalize('وإذا  '), 'وإذا');
  });

  it('treats tab as whitespace', () => {
    assert.equal(normalize('وإذا\tقيل'), 'وإذا قيل');
  });

  it('returns empty string for empty input', () => {
    assert.equal(normalize(''), '');
  });
});
