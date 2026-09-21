import { ResultsTable as SharedResultsTable } from '../../platform/ui/ResultsTable';
import { utc } from '../../platform/ui/format';
export type ResultRecord = { id: string; label: string; kind: string; speed: number | null; observedAt: string | null; evidenceClass: string };
export function ResultsTable(props: { records: ResultRecord[]; selectedId?: string; select(id: string): void; semantic: boolean }) {
  return <SharedResultsTable {...props} label="Demo results" getId={r => r.id} columns={[
    { id: 'label', label: 'Name', width: 220, value: r => r.label },
    { id: 'kind', label: 'Type', width: 112, value: r => r.kind },
    { id: 'speed', label: 'Speed · m/s', width: 130, value: r => r.speed?.toFixed(1) ?? 'Unknown' },
    { id: 'time', label: 'Source time · UTC', width: 190, value: r => utc(r.observedAt) },
    { id: 'evidence', label: 'Evidence', width: 112, value: () => 'Demo fixture' },
  ]} />;
}
