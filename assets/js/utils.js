function toAr(n) {
  return String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

// Full Quran text (Uthmani script). Loaded once via initQuranText().
// Structure: _qt[surah-1][ayah-1] = raw Uthmani text string.
var _qt = null;

function initQuranText(data) {
  _qt = data;
}

// Returns the Uthmani text of the given surah/ayah, or '' if not yet loaded.
function getAyah(s, a) {
  if (!_qt) return '';
  var surah = _qt[s - 1];
  return surah ? surah[a - 1] || '' : '';
}
