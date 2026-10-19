#!/usr/bin/env python3
"""External HTTP/raw-SQL oracle. No product helpers; synthetic local users only."""
import argparse
import base64
import concurrent.futures
import hashlib
import hmac
import http.server
import threading
import json
import os
from pathlib import Path
import secrets
import subprocess
import time
import unittest
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[2]
def source_digest():
    h=hashlib.sha256()
    for base in ('modules/invoice_ocr','supabase/migrations','tests/invoice-acceptance'):
        for p in sorted((ROOT/base).rglob('*')):
            if p.is_file() and '__pycache__' not in p.parts:
                h.update(str(p.relative_to(ROOT)).encode()+b'\0'+p.read_bytes()+b'\0')
    return h.hexdigest()

MIGRATION = ROOT / 'modules/invoice_ocr/db/0004_invoice_ocr_commands.sql'
DOCKER = os.environ.get('DOCKER', 'docker')
A = '10000000-0000-4000-8000-000000000001'
B = '10000000-0000-4000-8000-000000000002'

def ident(): return str(uuid.uuid4())
def run(*args, data=None):
    p = subprocess.run(args, input=data, text=True, capture_output=True, timeout=90)
    if p.returncode: raise RuntimeError(p.stderr[-3000:])
    return p.stdout.strip()

