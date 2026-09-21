import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { Button, Tag } from '@blueprintjs/core';
import { UiIcon } from './UiIcon';
import type { SymbolName } from './iconAssets';
import styles from './Records.module.css';
export type Field = { label: string; value: ReactNode };
import { safeSourceLink } from './format';
export function FieldRows({ fields, lineage = false }: { fields: Field[]; lineage?: boolean }) {
  return <dl className={lineage ? styles.lineage : undefined}>{fields.map(field => <Fragment key={field.label}>
    <dt>{field.label}</dt><dd>{field.value ?? 'Unknown'}</dd>
  </Fragment>)}</dl>;
}
export function InspectorFrame({ title, kind, symbol, evidence, summary, actions, close, children }: {
  title: string; kind: string; symbol: SymbolName; evidence: string; summary: ReactNode; actions?: ReactNode;
  close(): void; children: ReactNode;
}) {
  return <aside className={styles.inspector} aria-label="Record inspector">
    <div className={styles.panelHeader}><span>INSPECTOR</span><Button minimal icon={<UiIcon name="close" />} aria-label="Close inspector" onClick={close} /></div>
    <div className={styles.inspectorContent}><div className={styles.objectIcon}><UiIcon name={symbol} size={24} /></div>
      <div className={styles.eyebrow}>{kind}</div><h2>{title}</h2><Tag minimal>{evidence}</Tag>
      <p className={styles.muted}>{summary}</p>{actions}{children}
    </div>
  </aside>;
}
export function SourceEvidence({ provenance, observationId, entityId, expanded, toggleExpanded, note, details }: {
  provenance: { sourceUrl: string; attribution: string; licenseRef: string; transformVersion: string; transformDescription?: string | null; rawRef: string };
  observationId: string; entityId: string; expanded: boolean; toggleExpanded(): void; note: ReactNode; details: Field[];
}) {
  return <section><h3>Source & evidence</h3>
    <a href={safeSourceLink(provenance.sourceUrl)} target="_blank" rel="noreferrer">{provenance.attribution}</a> · <a href={safeSourceLink(provenance.licenseRef)} target="_blank" rel="noreferrer">Source terms</a>
    <p className={styles.muted}>{note}</p>
    <Button minimal rightIcon={<UiIcon name={expanded ? 'up' : 'down'} />} onClick={toggleExpanded} aria-expanded={expanded}>Supporting details</Button>
    {expanded && <FieldRows lineage fields={[
      { label: 'Observation ID', value: observationId }, { label: 'Entity ID', value: entityId }, ...details,
      { label: 'Transform', value: `${provenance.transformVersion}${provenance.transformDescription ? ` · ${provenance.transformDescription}` : ''}` },
      { label: 'Source URL', value: provenance.sourceUrl }, { label: 'Raw reference', value: provenance.rawRef },
    ]} />}
  </section>;
}
