import { expect, test } from 'vitest';
import { Cartesian3, Ellipsoid } from 'cesium';
import { pointVisible } from '../src/platform/maps/pointVisibility';
import { aircraftMarker } from '../src/apps/atlas/aircraftPresentation';
import { earthquakeMarker } from '../src/apps/atlas/earthquakePresentation';
import { aircraftFixture } from './fixtures/aircraft';
import { earthquakeFixture } from './fixtures/earthquakes';
test('ground state and age set aircraft colour independently from missing-information badge', () => {
  const record = aircraftFixture().upserts[0]; const p = record.observation.properties;
  const now = Date.parse(p.positionObservedAt!);
  expect(aircraftMarker(record, now)?.colour).toBe('--accent');
  p.trackDegrees = null;
  expect(aircraftMarker(record, now)).toMatchObject({ symbol: 'plane', colour: '--accent', missingInformation: true });
  p.trueHeadingDegrees = 90;
  expect(aircraftMarker(record, now)).toMatchObject({ missingInformation: false, rotationDegrees: 0 });
  expect(aircraftMarker(record, now + 61000)?.colour).toBe('--aircraft-stale');
  p.onGround = true;
  expect(aircraftMarker(record, now + 61000)).toMatchObject({ symbol: 'plane', colour: '--aircraft-ground' });
  const quake = earthquakeFixture().upserts[0]; quake.observation.properties.depthKilometres = null;
  expect(earthquakeMarker(quake)).toMatchObject({ symbol: 'event', missingInformation: true });
});
test('globe visibility follows the camera and retains surface and elevated points in front', () => {
  const front = Cartesian3.fromDegrees(12, 58); const back = Cartesian3.fromDegrees(-168, -58);
  const camera = Cartesian3.fromDegrees(12, 58, 2400000);
  expect(pointVisible(camera, front, Ellipsoid.WGS84)).toBe(true);
  expect(pointVisible(camera, back, Ellipsoid.WGS84)).toBe(false);
  expect(pointVisible(Cartesian3.fromDegrees(-168, -58, 2400000), back, Ellipsoid.WGS84)).toBe(true);
  expect(pointVisible(camera, Cartesian3.fromDegrees(12, 58, 12000), Ellipsoid.WGS84)).toBe(true);
});
