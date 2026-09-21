import { Classes } from '@blueprintjs/core';
import { symbolImage } from './iconAssets';
import type { SymbolName } from './iconAssets';
export function UiIcon({ name, size = 18, className }: { name: SymbolName; size?: number; className?: string }) {
  return <span className={[Classes.ICON, className].filter(Boolean).join(' ')} aria-hidden="true" style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle', width: size, height: size,
    backgroundColor: 'currentColor', mask: `url("${symbolImage(name)}") center / contain no-repeat` }} />;
}
