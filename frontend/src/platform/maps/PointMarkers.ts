import { BillboardCollection, Cartesian3, Color, Math as CesiumMath } from 'cesium';
import type { Billboard, Viewer } from 'cesium';
import { symbolImage } from '../ui/iconAssets';
import type { SymbolName } from '../ui/iconAssets';

export type RecordReference = { entityId: string; observationId: string };
export type PointMarker = {
  reference: RecordReference; longitude: number; latitude: number; altitudeMetres?: number;
  symbol: SymbolName; size: number; colour: string; rotationDegrees?: number;
};
export type CameraState = { longitude: number; latitude: number; height: number };
export const northernEuropeCamera: CameraState = { longitude: 12, latitude: 58, height: 2400000 };

// Owned by one viewer. Updates are batched by PointMap, never held in React state.
export class PointMarkers {
  private collection: BillboardCollection;
  private markers = new Map<string, Billboard>();
  private references = new Map<string, RecordReference>();
  private highlight: Billboard;
  constructor(private viewer: Viewer) {
    this.collection = viewer.scene.primitives.add(new BillboardCollection());
    this.highlight = this.collection.add({ position: Cartesian3.ZERO, image: symbolImage('selection'), show: false, disableDepthTestDistance: Infinity });
  }
  pick(id: unknown) { return typeof id === 'string' ? this.references.get(id) : undefined; }
  update(points: PointMarker[], selectedId?: string) {
    const present = new Set<string>();
    const theme = getComputedStyle(document.documentElement);
    const colour = (token: string) => Color.fromCssColorString(token.startsWith('--') ? theme.getPropertyValue(token).trim() : token);
    this.highlight.show = false;
    for (const point of points) {
      const id = point.reference.entityId; present.add(id); this.references.set(id, point.reference);
      const position = Cartesian3.fromDegrees(point.longitude, point.latitude, point.altitudeMetres ?? 0);
      let marker = this.markers.get(id);
      if (!marker) { marker = this.collection.add({ id, position, disableDepthTestDistance: Infinity }); this.markers.set(id, marker); }
      marker.position = position; marker.image = symbolImage(point.symbol);
      marker.width = point.size; marker.height = point.size;
      marker.rotation = -CesiumMath.toRadians(point.rotationDegrees ?? 0);
      marker.color = colour(point.colour); marker.scale = id === selectedId ? 1.2 : 1;
      if (id === selectedId) {
        this.highlight.position = position; this.highlight.id = id; this.highlight.show = true;
        this.highlight.width = point.size + 18; this.highlight.height = point.size + 18;
        this.highlight.color = colour('--accent');
      }
    }
    for (const [id, marker] of this.markers) if (!present.has(id)) {
      this.collection.remove(marker); this.markers.delete(id); this.references.delete(id);
    }
    this.viewer.scene.requestRender();
  }
  dispose() { if (!this.viewer.isDestroyed()) this.viewer.scene.primitives.remove(this.collection); this.markers.clear(); this.references.clear(); }
}
