import { expect, test } from 'vitest';
import { aircraftChannel, clearAircraftChannels } from '../src/platform/data/AircraftChannel';
import { earthquakeChannel, clearEarthquakeChannel } from '../src/platform/data/EarthquakeChannel';
import type { AircraftLayer, AtlasLayer, AtlasState, EarthquakeLayer } from '../src/apps/atlas/atlasModule';
import { composedMarkers, markerQuota } from '../src/apps/atlas/atlasMarkerComposition';
import { collectResults, fairRows, resultCounts, scopedLayers } from '../src/apps/atlas/atlasResults';
import type { LayerResults } from '../src/apps/atlas/atlasResults';
import { layerDemandKey } from '../src/apps/atlas/atlasDemand';
import { atlasGroups, layerShown, mapRecordKey, mapVisibility, setGroupMapRecordsShown, setGroupsVisible } from '../src/apps/atlas/atlasGroups';
import { aircraftFixture } from './fixtures/aircraft';
import { earthquakeFixture } from './fixtures/earthquakes';

const query = { longitude: 12, latitude: 58, radiusNm: 250 };
const aircraft = (id: string): AircraftLayer => ({ id, domain: 'aircraft', connectionId: 'legacy-aircraft',
  datasetId: 'legacy-aircraft:positions', participating: true, visible: true, query,
  filters: { query: '', freshness: 'all' }, appearance: { opacity: 1, sizeScale: 1 } });
const earthquake: EarthquakeLayer = { id: 'quake-layer', domain: 'earthquakes', connectionId: 'legacy-earthquakes',
  datasetId: 'legacy-earthquakes:events', participating: true, visible: true,
  filters: { query: '', minimumMagnitude: null, maxAgeHours: null, sort: 'occurred' }, appearance: { opacity: 1, sizeScale: 1 } };

test('equivalent appearances share one connection/query channel while preserving rendering identity and independent filters', () => {
  const first = aircraft('aircraft-a'); const second = aircraft('aircraft-b');
  expect(layerDemandKey(first, 'workspace-a')).toBe(layerDemandKey(second, 'workspace-a'));
  expect(layerDemandKey(first, 'workspace-a')).not.toBe(layerDemandKey({ ...second, datasetId: 'other-dataset' }, 'workspace-a'));
  const channel = aircraftChannel(query, first.connectionId, 'workspace-a');
  expect(aircraftChannel(query, second.connectionId, 'workspace-a')).toBe(channel);
  expect(aircraftChannel(query, first.connectionId, 'workspace-b')).not.toBe(channel);
  expect(aircraftChannel(query, 'another-connection', 'workspace-a')).not.toBe(channel);
  channel.accept(aircraftFixture());
  const quakeChannel = earthquakeChannel(earthquake.connectionId, 'workspace-a');
  quakeChannel.accept(earthquakeFixture());
  const layers: AtlasLayer[] = [first, { ...second, filters: { query: 'not a match', freshness: 'all' } }, earthquake];
  const channels = new Map([[layerDemandKey(first, 'workspace-a'), channel],
    [layerDemandKey(earthquake, 'workspace-a'), quakeChannel]]);
  const markers = composedMarkers(layers, channels, 'workspace-a', Date.now(), () => {});
  expect(markers).toHaveLength(2);
  expect(markers[0].appearanceId).toBe('aircraft-a:' + markers[0].reference.entityId);
  expect(markers[0].reference.layerInstanceId).toBe('aircraft-a');
  expect(markers[1].reference.layerInstanceId).toBe('quake-layer');
  const both = composedMarkers([first, second, earthquake], channels, 'workspace-a', Date.now(), () => {});
  expect(both).toHaveLength(3);
  expect(both[0].reference.entityId).toBe(both[1].reference.entityId);
  expect(both[0].appearanceId).not.toBe(both[1].appearanceId);
  expect(composedMarkers([first, { ...second, participating: false }, earthquake], channels, 'workspace-a', Date.now(), () => {}))
    .toHaveLength(2);
  clearAircraftChannels(); clearEarthquakeChannel();
});

test('a broken contributor does not suppress markers from another layer', () => {
  const channel = aircraftChannel(query, 'legacy-aircraft', 'workspace-a'); channel.accept(aircraftFixture());
  const healthy = aircraft('healthy'); const broken = { ...aircraft('broken'), filters: null } as unknown as AircraftLayer;
  const failures: string[] = [];
  const markers = composedMarkers([broken, healthy], new Map([[layerDemandKey(healthy, 'workspace-a'), channel]]),
    'workspace-a', Date.now(), id => failures.push(id));
  expect(failures).toEqual(['broken']);
  expect(markers).toHaveLength(1);
  expect(markers[0].reference.layerInstanceId).toBe('healthy');
  clearAircraftChannels();
});

