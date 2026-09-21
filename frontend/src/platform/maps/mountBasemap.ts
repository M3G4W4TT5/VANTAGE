import type { ImageryLayer, Viewer } from 'cesium';
import type { BasemapSource } from './BasemapSource';

export type BasemapStatus = { name: string; offline: boolean; message?: string };

export async function mountBasemap(viewer: Viewer, source: BasemapSource | undefined, fallback: BasemapSource,
  status: (value: BasemapStatus) => void): Promise<() => void> {
  const local = source?.offline ? source : fallback;
  const base = await local.create();
  if (viewer.isDestroyed()) return () => {};
  const baseLayer = viewer.imageryLayers.addImageryProvider(base);
  const layers = [baseLayer]; let detailed: ImageryLayer | undefined; let removeError = () => {}; let disposed = false;
  const applyTheme = () => {
    if (disposed || viewer.isDestroyed()) return;
    for (const layer of layers) {
      layer.saturation = .15;
      layer.brightness = document.documentElement.dataset.theme === 'dark' ? .65 : 1;
    }
    viewer.scene.requestRender();
  };
  const showFallback = (message?: string) => {
    if (disposed || viewer.isDestroyed()) return;
    // Remove the failed layer so its pending reprojection work cannot hold the globe's queue open.
    if (detailed) {
      const failed = detailed; detailed = undefined; removeError();
      layers.splice(layers.indexOf(failed), 1);
      queueMicrotask(() => { if (!disposed && !viewer.isDestroyed()) viewer.imageryLayers.remove(failed, true); });
    }
    status({ name: local.name, offline: true, message }); viewer.scene.requestRender();
  };
  const offline = () => showFallback('Network unavailable. Showing the coarse offline map.');
  showFallback(source ? undefined : 'The saved basemap is not registered. Showing the offline map.');
  const observer = new MutationObserver(applyTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('offline', offline);
  applyTheme();
  if (source && !source.offline && navigator.onLine) {
    try {
      const provider = await source.create();
      if (!viewer.isDestroyed()) {
        detailed = viewer.imageryLayers.addImageryProvider(provider); layers.push(detailed);
        removeError = provider.errorEvent.addEventListener(() => showFallback('Detailed tiles are unavailable. Showing the coarse offline map.'));
        status({ name: source.name, offline: false }); applyTheme();
      }
    } catch { showFallback('Detailed tiles could not be loaded. Showing the coarse offline map.'); }
  } else if (source && !source.offline) offline();
  return () => { disposed = true; observer.disconnect(); removeError(); window.removeEventListener('offline', offline); };
}
