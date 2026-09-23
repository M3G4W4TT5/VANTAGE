import { useEffect, useState } from 'react';
import { AnchorButton, Button, HTMLSelect, Spinner } from '@blueprintjs/core';
import { VantageClient } from '../../api/generated/client';
import type { HealthDto } from '../../api/generated/client';
import type { SystemViewProps } from '../registry/AppRegistry';
import { sessionService } from '../session/SessionService';
import styles from './SettingsModule.module.css';

const api = new VantageClient('', { fetch: sessionService.fetch });

const regions = [
  { value: 'northern-europe', label: 'Northern Europe' },
  { value: 'denmark', label: 'Denmark' },
  { value: 'europe', label: 'Europe' },
  { value: 'world', label: 'World' },
];
const zones = ['UTC', ...Intl.supportedValuesOf('timeZone')];

export function SettingsView({ session, theme, themeDisabled, onThemeChange, defaultRegion, timeZone,
  onDisplayPreferenceChange }: SystemViewProps) {
  const [health, setHealth] = useState<HealthDto | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    void api.health_Get(abort.signal).then(value => { setHealth(value); setHealthError(false); }, () => {
      if (!abort.signal.aborted) setHealthError(true);
    });
    return () => abort.abort();
  }, [revision]);
  return <main id="settings" className={styles.settings}>
    <p className={styles.eyebrow}>SYSTEM TOOL</p>
    <h1>Settings</h1>
    <p className={styles.intro}>Manage your personal display preferences and check this installation.</p>
    <section aria-labelledby="personal-settings">
      <h2 id="personal-settings">Personal preferences</h2>
      <div className={styles.settingRow}>
        <div><strong>Theme</strong><p>Applies to Home, Settings and every workspace. Workspace Save is separate.</p></div>
        <HTMLSelect aria-label="Theme" value={theme} disabled={themeDisabled} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
          onChange={event => onThemeChange(event.target.value as 'dark' | 'light')} />
      </div>
      <div className={styles.settingRow}>
        <div><strong>Default map region</strong><p>Centres new ATLAS workspaces. Existing saved cameras keep their position.</p></div>
        <HTMLSelect aria-label="Default map region" value={defaultRegion ?? 'northern-europe'} disabled={themeDisabled}
          options={regions} onChange={event => onDisplayPreferenceChange?.({ defaultRegion: event.target.value })} />
      </div>
      <div className={styles.settingRow}>
        <div><strong>Display timezone</strong><p>Applies to displayed times throughout VANTAGE. Stored source and provenance times remain UTC.</p></div>
        <HTMLSelect aria-label="Display timezone" value={timeZone ?? 'UTC'} disabled={themeDisabled}
          options={zones.map(zone => ({ value: zone, label: zone }))}
          onChange={event => onDisplayPreferenceChange?.({ timeZone: event.target.value })} />
      </div>
    </section>
    <section aria-labelledby="system-status">
      <h2 id="system-status">System status</h2>
      {health ? <dl className={styles.status}><dt>Application</dt><dd>{health.status}</dd><dt>Storage</dt><dd>{health.storage}</dd></dl> :
        healthError ? <div role="alert" className={styles.statusError}>Status unavailable. <Button small onClick={() => setRevision(value => value + 1)}>Retry</Button></div> :
          <div role="status" className={styles.loading}><Spinner size={16} /> Checking status…</div>}
    </section>
    <section aria-labelledby="account-settings">
      <h2 id="account-settings">Account</h2>
      <dl className={styles.status}><dt>Signed in as</dt><dd>{session.user.displayName}</dd></dl>
      <AnchorButton minimal href="/auth/account" target="_blank" rel="noopener noreferrer" rightIcon="share">Manage password and authenticator</AnchorButton>
    </section>
  </main>;
}
