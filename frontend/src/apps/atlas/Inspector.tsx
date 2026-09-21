import { Button, Icon, Tag } from '@blueprintjs/core';
import type { DemoRecord } from './fixtures';
import styles from './Atlas.module.css';

export function Inspector({ record, expanded, toggleExpanded, close }: {
  record: DemoRecord; expanded: boolean; toggleExpanded(): void; close(): void;
}) {
  return <aside className={styles.inspector} aria-label="Record inspector">
    <div className={styles.panelHeader}><span>INSPECTOR</span><Button minimal icon="cross" aria-label="Close inspector" onClick={close} /></div>
    <div className={styles.inspectorContent}>
      <div className={styles.objectIcon}><Icon icon={record.kind === 'Aircraft' ? 'airplane' : record.kind === 'Vessel' ? 'ship' : 'map-marker'} size={24} /></div>
      <div className={styles.eyebrow}>{record.kind}</div><h2>{record.label}</h2><Tag minimal>DEMO FIXTURE</Tag>
      <p className={styles.muted}>Synthetic record for exploring the workspace. It does not describe a real asset.</p>
      <section><h3>Observation</h3><dl>
        <dt>Source time</dt><dd><time dateTime={record.observedAt}>21 Sep 2026 · 12:00 UTC</time></dd>
        <dt>Retrieved</dt><dd>Bundled fixture · no retrieval</dd>
        <dt>Speed</dt><dd>{record.speed === null ? 'Unknown' : `${record.speed.toFixed(1)} m/s`}</dd>
        <dt>Latitude</dt><dd>{record.latitude?.toFixed(4) ?? 'Unknown'}</dd>
        <dt>Longitude</dt><dd>{record.longitude?.toFixed(4) ?? 'Unknown'}</dd>
        <dt>Precision</dt><dd>{record.latitude === null ? 'Unknown · not mapped' : 'Synthetic coordinate'}</dd>
      </dl></section>
      <section><h3>Source & evidence</h3><p>VANTAGE demo fixtures</p><p className={styles.muted}>Original synthetic data · fixture method v1. Values remain labelled demo in every view.</p>
        <Button minimal rightIcon={expanded ? 'chevron-up' : 'chevron-down'} onClick={toggleExpanded} aria-expanded={expanded}>Supporting details</Button>
        {expanded && <dl className={styles.lineage}><dt>Entity ID</dt><dd>{record.id}</dd><dt>Observation ID</dt><dd>{record.observationId}</dd>
          <dt>Identity basis</dt><dd>Exact fixture ID · v1. No cross-source association.</dd><dt>Display rule</dt><dd>Selected fixture observation · v1</dd>
          <dt>Conflicting sources</dt><dd>None supplied in this fixture</dd><dt>Retained evidence</dt><dd>No saved snapshot</dd></dl>}
      </section>
    </div>
  </aside>;
}
