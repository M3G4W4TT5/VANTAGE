#!/bin/sh
set -eu
# No shell tracing: credentials are read by psql from environment, never command arguments.
# The existing PostgreSQL server/volume and VANTAGE database are retained.
result=$(mktemp)
chmod 600 "$result"
trap 'rm -f "$result"' EXIT
if ! psql -X -q -v ON_ERROR_STOP=1 -h db -U vantage -d postgres >"$result" 2>&1 <<'SQL'
\getenv keycloak_password KEYCLOAK_DB_PASSWORD
SELECT format('CREATE ROLE keycloak LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'keycloak_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'keycloak')
\gexec
SELECT 'CREATE DATABASE keycloak OWNER keycloak'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'keycloak')
\gexec
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'keycloak' AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR NOT rolcanlogin))
    OR NOT EXISTS (SELECT 1 FROM pg_database d JOIN pg_roles r ON d.datdba = r.oid WHERE d.datname = 'keycloak' AND r.rolname = 'keycloak') THEN
    RAISE EXCEPTION 'Existing Keycloak database or role has incompatible ownership or privileges';
  END IF;
END $$;
REVOKE ALL ON DATABASE keycloak FROM PUBLIC;
SQL
then
  echo 'Keycloak database provisioning failed. Existing data and credentials were preserved; verify local database ownership/configuration.' >&2
  exit 1
fi
# Check an existing role's password without altering it. Suppress database error details.
if ! PGPASSWORD="$KEYCLOAK_DB_PASSWORD" psql -X -q -v ON_ERROR_STOP=1 -h db -U keycloak -d keycloak -c 'SELECT 1' >"$result" 2>&1; then
  echo 'Keycloak database credentials do not match the existing role. Restore the protected configuration; no password was rotated.' >&2
  exit 1
fi
echo 'Keycloak database and restricted owner are ready; existing credentials were preserved.'
