import { UiIcon, MarkerSymbol } from '../../platform/ui/UiIcon';
import styles from './Atlas.module.css';
export function AircraftLegend() {
  return <div className={styles.sidebarSection}>
    <div className={styles.sectionHeading}>Aircraft legend</div>
    <div className={styles.magnitudeLegend} aria-label="Aircraft legend">
      { [['--accent', 'Recent'], ['--aircraft-stale', 'Old / age unknown'], ['--aircraft-ground', 'Grounded']].map(([colour, label]) =>
        <span key={colour} style={{ color: `var(${colour})` }}><UiIcon name="plane" size={24} /><span>{label}</span></span>)}
      <span><MarkerSymbol name="plane" missingInformation /><span>Missing data</span></span>
      <span style={{ color: 'var(--selection-outline)' }}><UiIcon name="selection" size={30} /><span>Selected</span></span>
    </div>
    <p className={styles.muted}>Old means position older than 60 seconds. Reported grounded aircraft stay red, regardless of age. A ? marks unavailable track/heading, ground state or position time. Direction defaults north only when unknown; it is not an observed heading. Inspect the record for the missing fields.</p>
  </div>;
}
