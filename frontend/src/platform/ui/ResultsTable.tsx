import { Cell, Column, Table, Regions, SelectionModes } from '@blueprintjs/table';
import styles from './Records.module.css';
export type ResultColumn<T> = { id: string; label: string; width: number; value(record: T): string };
export function ResultsTable<T>({ records, columns, getId, selectedId, select, semantic, label }: {
  records: T[]; columns: ResultColumn<T>[]; getId(record: T): string;
  selectedId?: string; select(id: string): void; semantic: boolean; label: string;
}) {
  if (!records.length) return <div className={styles.empty} role="status">No matching records. Adjust the filters or check source status.</div>;
  const cell = (record: T, column: ResultColumn<T>, index: number) => index === 0 ?
    <button className={styles.recordLink} aria-pressed={selectedId === getId(record)} onClick={() => select(getId(record))}>{column.value(record)}</button> : column.value(record);
  if (semantic) return <div className={styles.semanticResults}>
    <table aria-label={label}><thead><tr>{columns.map(column => <th scope="col" key={column.id}>{column.label}</th>)}</tr></thead>
      <tbody>{records.map(record => <tr key={getId(record)} data-selected={selectedId === getId(record)}>
        {columns.map((column, index) => <td key={column.id}>{cell(record, column, index)}</td>)}
      </tr>)}</tbody></table>
  </div>;
  const selectedIndex = records.findIndex(r => getId(r) === selectedId);
  return <div className={styles.grid} aria-label={`Virtualised ${label.toLowerCase()}`}>
    <Table numRows={records.length} defaultRowHeight={34} enableRowHeader={false} enableGhostCells={false}
      enableFocusedCell enableMultipleSelection={false} selectionModes={SelectionModes.ROWS_ONLY}
      selectedRegions={selectedIndex >= 0 ? [Regions.row(selectedIndex)] : []}
      onSelection={regions => { const row = regions[0]?.rows?.[0]; if (row !== undefined && records[row]) select(getId(records[row])); }}
      columnWidths={columns.map(column => column.width)}>
      {columns.map((column, index) => <Column key={column.id} name={column.label} cellRenderer={i => <Cell interactive={index === 0}>{cell(records[i], column, index)}</Cell>} />)}
    </Table>
  </div>;
}
