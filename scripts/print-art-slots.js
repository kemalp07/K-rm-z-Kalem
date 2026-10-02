// Prints the art slot table for assets/art/README.md (source of truth: src/art/slots.ts).
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '../src/art/slots.ts'), 'utf8');
const re = /^\s+(\w+): \{ w: (\d+), h: (\d+), note: '([^']*)' \},$/gm;
let m;
console.log('| Slot (dosya adı) | Dünya ölçüsü | Teslim ölçüsü (3×) | Not |');
console.log('|---|---|---|---|');
while ((m = re.exec(src))) console.log(`| \`${m[1]}.png\` | ${m[2]}×${m[3]} | ${m[2] * 3}×${m[3] * 3} px | ${m[4]} |`);
