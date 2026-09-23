import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AtlasLayer } from './atlasModule';
import { AircraftLegend } from './AircraftLegend';
import { EarthquakeLegend } from './EarthquakeContributor';
import styles from './Atlas.module.css';

export function LayerLegendHint({ name, domain }: { name: string; domain: AtlasLayer['domain'] }) {
  const id = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const location = (target: HTMLElement) => {
    const row = target.getBoundingClientRect();
    const sidebar = target.closest('aside')?.getBoundingClientRect();
    return { left: Math.max(8, Math.min(window.innerWidth - 260, (sidebar?.right ?? row.right) + 8)),
      top: Math.max(8, Math.min(window.innerHeight - 340, row.top)) };
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <><span className={styles.legendTarget} tabIndex={0} aria-label={`${name} legend, focus to show`}
    aria-describedby={position ? id : undefined}
    onMouseEnter={event => { clear(); const next = location(event.currentTarget); timer.current = setTimeout(() => setPosition(next), 500); }}
    onMouseLeave={() => { clear(); setPosition(null); }}
    onContextMenu={() => { clear(); setPosition(null); }}
    onFocus={event => { clear(); setPosition(location(event.currentTarget)); }}
    onBlur={() => setPosition(null)}>{name}</span>
    {position && createPortal(<div id={id} className={styles.legendPopover} role="tooltip" style={position}>
      {domain === 'aircraft' ? <AircraftLegend /> : domain === 'earthquakes' ? <EarthquakeLegend /> :
        <p>GeoJSON points, lines and polygons use one generic source style. Null geometry remains in List. Source time and precision may be unknown.</p>}
    </div>, document.body)}</>;
}
