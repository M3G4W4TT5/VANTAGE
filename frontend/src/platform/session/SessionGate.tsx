import { useEffect, useState, useSyncExternalStore } from 'react';
import { AnchorButton, Button, NonIdealState, Spinner } from '@blueprintjs/core';
import type { AppRegistry } from '../registry/AppRegistry';
import { VantageShell } from '../shell/VantageShell';
import { WorkspaceService } from '../workspaces/WorkspaceService';
import { sessionBoundary, sessionService } from './SessionService';
import type { AuthenticatedSession } from './SessionService';
import { SignOutForm } from './SignOutForm';
import styles from './SessionGate.module.css';

function AuthenticatedShell({ registry, session }: { registry: AppRegistry; session: AuthenticatedSession }) {
  const [workspaces] = useState(() => new WorkspaceService(session.user.id));
  useEffect(() => workspaces.acquire(), [workspaces]);
  return <VantageShell registry={registry} workspaces={workspaces} session={session} />;
}
export function SessionGate({ registry }: { registry: AppRegistry }) {
  const snapshot = useSyncExternalStore(sessionService.subscribe, sessionService.getSnapshot);
  useEffect(() => {
    void sessionService.refresh();
    const timer = setInterval(() => void sessionService.refresh(), 10000);
    const focus = () => void sessionService.refresh();
    window.addEventListener('focus', focus);
    return () => { clearInterval(timer); window.removeEventListener('focus', focus); };
  }, []);
  useEffect(() => {
    if (snapshot.session?.user.canUseData) return;
    document.documentElement.dataset.theme = 'dark'; document.body.classList.add('bp6-dark');
  }, [snapshot.session?.user.canUseData]);
  if (snapshot.session?.user.canUseData) return <AuthenticatedShell key={sessionBoundary(snapshot.session)} registry={registry} session={snapshot.session} />;
  const busy = snapshot.status === 'loading' || snapshot.status === 'signing-out';
  return <div className={styles.entry}>
    <header className={styles.header}>
      <img className={styles.mark} src="/brand/vantage-mark-white.svg" alt="" />
      <img className={styles.wordmark} src="/brand/vantage-wordmark-white.svg" alt="VANTAGE" />
    </header>
    <main className={styles.content}>
      <NonIdealState icon={busy ? <Spinner size={24} /> : 'lock'}
        title={snapshot.status === 'loading' ? 'Checking your session' : snapshot.status === 'signing-out' ? 'Signing out' : snapshot.session ? 'Data access unavailable' : 'Sign in to VANTAGE'}
        description={snapshot.session ? `${snapshot.session.user.displayName} does not currently have access to shared data.` :
          (new URLSearchParams(location.search).get('auth') === 'failed' ? 'Sign-in could not be completed. Check provider availability and your VANTAGE access, then retry.' : snapshot.message) ?? 'Use your operator account and authenticator app to open your saved work.'}
        action={busy ? undefined : snapshot.session ? <SignOutForm csrfToken={snapshot.session.csrfToken} /> : <div className={styles.actions}>
          <AnchorButton href="/auth/login" intent="primary">Sign in</AnchorButton>
          {snapshot.status === 'unavailable' && <Button onClick={() => void sessionService.refresh()}>Retry</Button>}
        </div>} />
    </main>
  </div>;
}
