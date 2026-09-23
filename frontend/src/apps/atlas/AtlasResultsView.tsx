import { UiIcon } from '../../platform/ui/UiIcon';
import { displayTime } from '../../platform/ui/format';
import { atlasGroups, groupId, mapRecordKey, mapVisibility } from './atlasGroups';
import type { AtlasGroup, MapVisibilityState } from './atlasGroups';
import { categoryOf, fairRows, resultSummary, resultTime } from './atlasResults';
import type { AtlasResult, LayerResults } from './atlasResults';
import styles from './Atlas.module.css';

export function AtlasResultsView({ groups, selectedLayerId, selectedId, select, visibilityState, toggleMapRecord,
  toggleGroupMapRecords, limit, showMore }: {
  groups: LayerResults[]; selectedLayerId: string | null; selectedId?: string; select(row: AtlasResult): void;
  visibilityState: MapVisibilityState; toggleMapRecord(row: AtlasResult): void;
  toggleGroupMapRecords(group: AtlasGroup, shown: boolean): void; limit: number; showMore(): void;
}) {
  const allRows = groups.reduce((sum, group) => sum + group.rows.length, 0);
  const rows = fairRows(groups, limit);
  const layerGroups = atlasGroups(groups.map(group => group.layer));
  const visibility = mapVisibility(visibilityState);
  const selectedKey = selectedLayerId && selectedId ? `${selectedLayerId}:${selectedId}` : null;
  return <section className={styles.hierarchicalList} aria-label="ATLAS records">
    {(['Vehicles & satellites', 'Events & alerts'] as const).map(category => {
      const categoryGroups = layerGroups.filter(group => categoryOf(group.domain) === category);
      if (!categoryGroups.length) return null;
      return <details key={category} open className={styles.listCategory}>
        <summary>{category}</summary>
        {categoryGroups.map(group => {
          const members = new Set(group.layers.map(layer => layer.id));
          const groupRows = rows.filter(row => members.has(row.layer.id));
          const appearances = groups.filter(item => groupId(item.layer) === group.id);
          const total = appearances.reduce((sum, item) => sum + item.rows.length, 0);
          const unavailable = appearances.some(item => item.health === 'No active dataset response');
          const failed = appearances.some(item => item.error);
          const allShown = visibility.groupShown(group);
          return <details key={group.id} open className={styles.listGroup}>
            <summary>{group.name} <span>{total} cached appearance{total === 1 ? '' : 's'}</span>
              <button className={styles.groupMapEye} type="button" aria-label={`${allShown ? 'Hide all' : 'Show all'} ${group.name} records on map`}
                aria-pressed={allShown} title={allShown ? 'Hide all records on map' : 'Show all records on map'}
                onClick={event => { event.preventDefault(); event.stopPropagation(); toggleGroupMapRecords(group, !allShown); }}>
                <UiIcon name={allShown ? 'eye' : 'eyeOff'} size={17} /></button>
            </summary>
            {groupRows.length ? <div className={styles.listTableScroll}><table role="table" aria-label={`${group.name} records`}>
              <thead><tr><th scope="col">Record</th><th scope="col">Source</th><th scope="col">Summary</th>
                <th scope="col">Relevant time</th><th scope="col">Map</th></tr></thead>
              <tbody>{groupRows.map(row => {
                const key = mapRecordKey(row.layer, row.record.entity.id);
                const hasLocation = !!row.record.observation.geometry;
                const onMap = hasLocation && visibility.recordShown(row.layer, key);
                return <tr key={row.key} data-selected={selectedKey === row.key}>
                  <td data-label="Record"><button className={styles.recordSelect} onClick={() => select(row)}
                    title={`${resultSummary(row)} · ${row.record.observation.provenance.attribution} · ${displayTime(resultTime(row))}`}
                    aria-pressed={selectedKey === row.key}>{row.record.entity.label}</button></td>
                  <td data-label="Source">{row.record.observation.provenance.attribution}</td>
                  <td data-label="Summary">{resultSummary(row)}</td><td data-label="Time">{displayTime(resultTime(row))}</td>
                  <td data-label="Map"><button className={styles.mapEye} type="button" disabled={!hasLocation}
                    aria-label={`${onMap ? 'Hide' : 'Show'} ${row.record.entity.label} on map`}
                    aria-pressed={onMap} title={hasLocation ? (onMap ? 'Shown on map' : 'Hidden on map') : 'Location unknown'}
                    onClick={() => toggleMapRecord(row)}><UiIcon name={onMap ? 'eye' : 'eyeOff'} size={17} /></button></td>
                </tr>;
              })}</tbody>
            </table></div> : <p className={styles.listEmpty}>{failed ? 'This group could not prepare its records. Other groups remain available.' :
              unavailable ? 'No active source response. Check its connection in NEXUS.' :
                'No cached records match this group’s filters.'}</p>}
          </details>;
        })}
      </details>;
    })}
    {!groups.length && <p className={styles.listEmpty}>No groups are visible. Show a group in Layers to view current records.</p>}
    {allRows > rows.length && <button className={styles.moreResults} onClick={showMore}>
      Show more · {rows.length} of {allRows} cached appearances
    </button>}
    <p className={styles.resultCaveat}>This list covers the full queried area, including records without a map location. Counts describe the current local cache, not source totals.</p>
  </section>;
}
