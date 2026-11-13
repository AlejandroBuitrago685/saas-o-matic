import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openApiDocument } from './openapi-document.js';

/** `npm run openapi`: regenerates the versioned document; a test fails while it is out of date (D-110). */
const target = new URL('../openapi.json', import.meta.url);
writeFileSync(target, await openApiDocument());
process.stdout.write(`Wrote ${fileURLToPath(target)}\n`);
