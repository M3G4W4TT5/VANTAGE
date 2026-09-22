#!/usr/bin/env python3
"""Protected, quiesced local VANTAGE data backup. Never includes the Keycloak database."""
import datetime
import hashlib
import json
import os
import pathlib
import subprocess


def capture_fingerprints(psql):
    """Capture ordered columns so later additive migrations do not change original fingerprints."""
    def query(sql):
        return subprocess.check_output(psql + ['-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], text=True).strip()

    def literal(value):
        return "'" + value.replace("'", "''") + "'"

    def identifier(value):
        return '"' + value.replace('"', '""') + '"'

    tables = json.loads(query("""SELECT coalesce(json_agg(t ORDER BY table_schema, table_name), '[]'::json)::text
      FROM (SELECT table_schema, table_name FROM information_schema.tables
        WHERE table_schema IN ('platform','atlas') AND table_type='BASE TABLE') t"""))
    fingerprints = []
    for table in tables:
        schema, name = table['table_schema'], table['table_name']
        columns = json.loads(query(f'''SELECT json_agg(column_name ORDER BY ordinal_position)::text
          FROM information_schema.columns WHERE table_schema={literal(schema)} AND table_name={literal(name)}'''))
        selected = ', '.join(identifier(column) for column in columns)
        sql = f'''SELECT count(*), md5(coalesce(string_agg(row_to_json(t)::text, E'\\n' ORDER BY row_to_json(t)::text),''))
          FROM (SELECT {selected} FROM {identifier(schema)}.{identifier(name)}) t'''
        count, digest = query(sql).split('|')
        fingerprints.append({'schema': schema, 'table': name, 'columns': columns, 'rows': int(count), 'contentMd5': digest})
    return fingerprints


def main():
    root = pathlib.Path(__file__).resolve().parents[1]
    os.umask(0o077)
    destination = root / 'artifacts/private-backups' / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    destination.mkdir(parents=True, mode=0o700)
    compose = ['sudo', '-n', 'docker', 'compose', '--env-file', str(root/'infra/.env'), '-f', str(root/'infra/compose.yaml')]
    subprocess.run(compose + ['stop', 'app'], check=True, stdout=subprocess.DEVNULL)
    docker = ['sudo', '-n', 'docker', 'exec', 'vantage-db-1']

    def docker_to_file(args, path):
        with path.open('wb') as output:
            subprocess.run(docker + args, check=True, stdout=output)

    docker_to_file(['pg_dump', '-U', 'vantage', '-d', 'vantage', '-Fc', '--no-owner', '--no-privileges'], destination/'vantage.dump')
    docker_to_file(['pg_dump', '-U', 'vantage', '-d', 'vantage', '--schema-only', '--no-owner', '--no-privileges'], destination/'schema.sql')
    fingerprints = capture_fingerprints(docker + ['psql', '-U', 'vantage', '-d', 'vantage'])
    manifest = {
        'manifestVersion': 2,
        'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
        'tables': fingerprints,
        'files': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in destination.iterdir()},
        'exclusions': ['Keycloak database', 'local secret configuration', 'session tickets/tokens'],
        'binaryAssets': 'No persistent user binary assets implemented at this checkpoint.',
    }
    (destination/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(f'Protected backup: {destination.relative_to(root)}. App remains stopped; database volume preserved.')
    print('Table counts: ' + ', '.join('{}={}'.format(t['table'], t['rows']) for t in fingerprints))


if __name__ == '__main__':
    main()
