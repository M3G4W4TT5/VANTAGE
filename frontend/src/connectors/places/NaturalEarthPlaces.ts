import { validateContract } from '../../platform/contracts';
import type { PlaceResult, PlaceSource } from '../../platform/places/PlaceSource';

type Index = { schemaVersion: 1; sourceVersion: string; places: {
  id: string; name: string; country: string; aliases: string[]; longitude: number; latitude: number; rank: number;
}[] };
// Fold accents and common Nordic letters; keep source spelling for display.
const fold = (text: string) => text.toLocaleLowerCase('en').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ß/g, 'ss');
let index: Index | undefined;
export const naturalEarthPlaces: PlaceSource = {
  id: 'natural-earth-places', name: 'Natural Earth v5.1.2',
  documentationUrl: 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/',
  coverage: 'Offline cities and towns · approximate map positions · no street addresses.',
  async search(query, cancellation): Promise<PlaceResult[]> {
    if (!index) {
      const response = await fetch('/data/natural-earth-places.v1.json', { signal: cancellation });
      if (!response.ok) throw new Error('The bundled place index could not be loaded.');
      const data: unknown = await response.json(); validateContract<Index>('PlaceIndex', data); index = data;
    }
    cancellation.throwIfAborted();
    const words = fold(query.trim()).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return index.places.filter(place => words.every(word => fold(`${place.name} ${place.country} ${place.aliases.join(' ')}`).includes(word)))
      .sort((a, b) => Number(!fold(a.name).startsWith(words[0])) - Number(!fold(b.name).startsWith(words[0])) || a.rank - b.rank || a.name.localeCompare(b.name))
      .slice(0, 8).map(place => ({ id: `${this.id}:${place.id}`, name: place.name, country: place.country,
        longitude: place.longitude, latitude: place.latitude, sourceId: this.id, precision: 'approximate' }));
  },
};
