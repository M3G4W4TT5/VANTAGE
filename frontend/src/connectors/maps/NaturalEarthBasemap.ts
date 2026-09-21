import type { BasemapSource } from '../../platform/maps/BasemapSource';

export const naturalEarthBasemap: BasemapSource = {
  id: 'natural-earth', name: 'Natural Earth · offline', offline: true,
  documentationUrl: 'https://www.naturalearthdata.com/about/terms-of-use/',
  create: async () => { const { TileMapServiceImageryProvider } = await import('cesium'); return TileMapServiceImageryProvider.fromUrl('/cesium/Assets/Textures/NaturalEarthII', {
    credit: 'Made with Natural Earth · public domain',
  }); },
};