class Stack:
    def __init__(self):
        self.name = 'ios-invoice-' + secrets.token_hex(5)
        self.db = self.name + '-db'; self.api = self.name + '-api'
        self.secret = secrets.token_hex(32)
        self.password = secrets.token_hex(24)
        self.url = None
        self.migration_source = MIGRATION.read_text()
    def sql(self, sql):
        return run(DOCKER, 'exec', '-i', '-e', 'PGPASSWORD='+self.password, self.db, 'psql', '-h', '127.0.0.1', '-XAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', data=sql)
    def setup(self):
        run(DOCKER, 'network', 'create', self.name)
        run(DOCKER, 'run', '-d', '--name', self.db, '--network', self.name,
            '-e', 'POSTGRES_PASSWORD='+self.password, 'postgres:17-bookworm')
        for _ in range(90):
            if subprocess.run([DOCKER,'exec',self.db,'pg_isready','-h','127.0.0.1','-U','postgres'],capture_output=True).returncode == 0: break
            time.sleep(.3)
        else: raise RuntimeError('PostgreSQL did not become ready')
        self.sql(f"""
          create role anon nologin; create role authenticated nologin;
          create role service_role nologin bypassrls;
          create role authenticator login noinherit password '{self.password}';
          grant anon, authenticated, service_role to authenticator;
          create schema auth; create schema storage;
          create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{{}}');
          create function auth.uid() returns uuid language sql stable as
            $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
          grant usage on schema public,auth,storage to anon,authenticated,service_role;
          grant execute on function auth.uid() to anon,authenticated,service_role;
          create table storage.buckets(id text primary key,name text,public boolean);
          create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
          alter table storage.objects enable row level security;
          create function storage.foldername(text) returns text[] language sql immutable as
            $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
          alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
          grant select,insert,update,delete on storage.objects to authenticated;
        """)
        files = sorted((ROOT/'supabase/migrations').glob('*.sql'))
        files += sorted((ROOT/'modules/invoice_ocr/db').glob('000[123]*.sql'))
        for f in files: self.sql(f.read_text())
        self.sql(f"""insert into auth.users(id,email) values ('{A}','a@example.invalid'),('{B}','b@example.invalid');
          insert into core_user_modules(user_id,module_id) values ('{A}','invoice_ocr'),('{B}','invoice_ocr');
          insert into invoice_ocr_invoices(id,user_id,file_path,file_mime,vendor,total_amount,status)
            values ('30000000-0000-4000-8000-000000000001','{A}','{A}/legacy.pdf','application/pdf','Legacy',42,'approved');
          insert into invoice_ocr_line_items(invoice_id,user_id,description,total_amount)
            values ('30000000-0000-4000-8000-000000000001','{A}','Legacy line',42);""")
        self.sql(self.migration_source); self.sql(self.migration_source)
        assert self.sql("select vendor||':'||revision from invoice_ocr_invoices") == 'Legacy:0'
        assert self.sql("select description from invoice_ocr_line_items") == 'Legacy line'
        run(DOCKER,'run','-d','--name',self.api,'--network',self.name,'-p','127.0.0.1::3000',
            '-e',f'PGRST_DB_URI=postgresql://authenticator:{self.password}@{self.db}:5432/postgres',
            '-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_DB_SCHEMAS=public',
            '-e','PGRST_JWT_SECRET='+self.secret,'postgrest/postgrest:v12.2.3')
        port=run(DOCKER,'port',self.api,'3000/tcp').rsplit(':',1)[1]
        self.url='http://127.0.0.1:'+port
        for _ in range(100):
            try:
                if self.http('GET','/core_modules',actor=A)[0] == 200: break
            except OSError: pass
            time.sleep(.2)
        else: raise RuntimeError('PostgREST did not become ready')
    def token(self, actor=A, role='authenticated'):
        def b64(v): return base64.urlsafe_b64encode(v).rstrip(b'=')
        claims={'role':role,'exp':int(time.time())+3600}
        if actor: claims['sub']=actor
        data=b64(b'{"alg":"HS256","typ":"JWT"}')+b'.'+b64(json.dumps(claims).encode())
        return (data+b'.'+b64(hmac.new(self.secret.encode(),data,hashlib.sha256).digest())).decode()
    def http(self, method, path, body=None, actor=A, role='authenticated'):
        headers={'Content-Type':'application/json','Prefer':'return=representation'}
        if role: headers['Authorization']='Bearer '+self.token(actor,role)
        req=urllib.request.Request(self.url+path, data=None if body is None else json.dumps(body).encode(),method=method,headers=headers)
        try:
            with urllib.request.urlopen(req,timeout=15) as r:
                raw=r.read(); return r.status,json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            raw=e.read(); return e.code,json.loads(raw) if raw else None
    def cleanup(self):
        inspect=subprocess.run([DOCKER,'inspect','--format','{{json .Mounts}}',self.db],capture_output=True,text=True)
        volumes=[m['Name'] for m in json.loads(inspect.stdout or '[]') if m['Type']=='volume'] if inspect.returncode==0 else []
        for name in (self.api,self.db):
            subprocess.run([DOCKER,'rm','-f','-v',name],capture_output=True)
        subprocess.run([DOCKER,'network','rm',self.name],capture_output=True)
        containers=run(DOCKER,'ps','-aq','--filter','name='+self.name)
        networks=run(DOCKER,'network','ls','-q','--filter','name='+self.name)
        removed=all(subprocess.run([DOCKER,'volume','inspect',v],capture_output=True).returncode!=0 for v in volumes)
        return {'containers_removed':not containers,'network_removed':not networks,'volumes_removed':removed}

