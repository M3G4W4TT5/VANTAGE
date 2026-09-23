import type { AtlasLayer } from './atlasModule';

export type AtlasGroup = { id: string; name: string; domain: AtlasLayer['domain']; layers: AtlasLayer[]; visible: boolean };

export const groupId = (layer: AtlasLayer) => layer.groupId ?? layer.id;
export const groupName = (layer: AtlasLayer) => layer.groupName ?? (layer.domain === 'aircraft' ? 'Aircraft' : layer.domain === 'earthquakes' ? 'Earthquakes' : 'GeoJSON features');
// Old v2 workspaces can contain visible but unused layers. Keep those dormant until explicitly shown.
export const layerShown = (layer: AtlasLayer) => layer.visible && layer.participating;
// Showing a dormant layer is explicit activation. Hiding an active layer changes presentation only.
export function setGroupsVisible(layers: AtlasLayer[], ids: ReadonlySet<string>, visible: boolean): AtlasLayer[] {
  return layers.map(layer => ids.has(groupId(layer)) ?
    { ...layer, visible, participating: layer.participating || visible } : layer);
}
export const mapRecordKey = (layer: AtlasLayer, entityId: string) => `${layer.id}:${entityId}`;
export type MapVisibilityState = { hiddenMapRecordIds?: string[]; hiddenMapGroupIds?: string[];
  shownMapRecordIds?: string[] };

// A hidden group is the default for current and future records. Individual eyes override that default.
export function mapVisibility(state: MapVisibilityState) {
  const hiddenGroups = new Set(state.hiddenMapGroupIds ?? []);
  const hiddenRecords = new Set(state.hiddenMapRecordIds ?? []);
  const shownRecords = new Set(state.shownMapRecordIds ?? []);
  return {
    groupShown: (group: AtlasGroup) => !hiddenGroups.has(group.id),
    recordShown: (layer: AtlasLayer, key: string) => hiddenGroups.has(groupId(layer)) ? shownRecords.has(key) : !hiddenRecords.has(key),
  };
}

export function setGroupMapRecordsShown(state: MapVisibilityState, group: AtlasGroup, shown: boolean): MapVisibilityState {
  const memberIds = new Set(group.layers.map(layer => layer.id));
  const belongs = (key: string) => [...memberIds].some(id => key.startsWith(id + ':'));
  return {
    hiddenMapGroupIds: shown ? (state.hiddenMapGroupIds ?? []).filter(id => id !== group.id) :
      [...new Set([...(state.hiddenMapGroupIds ?? []), group.id])],
    hiddenMapRecordIds: (state.hiddenMapRecordIds ?? []).filter(key => !belongs(key)),
    shownMapRecordIds: (state.shownMapRecordIds ?? []).filter(key => !belongs(key)),
  };
}

export function atlasGroups(layers: AtlasLayer[]): AtlasGroup[] {
  const groups = new Map<string, AtlasGroup>();
  for (const layer of layers) {
    const id = groupId(layer);
    let group = groups.get(id);
    if (!group) {
      group = { id, name: groupName(layer), domain: layer.domain, layers: [], visible: layerShown(layer) };
      groups.set(id, group);
    }
    group.layers.push(layer);
  }
  return [...groups.values()];
}
