var MAX_WORDS = 5;

var WAW = 'و'; // و
var FA  = 'ف'; // ف

var FREE = {};
FREE['ثم'] = 'thumma'; // ثم
FREE['أو'] = 'aw';     // أو
FREE['بل'] = 'bal';    // بل
FREE['لكن'] = 'lakin'; // لكن
FREE['أم'] = 'am';    // أم
FREE['ألا'] = 'alaa'; // ألا

var CONN_META = {
  waw:    { cls: 'conn-waw',    hlCls: 'hl-waw' },
  fa:     { cls: 'conn-fa',     hlCls: 'hl-fa'  },
  none:   { cls: 'conn-none',   hlCls: '' },
  thumma: { cls: 'conn-thumma', hlCls: 'hl-thumma' },
  aw:     { cls: 'conn-aw',     hlCls: 'hl-aw' },
  bal:    { cls: 'conn-bal',    hlCls: 'hl-bal' },
  lakin:  { cls: 'conn-lakin',  hlCls: 'hl-lakin' },
  am:     { cls: 'conn-am',     hlCls: 'hl-am' },
  alaa:   { cls: 'conn-alaa',   hlCls: 'hl-alaa' },
};

function normalize(text) {
  return text
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, '')
    .replace(/ٱ/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim();
}

function getConnector(rawText) {
  var n = normalize(rawText);
  if (!n) return { key: 'none', stripped: '' };

  if (n[0] === WAW) return { key: 'waw', stripped: n.slice(1).replace(/^\s+/, '') };
  if (n[0] === FA)  return { key: 'fa',  stripped: n.slice(1).replace(/^\s+/, '') };

  var sp = n.indexOf(' ');
  var fw = sp === -1 ? n : n.slice(0, sp);
  if (FREE[fw]) return { key: FREE[fw], stripped: sp === -1 ? '' : n.slice(sp + 1) };

  return { key: 'none', stripped: n };
}

function connLabel(rawText, key) {
  if (key === 'none') return 'بدون'; // بدون
  var idx = rawText.search(/[؀-ۿ]/);
  if (idx === -1) return key;
  var rest = rawText.slice(idx);
  if (key === 'waw' || key === 'fa') {
    var m = rest.match(/^([؀-ۿ](?:[ؐ-ًؚ-ٰٟۖ-ۭ])*)/);
    return m ? m[1] : key;
  }
  var sp2 = rest.search(/\s/);
  return sp2 === -1 ? rest : rest.slice(0, sp2);
}

function highlightOpening(rawText, key) {
  var meta = CONN_META[key];
  if (!meta || !meta.hlCls) return rawText;
  var idx = rawText.search(/[؀-ۿ]/);
  if (idx === -1) return rawText;
  var rest = rawText.slice(idx);
  var hi, after;
  if (key === 'waw' || key === 'fa') {
    var m2 = rest.match(/^([؀-ۿ](?:[ؐ-ًؚ-ٰٟۖ-ۭ])*)([^]*)$/);
    if (!m2) return rawText;
    hi = m2[1]; after = m2[2];
  } else {
    var sp3 = rest.search(/\s/);
    if (sp3 === -1) { hi = rest; after = ''; }
    else { hi = rest.slice(0, sp3); after = rest.slice(sp3); }
  }
  return rawText.slice(0, idx) + '<span class="' + meta.hlCls + '">' + hi + '</span>' + after;
}

function findGroupsVariable(data, minShared) {
  var emitted = {};
  var groups  = [];

  for (var n = MAX_WORDS; n >= minShared; n--) {
    var map = {};
    for (var i = 0; i < data.length; i++) {
      var rec = data[i];
      if (!rec.words || rec.words.length < n) continue;
      var key = rec.words.slice(0, n).join('\x1F');
      if (!map[key]) map[key] = [];
      map[key].push(rec);
    }

    for (var key in map) {
      var verses = map[key];
      if (verses.length < 2) continue;

      var connSet = {};
      for (var j = 0; j < verses.length; j++) connSet[verses[j].conn] = true;
      if (Object.keys(connSet).length < 2) continue;

      var sig = verses.map(function(v) { return v.s + ':' + v.a; }).sort().join(',');
      if (emitted[sig]) continue;
      emitted[sig] = true;

      groups.push({ sharedWords: n, verses: verses });
    }
  }

  groups.sort(function(a, b) {
    var A = a.verses[0], B = b.verses[0];
    return A.s !== B.s ? A.s - B.s : A.a - B.a;
  });
  return groups;
}

function filterGroups(groups, filter) {
  if (filter === 'all') return groups;
  var FREE_KEYS = ['thumma', 'aw', 'bal', 'lakin', 'am', 'alaa'];
  return groups.filter(function(g) {
    var ks = {};
    g.verses.forEach(function(v) { ks[v.conn] = true; });
    if (filter === 'waw-fa')   return ks['waw'] && ks['fa'];
    if (filter === 'waw-none') return ks['waw'] && ks['none'];
    if (filter === 'fa-none')  return ks['fa']  && ks['none'];
    if (filter === 'other')    return FREE_KEYS.some(function(k) { return ks[k]; });
    return true;
  });
}

if (typeof module !== 'undefined') {
  module.exports = { MAX_WORDS, WAW, FA, FREE, CONN_META,
    normalize, getConnector, connLabel, highlightOpening,
    findGroupsVariable, filterGroups };
}
