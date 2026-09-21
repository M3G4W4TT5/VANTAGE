import plane from '@tabler/icons/outline/plane.svg?raw';
import circle from '@tabler/icons/outline/circle.svg?raw';
import event from '@tabler/icons/outline/focus-2.svg?raw';
import selection from '@tabler/icons/outline/brackets.svg?raw';
import plus from '@tabler/icons/outline/plus.svg?raw';
import minus from '@tabler/icons/outline/minus.svg?raw';
import locate from '@tabler/icons/outline/current-location.svg?raw';
import close from '@tabler/icons/outline/x.svg?raw';
import up from '@tabler/icons/outline/chevron-up.svg?raw';
import down from '@tabler/icons/outline/chevron-down.svg?raw';
import right from '@tabler/icons/outline/chevron-right.svg?raw';
import map from '@tabler/icons/outline/map.svg?raw';
import list from '@tabler/icons/outline/list.svg?raw';
import table from '@tabler/icons/outline/table.svg?raw';
import globe from '@tabler/icons/outline/world.svg?raw';
import layers from '@tabler/icons/outline/layout-sidebar.svg?raw';
import search from '@tabler/icons/outline/search.svg?raw';
import clock from '@tabler/icons/outline/clock.svg?raw';
const assets = { plane, circle, event, selection, plus, minus, locate, close, up, down, right, map, list, table, globe, layers, search, clock };
export type SymbolName = keyof typeof assets;
// Only pinned, bundled Tabler assets enter SVG image URLs. No source content is interpolated.
const urls = Object.fromEntries(Object.entries(assets).map(([key, svg]) => [key,
  'data:image/svg+xml,' + encodeURIComponent(svg.replaceAll('currentColor', 'white'))])) as Record<SymbolName, string>;
export const symbolImage = (name: SymbolName) => urls[name];
