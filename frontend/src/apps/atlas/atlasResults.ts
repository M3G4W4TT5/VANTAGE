import type { AircraftChannel, AircraftRecord } from '../../platform/data/AircraftChannel';
import type { EarthquakeChannel, EarthquakeRecord } from '../../platform/data/EarthquakeChannel';
import type { GeoJsonChannel, GeoJsonRecord } from '../../platform/data/GeoJsonChannel';
import type { AtlasLayer, AtlasState } from './atlasModule';
import type { AtlasChannel } from './atlasDemand';
import { layerDemandKey } from './atlasDemand';
import { matchesAircraft } from './aircraftLayerData';
import { matchesEarthquake } from './earthquakePresentation';
import { matchesGeoJson } from './geoJsonLayerData';

export const categoryOf = (domain: AtlasLayer['domain']) => domain === 'aircraft' ? 'Vehicles & satellites' :
  domain === 'earthquakes' ? 'Events & alerts' : 'Feeds & reports';
export const domainLabel = (domain: AtlasLayer['domain']) => domain === 'aircraft' ? 'Aircraft' : domain === 'earthquakes' ? 'Earthquakes' : 'GeoJSON';
export type AtlasResult =
  | { layer: Extract<AtlasLayer, { domain: 'aircraft' }>; record: AircraftRecord; key: string; health: string }
  | { layer: Extract<AtlasLayer, { domain: 'earthquakes' }>; record: EarthquakeRecord; key: string; health: string }
  | { layer: Extract<AtlasLayer, { domain: 'geojson' }>; record: GeoJsonRecord; key: string; health: string };
export type LayerResults = { layer: AtlasLayer; rows: AtlasResult[]; truncatedUpstream: boolean; health: string; error?: boolean };

export function scopedLayers(state: AtlasState): AtlasLayer[] {
  const participating = state.layers.filter(layer => layer.participating);
  if (state.resultScope === 'focused') return participating.filter(layer => layer.id === state.focusedLayerId);
  if (state.resultScope === 'selected') return participating.filter(layer => state.resultLayerIds?.includes(layer.id));
  return participating;
}

export function collectResults(layers: AtlasLayer[], channels: Map<string, AtlasChannel>, workspaceId: string, now: number): LayerResults[] {
  return layers.map(layer => {
    const channel = channels.get(layerDemandKey(layer, workspaceId));
    if (!channel) return { layer, rows: [], truncatedUpstream: false, health: 'No active dataset response' };
    try {
      if (layer.domain === 'aircraft') {
        const snapshot = (channel as AircraftChannel).getSnapshot();
        const health = `${snapshot.transport} · ${snapshot.health.state}`;
        const rows = snapshot.records.filter(record => matchesAircraft(record, layer, now))
          .sort((a, b) => a.entity.label.localeCompare(b.entity.label) || a.entity.id.localeCompare(b.entity.id))
          .map(record => ({ layer, record, key: `${layer.id}:${record.entity.id}`, health } as AtlasResult));
        return { layer, rows, truncatedUpstream: snapshot.completeness.truncated,
          health };
      }
      if (layer.domain === 'geojson') {
        const snapshot = (channel as GeoJsonChannel).getSnapshot();
        const health = `${snapshot.transport} · ${snapshot.health.state}`;
        const rows = snapshot.records.filter(record => matchesGeoJson(record, layer))
          .sort((a, b) => a.entity.label.localeCompare(b.entity.label) || a.entity.id.localeCompare(b.entity.id))
          .map(record => ({ layer, record, key: `${layer.id}:${record.entity.id}`, health } as AtlasResult));
        return { layer, rows, truncatedUpstream: snapshot.completeness.truncated, health };
      }
      const snapshot = (channel as EarthquakeChannel).getSnapshot();
      const health = `${snapshot.transport} · ${snapshot.health.state}`;
      const order = (record: EarthquakeRecord) => layer.filters.sort === 'magnitude' ? record.observation.properties.magnitude ?? -Infinity :
        Date.parse((layer.filters.sort === 'updated' ? record.observation.properties.sourceUpdatedAt : record.observation.observedAt) ?? '') || -Infinity;
      const rows = snapshot.records.filter(record => matchesEarthquake(record, layer.filters, now))
        .sort((a, b) => order(b) - order(a) || a.entity.id.localeCompare(b.entity.id))
        .map(record => ({ layer, record, key: `${layer.id}:${record.entity.id}`, health } as AtlasResult));
      return { layer, rows, truncatedUpstream: snapshot.completeness.truncated,
        health };
    } catch {
      return { layer, rows: [], truncatedUpstream: false, health: 'Presenter failed', error: true };
    }
  });
}

// Rotate across layers so a large source cannot consume every visible row.
export function fairRows(groups: LayerResults[], limit: number): AtlasResult[] {
  const rows: AtlasResult[] = [];
  for (let index = 0; rows.length < limit; index++) {
    let added = false;
    for (const group of groups) {
      const row = group.rows[index];
      if (row && rows.length < limit) { rows.push(row); added = true; }
    }
    if (!added) break;
  }
  return rows;
}

export function resultCounts(groups: LayerResults[]) {
  const all = groups.flatMap(group => group.rows);
  return { appearances: all.length,
    unique: new Set(all.map(row => `${row.layer.domain}:${row.record.entity.id}`)).size,
    mappable: all.filter(row => row.record.observation.geometry !== null).length,
    upstreamTruncated: groups.some(group => group.truncatedUpstream),
    failed: groups.filter(group => group.error).map(group => group.layer.id) };
}

export function resultSummary(row: AtlasResult): string {
  if (row.layer.domain === 'aircraft') {
    const record = row.record as AircraftRecord; const p = record.observation.properties;
    return `${p.onGround === null ? 'Ground state unknown' : p.onGround ? 'Reported grounded' : 'Reported airborne'} · ${p.speedMetresPerSecond?.toFixed(1) ?? 'unknown'} m/s`;
  }
  if (row.layer.domain === 'geojson') {
    const record = row.record as GeoJsonRecord;
    return `${record.observation.geometry?.type ?? 'Location unknown'} · ${record.observation.observedAt ? 'source time supplied' : 'source time unknown'}`;
  }
  const record = row.record as EarthquakeRecord; const p = record.observation.properties;
  return `M ${p.magnitude?.toFixed(1) ?? 'unknown'} · depth ${p.depthKilometres?.toFixed(1) ?? 'unknown'} km`;
}

export function resultTime(row: AtlasResult): string | null {
  return row.layer.domain === 'aircraft' ? (row.record as AircraftRecord).observation.properties.positionObservedAt : row.record.observation.observedAt;
}
