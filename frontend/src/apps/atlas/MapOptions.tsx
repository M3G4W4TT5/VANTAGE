import type { CameraState } from '../../platform/maps/PointMarkers';
import { useSourceServices } from '../../platform/sources/SourceServices';
import { PlaceSearch } from './PlaceSearch';
import styles from './Atlas.module.css';
export function MapOptions({ paneId, basemapId, setBasemap, setCamera }: {
  paneId: string; basemapId?: string; setBasemap(id: string): void; setCamera(camera: CameraState): void;
}) {
  const { basemapSources, defaultBasemapId, placeSource } = useSourceServices();
  return <><PlaceSearch source={placeSource} select={place => setCamera({ longitude: place.longitude, latitude: place.latitude, height: 75000 })} />
    <div className={styles.sidebarSection}>
      <label className={styles.sectionHeading} htmlFor={`${paneId}-basemap`}>Basemap</label>
      <select className={styles.fullSelect} id={`${paneId}-basemap`} value={basemapId ?? defaultBasemapId} onChange={event => setBasemap(event.target.value)}>
        {basemapSources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
      </select>
    </div></>;
}
