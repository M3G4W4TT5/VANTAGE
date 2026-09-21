import { Cell, Column, Table, Regions, SelectionModes } from '@blueprintjs/table';
export type ResultRecord = { id: string; label: string; kind: string; speed: number | null; observedAt: string | null; evidenceClass: string };
import styles from './Atlas.module.css';

export function ResultsTable({ records, selectedId, select, semantic, live = false }: {
  records: ResultRecord[]; live?: boolean; selectedId?: string; select(id: string): void; semantic: boolean;
}) {
  if (!records.length) return <div className={styles.empty} role="status">No matching records. Adjust the layers, filters or time.</div>;
  if (semantic) return <div className={styles.semanticResults}>
    <table aria-label={live ? 'Aircraft results' : 'Demo results'}><thead><tr><th>Name</th><th>Type</th><th>Speed (m/s)</th><th>Evidence</th></tr></thead>
      <tbody>{records.map(record => <tr key={record.id} data-selected={selectedId === record.id}>
        <td><button className={styles.recordLink} aria-pressed={selectedId === record.id} onClick={() => select(record.id)}>{record.label}</button></td>
        <td>{record.kind}</td><td className={styles.mono}>{record.speed?.toFixed(1) ?? 'Unknown'}</td><td>{record.evidenceClass}</td>
      </tr>)}</tbody></table>
  </div>;
  const selectedIndex = records.findIndex(r => r.id === selectedId);
  return <div className={styles.grid} aria-label={live ? 'Virtualised aircraft results' : 'Virtualised demo results'}>
    <Table numRows={records.length} defaultRowHeight={34} enableRowHeader={false} enableGhostCells={false}
      enableFocusedCell enableMultipleSelection={false} selectionModes={SelectionModes.ROWS_ONLY}
      selectedRegions={selectedIndex >= 0 ? [Regions.row(selectedIndex)] : []}
      onSelection={regions => { const row = regions[0]?.rows?.[0]; if (row !== undefined && records[row]) select(records[row].id); }}
      columnWidths={[220, 112, 130, 160, 112]}>
      <Column name="Name" cellRenderer={i => <Cell interactive><button className={styles.recordLink} onClick={() => select(records[i].id)}>{records[i].label}</button></Cell>} />
      <Column name="Type" cellRenderer={i => <Cell>{records[i].kind}</Cell>} />
      <Column name="Speed · m/s" cellRenderer={i => <Cell>{records[i].speed?.toFixed(1) ?? 'Unknown'}</Cell>} />
      <Column name="Source time · UTC" cellRenderer={i => <Cell>{records[i].observedAt?.slice(11, 19) ?? 'Unknown'}</Cell>} />
      <Column name="Evidence" cellRenderer={i => <Cell>{live ? records[i].evidenceClass : 'Demo fixture'}</Cell>} />
    </Table>
  </div>;
}
