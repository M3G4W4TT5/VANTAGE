import { Classes } from '@blueprintjs/core';
import { symbolImage } from './iconAssets';
import type { SymbolName } from './iconAssets';
export function UiIcon({ name, size = 18, className }: { name: SymbolName; size?: number; className?: string }) {
  return <span className={[Classes.ICON, className].filter(Boolean).join(' ')} aria-hidden="true" style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle', width: size, height: size,
    backgroundColor: 'currentColor', mask: `url("${symbolImage(name)}") center / contain no-repeat` }} />;
}

export function MarkerSymbol({ name, size = 24, missingInformation = false }: { name: SymbolName; size?: number; missingInformation?: boolean }) {
  return <span style={{ position: 'relative', display: 'inline-flex', marginRight: missingInformation ? 8 : 0 }}>
    <UiIcon name={name} size={size} />{missingInformation && <span style={{ position: 'absolute', top: -7, right: -9, color: 'var(--text)' }}><UiIcon name="question" size={15} /></span>}
  </span>;
}
