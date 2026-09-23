import { useEffect, useState } from 'react';
import type { GeoJsonRecord } from '../../platform/data/GeoJsonChannel';
import { client } from '../../platform/workspaces/WorkspaceService';
import { validateContract } from '../../platform/contracts';
import { FieldRows, InspectorFrame, SourceEvidence } from '../../platform/ui/Inspector';
import { utc } from '../../platform/ui/format';
import styles from './Atlas.module.css';

export function GeoJsonInspector({ record, selectedObservationId, workspaceId, expanded, toggleExpanded, close }: {
  record: GeoJsonRecord; selectedObservationId?: string; workspaceId: string; expanded: boolean;
  toggleExpanded(): void; close(): void;
}) {
  const observation = record.observation;
  return <InspectorFrame title={record.entity.label} kind={`GeoJSON feature / ${observation.sourceId}`} symbol="circle"
    evidence="REPORTED SOURCE FEATURE" close={close}
    summary={<>Current configured snapshot · {observation.geometry?.type ?? 'location unknown (List only)'}.<br />
      {selectedObservationId && selectedObservationId !== observation.id ?
        'The selected observation version has changed; its original reference remains.' :
        'No movement, tracking or event-ending meaning is inferred.'}</>}>
    <section><h3>Feature facts</h3><FieldRows fields={[
      { label: 'Source feature ID', value: observation.provenance.sourceRecordId },
      { label: 'Geometry', value: observation.geometry?.type ?? 'Unknown · off map' },
      { label: 'Location precision', value: 'Source precision unknown; coordinates do not establish accuracy.' },
      { label: 'Mapped source time', value: utc(observation.observedAt) },
      { label: 'Valid from', value: utc(observation.validFrom) },
      { label: 'Valid to', value: utc(observation.validTo) },
      { label: 'First retrieved for this version', value: utc(observation.retrievedAt) },
    ]} /></section>
    <section><h3>Source properties</h3><pre className={styles.sourceProperties}>{JSON.stringify(observation.properties, null, 2) ?? 'null'}</pre></section>
    <SourceEvidence provenance={observation.provenance} observationId={observation.id} entityId={record.entity.id}
      expanded={expanded} toggleExpanded={toggleExpanded}
      note="This generic FeatureCollection is an operator-configured snapshot. A missing feature in a later response is not proof that it ceased to exist."
      details={[
        { label: 'Identity basis', value: `${record.identityRule} · ${record.identityDescription ?? ''}` },
        { label: 'Display rule', value: 'Most recently accepted complete source snapshot; changed content creates a new immutable observation version.' },
        { label: 'Supersedes version', value: observation.supersedesObservationId ?? 'No earlier version linked' },
        { label: 'Selected version', value: selectedObservationId ?? 'No fixed version selected' },
        { label: 'Property lineage', value: `${observation.id}: label from the declared mapping; geometry /geometry; time from declared mapping; source properties /properties; retrieval /retrievedAt.` },
        { label: 'Retention', value: 'Bounded evidence cache: up to 48 hours / 50,000 versions per source. Saved workspaces retain presentation and references, not source payload snapshots.' },
      ]} />
    {expanded && <GeoJsonVersions key={`${record.entity.id}:${observation.id}`} record={record} workspaceId={workspaceId} />}
  </InspectorFrame>;
}

function GeoJsonVersions({ record, workspaceId }: { record: GeoJsonRecord; workspaceId: string }) {
  const [versions, setVersions] = useState<GeoJsonRecord[]>([]);
  const [status, setStatus] = useState('Loading retained versions…');
  useEffect(() => {
    const controller = new AbortController();
    void client.geoJson_Versions(record.entity.id, record.observation.sourceId, workspaceId, controller.signal)
      .then(values => {
        for (const value of values) validateContract<GeoJsonRecord>('GeoJsonRecord', value);
        if (!controller.signal.aborted) { setVersions(values as GeoJsonRecord[]);
          setStatus(values.length ? 'Up to 20 retained content versions.' : 'No retained versions are available.'); }
      }).catch(() => { if (!controller.signal.aborted) setStatus('Retained versions are unavailable. Current facts remain visible.'); });
    return () => controller.abort();
  }, [record.entity.id, record.observation.sourceId, workspaceId]);
  return <section><h3>Retained source versions</h3><p className={styles.muted}>{status}</p>
    {versions.map(version => <details key={version.observation.id}><summary>
      Retrieved {utc(version.observation.retrievedAt)} · {version.observation.geometry?.type ?? 'location unknown'}
    </summary><FieldRows lineage fields={[
      { label: 'Observation ID', value: version.observation.id },
      { label: 'Mapped source time', value: utc(version.observation.observedAt) },
      { label: 'Supersedes', value: version.observation.supersedesObservationId },
      { label: 'Properties', value: <pre className={styles.sourceProperties}>{JSON.stringify(version.observation.properties, null, 2) ?? 'null'}</pre> },
    ]} /></details>)}
  </section>;
}
