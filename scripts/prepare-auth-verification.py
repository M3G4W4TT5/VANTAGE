#!/usr/bin/env python3
"""Provision/clean an isolated temporary real-provider verification identity, never the operator."""
import json, pathlib, secrets, subprocess, sys, urllib.request, urllib.parse, uuid, os
root=pathlib.Path(__file__).resolve().parents[1]
os.umask(0o077)
folder=root/'artifacts/private-auth'; folder.mkdir(mode=0o700,parents=True,exist_ok=True)
account=folder/'account.json'
credentials=json.loads((root/'infra/keycloak/.local/credentials.json').read_text())
base='http://localhost:8180'
data=urllib.parse.urlencode({'grant_type':'password','client_id':'admin-cli','username':credentials['bootstrapAdminUsername'],'password':credentials['bootstrapAdminPassword']}).encode()
with urllib.request.urlopen(urllib.request.Request(base+'/realms/master/protocol/openid-connect/token',data=data),timeout=10) as response: token=json.load(response)['access_token']
def admin(method,path,body=None):
    request=urllib.request.Request(base+'/admin/realms/vantage/'+path,data=None if body is None else json.dumps(body).encode(),method=method,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    with urllib.request.urlopen(request,timeout=10) as response:
        content=response.read()
        return json.loads(content) if content else None

def sql(text):
    subprocess.run(['sudo','-n','docker','exec','-i','vantage-db-1','psql','-U','vantage','-d','vantage','-q','-v','ON_ERROR_STOP=1'],input=text,text=True,check=True,stdout=subprocess.DEVNULL)
if '--cleanup' in sys.argv:
    if not account.exists(): print('No verification identity exists.'); sys.exit(0)
    a=json.loads(account.read_text()); assert a['username'].startswith('verification-') and a['userId'].startswith('verification-')
    admin('DELETE','users/'+a['subject'])
    sql(f'''DELETE FROM platform.workspaces WHERE "OwnerId"='{a['userId']}'; DELETE FROM platform.users WHERE "Id"='{a['userId']}';''')
    for p in folder.iterdir():
        if p.is_file(): p.unlink()
    print('Removed only temporary provider identity, owned verification workspaces and ephemeral authentication files. Operator preserved.')
else:
    if account.exists(): print('Existing protected verification identity retained.'); sys.exit(0)
    identifier=uuid.uuid4().hex; username='verification-'+identifier[:12]
    a={'username':username,'password':'Vtg!2'+secrets.token_hex(24),'userId':'verification-'+identifier}
    admin('POST','users',{'username':username,'enabled':True,'firstName':'Verification','lastName':'Temporary','requiredActions':['CONFIGURE_TOTP'],'credentials':[{'type':'password','temporary':False,'value':a['password']}]})
    users=admin('GET','users?exact=true&username='+username); assert len(users)==1
    a['subject']=users[0]['id']
    issuer=json.loads((root/'backend/Vantage.Api/appsettings.Development.local.json').read_text())['Identity']['Authority']
    assert issuer=='http://localhost:8180/realms/vantage'
    sql(f'''INSERT INTO platform.users ("Id","Issuer","Subject","DisplayName","Enabled","CanUseData","AccessRevision") VALUES ('{a['userId']}','{issuer}','{a['subject']}','Temporary verification',true,true,1);''')
    account.write_text(json.dumps(a)+'\n')
    print('Temporary real-provider verification identity created; secrets kept in ignored mode-0600 account.json. Operator enrollment unchanged.')
