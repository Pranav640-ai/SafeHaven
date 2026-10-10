"""Opt-in web push. Queue states describe provider acceptance, never user receipt."""
import hashlib
import json
import os
import secrets
from datetime import timedelta
from urllib.parse import urlparse
from fastapi import APIRouter,Header,HTTPException
from pydantic import BaseModel,Field,HttpUrl
from backend.safety import store,clock,in_polygon

router=APIRouter(prefix='/api/safety/push')
def tables(conn):
    conn.executescript("CREATE TABLE IF NOT EXISTS subscriptions(id TEXT PRIMARY KEY,content TEXT,token_hash TEXT,expires TEXT); CREATE TABLE IF NOT EXISTS push_jobs(id TEXT PRIMARY KEY,subscription_id TEXT,bulletin_id TEXT,status TEXT,attempts INTEGER DEFAULT 0,created TEXT,UNIQUE(subscription_id,bulletin_id));")
    columns={r['name'] for r in conn.execute('PRAGMA table_info(push_jobs)')}
    for column in ['started','receipt_hash','received']:
        if column not in columns:conn.execute(f'ALTER TABLE push_jobs ADD COLUMN {column} TEXT')
    conn.execute('DELETE FROM subscriptions WHERE julianday(expires)<=julianday(?)',(clock().isoformat(),))
    conn.execute('DELETE FROM push_jobs WHERE subscription_id NOT IN (SELECT id FROM subscriptions) OR julianday(created)<julianday(?)',((clock()-timedelta(days=7)).isoformat(),))
def configured():return bool(os.getenv('VAPID_PUBLIC_KEY') and os.getenv('VAPID_PRIVATE_KEY') and os.getenv('VAPID_SUBJECT'))
@router.get('/config')
def configuration():return {'available':configured(),'public_key':os.getenv('VAPID_PUBLIC_KEY','') if configured() else ''}
class Subscription(BaseModel):
    endpoint:HttpUrl
    p256dh:str=Field(min_length=20,max_length=150)
    auth:str=Field(min_length=10,max_length=100)
    latitude:float=Field(ge=-90,le=90)
    longitude:float=Field(ge=-180,le=180)
    consent:bool
@router.post('/subscriptions')
def subscribe(data:Subscription):
    if not configured():raise HTTPException(503,'Destination notifications are unavailable.')
    if not data.consent:raise HTTPException(422,'Notification sharing consent required.')
    host=urlparse(str(data.endpoint)).hostname
    allowed={h.strip() for h in os.getenv('PUSH_ALLOWED_HOSTS','fcm.googleapis.com,updates.push.services.mozilla.com').split(',')}
    if data.endpoint.scheme!='https' or (host not in allowed and not (host or '').endswith('.notify.windows.com')) or data.endpoint.port not in [None,443]:raise HTTPException(422,'Unsupported push service endpoint.')
    sid,token=secrets.token_urlsafe(16),secrets.token_urlsafe(32)
    with store() as conn:
        tables(conn)
        if any(json.loads(r['content'])['endpoint']==str(data.endpoint) for r in conn.execute('SELECT content FROM subscriptions WHERE expires>?',(clock().isoformat(),)).fetchall()):
            raise HTTPException(409,'This browser already has an active subscription. Stop it before choosing another place.')
        conn.execute('INSERT INTO subscriptions VALUES(?,?,?,?)',(sid,json.dumps(data.model_dump(mode='json')),hashlib.sha256(token.encode()).hexdigest(),(clock()+timedelta(days=30)).isoformat()))
    return {'id':sid,'delete_token':token,'expires_at':(clock()+timedelta(days=30)).isoformat()}
@router.delete('/subscriptions/{sid}')
def unsubscribe(sid:str,authorization:str|None=Header(default=None)):
    token=authorization.removeprefix('Bearer ') if authorization else ''
    with store() as conn:
        tables(conn)
        row=conn.execute('SELECT token_hash FROM subscriptions WHERE id=?',(sid,)).fetchone()
        if not row:return {'removed':True}
        if not secrets.compare_digest(row['token_hash'],hashlib.sha256(token.encode()).hexdigest()):raise HTTPException(403,'Subscription removal permission required.')
        conn.execute('DELETE FROM subscriptions WHERE id=?',(sid,));conn.execute('DELETE FROM push_jobs WHERE subscription_id=?',(sid,))
    return {'removed':True}
