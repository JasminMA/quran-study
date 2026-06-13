import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getConnector } from './helpers/core.mjs';

// Helpers: verify key and (optionally) the stripped value
function assertConn(rawText, expectedKey, expectedStripped) {
  const result = getConnector(rawText);
  assert.equal(result.key, expectedKey,
    `key: expected "${expectedKey}", got "${result.key}" for input "${rawText}"`);
  if (expectedStripped !== undefined) {
    assert.equal(result.stripped, expectedStripped,
      `stripped: expected "${expectedStripped}", got "${result.stripped}" for input "${rawText}"`);
  }
}

// Verify stripped contains no tashkeel (U+064B–U+065F, U+0670)
function assertNoTashkeel(stripped) {
  for (const ch of stripped) {
    const cp = ch.codePointAt(0);
    assert.ok(
      !(cp >= 0x064B && cp <= 0x065F) && cp !== 0x0670,
      `stripped contains tashkeel U+${cp.toString(16).toUpperCase()}: "${stripped}"`
    );
  }
}

describe('getConnector() — waw (و)', () => {
  it('classifies verse starting with وَ as waw', () => {
    assertConn('وَإِذَا قِيلَ لَهُمْ', 'waw', 'إذا قيل لهم');
  });

  it('classifies وَاللَّهُ as waw', () => {
    assertConn('وَاللَّهُ بِكُلِّ شَيْءٍ', 'waw', 'الله بكل شيء');
  });

  it('stripped contains no tashkeel', () => {
    const { stripped } = getConnector('وَإِذَا قِيلَ لَهُمْ');
    assertNoTashkeel(stripped);
  });
});

describe('getConnector() — fa (ف)', () => {
  it('classifies verse starting with فَ as fa', () => {
    assertConn('فَإِذَا جَاءَ أَمْرُنَا', 'fa', 'إذا جاء أمرنا');
  });

  it('classifies فَاللَّهُ as fa', () => {
    assertConn('فَاللَّهُ أَوْلَىٰ بِهِمَا', 'fa', 'الله أولى بهما');
  });

  it('stripped contains no tashkeel', () => {
    const { stripped } = getConnector('فَإِذَا جَاءَ أَمْرُنَا');
    assertNoTashkeel(stripped);
  });
});

describe('getConnector() — thumma (ثم)', () => {
  it('classifies ثُمَّ as thumma', () => {
    // آتينا uses U+0622 (alef with madda), preserved as-is after normalization
    assertConn('ثُمَّ آتَيْنَا مُوسَى', 'thumma', 'آتينا موسى');
  });

  it('stripped does not start with ثم', () => {
    const { stripped } = getConnector('ثُمَّ آتَيْنَا مُوسَى');
    assert.ok(!stripped.startsWith('ثم'), 'stripped must not begin with the connector word');
  });
});

describe('getConnector() — aw (أو)', () => {
  it('classifies أَوْ as aw', () => {
    assertConn('أَوْ أَشَدَّ خَشْيَةً', 'aw', 'أشد خشية');
  });
});

describe('getConnector() — bal (بل)', () => {
  it('classifies بَلِ as bal', () => {
    assertConn('بَلِ اللَّهُ مَوْلَاكُمْ', 'bal', 'الله مولاكم');
  });
});

describe('getConnector() — lakin (لكن)', () => {
  it('classifies لَّٰكِنِ as lakin', () => {
    // Use alef-wasla variant: ٱللَّهُ
    assertConn('لَّٰكِنِ اللَّهُ يَشْهَدُ', 'lakin', 'الله يشهد');
  });
});

describe('getConnector() — am (أم)', () => {
  it('classifies أَمِ as am', () => {
    assertConn('أَمِ اتَّخَذَ مِمَّا خَلَقَ', 'am', 'اتخذ مما خلق');
  });
});

describe('getConnector() — alaa (ألا)', () => {
  it('classifies أَلَا as alaa', () => {
    assertConn('أَلَا إِنَّ أَوْلِيَاءَ', 'alaa', 'إن أولياء');
  });
});

