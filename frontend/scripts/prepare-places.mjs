// Explicit source-data refresh only; ordinary restore/build never downloads place data.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_populated_places_simple.geojson';
const expected = 'fd3fa867a320cbd5c5b6bb5bc550afeec2939fb2cef688e508007282a55ac42f';
const raw = process.argv[2] ? await readFile(process.argv[2]) : Buffer.from(await (await fetch(url)).arrayBuffer());
if (createHash('sha256').update(raw).digest('hex') !== expected) throw new Error('Natural Earth checksum mismatch; the existing index has not been changed.');
const source = JSON.parse(raw.toString('utf8'));
const places = source.features.map(feature => {
  const p = feature.properties; const [longitude, latitude] = feature.geometry.coordinates;
  if (feature.geometry.type !== 'Point' || !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
      !Number.isFinite(latitude) || Math.abs(latitude) > 90 || !p.name || !p.ne_id) throw new Error('Invalid place record.');
  return { id: String(p.ne_id), name: p.name, country: p.adm0name,
    aliases: [...new Set([p.nameascii, p.namealt, p.namepar, p.ls_name].filter(x => x && x !== p.name))],
    longitude, latitude, rank: p.scalerank };
}).sort((a, b) => a.id.localeCompare(b.id, 'en'));
if (places.length !== 7342 || new Set(places.map(p => p.id)).size !== places.length) throw new Error('Unexpected place count or duplicate source IDs.');
const directory = new URL('../public/data/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('natural-earth-places.v1.json', directory), JSON.stringify({ schemaVersion: 1, sourceVersion: '5.1.2', places }) + '\n');
console.log(`Prepared ${places.length} Natural Earth places from verified source ${expected}.`);
