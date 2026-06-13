# Test Plan — متشابهات الأوائل

## Prerequisites & setup

- [x] Extract `normalize`, `getConnector`, `findGroupsVariable`, `filterGroups` from
      `surahs/nisa/mutashabihat-awail.html` into `assets/js/awail-core.js` as a
      CommonJS module (`module.exports = { normalize, getConnector, ... }`)
- [x] Add `<script src="../../assets/js/awail-core.js"></script>` before the inline
      `<script>` in the HTML and remove the duplicated function definitions
- [x] Create `package.json` at project root:
      `{ "type": "module", "scripts": { "test": "node --test tests/*.mjs" } }`
- [x] Verify `node --version` is 18+ (required for `node:test`)
- [x] Confirm `node --test tests/*.mjs` runs without errors on empty test files

---

## §1a — normalize() unit tests
**File:** `tests/normalize.test.mjs`

### Tashkeel stripping
- [x] Fathah (U+064E) and kasrah (U+0650) are stripped: `"وَإِذَا"` → `"وإذا"`
- [x] Dammah (U+064F) and tanwin dammah (U+064C) are stripped: `"وُجُوهٌ"` → `"وجوه"`
- [x] Kasratan (U+064D) is stripped: `"يَوْمٍ"` → `"يوم"`
- [x] Shadda (U+0651) is stripped: `"لَكِنَّ"` → `"لكن"`
- [x] Sukun (U+0652) is stripped: `"يَوْمٍ"` → `"يوم"`
- [x] Fathatan (U+064B) is stripped: `"يَوْمًا"` → `"يوما"`

### Critical: Arabic base letters must NOT be stripped
- [x] `"الله"` (bare letters, no diacritics) → `"الله"` unchanged
- [x] `"فبما"` → `"فبما"` unchanged
- [x] `"وإذا"` (bare letters) → `"وإذا"` unchanged
- [x] Output of `normalize("الله")` has exactly 4 characters

  > **Why this matters:** the regex range `ؚ-ٰ` in the current code *may* span
  > U+061A–U+0670, which includes Arabic base letters U+0621–U+064A. If any of
  > these assertions fail (empty output or missing letters), the regex is stripping
  > Arabic letters and the function is silently broken.

### Superscript alef (U+0670)
- [x] `"هٰذا"` → `"هذا"` (superscript alef stripped)
- [x] `"الرَّحْمٰنِ"` → `"الرحمن"` (combined with tashkeel)

### Alef variants
- [x] `"ٱللَّهِ"` (U+0671 alef wasla, ٱ) → `"الله"` (ٱ → ا)
- [x] `"ٱلرَّحْمَٰنِ"` → `"الرحمن"`

### Quranic annotation marks (U+06D6–U+06ED)
- [x] U+06D9 (Arabic End of Ayah) is stripped: `"صِرَٰطَۙ"` → `"صرط"`
- [x] U+06DE (رُبُّ الْحِزْب mark ۞) is stripped when embedded mid-text
- [x] U+06D6 and U+06ED (boundary marks) are stripped

### Muqatta'at
- [x] `normalize` of الٓمٓ with Quranic marks → output equals `"الم"`, length 3
- [x] `normalize` of كٓهٰيٰعٓصٓ with Quranic marks → output equals `"كهيعص"`, length 5
- [x] `normalize` of عٓسٓقٓ → output equals `"عسق"`, length 3
  > These confirm superscript alef (ٰ on ه and ي) and maddah-like marks (ٓ) are
  > stripped but the base consonants survive.

### Whitespace normalization
- [x] Double space collapsed: `"وإذا  قيل"` → `"وإذا قيل"`
- [x] Leading/trailing whitespace trimmed: `"  وإذا قيل  "` → `"وإذا قيل"`
- [x] Tab character treated as whitespace: `"وإذا\tقيل"` → `"وإذا قيل"`
- [x] Empty string input: `""` → `""`

---

## §1b — getConnector() unit tests
**File:** `tests/connector.test.mjs`

