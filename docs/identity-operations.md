# Local identity operations

This is the step-3 reference deployment. Current verification and remaining acceptance work are recorded in [implementation progress](implementation-progress-2026-09-22.md). Home, NEXUS, recording and general account administration are later work.

## Deployment and configuration

Keycloak **26.7.4** is pinned by OCI index digest in `infra/compose.yaml`. The existing PostgreSQL/PostGIS server hosts separate `vantage` and `keycloak` databases. The `keycloak` login owns only the identity database and has no superuser, role-creation, database-creation or replication privileges. The idempotent `keycloak-db-init` job creates missing identity resources, validates existing ownership/passwords and never rotates credentials or recreates the application volume.

The VANTAGE container uses a separate restricted `vantage_app` runtime login through `ConnectionStrings:VantageRuntime`. It may read/write application workspaces and observation projections, and read the platform's identity/permission mapping. It cannot change that mapping, connect to the Keycloak database or administer schemas/roles. The existing `vantage` administrator credential is provided only to migrations, short provisioning jobs, tests and operator backups. After migrations, `app-db-init` grants only the listed application tables and verifies identity-database and identity-mapping denials before the application starts. Native development keeps the administrator and runtime connections in the protected development settings file; its application DbContext uses only the runtime connection.

Run from the repository root:

```sh
node scripts/init-local.mjs
sudo docker compose --env-file infra/.env -f infra/compose.yaml up -d --wait keycloak
```

For the native backend, after applying the EF migrations, provision/verify its runtime role explicitly:

```sh
sudo docker compose --env-file infra/.env -f infra/compose.yaml --profile container run --rm --no-deps app-db-init
```

This requires the database and completed `keycloak-db-init` from the command above. Compose application startup orders migrations and these grants automatically. A future migration adding runtime tables must explicitly extend the grant list; no blanket schema ownership is granted to the running application.

The initializer preserves existing values and adds only missing settings. It provisions an explicit internal user UUID and separate Keycloak subject UUID before any workspace ownership migration. Keep both stable. The public issuer is `http://localhost:8180/realms/vantage`; email and username are not ownership keys. A mismatch between local/Compose mappings is an error requiring recovery inspection.

Generated secret files are ignored by Git and restricted to the operator:

| File | Purpose |
| --- | --- |
| `infra/.env` | Database passwords, OIDC client secret and stable identity mapping |
| `backend/Vantage.Api/appsettings.Development.local.json` | Native backend connection and identity configuration |
| `infra/keycloak/.local/credentials.json` | Temporary bootstrap administrator and operator credentials |
| `infra/keycloak/.local/bootstrap.env` | Bootstrap administrator environment for Keycloak |
| `infra/keycloak/.local/import/vantage-realm.json` | One-time realm/client/operator import containing bootstrap secrets |

Directories use mode 0700 and files 0600. The pinned Keycloak image runs as UID 1000, matching this workstation's operator. A different host UID must arrange read access for the container UID without making the files world-readable. Do not print these files, include them in screenshots/reports, or use `docker compose config` without `--quiet`: expanded configuration contains secrets. Ordinary initialization does not overwrite an existing realm import. Keycloak startup imports the realm only when absent; restarting preserves enrolled credentials and settings. Changes to the committed template apply to new realms, so an existing realm needs a deliberate, reviewed admin operation. [Keycloak import behaviour](https://www.keycloak.org/server/importExport).

The committed `infra/keycloak/themes/vantage` login theme is mounted read-only into the reference container, and new realms select it through `loginTheme` in the realm template. Existing realms retain their current selection until an authorized administrator sets **Realm settings → Themes → Login theme** to `vantage` (or performs the equivalent Admin REST update). Recreate the Keycloak container after theme-file changes so its production theme cache cannot serve an older stylesheet; this preserves the database and enrolled credentials.

The confidential `vantage` client permits authorization code flow with **S256 PKCE**. Implicit flow, direct password grant, service accounts, public signup and wildcard redirects are disabled. Browser authentication uses required password and required OTP executions; OTP is not conditional on prior enrollment. Initial operator required actions are `UPDATE_PASSWORD` and `CONFIGURE_TOTP`.

