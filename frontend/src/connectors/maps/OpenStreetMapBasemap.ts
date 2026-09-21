import type { BasemapSource } from '../../platform/maps/BasemapSource';

export const openStreetMapBasemap: BasemapSource = {
  id: 'openstreetmap', name: 'OpenStreetMap · detailed', offline: false,
  documentationUrl: 'https://operations.osmfoundation.org/policies/tiles/',
  create: async () => { const { Credit, UrlTemplateImageryProvider } = await import('cesium'); return new UrlTemplateImageryProvider({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maximumLevel: 19,
    credit: new Credit('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors', true),
  }); },
};
