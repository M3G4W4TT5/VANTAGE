#!/bin/sh
set -eu
# Run only after migrations. The administrator connection is confined to this short provisioning job.
# No tracing or credentials in command arguments/output.
result=$(mktemp)
chmod 600 "$result"
trap 'rm -f "$result"' EXIT
if ! psql -X -q -v ON_ERROR_STOP=1 -h db -U vantage -d vantage >"$result" 2>&1 <<'SQL'
\getenv runtime_password VANTAGE_APP_DB_PASSWORD
SELECT format('CREATE ROLE vantage_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT PASSWORD %L', :'runtime_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vantage_app')
\gexec
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vantage_app' AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR NOT rolcanlogin))
    OR EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member WHERE r.rolname = 'vantage_app')
    OR EXISTS (SELECT 1 FROM pg_database d JOIN pg_roles r ON d.datdba = r.oid WHERE r.rolname = 'vantage_app')
    OR EXISTS (SELECT 1 FROM pg_namespace n JOIN pg_roles r ON n.nspowner = r.oid WHERE r.rolname = 'vantage_app')
    OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_roles r ON c.relowner = r.oid WHERE r.rolname = 'vantage_app') THEN
    RAISE EXCEPTION 'Existing runtime role has incompatible ownership or privileges';
  END IF;
END $$;
GRANT CONNECT ON DATABASE vantage TO vantage_app;
REVOKE ALL ON SCHEMA platform FROM vantage_app;
GRANT USAGE ON SCHEMA platform TO vantage_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.workspaces, platform.observations,
  platform.current_aircraft, platform.current_earthquakes, platform.earthquake_feeds TO vantage_app;
REVOKE ALL ON platform.users FROM vantage_app;
GRANT SELECT ON platform.users TO vantage_app;
SQL
then
  echo 'Runtime database provisioning failed. Verify completed migrations and local role configuration; existing data and credentials were preserved.' >&2
  exit 1
fi
if ! PGPASSWORD="$VANTAGE_APP_DB_PASSWORD" psql -X -q -v ON_ERROR_STOP=1 -h db -U vantage_app -d vantage -c 'SELECT count(*) FROM platform.users' >"$result" 2>&1; then
  echo 'Runtime database credentials do not match the existing role. Restore protected configuration; no password was rotated.' >&2
  exit 1
fi
if PGPASSWORD="$VANTAGE_APP_DB_PASSWORD" psql -X -q -v ON_ERROR_STOP=1 -h db -U vantage_app -d keycloak -c 'SELECT 1' >"$result" 2>&1; then
  echo 'Runtime role unexpectedly connects to the identity database. Verify restricted identity database grants before starting VANTAGE.' >&2
  exit 1
fi
if PGPASSWORD="$VANTAGE_APP_DB_PASSWORD" psql -X -q -v ON_ERROR_STOP=1 -h db -U vantage_app -d vantage -c 'UPDATE platform.users SET "DisplayName" = "DisplayName" WHERE false' >"$result" 2>&1; then
  echo 'Runtime role unexpectedly has write access to identity mappings. Verify grants before starting VANTAGE.' >&2
  exit 1
fi
echo 'Runtime database role is ready; identity database access and identity-mapping mutation are denied.'
