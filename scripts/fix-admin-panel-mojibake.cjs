const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/admin/AdminPanel.tsx');
let buf = fs.readFileSync(file);

/** UTF-8 double-mojibake: doğru Türkçe baytları yanlış çözülüp tekrar UTF-8 yazılmış. */
const replacements = [
  ['c384c2b1', 'c4b1'], // ı
  ['c383c2bc', 'c3bc'], // ü
  ['c385c5b8', 'c59f'], // ş
  ['c384c5b8', 'c49f'], // ğ
  ['c383c2a7', 'c3a7'], // ç
  ['c383c2b6', 'c3b6'], // ö
  ['c385c29e', 'c59e'], // Ş
  ['c384c2b0', 'c4b0'], // İ
  ['c383c2b1', 'c3b1'], // ñ edge? check - actually for ñ - skip if not in file
  ['c383c296', 'c396'], // Ö (capital) - if present
  ['c383c287', 'c387'], // Ç
  ['c383c29c', 'c39c'], // Ü
  ['c383e28093', 'c396'], // Ã– -> Ö (double-mojibake variant)
  ['c383e280a1', 'c387'], // Ã‡ -> Ç
];

for (const [bad, good] of replacements) {
  const badBuf = Buffer.from(bad, 'hex');
  const goodBuf = Buffer.from(good, 'hex');
  let i = 0;
  let count = 0;
  while ((i = buf.indexOf(badBuf, i)) !== -1) {
    buf = Buffer.concat([buf.subarray(0, i), goodBuf, buf.subarray(i + badBuf.length)]);
    i += goodBuf.length;
    count += 1;
  }
  if (count) console.log(bad, '->', good, count);
}

// Em dash — (U+2014) mojibake: â€™ style or e2 80 94 triple mis-encoded
// Common: c3a2e2809c (â€") in UTF-8 for the three-char mojibake
const emDashMojibakes = [
  ['c3a2e2809c', 'e28094'], // â€" -> —
  ['c3a2e2809d', 'e28094'], // â€" variant
  ['c3a2e282ace2809e', 'e28094'], // another variant if any
  ['c3a2e282ace2809d', 'e28094'], // â€" (â + € + ”) -> —
];

for (const [bad, good] of emDashMojibakes) {
  const badBuf = Buffer.from(bad, 'hex');
  const goodBuf = Buffer.from(good, 'hex');
  let i = 0;
  let count = 0;
  while ((i = buf.indexOf(badBuf, i)) !== -1) {
    buf = Buffer.concat([buf.subarray(0, i), goodBuf, buf.subarray(i + badBuf.length)]);
    i += goodBuf.length;
    count += 1;
  }
  if (count) console.log('emdash', bad, count);
}

// Remaining GÃ¶ -> Gö etc: c383c2b6 already ö - "GÃ¶" is G + Ã + ¶? 
// Actually "GÃ¶" = G + c3 83 c2 b6 in file for gö - that's G + UTF-8(Ã) + UTF-8(¶)? 
// Let me check: Gö should be G + c3 b6 (ö with combining). 
// "GÃ¶nderim" = G + c383c2b6 + nderim - the c383c2b6 is already in our map as ö - but it's attached after G without the 4-byte pattern starting at G.

fs.writeFileSync(file, buf);
console.log('Done. Sample:', buf.toString('utf8').includes('Giriş') ? 'has Giriş' : 'no Giriş');
console.log('Sample:', buf.toString('utf8').includes('onaylandı') ? 'has onaylandı' : 'check unicode escapes');
