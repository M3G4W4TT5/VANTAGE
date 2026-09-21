import { expect, test } from 'vitest';
import { AircraftChannel } from '../src/platform/data/AircraftChannel';
import { aircraftFixture } from './fixtures/aircraft';

test('aircraft stream rejects gaps, duplicates and invalid contracts and restores with a reset', () => {
  const channel = new AircraftChannel({ longitude: 12, latitude: 58, radiusNm: 250 });
  expect(channel.accept(aircraftFixture())).toBe('accepted');
  expect(channel.accept(aircraftFixture())).toBe('duplicate');
  expect(channel.accept(aircraftFixture(2, false, 900))).toBe('gap');
  expect(channel.getSnapshot().records[0].observation.properties.speedMetresPerSecond).toBe(100);
  expect(channel.accept(aircraftFixture(3, true, 110))).toBe('accepted');
  const late = aircraftFixture(4, false, 50); late.upserts[0].observation.properties.positionObservedAt = '2026-09-21T11:00:00.000Z';
  expect(channel.accept(late)).toBe('accepted');
  expect(channel.getSnapshot().records[0].observation.properties.speedMetresPerSecond).toBe(110);
  const malformed = aircraftFixture(5, false); malformed.upserts[0].observation.geometry!.coordinates[0] = 999;
  expect(() => channel.accept(malformed)).toThrow();
  const remove = aircraftFixture(5, false); remove.upserts = []; remove.removals = ['fixture-provider:abcdef']; remove.completeness.returned = 0;
  expect(channel.accept(remove)).toBe('accepted'); expect(channel.getSnapshot().records).toHaveLength(0);
});