STACK=None
class InvoiceAcceptance(unittest.TestCase):
    def setUp(self):
        self.s=STACK
        self.s.sql(f"""truncate invoice_ocr_invoices,invoice_ocr_requests,invoice_ocr_audit cascade;
          delete from storage.objects;
          update core_profiles set disabled=false;
          update core_modules set enabled=true where id='invoice_ocr';
          insert into core_user_modules(user_id,module_id) values ('{A}','invoice_ocr'),('{B}','invoice_ocr') on conflict do nothing;""")
    def command(self, command, invoice, revision, payload=None, request=None, actor=A):
        return {'p_command':command,'p_invoice_id':invoice,'p_expected_revision':revision,
                'p_payload':payload or {},'p_request_id':request or ident()}
    def execute(self, args, actor=A, success=True):
        status,data=self.s.http('POST','/rpc/invoice_ocr_execute',args,actor)
        if success: self.assertEqual(status,200,data)
        else: self.assertGreaterEqual(status,400,data); self.assertLess(status,500,data)
        return data
    def seed(self, fields=None, lines=None):
        invoice=ident(); name=A+'/'+ident()+'.pdf'
        self.s.sql(f"insert into storage.objects(bucket_id,name) values ('invoice_ocr','{name}')")
        payload={'file_path':name,'file_mime':'application/pdf','vendor':'Vendor','total_amount':123.45,
                 'extracted_mock':True,'line_items':lines or []}
        payload.update(fields or {})
        args=self.command('import',invoice,0,payload)
        result=self.execute(args)
        return invoice,result,args
    def snapshot(self):
        return self.s.sql("select jsonb_build_array((select jsonb_agg(t order by id) from invoice_ocr_invoices t),(select jsonb_agg(t order by id) from invoice_ocr_line_items t),(select jsonb_agg(t order by request_id) from invoice_ocr_audit t),(select jsonb_agg(t order by request_id) from invoice_ocr_requests t))")
    def test_import_and_decision(self):
        inv,_,_=self.seed(lines=[{'description':'A','quantity':2,'unit_price':50,'total_amount':100},{'description':'B','total_amount':23.45}])
        r=self.execute(self.command('approve',inv,1,{'vendor':'Corrected','total_amount':-12.50}))
        self.assertEqual((r['status'],r['revision']),('approved',2))
        self.assertEqual(self.s.sql(f"select vendor||':'||total_amount from invoice_ocr_invoices where id='{inv}'"),'Corrected:-12.50')
        self.assertEqual(self.s.sql('select count(*) from invoice_ocr_line_items'),'2')
        self.assertEqual(self.s.sql('select count(*) from invoice_ocr_audit'),'2')
    def test_minimal_draft(self):
        inv,_,_=self.seed({'vendor':None,'total_amount':None})
        self.execute(self.command('reject',inv,1,{'comment':'Missing invoice fields'}))
    def test_approval_and_rejection_requirements(self):
        inv,_,_=self.seed({'vendor':None,'total_amount':None})
        before=self.snapshot()
        for command,payload in [('approve',{}),('approve',{'vendor':'X'}),('approve',{'vendor':'\t\n','total_amount':1}),('approve',{'vendor':'\u00a0','total_amount':1}),('reject',{}),('reject',{'comment':'   '})]:
            self.execute(self.command(command,inv,1,payload),success=False)
            self.assertEqual(self.snapshot(),before)
        self.execute(self.command('approve',inv,1,{'vendor':'X','total_amount':0}))
    def test_reopen_and_bound_undo(self):
        inv,_,_=self.seed()
        decision=self.execute(self.command('reject',inv,1,{'comment':'Duplicate'}))
        reopened=self.execute(self.command('reopen',inv,2))
        restored=self.execute(self.command('undo',inv,3,{'request_id':reopened['requestId']}))
        self.assertEqual(restored['status'],'rejected')
        self.execute(self.command('undo',inv,4,{'request_id':decision['requestId']}),success=False)
        self.execute(self.command('undo',inv,4,{'request_id':restored['requestId']}),success=False)
    def test_undo_cannot_restore_invalid_legacy_decision(self):
        inv,_,_=self.seed()
        self.s.sql(f"update invoice_ocr_invoices set status='approved',vendor=null,total_amount=null where id='{inv}'")
        reopened=self.execute(self.command('reopen',inv,1))
        before=self.snapshot()
        self.execute(self.command('undo',inv,2,{'request_id':reopened['requestId']}),success=False)
        self.assertEqual(self.snapshot(),before)

    def test_decision_undo_preserves_corrections(self):
        inv,_,_=self.seed()
        r=self.execute(self.command('approve',inv,1,{'vendor':'Corrected'}))
        self.execute(self.command('undo',inv,2,{'request_id':r['requestId']}))
        self.assertEqual(self.s.sql('select vendor||\':\'||status from invoice_ocr_invoices'),'Corrected:pending')
    def test_closed_shapes_and_transitions(self):
        inv,_,_=self.seed(); before=self.snapshot()
        for cmd,payload in [('set_status',{'status':'approved'}),('approve',{'user_id':B}),('approve',{'status':'approved'}),('reopen',{}),('undo',{'request_id':ident(),'status':'approved'}),('approve',{'total_amount':'123.45'}),('approve',{'total_amount':1.001}),('approve',{'vendor':{}}),('approve',{'issue_date':'2026-02-30'})]:
            self.execute(self.command(cmd,inv,1,payload),success=False)
            self.assertEqual(self.snapshot(),before)
        self.execute(self.command('approve',inv,1))
        self.execute(self.command('reject',inv,2,{'comment':'Change mind'}),success=False)
    def test_revision_checks(self):
        inv,_,_=self.seed(); before=self.snapshot()
        for revision in (None,-1,0,2):
            self.execute(self.command('approve',inv,revision),success=False)
            self.assertEqual(self.snapshot(),before)
    def test_required_request_and_no_service_role_execution(self):
        inv,_,_=self.seed(); before=self.snapshot()
        args=self.command('approve',inv,1); args['p_request_id']=None
        self.execute(args,success=False)
        status,_=self.s.http('POST','/rpc/invoice_ocr_execute',self.command('approve',inv,1),role='service_role')
        self.assertEqual(status,403)
        self.assertEqual(self.snapshot(),before)

    def test_replay_and_conflicting_reuse(self):
        inv,_,_=self.seed(); args=self.command('approve',inv,1)
        result=self.execute(args); before=self.snapshot()
        self.assertEqual(self.execute(args),result); self.assertEqual(self.snapshot(),before)
        args['p_command']='reject'; args['p_payload']={'comment':'No'}
        self.execute(args,success=False); self.assertEqual(self.snapshot(),before)
    def test_competing_and_identical_concurrency(self):
        inv,_,_=self.seed()
        args=[self.command('approve',inv,1),self.command('reject',inv,1,{'comment':'No'})]
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            results=list(pool.map(lambda a:self.s.http('POST','/rpc/invoice_ocr_execute',a),args))
        self.assertEqual(sum(status==200 for status,_ in results),1,results)
        inv,_,_=self.seed(); args=self.command('approve',inv,1)
        with concurrent.futures.ThreadPoolExecutor(4) as pool:
            results=list(pool.map(lambda _:self.s.http('POST','/rpc/invoice_ocr_execute',args),range(4)))
        self.assertTrue(all(status==200 for status,_ in results),results)
        self.assertTrue(all(r==results[0] for r in results))
        self.assertEqual(self.s.sql(f"select count(*) from invoice_ocr_audit where invoice_id='{inv}'"),'2')
    def test_current_access_before_replay_and_read(self):
        for change,restore in [
            (f"delete from core_user_modules where user_id='{A}'",f"insert into core_user_modules(user_id,module_id) values ('{A}','invoice_ocr')"),
            (f"update core_profiles set disabled=true where id='{A}'",f"update core_profiles set disabled=false where id='{A}'"),
            ("update core_modules set enabled=false where id='invoice_ocr'","update core_modules set enabled=true where id='invoice_ocr'")]:
            inv,_,_=self.seed(); args=self.command('approve',inv,1); self.execute(args)
            before=self.snapshot(); self.s.sql(change)
            self.execute(args,success=False); self.assertEqual(self.snapshot(),before)
            self.assertEqual(self.s.http('GET','/invoice_ocr_invoices')[1],[])
            self.s.sql(restore)
    def test_foreign_owner_and_anonymous(self):
        inv,_,_=self.seed(); before=self.snapshot()
        self.execute(self.command('approve',inv,1),actor=B,success=False)
        self.assertEqual(self.s.http('GET','/invoice_ocr_invoices',actor=B)[1],[])
        self.assertEqual(self.s.http('POST','/rpc/invoice_ocr_execute',self.command('approve',inv,1),role=None)[0],401)
        self.assertEqual(self.snapshot(),before)
    def test_direct_writes_and_helper_calls(self):
        inv,_,_=self.seed(); before=self.snapshot()
        for role in ('authenticated','service_role','anon'):
            for table in ('invoice_ocr_invoices','invoice_ocr_line_items','invoice_ocr_audit','invoice_ocr_requests'):
                field = 'command' if table == 'invoice_ocr_audit' else 'result' if table == 'invoice_ocr_requests' else 'status'
                value = {} if field == 'result' else 'approve' if field == 'command' else 'approved' if table == 'invoice_ocr_invoices' else 'rejected'
                for method,body in [('PATCH',{field:value}),('POST',{}),('DELETE',None)]:
                    status,_=self.s.http(method,'/'+table,body,role=role)
                    self.assertIn(status,(401,403), (role,table,method,status))
        self.assertNotEqual(self.s.http('POST','/rpc/invoice_ocr_check_fields',{'p':{}})[0],200)
        self.assertEqual(self.snapshot(),before)
    def test_atomic_import_and_forged_authority(self):
        for fields in ({'status':'approved'},{'user_id':B},{'line_items':[{'description':'valid'},{'quantity':'bad'}]}, {'line_items':[{'invoice_id':ident()}]}, {'file_path':B+'/foreign.pdf'}):
            name=A+'/'+ident()+'.pdf'; self.s.sql(f"insert into storage.objects(bucket_id,name) values ('invoice_ocr','{name}')")
            payload={'file_path':name,'file_mime':'application/pdf','extracted_mock':False,'line_items':[]};payload.update(fields)
            before=self.snapshot(); self.execute(self.command('import',ident(),0,payload),success=False)
            self.assertEqual(self.snapshot(),before)
    def test_storage_original_and_current_access(self):
        inv,_,args=self.seed()
        name=args['p_payload']['file_path']
        claims=json.dumps({'sub':A,'role':'authenticated'})
        def role_sql(sql):
            return self.s.sql(f"begin;set local role authenticated;set local request.jwt.claims='{claims}';{sql};rollback;")
        self.assertIn('0',role_sql(f"with d as (delete from storage.objects where name='{name}' returning id) select count(*) from d"))
        self.s.sql(f"update core_profiles set disabled=true where id='{A}'")
        result=role_sql('select count(*) from storage.objects')
        self.assertEqual(result.splitlines()[-2],'0')

    def test_required_writes_rollback(self):
        inv,_,_=self.seed()
        for table in ('invoice_ocr_audit','invoice_ocr_requests'):
            self.s.sql(f"create or replace function invoice_ocr_test_failure() returns trigger language plpgsql as $$begin raise exception 'test storage failure' using errcode='XX000'; end$$; create trigger test_failure before insert on {table} for each row execute function invoice_ocr_test_failure();")
            before=self.snapshot()
            status,_=self.s.http('POST','/rpc/invoice_ocr_execute',self.command('approve',inv,1))
            self.assertGreaterEqual(status,500); self.assertEqual(self.snapshot(),before)
            self.s.sql(f'drop trigger test_failure on {table}')
    def test_missing_infrastructure_is_failure(self):
        inv,_,_=self.seed(); before=self.snapshot()
        self.s.sql('alter table invoice_ocr_audit rename to invoice_ocr_audit_unavailable')
        try:
            status,_=self.s.http('POST','/rpc/invoice_ocr_execute',self.command('approve',inv,1))
            self.assertGreaterEqual(status,500)
        finally: self.s.sql('alter table invoice_ocr_audit_unavailable rename to invoice_ocr_audit')
        self.assertEqual(self.snapshot(),before)

