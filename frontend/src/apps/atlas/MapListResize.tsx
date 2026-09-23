import { useRef } from 'react';
import styles from './Atlas.module.css';

export function MapListResize({ ratio, onChange }: { ratio: number; onChange(value: number): void }) {
  const dragging = useRef(false);
  const update = (event: { clientX: number; clientY: number; currentTarget: HTMLDivElement }) => {
    const parent = event.currentTarget.parentElement;
    if (!parent) return;
    const box = parent.getBoundingClientRect();
    const stacked = getComputedStyle(parent).flexDirection === 'column';
    const value = stacked ? (event.clientY - box.top) / box.height : (event.clientX - box.left) / box.width;
    onChange(Math.max(.2, Math.min(.8, Math.round(value * 100) / 100)));
  };
  return <div className={styles.mapListResize} role="separator" aria-label="Map and list split" aria-valuemin={20}
    aria-valuemax={80} aria-valuenow={Math.round(ratio * 100)} aria-orientation="vertical" tabIndex={0}
    onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); dragging.current = true;
      event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); update(event); }}
    onPointerMove={event => { if (dragging.current) update(event); }}
    onPointerUp={event => { dragging.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId); }}
    onLostPointerCapture={() => { dragging.current = false; }}
    onKeyDown={event => { if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); onChange(event.key === 'Home' ? .2 : event.key === 'End' ? .8 :
        Math.max(.2, Math.min(.8, ratio + (['ArrowRight', 'ArrowDown'].includes(event.key) ? .05 : -.05)))); }} />;
}
