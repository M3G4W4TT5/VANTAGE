import { Button, Icon, Tag } from '@blueprintjs/core';
import type { AircraftRecord } from '../../platform/data/AircraftChannel';
import styles from './Atlas.module.css';
import { utc, ageLabel } from './aircraftFormat';
const safeLink = (url: string) => /^https?:\/\//i.test(url) ? url : undefined;
const value = (n: number | null, unit: string) => n === null ? 'Unknown' : `${n.toFixed(1)} ${unit}`;
export function AircraftInspector({ record, now, selectedObservationId, expanded, toggleExpanded, close, follow, toggleFollow }: {
  record: AircraftRecord; now: number; selectedObservationId?: string; expanded: boolean; toggleExpanded(): void; close(): void;
  follow: boolean; toggleFollow(): void;
}) {
  const o = record.observation; const p = o.properties;
  return <aside className={styles.inspector} aria-label="Record inspector">
    <div className={styles.panelHeader}><span>INSPECTOR</span><Button minimal icon="cross" aria-label="Close inspector" onClick={close} /></div>
    <div className={styles.inspectorContent}><div className={styles.objectIcon}><Icon icon="airplane" size={24} /></div>
      <div className={styles.eyebrow}>Aircraft / {o.sourceId}</div><h2>{record.entity.label}</h2><Tag minimal>{o.evidenceClass.toUpperCase()} POSITION</Tag>
      <p className={styles.muted}>Latest available observation · {ageLabel(p.positionObservedAt, now)}.<br />{selectedObservationId && selectedObservationId !== o.id ? 'Updated since selection.' : 'No cross-source identity merge.'}</p>
      <Button icon="locate" active={follow} disabled={!o.geometry} onClick={toggleFollow}>{follow ? 'Stop following' : 'Follow on map'}</Button>
      <section><h3>Observation</h3><dl>
        <dt>Position time</dt><dd>{utc(p.positionObservedAt)}</dd><dt>Last message</dt><dd>{utc(o.observedAt)}</dd>
        <dt>Retrieved</dt><dd>{utc(o.retrievedAt)}</dd><dt>Callsign</dt><dd>{p.callsign ?? 'Unknown'}</dd>
        <dt>{p.addressNamespace === 'icao24' ? 'ICAO address' : 'Source address'}</dt><dd>{p.address.toUpperCase()}</dd>
        <dt>Registration</dt><dd>{p.registration ?? 'Unknown'} · reported</dd><dt>Aircraft type</dt><dd>{p.aircraftType ?? 'Unknown'}</dd>
        <dt>Ground speed</dt><dd>{value(p.speedMetresPerSecond, 'm/s')}</dd>
        <dt>Barometric altitude</dt><dd>{value(p.barometricAltitudeMetres, 'm')} · pressure reference</dd>
        <dt>Geometric altitude</dt><dd>{value(p.ellipsoidAltitudeMetres, 'm')} · WGS84 ellipsoid</dd>
        <dt>Ground state</dt><dd>{p.onGround === null ? 'Unknown' : p.onGround ? 'Reported on ground' : 'Reported airborne'}</dd>
        <dt>Track</dt><dd>{value(p.trackDegrees, '° true')}</dd><dt>Heading</dt><dd>{value(p.trueHeadingDegrees, '° true')} · may be provider-derived</dd>
        <dt>Longitude, latitude</dt><dd>{o.geometry?.coordinates.map(n => n.toFixed(5)).join(', ') ?? 'Unknown · not mapped'}</dd>
        <dt>Accuracy</dt><dd>Unknown. Decimal places do not establish accuracy.</dd>
        <dt>Containment radius</dt><dd>{value(p.containmentRadiusMetres, 'm')} · integrity measure, not an accuracy guarantee</dd>
      </dl><p className={styles.muted}>{p.ellipsoidAltitudeMetres === null ? 'Map symbol is placed on the surface because geometric altitude is unknown.' : 'Map height uses the reported ellipsoid altitude.'} Positions are not extrapolated. Non-position fields may have different source ages.</p></section>
      <section><h3>Source & evidence</h3><a href={safeLink(o.provenance.sourceUrl)} target="_blank" rel="noreferrer">{o.provenance.attribution}</a> · <a href={safeLink(o.provenance.licenseRef)} target="_blank" rel="noreferrer">Source terms</a>
        <p className={styles.muted}>Source coverage and identity claims can be incomplete. Addresses may be reused or misreported; registration and callsign do not prove permanent identity.</p>
        <Button minimal rightIcon={expanded ? 'chevron-up' : 'chevron-down'} onClick={toggleExpanded} aria-expanded={expanded}>Supporting details</Button>
        {expanded && <dl className={styles.lineage}><dt>Observation ID</dt><dd>{o.id}</dd><dt>Entity ID</dt><dd>{record.entity.id}</dd>
          <dt>Identity basis</dt><dd>{record.identityRule}{record.identityDescription && ` · ${record.identityDescription}`}</dd>
          <dt>Display rule</dt><dd>Latest known position time, then source message time · v1. Older arrivals cannot replace newer positions.</dd>
          <dt>Property lineage</dt><dd>Position: {o.id} /geometry; position time: /properties/positionObservedAt; speed: /properties/speedMetresPerSecond; altitudes: /properties/barometricAltitudeMetres and /properties/ellipsoidAltitudeMetres.</dd>
          <dt>Transform</dt><dd>{o.provenance.transformVersion}{o.provenance.transformDescription && ` · ${o.provenance.transformDescription}`}</dd>
          <dt>Provider type / MLAT</dt><dd>{p.sourceType} / {p.mlatFields.join(', ') || 'No MLAT fields supplied'}. Evidence class and conversion are supplied by the source adapter.</dd>
          <dt>Source query</dt><dd>{o.provenance.sourceUrl}</dd><dt>Raw reference</dt><dd>{o.provenance.rawRef}</dd>
          <dt>Retention</dt><dd>Live cache only: at most 24 hours / 50,000 observations. No preserved evidence snapshot or recorded trail.</dd>
        </dl>}
      </section>
    </div>
  </aside>;
}
