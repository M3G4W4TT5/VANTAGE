import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Atlas.module.css';

export type GroupAction = 'filters' | 'actions' | 'settings' | 'delete';
export type AtlasMenuItem<T extends string> = { action: T; label: string; danger?: boolean };

export function AtlasContextMenu<T extends string>({ label, items, x, y, returnFocus, onChoose, onClose }: {
  label: string; items: AtlasMenuItem<T>[]; x: number; y: number; returnFocus: HTMLElement;
  onChoose(action: T): void; onClose(): void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const pointer = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) onClose(); };
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); onClose(); returnFocus.focus();
    };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', key); };
  }, [onClose, returnFocus]);
  return createPortal(<div ref={menu} className={styles.contextMenu} role="menu"
    aria-label={label}
    style={{ left: Math.max(8, Math.min(x, window.innerWidth - 190)), top: Math.max(8, Math.min(y, window.innerHeight - (items.length * 33 + 16))) }}
    onKeyDown={event => {
      const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length :
        event.key === 'ArrowUp' ? (index + buttons.length - 1) % buttons.length :
          event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault(); buttons[next].focus();
    }}>
    {items.map(item => <button key={item.action} role="menuitem" data-danger={!!item.danger}
      onClick={() => onChoose(item.action)}>{item.label}</button>)}
  </div>, document.body);
}