def enqueue(bulletin):
    if not configured():return
    if bulletin['severity'] not in ['warning','critical']:return
    with store() as conn:
        tables(conn)
        for row in conn.execute('SELECT * FROM subscriptions WHERE expires>?',(clock().isoformat(),)).fetchall():
            data=json.loads(row['content'])
            if in_polygon([data['longitude'],data['latitude']],bulletin['polygon']):
                conn.execute('INSERT OR IGNORE INTO push_jobs(id,subscription_id,bulletin_id,status,created) VALUES(?,?,?,?,?)',(secrets.token_urlsafe(16),row['id'],bulletin['id'],'queued',clock().isoformat()))
class Receipt(BaseModel):
    id:str=Field(min_length=10,max_length=100)
    token:str=Field(min_length=20,max_length=100)
@router.post('/receipt')
def receipt(data:Receipt):
    with store() as conn:
        tables(conn)
        row=conn.execute('SELECT receipt_hash FROM push_jobs WHERE id=?',(data.id,)).fetchone()
        if not row or not row['receipt_hash'] or not secrets.compare_digest(row['receipt_hash'],hashlib.sha256(data.token.encode()).hexdigest()):raise HTTPException(403,'Valid device receipt required.')
        conn.execute('UPDATE push_jobs SET received=COALESCE(received,?) WHERE id=?',(clock().isoformat(),data.id))
    return {'received':True}
def deliver_pending():
    if not configured():raise RuntimeError('Configure VAPID keys and a contact subject before starting delivery.')
    from pywebpush import webpush
    stats={'provider_accepted':0,'failed':0,'expired':0}
    from backend.safety import bulletins
    current={p['bulletin']['id']:p['bulletin'] for p in bulletins()}
    stale=(clock()-timedelta(minutes=5)).isoformat()
    with store() as conn:
        tables(conn)
        rows=conn.execute("SELECT j.*,s.content,s.expires FROM push_jobs j LEFT JOIN subscriptions s ON s.id=j.subscription_id WHERE (j.status IN ('queued','retry') OR (j.status='sending' AND j.started<?)) AND j.attempts<3 LIMIT 50",(stale,)).fetchall()
    for row in rows:
        with store() as conn:
            if not row['content'] or row['expires']<=clock().isoformat() or row['bulletin_id'] not in current:
                conn.execute("UPDATE push_jobs SET status='expired' WHERE id=?",(row['id'],));stats['expired']+=1;continue
            nonce=secrets.token_urlsafe(32)
            updated=conn.execute("UPDATE push_jobs SET status='sending',attempts=attempts+1,started=?,receipt_hash=? WHERE id=? AND (status IN ('queued','retry') OR (status='sending' AND started<?)) AND attempts<3",(clock().isoformat(),hashlib.sha256(nonce.encode()).hexdigest(),row['id'],stale)).rowcount
            if not updated:continue
        s=json.loads(row['content'])
        try:
            webpush(subscription_info={'endpoint':s['endpoint'],'keys':{'p256dh':s['p256dh'],'auth':s['auth']}},data=json.dumps({'bulletin_id':row['bulletin_id'],'job_id':row['id'],'receipt_token':nonce}),vapid_private_key=os.environ['VAPID_PRIVATE_KEY'],vapid_claims={'sub':os.environ['VAPID_SUBJECT']},ttl=300,timeout=15,headers={'X-WNS-Type':'wns/raw'} if urlparse(s['endpoint']).hostname.endswith('.notify.windows.com') else {})
            with store() as conn:conn.execute("UPDATE push_jobs SET status='provider_accepted' WHERE id=?",(row['id'],))
            stats['provider_accepted']+=1
        except Exception:
            with store() as conn:conn.execute("UPDATE push_jobs SET status='retry' WHERE id=?",(row['id'],))
            stats['failed']+=1
    return stats
