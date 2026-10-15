import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openApiSpec } from '../src/docs/openapi';

// יוצר את הקובץ docs/openapi.json מתוך התיעוד שבקוד
const outDir = join(__dirname, '..', 'docs');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'openapi.json'), `${JSON.stringify(openApiSpec, null, 2)}\n`, 'utf8');
console.log('✅ docs/openapi.json נוצר');
