import { BillboardCollection, Cartesian2, Cartesian3, Color, SceneMode, Math as CesiumMath } from 'cesium';
import { pointVisible } from './pointVisibility';
import type { Billboard, Viewer } from 'cesium';
import { symbolImage } from '../ui/iconAssets';
import type { SymbolName } from '../ui/iconAssets';

export type RecordReference = { entityId: string; observationId: string };
export type PointMarker = {
  reference: RecordReference; longitude: number; latitude: number; altitudeMetres?: number;
  symbol: SymbolName; size: number; colour: string; rotationDegrees?: number; missingInformation?: boolean;
};
export type CameraState = { longitude: number; latitude: number; height: number };
export const northernEuropeCamera: CameraState = { longitude: 12, latitude: 58, height: 2400000 };

// Owned by one viewer. Updates are batched by PointMap, never held in React state.
export class PointMarkers {
  private collection: BillboardCollection;
  private markers = new Map<string, Billboard>();
  private badges = new Map<string, Billboard>();
  private references = new Map<string, RecordReference>();
  private highlight: Billboard;
  private removeVisibility: () => void;
  constructor(private viewer: Viewer) {
    this.collection = viewer.scene.primitives.add(new BillboardCollection());
    this.removeVisibility = viewer.scene.preRender.addEventListener(() => this.updateVisibility());
    this.highlight = this.collection.add({ position: Cartesian3.ZERO, image: symbolImage('selection'), show: false, disableDepthTestDistance: Infinity });
  }
  pick(id: unknown) { return typeof id === 'string' ? this.references.get(id) : undefined; }
  update(points: PointMarker[], selectedId?: string) {
    const present = new Set<string>();
    const theme = getComputedStyle(document.documentElement);
    const colour = (token: string) => Color.fromCssColorString(token.startsWith('--') ? theme.getPropertyValue(token).trim() : token);
    this.highlight.show = false; this.highlight.id = undefined;
    for (const point of points) {
      const id = point.reference.entityId; present.add(id); this.references.set(id, point.reference);
      const position = Cartesian3.fromDegrees(point.longitude, point.latitude, point.altitudeMetres ?? 0);
      let marker = this.markers.get(id);
      if (!marker) { marker = this.collection.add({ id, position, disableDepthTestDistance: Infinity }); this.markers.set(id, marker); }
      marker.position = position; marker.image = symbolImage(point.symbol);
      marker.width = point.size; marker.height = point.size;
      marker.rotation = -CesiumMath.toRadians(point.rotationDegrees ?? 0);
      marker.color = colour(point.colour); marker.scale = id === selectedId ? 1.2 : 1;
      let badge = this.badges.get(id);
      if (point.missingInformation) {
        if (!badge) { badge = this.collection.add({ id, position, image: symbolImage('question'), disableDepthTestDistance: Infinity }); this.badges.set(id, badge); }
        badge.position = position; badge.width = 15; badge.height = 15;
        badge.pixelOffset = new Cartesian2(point.size * .55, -point.size * .55); badge.color = colour('--text');
      } else if (badge) { this.collection.remove(badge); this.badges.delete(id); }
      if (id === selectedId) {
        this.highlight.position = position; this.highlight.id = id; this.highlight.show = true;
        this.highlight.width = point.size + (point.missingInformation ? 32 : 18); this.highlight.height = point.size + (point.missingInformation ? 32 : 18);
        this.highlight.color = colour('--selection-outline');
      }
    }
    for (const [id, marker] of this.markers) if (!present.has(id)) {
      this.collection.remove(marker); this.markers.delete(id); this.references.delete(id);
      const badge = this.badges.get(id); if (badge) this.collection.remove(badge); this.badges.delete(id);
    }
    this.updateVisibility();
    this.viewer.scene.requestRender();
  }
  private updateVisibility() {
    const globe = this.viewer.scene.mode === SceneMode.SCENE3D;
    for (const marker of this.markers.values()) marker.show = !globe || pointVisible(this.viewer.camera.positionWC, marker.position, this.viewer.scene.globe.ellipsoid);
    for (const [id, badge] of this.badges) badge.show = this.markers.get(id)?.show ?? false;
    const selected = this.markers.get(this.highlight.id);
    this.highlight.show = !!selected && selected.show;
  }
  dispose() { this.removeVisibility(); if (!this.viewer.isDestroyed()) this.viewer.scene.primitives.remove(this.collection); this.markers.clear(); this.badges.clear(); this.references.clear(); }
}