test('selected result scope stays separate from focus and participation', () => {
  const first = aircraft('first'); const second = aircraft('second');
  const state = { layers: [first, second, earthquake], focusedLayerId: 'first', resultScope: 'selected',
    resultLayerIds: ['second', 'quake-layer'] } as AtlasState;
  expect(scopedLayers(state).map(layer => layer.id)).toEqual(['second', 'quake-layer']);
  expect(scopedLayers({ ...state, layers: [first, { ...second, participating: false }, earthquake] }).map(layer => layer.id))
    .toEqual(['quake-layer']);
  expect(scopedLayers({ ...state, resultScope: 'focused' }).map(layer => layer.id)).toEqual(['first']);
});

test('dense results are fairly paged, counts distinguish records and appearances, and one presenter failure is isolated', () => {
  const first = aircraft('first'); const second = aircraft('second');
  const sample = aircraftFixture().upserts[0]; const quake = earthquakeFixture().upserts[0];
  const dense = Array.from({ length: 400 }, (_, index) => ({ layer: first,
    record: { ...sample, entity: { ...sample.entity, id: `aircraft-${index}` } },
    key: `first:aircraft-${index}`, health: 'connected · healthy' }));
  const groups: LayerResults[] = [
    { layer: first, rows: dense, truncatedUpstream: true, health: 'connected · healthy' },
    { layer: earthquake, rows: [{ layer: earthquake, record: quake, key: `quake-layer:${quake.entity.id}`, health: 'connected · healthy' }],
      truncatedUpstream: false, health: 'connected · healthy' },
    { layer: second, rows: [{ ...dense[0], layer: second, key: `second:${dense[0].record.entity.id}` }],
      truncatedUpstream: false, health: 'connected · healthy' },
  ];
  expect(fairRows(groups, 3).map(row => row.layer.id)).toEqual(['first', 'quake-layer', 'second']);
  expect(resultCounts(groups)).toMatchObject({ appearances: 402, unique: 401, upstreamTruncated: true });
  expect(markerQuota(1)).toBe(600);
  expect(markerQuota(16)).toBe(150);

  const channel = aircraftChannel(query, first.connectionId, 'workspace-a'); channel.accept(aircraftFixture());
  const results = collectResults([{ ...first, filters: null } as unknown as AircraftLayer, second],
    new Map([[layerDemandKey(first, 'workspace-a'), channel]]), 'workspace-a', Date.now());
  expect(results[0].error).toBe(true);
  expect(results[1].rows).toHaveLength(1);
  clearAircraftChannels();
});

test('a hidden group defaults all current and future map records off while record overrides remain independent of List', () => {
  const first = { ...aircraft('first'), groupId: 'watch', groupName: 'Watch aircraft' };
  const second = { ...aircraft('second'), groupId: 'watch', groupName: 'Watch aircraft' };
  const dormant = { ...earthquake, visible: true, participating: false };
  expect(atlasGroups([first, second, dormant]).map(group => [group.id, group.layers.length, group.visible]))
    .toEqual([['watch', 2, true], ['quake-layer', 1, false]]);
  expect(layerShown(dormant)).toBe(false);
  const hiddenLayers = setGroupsVisible([first, second, dormant], new Set(['watch', 'quake-layer']), false);
  expect(hiddenLayers.map(layer => [layer.visible, layer.participating]))
    .toEqual([[false, true], [false, true], [false, false]]);
  expect(hiddenLayers.every(layer => !layerShown(layer))).toBe(true);
  expect(setGroupsVisible(hiddenLayers, new Set(['watch', 'quake-layer']), true)
    .map(layer => [layer.visible, layer.participating])).toEqual([[true, true], [true, true], [true, true]]);
  const channel = aircraftChannel(query, first.connectionId, 'workspace-a'); channel.accept(aircraftFixture());
  const channels = new Map([[layerDemandKey(first, 'workspace-a'), channel]]);
  const results = collectResults([first, second], channels, 'workspace-a', Date.now());
  expect(results.map(group => group.rows.length)).toEqual([1, 1]);
  const key = mapRecordKey(first, results[0].rows[0].record.entity.id);
  expect(composedMarkers([first, second], channels, 'workspace-a', Date.now(), () => {}, { hiddenMapRecordIds: [key] })
    .map(marker => marker.reference.layerInstanceId)).toEqual(['second']);
  const group = atlasGroups([first, second])[0];
  const hidden = setGroupMapRecordsShown({}, group, false);
  expect(hidden.hiddenMapGroupIds).toEqual(['watch']);
  expect(mapVisibility(hidden).recordShown(first, key)).toBe(false);
  expect(mapVisibility(hidden).recordShown(first, mapRecordKey(first, 'future-aircraft'))).toBe(false);
  expect(composedMarkers([first, second], channels, 'workspace-a', Date.now(), () => {}, hidden)).toHaveLength(0);
  const selected = { ...hidden, shownMapRecordIds: [key] };
  expect(composedMarkers([first, second], channels, 'workspace-a', Date.now(), () => {}, selected)
    .map(marker => marker.reference.layerInstanceId)).toEqual(['first']);
  expect(setGroupMapRecordsShown(selected, group, true)).toMatchObject({ hiddenMapGroupIds: [], shownMapRecordIds: [] });
  expect(collectResults([first, second], channels, 'workspace-a', Date.now()).map(group => group.rows.length)).toEqual([1, 1]);
  clearAircraftChannels();
});
