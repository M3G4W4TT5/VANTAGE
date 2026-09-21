import { useEffect, useId, useState } from 'react';
import { Button, Icon, InputGroup } from '@blueprintjs/core';
import type { PlaceResult, PlaceSource } from '../../platform/places/PlaceSource';
import styles from './Atlas.module.css';

export function PlaceSearch({ source, select }: { source: PlaceSource; select(place: PlaceResult): void }) {
  const id = useId(); const [query, setQuery] = useState(''); const [results, setResults] = useState<PlaceResult[]>([]);
  const [status, setStatus] = useState(''); const [chosen, setChosen] = useState<PlaceResult>();
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setResults([]);
      if (query.trim().length < 2) { setStatus(''); return; }
      setStatus('Searching the offline place index…');
      void source.search(query, controller.signal).then(places => {
        if (controller.signal.aborted) return;
        setResults(places); setStatus(places.length ? `${places.length} place results` : 'No indexed place matches. Try a nearby city or another spelling.');
      }).catch(() => { if (!controller.signal.aborted) setStatus('Place search is unavailable. The map can still be moved manually.'); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, source]);
  return <section className={styles.sidebarSection} aria-label="Place search">
    <label className={styles.sectionHeading} htmlFor={id}>Find a place</label>
    <InputGroup id={id} leftIcon="search" placeholder="City or town…" value={query} maxLength={120}
      onChange={event => { setQuery(event.target.value); setChosen(undefined); }} />
    <p className={styles.muted}><a href={source.documentationUrl} target="_blank" rel="noreferrer">{source.name}</a><br />{source.coverage}</p>
    <span className={styles.searchStatus} role="status">{status}</span>
    {results.length > 0 && <ul className={styles.placeResults} aria-label="Place results">{results.map(place => <li key={place.id}>
      <button className={styles.resultRow} onClick={() => { select(place); setChosen(place); setQuery(''); }}>
        <Icon icon="map-marker" /><span>{place.name}<small>{place.country} · approximate</small></span><Icon icon="chevron-right" />
      </button>
    </li>)}</ul>}
    {chosen && <p className={styles.muted}>Centred on <strong>{chosen.name}</strong>, {chosen.country}. Use “Search this area” to move the aircraft collection.</p>}
    {query && <Button minimal small onClick={() => setQuery('')}>Clear search</Button>}
  </section>;
}
