import { AnchorButton, Button, HTMLSelect } from '@blueprintjs/core';
import type { WorkspaceSummaryDto } from '../../api/generated/client';
import type { AppRegistry } from '../registry/AppRegistry';
import type { AuthenticatedSession } from '../session/SessionService';
import { SignOutForm } from '../session/SignOutForm';
import { utc } from '../ui/format';
import styles from './HomeView.module.css';

type Theme = 'dark' | 'light';

export type HomeViewProps = {
  registry: AppRegistry;
  workspaces: WorkspaceSummaryDto[];
  currentWorkspaceId: string | null;
  busy: boolean;
  session: AuthenticatedSession;
  theme: Theme;
  themeDisabled: boolean;
  onOpenWorkspace(id: string): void;
  onCreateWorkspace(): void;
  onDuplicateWorkspace(id: string): void;
  onRenameWorkspace(id: string): void;
  onDeleteWorkspace(id: string): void;
  onLaunchApp(appId: string): void;
  onOpenSystem(toolId: string): void;
  onThemeChange(theme: Theme): void;
};

export function HomeView({ registry, workspaces, currentWorkspaceId, busy, session, theme, themeDisabled,
  onOpenWorkspace, onCreateWorkspace, onDuplicateWorkspace, onRenameWorkspace, onDeleteWorkspace,
  onLaunchApp, onOpenSystem, onThemeChange }: HomeViewProps) {
  const modules = registry.list();
  const apps = modules.filter(module => module.manifest.kind === 'app');
  const systemTools = modules.filter(module => module.manifest.kind === 'system-tool' && !module.manifest.workspaceRequired && module.SystemView);

  return <main id="home" className={styles.home}>
    <div className={styles.heading}>
      <p className={styles.eyebrow}>VANTAGE</p>
      <h1>Home</h1>
      <p>Open a workspace, launch an app or manage connections and settings.</p>
    </div>

    <div className={styles.sections}>
      <section className={`${styles.section} ${styles.workspaceSection}`} aria-labelledby="home-workspaces">
        <div className={styles.sectionHeading}>
          <div><p className={styles.sectionNumber}>01 / WORK</p><h2 id="home-workspaces">Workspaces</h2></div>
          <Button icon="add" intent="primary" disabled={busy} onClick={onCreateWorkspace}>Create workspace</Button>
        </div>
        {workspaces.length ? <ul className={styles.workspaceList}>
          {workspaces.map(workspace => {
            if (!workspace.id) return null;
            const id = workspace.id;
            const name = workspace.name || 'Unnamed workspace';
            return <li className={styles.workspaceRow} key={id}>
              <div className={styles.workspaceDetails}>
                <div className={styles.workspaceNameLine}>
                  <strong>{name}</strong>
                  {id === currentWorkspaceId && <span className={styles.current}>Current</span>}
                </div>
                {workspace.updatedAt && <span className={styles.updated}>Updated {utc(workspace.updatedAt)}</span>}
              </div>
              <div className={styles.workspaceActions}>
                <Button small icon="folder-open" disabled={busy} onClick={() => onOpenWorkspace(id)} aria-label={`Open ${name}`}>Open</Button>
                <Button small minimal icon="duplicate" disabled={busy} onClick={() => onDuplicateWorkspace(id)} aria-label={`Duplicate ${name}`}>Duplicate</Button>
                <Button small minimal icon="edit" disabled={busy} onClick={() => onRenameWorkspace(id)} aria-label={`Rename ${name}`}>Rename</Button>
                <Button small minimal icon="trash" disabled={busy} onClick={() => onDeleteWorkspace(id)} aria-label={`Delete ${name}`}>Delete</Button>
              </div>
            </li>;
          })}
        </ul> : <p className={styles.empty}>{busy ? 'Loading workspaces…' : 'No workspaces yet. Create one to start working.'}</p>}
      </section>

      <section className={styles.section} aria-labelledby="home-apps">
        <div className={styles.sectionHeading}><div><p className={styles.sectionNumber}>02 / ANALYZE</p><h2 id="home-apps">Apps</h2></div></div>
        {apps.length ? <ul className={styles.destinationList}>{apps.map(app => <li key={app.manifest.id}>
          <div className={styles.destinationName}>
            <img src={app.manifest.branding[theme]} alt="" />
            <span>{app.manifest.navigation.label}</span>
          </div>
          <Button minimal rightIcon="arrow-right" disabled={busy} onClick={() => onLaunchApp(app.manifest.id)}
            aria-label={`Choose workspace for ${app.manifest.navigation.label}`}>Choose workspace</Button>
        </li>)}</ul> : <p className={styles.empty}>No apps are installed.</p>}
      </section>

      <section className={styles.section} aria-labelledby="home-system">
        <div className={styles.sectionHeading}><div><p className={styles.sectionNumber}>03 / MANAGE</p><h2 id="home-system">System</h2></div></div>
        {systemTools.length ? <ul className={styles.destinationList}>{systemTools.map(tool => <li key={tool.manifest.id}>
          <div className={styles.destinationName}><img src={tool.manifest.branding[theme]} alt="" /><span>{tool.manifest.navigation.label}</span></div>
          <Button minimal rightIcon="arrow-right" disabled={busy} onClick={() => onOpenSystem(tool.manifest.id)}
            aria-label={`Open ${tool.manifest.navigation.label}`}>Open</Button>
        </li>)}</ul> : <p className={styles.empty}>No system tools are available.</p>}
      </section>

      <section className={styles.section} aria-labelledby="home-account">
        <div className={styles.sectionHeading}><div><p className={styles.sectionNumber}>04 / IDENTITY</p><h2 id="home-account">Account</h2></div></div>
        <dl className={styles.accountDetails}><dt>Signed in as</dt><dd>{session.user.displayName}</dd></dl>
        <div className={styles.preference}>
          <label htmlFor="home-theme">Theme</label>
          <HTMLSelect id="home-theme" value={theme} disabled={themeDisabled} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
            onChange={event => onThemeChange(event.target.value as Theme)} />
        </div>
        <p className={styles.preferenceNote}>Your theme applies across workspaces.</p>
        <AnchorButton minimal href="/auth/account" target="_blank" rel="noopener noreferrer" rightIcon="share">Manage password and authenticator</AnchorButton>
        <div className={styles.signOut}><SignOutForm csrfToken={session.csrfToken} /></div>
      </section>
    </div>
  </main>;
}
