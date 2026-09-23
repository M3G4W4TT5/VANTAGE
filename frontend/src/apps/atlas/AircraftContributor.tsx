import { useState } from 'react';
import { Button, InputGroup } from '@blueprintjs/core';
import type { AircraftSourceDto } from '../../api/generated/client';
import type { AircraftLayer } from './atlasModule';
import { UiIcon } from '../../platform/ui/UiIcon';
import styles from './Atlas.module.css';

export function AircraftLayerFilters({ layer, paneId, source, update }: { layer: AircraftLayer; paneId: string;
  source?: AircraftSourceDto; update(layer: AircraftLayer): void }) {
  const [longitude, setLongitude] = useState(String(layer.query.longitude));
  const [latitude, setLatitude] = useState(String(layer.query.latitude));
  const validCentre = longitude.trim() !== '' && latitude.trim() !== '' && Number.isFinite(+longitude) && Number.isFinite(+latitude) &&
    +longitude >= -180 && +longitude <= 180 && +latitude >= -85 && +latitude <= 85;
  const maximum = source?.maximumRadiusNm ?? Math.max(250, layer.query.radiusNm);
  const minimum = source?.minimumRadiusNm ?? 10;
  const radii = [...new Set([25, 50, 100, layer.query.radiusNm, maximum])]
    .filter(radius => radius >= minimum && radius <= maximum).sort((a, b) => a - b);
  return <>
    <div className={styles.sidebarSection}>
      <InputGroup leftIcon={<UiIcon name="search" />} aria-label="Filter aircraft" placeholder="Callsign, ICAO, registration…"
        value={layer.filters.query} maxLength={500} onChange={event => update({ ...layer, filters: { ...layer.filters, query: event.target.value } })} />
      <label className={styles.fieldLabel} htmlFor={`${paneId}-${layer.id}-freshness`}>Position age</label>
      <select className={styles.fullSelect} id={`${paneId}-${layer.id}-freshness`} value={layer.filters.freshness}
        onChange={event => update({ ...layer, filters: { ...layer.filters, freshness: event.target.value as AircraftLayer['filters']['freshness'] } })}>
        <option value="all">All available positions</option><option value="recent">Recent · ≤ 60 seconds</option><option value="older">Older or unknown age</option>
      </select>
      <label className={styles.fieldLabel} htmlFor={`${paneId}-${layer.id}-radius`}>Collection radius</label>
      <select className={styles.fullSelect} id={`${paneId}-${layer.id}-radius`} value={layer.query.radiusNm}
        onChange={event => update({ ...layer, query: { ...layer.query, radiusNm: +event.target.value } })}>
        {radii.map(radius => <option key={radius} value={radius}>{radius} NM</option>)}
      </select>
      <p className={styles.muted}>Query centre {layer.query.latitude.toFixed(2)}°, {layer.query.longitude.toFixed(2)}°. The circle does not establish complete airspace coverage.</p>
      <div className={styles.coordinateFields}>
        <label htmlFor={`${paneId}-${layer.id}-longitude`}>Longitude<input id={`${paneId}-${layer.id}-longitude`} type="number" min="-180" max="180" step="0.01"
          value={longitude} onChange={event => setLongitude(event.target.value)} /></label>
        <label htmlFor={`${paneId}-${layer.id}-latitude`}>Latitude<input id={`${paneId}-${layer.id}-latitude`} type="number" min="-85" max="85" step="0.01"
          value={latitude} onChange={event => setLatitude(event.target.value)} /></label>
      </div>
      <Button small disabled={!validCentre || (+longitude === layer.query.longitude && +latitude === layer.query.latitude)}
        onClick={() => update({ ...layer, query: { ...layer.query, longitude: +longitude, latitude: +latitude } })}>Search at coordinates</Button>
      <p className={styles.muted}>Entering coordinates does not request data until Search at coordinates. Map movement alone does not change this area.</p>
      <Button minimal onClick={() => update({ ...layer, filters: { query: '', freshness: 'all' } })}>Clear filters</Button>
    </div>
  </>;
}