describe('getConnector() — none (بدون)', () => {
  it('classifies ٱلْحَمْدُ as none', () => {
    assertConn('الْحَمْدُ لِلَّهِ رَبِّ', 'none');
    // stripped equals the normalized full text
    const { stripped } = getConnector('الْحَمْدُ لِلَّهِ رَبِّ');
    assert.equal(stripped, 'الحمد لله رب');
  });

  it('classifies ذَٰلِكَ as none', () => {
    assertConn('ذَٰلِكَ الْكِتَابُ', 'none', 'ذلك الكتاب');
  });

  it('returns none for empty string', () => {
    assertConn('', 'none', '');
  });
});

describe('getConnector() — double-prefix cases (not false positives)', () => {
  // These verses start with وَوَ or فَفَ: the first letter is the connector,
  // the verb itself also starts with the same letter. Only one layer must be stripped.

  it('2:132 وَوَصَّىٰ: key=waw, stripped starts with وصى', () => {
    const { key, stripped } = getConnector('وَوَصَّىٰ بِهَا إِبْرَاهِيمُ');
    assert.equal(key, 'waw');
    assert.ok(stripped.startsWith('وصى'), `stripped="${stripped}" should start with "وصى"`);
  });

  it('6:84 وَوَهَبْنَا: key=waw, stripped starts with وهبنا', () => {
    const { key, stripped } = getConnector('وَوَهَبْنَا لَهُ إِسْحَاقَ');
    assert.equal(key, 'waw');
    assert.ok(stripped.startsWith('وهبنا'), `stripped="${stripped}" should start with "وهبنا"`);
  });

  it('21:79 فَفَهَّمْنَاهَا: key=fa, stripped starts with فهمناها', () => {
    const { key, stripped } = getConnector('فَفَهَّمْنَاهَا سُلَيْمَانَ');
    assert.equal(key, 'fa');
    assert.ok(stripped.startsWith('فهمناها'), `stripped="${stripped}" should start with "فهمناها"`);
  });

  it('54:11 فَفَتَحْنَا: key=fa, stripped starts with فتحنا', () => {
    const { key, stripped } = getConnector('فَفَتَحْنَا أَبْوَابَ السَّمَاءِ');
    assert.equal(key, 'fa');
    assert.ok(stripped.startsWith('فتحنا'), `stripped="${stripped}" should start with "فتحنا"`);
  });

  it('double-waw: stripped[0] is still و (only one layer stripped)', () => {
    const { stripped } = getConnector('وَوَصَّىٰ بِهَا إِبْرَاهِيمُ');
    assert.equal(stripped.codePointAt(0), 0x0648, // و
      'first character of stripped must be و (second waw, part of verb)');
  });

  it('double-fa: stripped[0] is still ف (only one layer stripped)', () => {
    const { stripped } = getConnector('فَفَتَحْنَا أَبْوَابَ السَّمَاءِ');
    assert.equal(stripped.codePointAt(0), 0x0641, // ف
      'first character of stripped must be ف (second fa, part of verb)');
  });
});

describe('getConnector() — structural false-positive check', () => {
  it('أُمَّهَاتُكُمْ (mothers) is classified as none, not am', () => {
    // First word after normalize is "أمهتكم" (or similar), which ≠ "أم" in FREE
    const { key } = getConnector('أُمَّهَاتُكُمْ وَبَنَاتُكُمْ');
    assert.equal(key, 'none',
      'أُمَّهَاتُكُمْ must not be misclassified as the connector "أم"');
  });

  it('أَوَّلَ (first/foremost) starting with أو is NOT classified as aw', () => {
    // "أَوَّلَ" starts with أو but normalized first word is "أول" ≠ "أو"
    const { key } = getConnector('أَوَّلَ مَن يَكْفُرُ بِهِ');
    assert.equal(key, 'none',
      'أَوَّلَ must not be misclassified as the connector "أو"');
  });
});
