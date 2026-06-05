#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');

const targetBinary = join(
  packageRoot,
  'node_modules',
  'better-sqlite3',
  'build',
  'Release',
  'better_sqlite3.node',
);

if (existsSync(targetBinary)) {
  console.log('[better-sqlite3] binario ya presente, nada que hacer.');
  process.exit(0);
}

const packageJson = JSON.parse(
  await readFile(join(packageRoot, 'package.json'), 'utf-8'),
);

const versionRange = packageJson.dependencies?.['better-sqlite3'];
if (!versionRange) {
  console.log('[better-sqlite3] no esta en dependencies, saliendo.');
  process.exit(0);
}

const version = versionRange.replace(/^[\^~>=< ]+/, '');

const abi = process.versions.modules;
const platform = process.platform;
const arch = process.arch;
const filename = `better-sqlite3-v${version}-node-v${abi}-${platform}-${arch}.tar.gz`;
const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${version}/${filename}`;

const tmpDir = join(
  process.env.TMPDIR ?? process.env.TEMP ?? process.env.TMP ?? '.',
  `bs3-prebuild-${Date.now()}`,
);
mkdirSync(tmpDir, { recursive: true });
const tarPath = join(tmpDir, filename);

console.log(`[better-sqlite3] ABI=${abi} platform=${platform} arch=${arch} version=${version}`);
console.log(`[better-sqlite3] descargando ${url}`);

const response = await fetch(url, { redirect: 'follow' });
if (!response.ok) {
  console.error(
    `[better-sqlite3] descarga fallo: ${response.status} ${response.statusText}`,
  );
  process.exit(1);
}
await pipeline(response.body, createWriteStream(tarPath));

console.log(`[better-sqlite3] extrayendo ${tarPath}`);
execFileSync('tar', ['-xzf', tarPath, '-C', tmpDir], { stdio: 'inherit' });

const sourceBinary = join(tmpDir, 'build', 'Release', 'better_sqlite3.node');
if (!existsSync(sourceBinary)) {
  console.error(
    `[better-sqlite3] binario no encontrado en el prebuild extraido: ${sourceBinary}`,
  );
  process.exit(1);
}

mkdirSync(dirname(targetBinary), { recursive: true });
await pipeline(createReadStream(sourceBinary), createWriteStream(targetBinary));

console.log(`[better-sqlite3] binario instalado en ${targetBinary}`);
