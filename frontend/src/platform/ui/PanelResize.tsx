import { useRef } from 'react';
import styles from './PanelResize.module.css';

export function PanelResize({ label, edge, value, min, max, onChange }: {
  label: string; edge: 'left' | 'right'; value: number; min: number; max: number; onChange(value: number): void;
}) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const direction = edge === 'right' ? 1 : -1;
  const change = (width: number) => onChange(Math.round(Math.max(min, Math.min(max, width))));
  return <div className={styles.handle} data-edge={edge} role="separator" aria-label={label} aria-orientation="vertical"
    aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} tabIndex={0}
    onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.focus();
      drag.current = { x: event.clientX, width: value }; event.currentTarget.setPointerCapture(event.pointerId); }}
    onPointerMove={event => { if (drag.current) change(drag.current.width + direction * (event.clientX - drag.current.x)); }}
    onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onLostPointerCapture={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
    onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); change(event.key === 'Home' ? min : event.key === 'End' ? max : value + (event.key === 'ArrowRight' ? 10 : -10) * direction);
    }} />;
}
