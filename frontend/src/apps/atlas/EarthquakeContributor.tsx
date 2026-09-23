import { Button, InputGroup } from '@blueprintjs/core';
import type { EarthquakeLayer, EarthquakeSettings } from './atlasModule';
import { UiIcon, MarkerSymbol } from '../../platform/ui/UiIcon';
import { defaultEarthquakeSettings, magnitudeStyle } from './earthquakePresentation';
import styles from './Atlas.module.css';

export function EarthquakeLayerFilters({ layer, paneId, update }: { layer: EarthquakeLayer; paneId: string; update(layer: EarthquakeLayer): void }) {
  const filter = (next: Partial<EarthquakeSettings>) => update({ ...layer, filters: { ...layer.filters, ...next } });
  return <>
    <div className={styles.sidebarSection}>
      <InputGroup leftIcon={<UiIcon name="search" />} aria-label="Filter earthquakes" placeholder="Location or source event ID…"
        value={layer.filters.query} maxLength={500} onChange={event => filter({ query: event.target.value })} />
      <label className={styles.fieldLabel} htmlFor={`${paneId}-${layer.id}-magnitude`}>Minimum magnitude</label>
      <select className={styles.fullSelect} id={`${paneId}-${layer.id}-magnitude`} value={layer.filters.minimumMagnitude ?? 'all'}
        onChange={event => filter({ minimumMagnitude: event.target.value === 'all' ? null : +event.target.value })}>
        <option value="all">All feed values, including unknown</option>{[2.5, 3, 4, 5, 6].map(value => <option key={value} value={value}>M {value.toFixed(1)}+</option>)}
      </select>
      <label className={styles.fieldLabel} htmlFor={`${paneId}-${layer.id}-event-age`}>Event age</label>
      <select className={styles.fullSelect} id={`${paneId}-${layer.id}-event-age`} value={layer.filters.maxAgeHours ?? 'all'}
        onChange={event => filter({ maxAgeHours: event.target.value === 'all' ? null : +event.target.value })}>
        <option value="all">Whole received feed, including unknown</option>{[1, 6, 24].map(hours => <option key={hours} value={hours}>Occurred within {hours} hours</option>)}
      </select>
      <label className={styles.fieldLabel} htmlFor={`${paneId}-${layer.id}-event-sort`}>Sort events</label>
      <select className={styles.fullSelect} id={`${paneId}-${layer.id}-event-sort`} value={layer.filters.sort}
        onChange={event => filter({ sort: event.target.value as EarthquakeSettings['sort'] })}>
        <option value="occurred">Occurrence · newest first</option><option value="magnitude">Magnitude · largest first</option><option value="updated">Source update · newest first</option>
      </select>
      <Button minimal onClick={() => update({ ...layer, filters: defaultEarthquakeSettings })}>Clear filters</Button>
    </div>
  </>;
}
export function EarthquakeLegend() {
  return <div className={styles.sidebarSection}>
      <div className={styles.sectionHeading}>Magnitude legend</div>
      <div className={styles.magnitudeLegend} aria-label="Magnitude legend">{[[3, '< 4'], [5, '4–5.9'], [6, '6+'], [null, 'Unknown']].map(([value, label]) => {
        const style = magnitudeStyle(value as number | null);
        return <span key={label} style={{ color: `var(${style.colour})` }}><MarkerSymbol name="event" size={style.size} missingInformation={value === null} /><span>{label}</span></span>;
      })}</div>
      <p className={styles.muted}>Surface epicentres. Magnitude is not local impact; depth in km is never map altitude. A ? marks missing values.</p>
    </div>;
}