### All 9 connector types — correct key and stripped value
- [x] **waw:** `"وَإِذَا قِيلَ لَهُمْ"` → `{ key:'waw', stripped:'إذا قيل لهم' }`
- [x] **waw:** `"وَاللَّهُ بِكُلِّ شَيْءٍ"` → `{ key:'waw', stripped:'الله بكل شيء' }`
- [x] **fa:** `"فَإِذَا جَاءَ أَمْرُنَا"` → `{ key:'fa', stripped:'إذا جاء أمرنا' }`
- [x] **fa:** `"فَاللَّهُ أَوْلَىٰ بِهِمَا"` → `{ key:'fa', stripped:'الله أولى بهما' }`
- [x] **thumma:** `"ثُمَّ آتَيْنَا مُوسَى"` → `{ key:'thumma', stripped:'ءاتينا موسى' }`
- [x] **aw:** `"أَوْ أَشَدَّ خَشْيَةً"` → `{ key:'aw', stripped:'أشد خشية' }`
- [x] **bal:** `"بَلِ ٱللَّهُ مَوْلَىٰكُمْ"` → `{ key:'bal', stripped:'الله مولىكم' }`
- [x] **lakin:** `"لَّٰكِنِ ٱللَّهُ يَشْهَدُ"` → `{ key:'lakin', stripped:'الله يشهد' }`
- [x] **am:** `"أَمِ ٱتَّخَذَ مِمَّا خَلَقَ"` → `{ key:'am', stripped:'اتخذ مما خلق' }`
- [x] **alaa:** `"أَلَا إِنَّ أَوْلِيَاءَ"` → `{ key:'alaa', stripped:'إن أولياء' }`
- [x] **none:** `"ٱلْحَمْدُ لِلَّهِ رَبِّ"` → `{ key:'none', stripped:'الحمد لله رب' }`
- [x] **none:** `"ذَٰلِكَ ٱلْكِتَٰبُ"` → `{ key:'none', stripped:'ذلك الكتب' }`
- [x] **none:** empty string `""` → `{ key:'none', stripped:'' }`

### stripped must be normalized (no tashkeel)
- [x] For a waw verse, `stripped` contains no fathah (U+064E) characters
- [x] For a thumma verse, `stripped` starts with the word after ثم, with no diacritics

### Double-prefix cases — NOT false positives
These are real verses where a verb starting with و/ف follows the conjunction و/ف.
The connector key should still be `'waw'`/`'fa'` and `stripped` should start with
the verb (which itself begins with و/ف).

- [x] **2:132** `"وَوَصَّىٰ بِهَا إِبْرَٰهِيمُ"` → `{ key:'waw', stripped:'وصى بها إبرهم' }`
- [x] **6:84** `"وَوَهَبْنَا لَهُۥ إِسْحَٰقَ"` → `{ key:'waw', stripped:'وهبنا له إسحق' }`
- [x] **21:79** `"فَفَهَّمْنَٰهَا سُلَيْمَٰنَ"` → `{ key:'fa', stripped:'فهمنها سليمن' }`
- [x] **54:11** `"فَفَتَحْنَآ أَبْوَٰبَ ٱلسَّمَاءِ"` → `{ key:'fa', stripped:'فتحنا أبوب السماء' }`
- [x] In all four cases: `stripped[0]` equals `'و'` or `'ف'` respectively (confirms only
      one layer was stripped)

### Structural false-positive check — أم vs أُمّ
- [x] Input starting with `"أُمَّهَٰتُكُمْ"` (mothers, not connector)
      → `{ key:'none', ... }` because normalized first word `"أمهتكم"` ≠ `"أم"` in `FREE`

---

## §1c — findGroupsVariable() / LCP tests
**File:** `tests/lcp.test.mjs`

Use synthetic `data` arrays (plain JS objects, no API calls).

### Basic group formation
- [x] Two verses with 3 shared normalized words and different connectors → 1 group,
      `sharedWords=3`
- [x] Two verses with 3 shared words but `minShared=4` → 0 groups
- [x] Single verse → 0 groups (no pair possible)
- [x] Empty data array → 0 groups, no error

### Mixed-connector requirement
- [x] Two verses sharing a prefix, both `conn:'waw'` → 0 groups (same connector, not mixed)
- [x] Two verses sharing a prefix, `conn:'waw'` and `conn:'none'` → 1 group
- [x] Three verses sharing a prefix: `waw`, `fa`, `none` → 1 group (all three members)

