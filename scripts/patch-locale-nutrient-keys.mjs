import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'lib/i18n/messages');
const catalogBlock = `    catalogSources: {
      'hydroodo-0.4b18': 'Hydroodo 0.4 beta database',
      'hydrobuddy-salts-community': 'HydroBuddy salt composition reference',
      'growlog-scientific-canonical': 'Growlog scientific canonical references',
    },
`;

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.ts') || f === 'en.ts' || f === 'ru.ts' || f === 'index.ts') continue;
  let s = fs.readFileSync(path.join(dir, f), 'utf8');
  if (!s.includes('weekN:')) {
    s = s.replace("addStep: 'Add step',\n", "addStep: 'Add step',\n      weekN: 'Week {n}',\n");
  }
  if (!s.includes('farmMember:')) {
    s = s.replace(
      /markHarvestedConfirm:[\s\S]*?\n    \},\n    productFilters:/,
      (m) => m.replace(/\n    \},\n    productFilters:/, "\n      farmMember: 'Farm member',\n    },\n    productFilters:"),
    );
  }
  if (!s.includes('catalogSources:')) {
    s = s.replace('    sources: {', catalogBlock + '    sources: {');
  }
  fs.writeFileSync(path.join(dir, f), s);
}
