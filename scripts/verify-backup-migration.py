#!/usr/bin/env python3
"""Restore an existing backup into an isolated DB, migrate, compare identities/content, then drop it."""
import json, os, pathlib, subprocess, sys, uuid
root = pathlib.Path(__file__).resolve().parents[1]
backup = pathlib.Path(sys.argv[1]).resolve()
manifest = json.loads((backup/'manifest.json').read_text())
if manifest.get('manifestVersion', 1) not in (1, 2):
    raise SystemExit('Unsupported backup manifest version; no database was changed.')
name = 'vantage_migration_verify_' + uuid.uuid4().hex
base = ['sudo','-n','docker','exec','vantage-db-1']
def literal(value):
    return "'" + value.replace("'", "''") + "'"
def identifier(value):
    return '"' + value.replace('"', '""') + '"'
def query(sql):
    return subprocess.check_output(base+['psql','-U','vantage','-d',name,'-At','-v','ON_ERROR_STOP=1','-c',sql],text=True).strip()
def columns(schema, table):
    return json.loads(query(f'''SELECT coalesce(json_agg(column_name ORDER BY ordinal_position), '[]'::json)::text
      FROM information_schema.columns WHERE table_schema={literal(schema)} AND table_name={literal(table)}'''))
def fingerprint(schema, table, original_columns):
    selected = ', '.join(identifier(column) for column in original_columns)
    return query(f'''SELECT count(*), md5(coalesce(string_agg(row_to_json(t)::text, E'\\n' ORDER BY row_to_json(t)::text),''))
      FROM (SELECT {selected} FROM {identifier(schema)}.{identifier(table)}) t''')
subprocess.run(base+['createdb','-U','vantage',name],check=True)
try:
    with (backup/'vantage.dump').open('rb') as f:
        subprocess.run(['sudo','-n','docker','exec','-i','vantage-db-1','pg_restore','-U','vantage','-d',name,'--no-owner','--no-privileges','--exit-on-error'],stdin=f,check=True)
    original_columns = {}
    for table in manifest['tables']:
        key = (table['schema'], table['table'])
        restored = columns(*key)
        # Legacy manifests lack columns: derive them from the restored schema BEFORE migrating.
        # This also supports old-format backups taken after OwnerId was already introduced.
        captured = table.get('columns', restored)
        if not restored or captured != restored:
            raise SystemExit(f"Restored column metadata differs from the backup manifest for {table['table']}.")
        if manifest.get('manifestVersion', 1) == 2 and 'columns' not in table:
            raise SystemExit(f"Version 2 backup is missing original columns for {table['table']}.")
        expected = str(table['rows'])+'|'+table['contentMd5']
        if fingerprint(*key, captured) != expected:
            raise SystemExit(f"Restored baseline differs from the backup manifest for {table['table']}.")
        original_columns[key] = captured
    settings=json.loads((root/'backend/Vantage.Api/appsettings.Development.local.json').read_text())
    connection=settings['ConnectionStrings']['Vantage'].replace('Database=vantage;',f'Database={name};')
    assert f'Database={name};' in connection
    env={**os.environ,'ASPNETCORE_ENVIRONMENT':'Development','ConnectionStrings__Vantage':connection}
    result=subprocess.run(['dotnet','run','--project','backend/Vantage.Api','--no-launch-profile','--','--migrate'],cwd=root,env=env,capture_output=True,text=True)
    if result.returncode:
        print('Isolated migration failed; inspect locally without disclosing configuration.',file=sys.stderr)
        sys.exit(1)
    # Explicit compatibility map for the platform-ownership migration; other tables keep their schema.
    moved = {('atlas', table) for table in ('current_aircraft', 'current_earthquakes', 'earthquake_feeds')}
    for table in manifest['tables']:
        key = (table['schema'], table['table'])
        schema = 'platform' if key in moved else table['schema']
        # Include OwnerId whenever it existed in the backup. Exclude only genuinely new columns.
        result = fingerprint(schema, table['table'], original_columns[key])
        if result != str(table['rows'])+'|'+table['contentMd5']:
            raise SystemExit(f"Original data changed during migration for {table['table']}.")
    if query("SELECT to_regclass('platform.connections') IS NOT NULL") == 't' and not any(
            t['schema'] == 'platform' and t['table'] == 'connections' for t in manifest['tables']):
        checks = {
            'seeded connections': "SELECT count(*) = 2 FROM platform.connections WHERE \"Id\" IN ('legacy-aircraft','legacy-earthquakes')",
            'seeded datasets': "SELECT count(*) = 2 FROM platform.datasets WHERE \"ConnectionId\" IN ('legacy-aircraft','legacy-earthquakes')",
            'aircraft projection linkage': "SELECT count(*) = 0 FROM platform.current_aircraft WHERE \"ConnectionId\" <> 'legacy-aircraft'",
            'earthquake projection linkage': "SELECT count(*) = 0 FROM platform.current_earthquakes WHERE \"ConnectionId\" <> 'legacy-earthquakes'",
            'feed linkage': "SELECT count(*) = 0 FROM platform.earthquake_feeds WHERE \"ConnectionId\" <> 'legacy-earthquakes'",
            'observation delivery backfill': """SELECT (SELECT count(*) FROM platform.observation_deliveries) =
                (SELECT count(*) FROM platform.observations WHERE (\"DataType\"='aircraft' AND \"SourceId\"='adsb-lol')
                OR (\"DataType\"='earthquake' AND \"SourceId\"='usgs-earthquakes'))""",
        }
        for label, statement in checks.items():
            if query(statement) != 't': raise SystemExit(f'Step-5 migration check failed: {label}.')
    print('PASS: isolated restored database migrated; every original row and field preserved across all tables.')
finally:
    subprocess.run(base+['dropdb','-U','vantage',name],check=True)
