import type { ResultColumn } from '../../platform/ui/ResultsTable';
import type { AircraftRecord } from '../../platform/data/AircraftChannel';
import { utc } from '../../platform/ui/format';
export const aircraftColumns: ResultColumn<AircraftRecord>[] = [
  { id: 'label', label: 'Name', width: 200, value: r => r.entity.label },
  { id: 'address', label: 'Address', width: 110, value: r => r.observation.properties.address.toUpperCase() },
  { id: 'ground', label: 'Ground state', width: 120, value: r => r.observation.properties.onGround === null ? 'Unknown' : r.observation.properties.onGround ? 'Grounded' : 'Airborne' },
  { id: 'track', label: 'Track · ° true', width: 120, value: r => r.observation.properties.trackDegrees?.toFixed(1) ?? 'Unknown' },
  { id: 'speed', label: 'Speed · m/s', width: 120, value: r => r.observation.properties.speedMetresPerSecond?.toFixed(1) ?? 'Unknown' },
  { id: 'time', label: 'Position time', width: 210, value: r => utc(r.observation.properties.positionObservedAt) },
  { id: 'evidence', label: 'Evidence', width: 120, value: r => r.observation.evidenceClass },
];
