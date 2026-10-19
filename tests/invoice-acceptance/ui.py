#!/usr/bin/env python3
"""Disposable browser fixture: real app/PostgREST/PG; synthetic auth/storage, no LLM."""
import argparse
import base64
import http.server
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request
from run import Stack, A, B, ROOT

PASSWORD='local-invoice-fixture-only'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--out',required=True);args=parser.parse_args()
    out=Path(args.out);out.mkdir(parents=True,exist_ok=False)
    stack=Stack(); app=None; gateway=None; result={'status':'unknown'}
    try:
        stack.setup()
        stack.sql('truncate invoice_ocr_invoices,invoice_ocr_requests,invoice_ocr_audit cascade;delete from storage.objects;')
        tokens={A:stack.token(A),B:stack.token(B)}
        class Gateway(http.server.BaseHTTPRequestHandler):
            def log_message(self,*args): pass
            def respond(self,status,data):
                raw=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(raw)
            def actor(self):
                auth=self.headers.get('Authorization','')
                return next((a for a,t in tokens.items() if auth=='Bearer '+t),None)
            def session(self,actor):
                return {'access_token':tokens[actor],'token_type':'bearer','expires_in':3600,'expires_at':int(time.time())+3600,
                        'refresh_token':'fixture-'+actor,'user':{'id':actor,'email':'a@example.invalid' if actor==A else 'b@example.invalid',
                        'aud':'authenticated','role':'authenticated','app_metadata':{'provider':'email'},'user_metadata':{}}}
            def handle_request(self):
                body=self.rfile.read(int(self.headers.get('Content-Length','0')))
                if self.path.startswith('/rest/v1/'):
                    req=urllib.request.Request(stack.url+self.path[len('/rest/v1'):],data=body if body else None,method=self.command,
                        headers={k:v for k,v in self.headers.items() if k.lower() in ('authorization','content-type','prefer','accept','range','range-unit','accept-profile','content-profile')})
                    try: response=urllib.request.urlopen(req,timeout=15)
                    except urllib.error.HTTPError as e: response=e
                    with response:
                        raw=response.read();self.send_response(response.code)
                        for k,v in response.headers.items():
                            if k.lower() in ('content-type','content-range','preference-applied'): self.send_header(k,v)
                        self.end_headers()
                        if self.command!='HEAD': self.wfile.write(raw)
                    return
                if self.path.startswith('/auth/v1/token'):
                    data=json.loads(body); actor=A if data.get('email')=='a@example.invalid' else B if data.get('email')=='b@example.invalid' else None
                    if actor and data.get('password')==PASSWORD: self.respond(200,self.session(actor))
                    else: self.respond(400,{'message':'Invalid fixture credentials'})
                    return
                actor=self.actor()
                if self.path=='/auth/v1/user':
                    self.respond(200,self.session(actor)['user']) if actor else self.respond(401,{'message':'No fixture session'})
                    return
                if self.path=='/auth/v1/logout': self.respond(200,{}); return
                if self.path.startswith('/storage/v1/object/sign/'):
                    name=self.path.split('/storage/v1/object/sign/invoice_ocr/',1)[-1].split('?')[0]
                    if self.command=='POST':
                        if not actor or not name.startswith(actor+'/'): self.respond(403,{});return
                        self.respond(200,{'signedURL':'/object/sign/invoice_ocr/'+name+'?token=fixture'});return
                    # Tiny valid image; this fixture does not emulate cloud storage.
                    image=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=')
                    self.send_response(200);self.send_header('Content-Type','image/png');self.end_headers();self.wfile.write(image);return
                if self.path.startswith('/storage/v1/object/invoice_ocr/') and self.command=='POST':
                    name=self.path.split('/storage/v1/object/invoice_ocr/',1)[1]
                    if not actor or not name.startswith(actor+'/') or "'" in name: self.respond(403,{});return
                    stack.sql(f"insert into storage.objects(bucket_id,name) values ('invoice_ocr','{name}')")
                    self.respond(200,{'Key':'invoice_ocr/'+name});return
                if self.path=='/storage/v1/object/invoice_ocr' and self.command=='DELETE':
                    self.respond(200,[]);return
                self.respond(404,{'message':'Unknown local fixture route'})
            do_GET=handle_request;do_POST=handle_request;do_PATCH=handle_request;do_DELETE=handle_request;do_HEAD=handle_request
        gateway=http.server.ThreadingHTTPServer(('127.0.0.1',0),Gateway)
        thread=threading.Thread(target=gateway.serve_forever,daemon=True);thread.start()
        with socket.socket() as sock: sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        env={'PATH':os.environ['PATH'],'HOME':os.environ['HOME'],'NEXT_TELEMETRY_DISABLED':'1',
             'NEXT_PUBLIC_SUPABASE_URL':f'http://127.0.0.1:{gateway.server_port}',
             'NEXT_PUBLIC_SUPABASE_ANON_KEY':stack.token(None,'anon'),'AI_BACKEND':'openrouter','OPENROUTER_API_KEY':''}
        log=(out/'app.log').open('w')
        app=subprocess.Popen(['node','node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',str(port)],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
        info={'url':f'http://127.0.0.1:{port}','email':'a@example.invalid','password':PASSWORD,
              'scope':'real Next/PostgREST/PostgreSQL; synthetic auth/storage; keyless demo OCR; no hosted writes'}
        (out/'fixture.json').write_text(json.dumps(info,indent=2)+'\n');print(json.dumps(info),flush=True)
        while app.poll() is None: time.sleep(.5)
        raise RuntimeError('Local app exited before browser checks completed')
    except KeyboardInterrupt: result['status']='stopped after local browser session'
    finally:
        if app and app.poll() is None:
            os.killpg(app.pid,signal.SIGTERM)
            try: app.wait(timeout=15)
            except subprocess.TimeoutExpired: os.killpg(app.pid,signal.SIGKILL);app.wait()
        if gateway: gateway.shutdown();gateway.server_close()
        result['cleanup']=stack.cleanup()
        (out/'cleanup.json').write_text(json.dumps(result,indent=2)+'\n')

if __name__=='__main__': main()
