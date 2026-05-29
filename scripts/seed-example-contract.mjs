import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(root, '.clastro', 'example-snapshot.json');

const snapshot = {
  siteId: 'demo-site',
  generatedAt: new Date().toISOString(),
  collections: {
    procedures: {
      aft: {
        siteId: 'demo-site',
        collectionId: 'procedures',
        itemId: 'aft',
        status: 'published',
        values: {
          title: 'AFT Fat Transfer',
          slug: 'aft-fat-transfer',
          summary: 'A source-backed procedure item used to prove the snapshot shape.',
        },
        extraSections: [
          {
            type: 'recoveryTimeline',
            values: {
              intro: 'Recovery guidance is stored as a per-item extra section.',
            },
          },
        ],
        updatedBy: 'seed',
        updatedAt: new Date().toISOString(),
      },
    },
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
