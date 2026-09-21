import type { ImageryProvider } from 'cesium';

export interface BasemapSource {
  readonly id: string;
  readonly name: string;
  readonly offline: boolean;
  readonly documentationUrl: string;
  create(): Promise<ImageryProvider>;
}