def main():
    global STACK
    parser=argparse.ArgumentParser();parser.add_argument('--out',required=True);args=parser.parse_args()
    out=Path(args.out);out.mkdir(parents=True,exist_ok=False)
    STACK=Stack(); result={'status':'unknown','groups':[],'source_sha256':source_digest()}
    started=time.monotonic()
    try:
        STACK.setup(); result['upgrade']='legacy header/line retained; migration applied twice'
        suite=unittest.defaultTestLoader.loadTestsFromTestCase(InvoiceAcceptance)
        inventory=[t.id().split('.')[-1] for t in suite]
        runner=unittest.TextTestRunner(verbosity=2); measured=runner.run(suite)
        result.update(status='pass' if measured.wasSuccessful() else 'fail',groups=inventory,
                      run=measured.testsRun,failures=[t.id() for t,_ in measured.failures],errors=[t.id() for t,_ in measured.errors])
        # Sensitivity controls use actual SQL variants, never a production fault switch.
        if measured.wasSuccessful():
            controls={}
            source=STACK.migration_source
            for label,mutant,test in [
              ('approval_guard',source.replace("if next_status = 'approved' and (", "if false and ("),'test_approval_and_rejection_requirements'),
              ('direct_write',source+"\ngrant update on public.invoice_ocr_invoices to authenticated;\ncreate policy test_bypass on public.invoice_ocr_invoices for update using (true) with check (true);",'test_direct_writes_and_helper_calls')]:
                STACK.sql(mutant)
                case=unittest.defaultTestLoader.loadTestsFromName(test,InvoiceAcceptance)
                control=runner.run(case)
                controls[label]={'detected':len(control.failures)>0 and not control.errors,'source_sha256':hashlib.sha256(mutant.encode()).hexdigest()}
                if label=='direct_write': STACK.sql('drop policy test_bypass on invoice_ocr_invoices')
                STACK.sql(source)
            restored=runner.run(unittest.defaultTestLoader.loadTestsFromTestCase(InvoiceAcceptance))
            result['controls']=controls; result['restored_run']=restored.testsRun
            if not restored.wasSuccessful() or not all(v['detected'] for v in controls.values()): result['status']='fail'
        if result['status']=='pass':
            InvoiceAcceptance('test_import_and_decision').setUp()
            token=STACK.token()
            class Handler(http.server.BaseHTTPRequestHandler):
                def do_POST(self):
                    if self.path!='/object' or self.headers.get('Authorization')!='Bearer '+token:
                        self.send_error(403); return
                    name=json.loads(self.rfile.read(int(self.headers['Content-Length'])))['name']
                    if not name.startswith(A+'/') or "'" in name:
                        self.send_error(400); return
                    STACK.sql(f"insert into storage.objects(bucket_id,name) values ('invoice_ocr','{name}')")
                    self.send_response(200);self.end_headers();self.wfile.write(b'{}')
                def log_message(self,*args): pass
            server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
            thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
            try:
                fixture={'url':STACK.url,'token':token,'actor':A,'fixtureUrl':'http://127.0.0.1:'+str(server.server_port)}
                proc=subprocess.run(['node','tests/invoice-acceptance/actions.mjs'],cwd=ROOT,
                    env={'PATH':os.environ['PATH'],'INVOICE_ACTION_FIXTURE':json.dumps(fixture)},capture_output=True,text=True,timeout=90)
                if proc.returncode: raise RuntimeError('TypeScript action integration failed: '+proc.stderr[-2500:])
                result['action_integration']=json.loads(proc.stdout.strip().splitlines()[-1])
            finally: server.shutdown();server.server_close();thread.join()
        result['migration_sha256']=hashlib.sha256(STACK.migration_source.encode()).hexdigest()
        result['oracle_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
        result['images']={tag:run(DOCKER,'image','inspect','--format','{{.Id}}',tag) for tag in ('postgres:17-bookworm','postgrest/postgrest:v12.2.3')}
    except Exception as e:
        result['error']=str(e)[:3000]
    finally:
        result['source_unchanged']=source_digest()==result['source_sha256']
        if not result['source_unchanged']: result['status']='unknown'
        result['cleanup']=STACK.cleanup();result['duration_seconds']=round(time.monotonic()-started,3)
        if not all(result['cleanup'].values()): result['status']='unknown'
        (out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
    return 0 if result['status']=='pass' else 1

if __name__=='__main__': raise SystemExit(main())