### De-duplication — longest prefix wins
- [x] Verse pair sharing 5 words (different connectors): `findGroupsVariable(data, 1)`
      → exactly 1 group with `sharedWords=5`, NOT two groups at 5 and 3
- [x] After de-duplication, `sig` of `{A,B}` is only emitted once across all `n` iterations

### Three-verse nested subsets
- [x] A, B share 5 words; A, B, C share 2 words (C has third connector):
      `findGroupsVariable(data, 1)` → 2 groups: `{A,B}` at `sharedWords=5`
      AND `{A,B,C}` at `sharedWords=2` (different signatures, both valid)

### Word-split edge cases
- [x] Verse where `conn.stripped` contains double space: `words` array has no empty strings
- [x] Verse where `conn.stripped` is empty string (verse = only the connector): `words=[]`,
      verse participates in no groups
- [x] Leading space in `stripped` (e.g., `n.slice(1)` leaves `" إذا"`): `.replace(/^\s+/, '')`
      removes it → `words[0]` is `"إذا"`, not `""`

### MAX_WORDS cap
- [x] No group ever has `sharedWords > 5`
- [x] A verse with 7 space-separated words in `stripped`: only first 5 are stored,
      matching uses only those 5

### Sort order
- [x] Groups are sorted by `(s, a)` of first verse ascending
- [x] A group whose first verse is `s:10, a:1` appears after a group with `s:2, a:100`

---

## §2 — Data integrity (quran-openings.json)
**File:** `tests/data.test.mjs`

Load the JSON once at the top of the file. All checks are synchronous.

### Count and encoding
- [x] `data.length === 6236`
- [x] First 3 raw bytes of the file are `5B 7B 22` (`[{"`), confirming no UTF-8 BOM
      (use `fs.readFileSync` and check `buf[0]===0x5B, buf[1]===0x7B, buf[2]===0x22`)

### (s, a) completeness and uniqueness
- [x] No duplicate `(s, a)` pairs: `new Set(data.map(d => d.s+':'+d.a)).size === 6236`
- [x] Surah numbers span 1–114 with no gaps (all 114 surahs present)
- [x] Within each surah, ayah numbers run from 1 to the surah's total count with no gaps

### Field types and values
- [x] Every entry has fields `s` (number), `a` (number), `sn` (non-empty string),
      `c` (string), `w` (array)
- [x] Every `c` value is one of: `none waw fa thumma aw bal lakin am alaa`
- [x] Every `w` has length 0–5
- [x] No entry has `""` (empty string) inside `w`
- [x] No entry has `w` containing `undefined` or `null`

### Connector/words consistency
- [x] `c === 'waw'` entries: `w[0]` is never the single character `"و"` alone
      (a verse cannot consist of only a waw)
- [x] `c === 'thumma'` entries: `w[0] !== "ثم"` for all 105 such entries
      (connector must be stripped from words)
- [x] `c === 'fa'` entries: `w[0]` is never `"ف"` alone

### Connector distribution snapshot
Lock in the current counts so regeneration is visible:

- [x] `none` count = 3073
- [x] `waw` count = 2215
- [x] `fa` count = 698
- [x] `thumma` count = 105
- [x] `am` count = 61
- [x] `bal` count = 37
- [x] `aw` count = 24
- [x] `alaa` count = 18
- [x] `lakin` count = 5

---

## §3 — Regression tests with known mutashabihat
**File:** `tests/regression.test.mjs`
**Fixture:** `tests/helpers/fixtures.json`

### Step 0 — generate and verify the fixture (do once, before writing tests)
- [x] Write a throwaway Node script that loads the JSON, runs `findGroupsVariable`
      at `minShared=1` on all 6236 entries, and prints groups sorted by `sharedWords` desc
- [x] Inspect the output and select 5–8 groups by the criteria below
- [x] For each selected group, verify the (s, a) references against Quran.com or Tanzil.net
      to confirm the shared stem and connector difference are real
- [x] Save verified groups to `tests/helpers/fixtures.json`

### Groups to find and freeze (one per category)
- [x] **Waw ↔ None pair** — two النساء verses sharing 2+ stripped words where one has
      `c:'waw'` and the other `c:'none'`; record `sharedWords`, member `(s,a,c)` tuples,
      and stem words
- [x] **Waw ↔ Fa pair** — any two verses (whole-Quran) sharing 3+ words with `c:'waw'`
      and `c:'fa'`; this is the highest-value pedagogical case
