#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

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
  process.cwd(),
  'node_modules',
  '.cache',
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
const tarGz = Buffer.from(await response.arrayBuffer());
writeFileSync(tarPath, tarGz);

console.log(`[better-sqlite3] descomprimiendo ${tarPath}`);

const tar = gunzipSync(tarGz);
let offset = 0;
let extracted = false;

while (offset + 512 <= tar.length) {
  const header = tar.subarray(offset, offset + 512);
  if (header[0] === 0) break;

  const nameEnd = header.indexOf(0, 0);
  if (nameEnd < 0) break;
  const name = header.subarray(0, nameEnd).toString('utf-8');

  const sizeEnd = header.indexOf(0, 124);
  if (sizeEnd < 0) break;
  const sizeStr = header.subarray(124, sizeEnd).toString('utf-8').trim();
  const size = sizeStr === '' ? 0 : parseInt(sizeStr, 8);
  if (!Number.isFinite(size)) break;

  if (name.endsWith('better_sqlite3.node')) {
    const fileData = tar.subarray(offset + 512, offset + 512 + size);
    mkdirSync(dirname(targetBinary), { recursive: true });
    writeFileSync(targetBinary, fileData);
    console.log(`[better-sqlite3] binario instalado en ${targetBinary}`);
    extracted = true;
    break;
  }

  const paddedSize = Math.ceil(size / 512) * 512;
  offset += 512 + paddedSize;
}

if (!extracted) {
  console.error(
    `[better-sqlite3] no se encontro build/Release/better_sqlite3.node dentro del tarball`,
  );
  process.exit(1);
}