The client's default scopes are `basic` and `profile`. Keycloak's built-in `basic` scope supplies its `sub` mapper, including the subject in token-introspection responses; `profile` supplies standard profile claims. VANTAGE continues to require an active response with the expected issuer, subject and client ID. Missing claims are rejected rather than weakening subject validation. See [Keycloak's scope/subject migration notes](https://github.com/keycloak/keycloak/blob/26.7.4/docs/documentation/upgrading/topics/changes/changes-25_0_0.adoc#new-default-client-scope-basic).

For an existing client missing `basic`, an authorized administrator can add that existing built-in scope as **Default** under **Clients → vantage → Client scopes**, preserving `profile` and other deliberate configuration. The equivalent admin API operation is PUT `/admin/realms/vantage/clients/{client-uuid}/default-client-scopes/{basic-scope-uuid}` using IDs looked up from the realm's clients/client-scopes endpoints. Verify the client's default-scope list afterward, then start a fresh sign-in. Updating the template or restarting Keycloak does not modify an existing realm.

Email is optional for this local operator; no address is invented and email login/recovery is not configured. The realm template imports Keycloak's declarative user profile through `components`, preserving the pinned version's attribute validators, permissions and required names while omitting only the email attribute's `required` property. Profile verification remains enabled. An empty `required.roles` array is not equivalent: in Keycloak 26.7.4, empty roles and scopes mean always required. See the [pinned default profile](https://github.com/keycloak/keycloak/blob/26.7.4/services/src/main/resources/org/keycloak/userprofile/config/keycloak-default-user-profile.json), [requirement semantics](https://github.com/keycloak/keycloak/blob/26.7.4/core/src/main/java/org/keycloak/representations/userprofile/config/UPAttributeRequired.java) and [upstream component-import fixture](https://github.com/keycloak/keycloak/blob/26.7.4/tests/base/src/test/resources/org/keycloak/tests/model/import-userprofile.json).

For an existing realm created before this template change, an authorized Keycloak administrator can use **Realm settings → User profile → email** to make the attribute optional. The equivalent [Admin REST operation](https://www.keycloak.org/docs-api/latest/rest-api/index.html#_users) is to GET `/admin/realms/vantage/users/profile`, remove only `attributes[name=email].required`, then PUT the complete otherwise unchanged profile to that endpoint. Read it back to verify. Keep the admin bearer token in memory/private tooling, preserve other profile rules and the password/TOTP flow, and do not recreate the realm or operator. Restart/import does not update an existing realm.

## Initial operator enrollment

1. Open the protected credentials file in a trusted local editor to obtain the temporary password for username `operator`. Do not paste credentials into this task, terminal history or documentation.
2. Open VANTAGE at [http://127.0.0.1:5080](http://127.0.0.1:5080), choose sign in, and complete Keycloak's password change and authenticator-app TOTP enrollment. Keep the QR code, seed and one-time codes private; do not capture the enrollment page in test screenshots or traces.
3. Verify a fresh sign-in with the new password and TOTP, then sign out through VANTAGE. The initial operator's issuer/subject must match the configured mapping; successful provider login alone does not grant VANTAGE access.

The temporary password becomes invalid after enrollment. The bootstrap files are not an export of subsequently changed passwords or TOTP credentials. The identity database is the authoritative credential store. The bootstrap administrator is a temporary Keycloak installation account; establish and protect an appropriate recovery administrator in Keycloak and remove the bootstrap account when recovery administration is verified. Do not confuse either administrator with VANTAGE ownership.

## Origins, development and HTTPS

Only loopback host ports are published: application 5080, Keycloak 8180, PostgreSQL 54329. Keycloak's readiness port 9000 remains inside its container/network. `start` runs with HTTP explicitly enabled for this loopback setup. The application opts into `Identity:AllowLoopbackHttp=true`; this is not a remote hosting configuration. Remote access requires a separate HTTPS deployment, secure cookies, an HTTPS issuer/public origin and exact updated callbacks.

| Setting | Native backend | Compose backend |
| --- | --- | --- |
| `Identity:Authority` | `http://localhost:8180/realms/vantage` | Same public issuer |
| `Identity:MetadataAddress` | `http://localhost:8180/realms/vantage/.well-known/openid-configuration` | `http://keycloak:8080/realms/vantage/.well-known/openid-configuration` |
| `Identity:IntrospectionEndpoint` | `http://localhost:8180/realms/vantage/protocol/openid-connect/token/introspect` | Same path at `http://keycloak:8080` |
| `Identity:RevocationEndpoint` | `http://localhost:8180/realms/vantage/protocol/openid-connect/revoke` | Same path at `http://keycloak:8080` |
| `Identity:ClientId` | `vantage` | `vantage` |
| `Identity:PublicOrigin` | `http://127.0.0.1:5080` by default | `http://127.0.0.1:5080` |

Keycloak keeps the public issuer fixed and dynamically resolves backchannel URLs on its private network. Browser authorization/logout stays at `localhost:8180`; the backend fetches metadata, tokens and checks through the configured reachable address. [Keycloak hostname configuration](https://www.keycloak.org/server/hostname).

For native Vite development, stop the container application occupying port 5080, start Keycloak as above, then run the backend with the browser's canonical Vite origin:

```sh
ASPNETCORE_ENVIRONMENT=Development Identity__PublicOrigin=http://127.0.0.1:5173 dotnet run --project backend/Vantage.Api --no-launch-profile -- --urls http://127.0.0.1:5080
```

Run `npm --prefix frontend run dev` separately and open [http://127.0.0.1:5173](http://127.0.0.1:5173). Vite must proxy authentication callback and account routes as well as `/api` and `/hubs`; see the checked-in Vite configuration. Exact allowed callbacks are `/signin-oidc` and post-logout `/signout-callback-oidc` at ports 5080 and 5173. Other hostnames/ports need an explicit provider-client configuration change; changing `VANTAGE_HTTP_PORT` alone is insufficient.

## Session termination and revocation

The reference settings use a fixed **30-minute** VANTAGE session, a **15-second** backend validation interval and **3-second** provider-request timeout. Keycloak's realm session idle/maximum lifespan is also 30 minutes. The conservative backend cleanup bound is **25 seconds**, including another in-flight check and scheduler margin. Backend checks enforce local user access and provider session validity. Read the implementation progress record for the measured results and completed negative checks; configuration alone is not evidence that a flow passed.

VANTAGE sign-out terminates its server session and affected live/background leases, then performs provider sign-out. A privileged operator can revoke the user's sessions in Keycloak's administration console; backend checks must then stop affected demand within the documented bound. Disabling VANTAGE access also revokes applicable demand. A provider failure does not create anonymous access. Closing one pane releases only that pane's demand. Restarting/signing in does not restart recording; the implemented cancellation interface is a foundation for later recording, not a recording UI.

## Protected identity backup

An ordinary VANTAGE backup contains application data and ownership IDs. It must exclude Keycloak's database, passwords, TOTP material, client secrets and session tokens. Keep the identity recovery set separately in protected operator-controlled storage. A Keycloak database dump contains credential material and needs the same protection as credentials. Its retention is independent of the application cache/recording budget.

The following creates a separate local recovery set without printing its contents:

```sh
umask 077
identity_backup="artifacts/protected-identity-backup/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$identity_backup"
sudo docker compose --env-file infra/.env -f infra/compose.yaml exec -T db pg_dump -U vantage -d keycloak --format=custom > "$identity_backup/keycloak.dump"
tar -czf "$identity_backup/local-configuration.tar.gz" infra/.env infra/keycloak/.local backend/Vantage.Api/appsettings.Development.local.json
chmod 600 "$identity_backup/keycloak.dump" "$identity_backup/local-configuration.tar.gz"
```

Copy this set to encrypted operator-controlled backup storage, retain the original identity mapping, and verify its restore separately. Do not upload it as a task artifact. A bootstrap realm JSON alone cannot recover changed passwords, TOTP credentials or the complete provider state. Keycloak's own realm export also has recovery limitations; a database recovery set is used here. [Keycloak export limitations](https://www.keycloak.org/server/importExport).

## Recovery without replacing the application volume

Validate recovery in an isolated identity database first. These commands preserve both existing databases; set `identity_backup` to the protected set to restore. Stop application/Keycloak before an actual identity cutover, since active credentials and sessions are affected.

```sh
sudo docker compose --env-file infra/.env -f infra/compose.yaml exec -T db createdb -U vantage -O keycloak keycloak_recovery
sudo docker compose --env-file infra/.env -f infra/compose.yaml exec -T db psql -U vantage -d postgres -v ON_ERROR_STOP=1 -c 'REVOKE ALL ON DATABASE keycloak_recovery FROM PUBLIC'
sudo docker compose --env-file infra/.env -f infra/compose.yaml exec -T db pg_restore -U vantage --role=keycloak -d keycloak_recovery --no-owner --no-privileges --exit-on-error < "$identity_backup/keycloak.dump"
sudo docker compose --env-file infra/.env -f infra/compose.yaml exec -T db psql -U vantage -d postgres -v ON_ERROR_STOP=1 -c "SELECT NOT has_database_privilege('vantage_app', 'keycloak_recovery', 'CONNECT') AS runtime_access_denied"
```

The access check must return `t` before cutover. The normal provisioning job checks the original `keycloak` database; this separate check protects the recovery database.

The fixed recovery database name must be unused; choose a new explicit name for a later drill. Never drop the live `keycloak`, `vantage` databases or `vantage_database` volume as a shortcut. For a controlled cutover, put this temporary Compose override in ignored `infra/keycloak/.local/recovery-compose.yaml`:

```yaml
services:
  keycloak:
    environment:
      KC_DB_URL: jdbc:postgresql://db:5432/keycloak_recovery
```

Then stop the affected services and start with the override:

```sh
sudo docker compose --env-file infra/.env -f infra/compose.yaml --profile container stop app keycloak
sudo docker compose --env-file infra/.env -f infra/compose.yaml -f infra/keycloak/.local/recovery-compose.yaml up -d --wait keycloak
sudo docker compose --env-file infra/.env -f infra/compose.yaml -f infra/keycloak/.local/recovery-compose.yaml --profile container up -d app
```

Verify real password/TOTP login, the restored operator subject and the unchanged VANTAGE issuer/subject mapping before declaring recovery successful. App restart invalidates its prior backend sessions; retained work remains. Keep the original identity database for rollback. Continue including the override until deliberately adopting the recovered database in local configuration. Restoring old backups can restore old credentials or records; explicitly revoke provider sessions after recovery and review credential changes made since the backup.

If identity credentials are unavailable, recover through a verified Keycloak administrator: reset the user's password and require TOTP re-enrollment while preserving their existing subject UUID. Do not delete/recreate the user or assign work to a new first login. Loss of the issuer/subject mapping requires an explicit verified ownership-remapping operation; automatic reassignment is prohibited and no generic remapping tool is implemented in this milestone. Full clean-install and identity recovery acceptance remains a later required check.
