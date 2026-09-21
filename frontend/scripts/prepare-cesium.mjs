import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const destination = new URL('public/cesium/', root);
mkdirSync(destination, { recursive: true });
for (const directory of ['Workers', 'ThirdParty', 'Assets', 'Widgets'])
  cpSync(new URL(`node_modules/cesium/Build/Cesium/${directory}`, root), new URL(directory, destination), { recursive: true });
for (const file of ['LICENSE.md', 'ThirdParty.json'])
  cpSync(fileURLToPath(new URL(`node_modules/cesium/${file}`, root)), fileURLToPath(new URL(file, destination)));
