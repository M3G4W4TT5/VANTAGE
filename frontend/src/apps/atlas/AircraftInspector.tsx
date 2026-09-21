import { Button } from '@blueprintjs/core';
import type { AircraftRecord } from '../../platform/data/AircraftChannel';
import { InspectorFrame, FieldRows, SourceEvidence } from '../../platform/ui/Inspector';
import { UiIcon } from '../../platform/ui/UiIcon';
import { utc, ageLabel, measure } from '../../platform/ui/format';
import styles from './Atlas.module.css';
export function AircraftInspector({ record, now, selectedObservationId, expanded, toggleExpanded, close, follow, toggleFollow }: {
  record: AircraftRecord; now: number; selectedObservationId?: string; expanded: boolean; toggleExpanded(): void; close(): void;
  follow: boolean; toggleFollow(): void;
}) {
  const o = record.observation; const p = o.properties;
  return <InspectorFrame title={record.entity.label} kind={`Aircraft / ${o.sourceId}`} symbol="plane" evidence={`${o.evidenceClass.toUpperCase()} POSITION`} close={close}
    summary={<>Latest available observation · {ageLabel(p.positionObservedAt, now)}.<br />{selectedObservationId && selectedObservationId !== o.id ? 'Updated since selection.' : 'No cross-source identity merge.'}</>}
    actions={<Button icon={<UiIcon name="locate" />} active={follow} disabled={!o.geometry} onClick={toggleFollow}>{follow ? 'Stop following' : 'Follow on map'}</Button>}>
    <section><h3>Observation</h3><FieldRows fields={[
      { label: 'Position time', value: utc(p.positionObservedAt) }, { label: 'Last message', value: utc(o.observedAt) },
      { label: 'Retrieved', value: utc(o.retrievedAt) }, { label: 'Callsign', value: p.callsign },
      { label: p.addressNamespace === 'icao24' ? 'ICAO address' : 'Source address', value: p.address.toUpperCase() },
      { label: 'Registration', value: `${p.registration ?? 'Unknown'} · reported` }, { label: 'Aircraft type', value: p.aircraftType },
      { label: 'Ground speed', value: measure(p.speedMetresPerSecond, 'm/s') },
      { label: 'Barometric altitude', value: `${measure(p.barometricAltitudeMetres, 'm')} · pressure reference` },
      { label: 'Geometric altitude', value: `${measure(p.ellipsoidAltitudeMetres, 'm')} · WGS84 ellipsoid` },
      { label: 'Ground state', value: p.onGround === null ? 'Unknown' : p.onGround ? 'Reported on ground' : 'Reported airborne' },
      { label: 'Track', value: measure(p.trackDegrees, '° true') }, { label: 'Heading', value: `${measure(p.trueHeadingDegrees, '° true')} · may be provider-derived` },
      { label: 'Longitude, latitude', value: o.geometry?.coordinates.map(n => n.toFixed(5)).join(', ') ?? 'Unknown · not mapped' },
      { label: 'Accuracy', value: 'Unknown. Decimal places do not establish accuracy.' },
      { label: 'Containment radius', value: `${measure(p.containmentRadiusMetres, 'm')} · integrity measure, not an accuracy guarantee` },
    ]} /><p className={styles.muted}>{p.ellipsoidAltitudeMetres === null ? 'Map symbol is placed on the surface because geometric altitude is unknown.' : 'Map height uses the reported ellipsoid altitude.'} Positions are not extrapolated. Non-position fields may have different source ages.</p></section>
    <SourceEvidence provenance={o.provenance} observationId={o.id} entityId={record.entity.id} expanded={expanded} toggleExpanded={toggleExpanded}
      note="Source coverage and identity claims can be incomplete. Addresses may be reused or misreported; registration and callsign do not prove permanent identity."
      details={[
        { label: 'Identity basis', value: `${record.identityRule}${record.identityDescription ? ` · ${record.identityDescription}` : ''}` },
        { label: 'Display rule', value: 'Latest known position time, then source message time · v1. Older arrivals cannot replace newer positions.' },
        { label: 'Property lineage', value: `Position: ${o.id} /geometry; position time: /properties/positionObservedAt; speed: /properties/speedMetresPerSecond; altitudes: /properties/barometricAltitudeMetres and /properties/ellipsoidAltitudeMetres.` },
        { label: 'Provider type / MLAT', value: `${p.sourceType} / ${p.mlatFields.join(', ') || 'No MLAT fields supplied'}. Evidence class and conversion are supplied by the source adapter.` },
        { label: 'Retention', value: 'Live cache only: at most 24 hours / 50,000 observations per source. No preserved evidence snapshot or recorded trail.' },
      ]} />
  </InspectorFrame>;
}
