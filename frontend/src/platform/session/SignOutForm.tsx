import { Button } from '@blueprintjs/core';
import { sessionService } from './SessionService';

export function SignOutForm({ csrfToken }: { csrfToken: string }) {
  return <form method="post" action="/auth/logout" onSubmit={event => {
    event.preventDefault();
    // Submit the native navigation before unmounting the authenticated interface.
    event.currentTarget.submit();
    sessionService.clear('Signing out…', 'signing-out');
  }}>
    <input type="hidden" name="__RequestVerificationToken" value={csrfToken} />
    <Button type="submit" minimal icon="log-out">Sign out</Button>
  </form>;
}
