import { Cartesian3, Color, PolygonHierarchy } from 'cesium';
import type { Entity, Viewer } from 'cesium';
import type { GeoJsonGeometry } from '../data/GeoJsonChannel';
import type { RecordReference } from './PointMarkers';

export type GeoJsonVector = { appearanceId: string; reference: RecordReference; geometry: GeoJsonGeometry;
  opacity: number };
type Position = [number, number] | [number, number, number];

// Owned by one viewer. Vector entity IDs are appearances; underlying record references remain stable.
export class GeoJsonVectors {
  private entities: Entity[] = [];
  private picks = new Map<string, RecordReference>();
  private signature = '';
  constructor(private viewer: Viewer) {}
  pick(value: unknown): RecordReference | undefined {
    const id = typeof value === 'string' ? value : value && typeof value === 'object' && 'id' in value ? value.id : null;
    return typeof id === 'string' ? this.picks.get(id) : undefined;
  }
  update(vectors: GeoJsonVector[], selectedId?: string) {
    const signature = vectors.map(vector => `${vector.appearanceId}:${vector.reference.observationId}:${vector.opacity}`).join('|') +
      `|${selectedId ?? ''}`;
    if (signature === this.signature) return;
    this.signature = signature;
    for (const entity of this.entities) this.viewer.entities.remove(entity);
    this.entities = []; this.picks.clear();
    for (const vector of vectors) {
      const selected = vector.appearanceId === selectedId;
      const colour = Color.fromCssColorString(selected ? '#a486ff' : '#40b7ab').withAlpha(vector.opacity);
      const outline = Color.fromCssColorString(selected ? '#a486ff' : '#40b7ab').withAlpha(Math.max(.35, vector.opacity));
      const add = (part: number, graphic: Parameters<Viewer['entities']['add']>[0]) => {
        const id = `geo-vector:${vector.appearanceId}:${part}`;
        const entity = this.viewer.entities.add({ ...graphic, id });
        this.entities.push(entity); this.picks.set(id, vector.reference);
      };
      const positions = (points: Position[]) => points.map(point => Cartesian3.fromDegrees(point[0], point[1]));
      const polygon = (rings: Position[][], part: number) => add(part, {
        polygon: { hierarchy: new PolygonHierarchy(positions(rings[0]), rings.slice(1).map(ring =>
          new PolygonHierarchy(positions(ring)))), material: colour.withAlpha(vector.opacity * .22),
          outline: true, outlineColor: outline, height: 0 },
      });
      switch (vector.geometry.type) {
        case 'LineString': add(0, { polyline: { positions: positions(vector.geometry.coordinates as Position[]),
          width: selected ? 4 : 2, material: colour, clampToGround: true } }); break;
        case 'MultiLineString': (vector.geometry.coordinates as Position[][]).forEach((line, index) => add(index, {
          polyline: { positions: positions(line), width: selected ? 4 : 2, material: colour, clampToGround: true } })); break;
        case 'Polygon': polygon(vector.geometry.coordinates as Position[][], 0); break;
        case 'MultiPolygon': (vector.geometry.coordinates as Position[][][]).forEach((rings, index) => polygon(rings, index)); break;
      }
    }
    this.viewer.scene.requestRender();
  }
  dispose() { for (const entity of this.entities) if (!this.viewer.isDestroyed()) this.viewer.entities.remove(entity);
    this.entities = []; this.picks.clear(); this.signature = ''; }
}
