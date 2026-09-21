import { useEffect, useState } from 'react';
import { Button } from '@blueprintjs/core';
import { VantageClient } from '../../api/generated/client';
import type { EarthquakeRecord } from '../../platform/data/EarthquakeChannel';
import { validateContract } from '../../platform/contracts';
import { FieldRows, InspectorFrame, SourceEvidence } from '../../platform/ui/Inspector';
import { UiIcon } from '../../platform/ui/UiIcon';
import { ageLabel, measure, utc } from '../../platform/ui/format';
import styles from './Atlas.module.css';

export function EarthquakeInspector({ record, selectedObservationId, now, expanded, toggleExpanded, close, zoom }: {
  record: EarthquakeRecord; selectedObservationId?: string; now: number; expanded: boolean; toggleExpanded(): void; close(): void; zoom(): void;
}) {
  const o = record.observation; const p = o.properties;
  return <InspectorFrame title={record.entity.label} kind={`Earthquake / ${o.sourceId}`} symbol="event" evidence={`${o.evidenceClass.toUpperCase()} EVENT`} close={close}
    summary={<>Event age: {ageLabel(o.observedAt, now)}.<br />{selectedObservationId && selectedObservationId !== o.id ? 'Revised since selection; the selected version reference is preserved.' : 'Latest known source revision. No cross-source identity merge.'}</>}
    actions={<Button icon={<UiIcon name="locate" />} disabled={!o.geometry} onClick={zoom}>Zoom to event</Button>}>
    <section><h3>Event facts</h3><FieldRows fields={[
      { label: 'Magnitude', value: p.magnitude?.toFixed(1) ?? 'Unknown' }, { label: 'Magnitude type', value: p.magnitudeType },
      { label: 'Depth', value: measure(p.depthKilometres, 'km') }, { label: 'Depth reference', value: p.depthReference },
      { label: 'Location', value: p.place }, { label: 'Longitude, latitude', value: o.geometry?.coordinates.map(n => n.toFixed(5)).join(', ') ?? 'Unknown · not mapped' },
      { label: 'Occurred', value: utc(o.observedAt) }, { label: 'Source updated', value: utc(p.sourceUpdatedAt) },
      { label: 'Version retrieved', value: utc(o.retrievedAt) }, { label: 'Review status', value: p.reviewStatus },
      { label: 'Event type', value: p.eventType }, { label: 'Network', value: p.network },
      { label: 'Location precision', value: 'Accuracy unknown. Decimal places do not establish accuracy.' },
    ]} /><p className={styles.muted}>The map marks the surface epicentre. Depth remains a separate source measurement in kilometres. Magnitude is not an impact or shaking estimate.</p></section>
    <SourceEvidence provenance={o.provenance} observationId={o.id} entityId={record.entity.id} expanded={expanded} toggleExpanded={toggleExpanded}
      note="Reported locations, times and magnitudes may be revised. The feed has limited scope; absence does not establish that no earthquake occurred."
      details={[
        { label: 'Identity basis', value: `${record.identityRule} · ${record.identityDescription ?? ''}` },
        { label: 'Display rule', value: 'Newest known source-update time · v1. Occurrence time and retrieval time never determine the preferred revision. Equal-time conflicts retain the first accepted display version.' },
        { label: 'Supersedes version', value: o.supersedesObservationId ?? 'No earlier current version linked' },
        { label: 'Selected version', value: selectedObservationId ?? 'No fixed version selected' },
        { label: 'Property lineage', value: `${o.id}: magnitude /properties/magnitude; type /properties/magnitudeType; depth /properties/depthKilometres; location /geometry and /properties/place; occurrence /observedAt; update /properties/sourceUpdatedAt; retrieval /retrievedAt.` },
        { label: 'Retention', value: 'Bounded cache: up to 48 hours / 50,000 observation versions per source. Save stores view settings and references, not a preserved evidence snapshot.' },
      ]} />
    {expanded && <EarthquakeVersions key={`${record.entity.id}:${o.id}`} record={record} />}
  </InspectorFrame>;
}
function EarthquakeVersions({ record }: { record: EarthquakeRecord }) {
  const [versions, setVersions] = useState<EarthquakeRecord[]>([]); const [status, setStatus] = useState('Loading retained versions…');
  useEffect(() => {
    const controller = new AbortController();
    void new VantageClient().earthquakes_Versions(record.entity.id, record.observation.sourceId, controller.signal).then(values => {
      for (const value of values) validateContract<EarthquakeRecord>('EarthquakeRecord', value);
      if (!controller.signal.aborted) { setVersions(values as EarthquakeRecord[]); setStatus(values.length ? 'Up to 20 recently retrieved versions. Earlier versions may have expired.' : 'No versions are available in the bounded cache.'); }
    }).catch(() => { if (!controller.signal.aborted) setStatus('Retained versions are unavailable. Current facts remain visible.'); });
    return () => controller.abort();
  }, [record.entity.id, record.observation.sourceId]);
  return <section><h3>Retained source versions</h3><p className={styles.muted}>{status}</p>
    {versions.map(version => <details key={version.observation.id}><summary>Updated {utc(version.observation.properties.sourceUpdatedAt)} · M {version.observation.properties.magnitude?.toFixed(1) ?? 'unknown'}</summary>
      <FieldRows lineage fields={[
        { label: 'Observation ID', value: version.observation.id }, { label: 'Occurred', value: utc(version.observation.observedAt) },
        { label: 'Retrieved', value: utc(version.observation.retrievedAt) }, { label: 'Location', value: version.observation.properties.place },
        { label: 'Depth', value: measure(version.observation.properties.depthKilometres, 'km') },
        { label: 'Supersedes', value: version.observation.supersedesObservationId },
      ]} /></details>)}
  </section>;
}