- [x] **Three-member cluster** — a group with ≥3 members having at least 2 distinct
      connector types among them
- [x] **Long-prefix match (sharedWords=5)** — a group with the maximum 5 shared words;
      most sensitive to normalization changes
- [x] **Cross-surah pair involving النساء** — one member from surah 4, the other from
      any other surah; verifies whole-Quran scope produces it
- [x] **Connector-only difference with no prefix match** — a pair where both verses begin
      with the same 1 word after stripping (sharedWords=1); verifies `minShared=1` mode

### Negative fixture — must NOT appear
- [x] Identify two النساء verses sharing 2+ stripped words with the SAME connector;
      record their `(s,a)` pairs; assert no group in the output contains both

### Regression assertions (run after fixture is built)
- [x] Load JSON, run `findGroupsVariable(data, 1)` → `groups`
- [x] For each fixture group: assert a group exists in `groups` with matching
      `sharedWords` and the same set of `(s, a)` member pairs (order-independent)
- [x] For the negative fixture: assert no group contains both specified `(s, a)` pairs

---

## §4 — Whole-Quran end-to-end
**File:** `tests/regression.test.mjs` (add a describe block) or separate file

- [x] Load all 6236 entries and confirm count before running
- [x] `findGroupsVariable(data, 1)` completes without throwing
- [x] Result length > 0
- [x] Result length < 6236 (sanity upper bound)
- [x] Two consecutive runs on the same data return identical results (deterministic):
      `assert.deepEqual(run1, run2)`
- [x] Monotonicity: `groups_at_2.length <= groups_at_1.length` and
      `groups_at_3.length <= groups_at_2.length`
- [x] No group has `sharedWords > 5` (MAX_WORDS cap respected)
- [x] Log (but do not assert) wall-clock time; flag manually if it exceeds 3 seconds

---

## §5 — UI/filter correctness
**File:** `tests/filter.test.mjs`

These test the pure JS logic only — no browser, no DOM.

### Similarity filter (findGroupsVariable threshold)
- [x] Build a synthetic fixture with groups at sharedWords 1, 2, and 3 (different connectors)
- [x] `findGroupsVariable(data, 2)` returns no group with `sharedWords < 2`
- [x] `findGroupsVariable(data, 3)` returns no group with `sharedWords < 3`
- [x] A group with `sharedWords=1` present in `findGroupsVariable(data,1)` is absent
      from `findGroupsVariable(data,2)`

### Connector filter (filterGroups)
- [x] `filterGroups(groups, 'all')` returns all groups unchanged
- [x] `filterGroups(groups, 'waw-fa')` returns only groups containing both `waw` and `fa`
      members
- [x] `filterGroups(groups, 'waw-none')` returns only groups with both `waw` and `none`
- [x] `filterGroups(groups, 'fa-none')` returns only groups with both `fa` and `none`
- [x] `filterGroups(groups, 'other')` returns only groups containing at least one member
      with a connector in `{thumma, aw, bal, lakin, am, alaa}`
- [x] A group with only `waw` and `fa` members does NOT appear in `filterGroups(groups, 'other')`
- [x] `filterGroups([], 'waw-fa')` returns `[]` without error

### Scope consistency — per-surah ⊆ whole-Quran (at verse-pair level)
- [x] Run `findGroupsVariable` on only `s=4` entries with `minShared=2` → `nisaGroups`
- [x] Run `findGroupsVariable` on all 6236 entries with `minShared=2` → `quranGroups`
- [x] For every verse-pair `(4:X, 4:Y)` that co-appears in any `nisaGroups` group,
      assert there exists a `quranGroups` group that also contains both `(s:4,a:X)`
      and `(s:4,a:Y)` as members (possibly in a larger multi-verse group)
- [x] The above holds regardless of whether the cross-Quran group has additional members
      from other surahs

---

## Completion checklist

- [x] All test files pass: `npm test`
- [x] No test relies on network — all use local JSON or synthetic data
- [x] `assets/js/awail-core.js` is loaded in the HTML without breaking the existing feature
- [x] `tests/helpers/fixtures.json` is committed alongside the tests
- [x] The 9 connector distribution counts in §2 are updated if the JSON is ever regenerated
