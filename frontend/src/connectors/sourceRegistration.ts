import { naturalEarthBasemap } from './maps/NaturalEarthBasemap';
import { openStreetMapBasemap } from './maps/OpenStreetMapBasemap';
import { naturalEarthPlaces } from './places/NaturalEarthPlaces';

// Composition only. Domain views consume capability interfaces; provider changes stay here and in adapters.
export const basemapSources = [openStreetMapBasemap, naturalEarthBasemap];
export const defaultBasemapId = openStreetMapBasemap.id;
export const offlineBasemap = naturalEarthBasemap;
export const placeSource = naturalEarthPlaces;
