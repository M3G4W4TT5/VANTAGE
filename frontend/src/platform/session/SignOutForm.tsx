import { Button } from '@blueprintjs/core';

export function SignOutForm({ csrfToken }: { csrfToken: string }) {
  return <form method="post" action="/auth/logout">
    <input type="hidden" name="__RequestVerificationToken" value={csrfToken} />
    <Button type="submit" minimal icon="log-out">Sign out</Button>
  </form>;
}
