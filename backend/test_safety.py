import base64,json
from datetime import datetime,timedelta,timezone
import pytest
from fastapi.testclient import TestClient
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature
from backend import app as module
from backend import safety,push

TOKEN='test-only-operator-token-not-production-'+'x'*32
AUTH={'Authorization':'Bearer '+TOKEN}
POINT={'latitude':10,'longitude':77}
RING=[[76.9,9.9],[77.1,9.9],[77.1,10.1],[76.9,10.1],[76.9,9.9]]
@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setenv('DATABASE_PATH',str(tmp_path/'safety.db'))
    for key in ['GEMINI_API_KEY','ALERT_SIGNING_KEY','VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT','OFFICIAL_SOURCE_HOSTS','SAFETY_DIRECTORY_PATH']:
        monkeypatch.delenv(key,raising=False)
    monkeypatch.setenv('SAFETY_ADMIN_TOKEN',TOKEN)
    return TestClient(module.app)
def bulletin(**overrides):
    now=datetime.now(timezone.utc)
    return {'title':'Test-only supplied flood bulletin','hazard':'Flood','severity':'warning','instructions':['Do not enter floodwater.'],'source_url':'https://www.ready.gov/floods','issuer':'Test publisher','published_at':now.isoformat(),'expires_at':(now+timedelta(hours=6)).isoformat(),'polygon':RING,**overrides}
def observation(**overrides):
    return {**POINT,'kind':'blockedRoad','description':'Observed obstruction at the selected point','observed_at':datetime.now(timezone.utc).isoformat(),'consent':True,**overrides}

def test_reports_consent_radius_and_owner_removal(client):
    assert client.post('/api/safety/reports',json=observation(consent=False)).status_code==422
    result=client.post('/api/safety/reports',json=observation()).json()
    assert result['report']['trust']=='Unverified'
    assert len(client.post('/api/safety/nearby',json=POINT).json()['reports'])==1
    assert client.post('/api/safety/nearby',json={'latitude':50,'longitude':5}).json()['reports']==[]
    rid=result['report']['id']
    assert client.delete('/api/safety/reports/'+rid).status_code==403
    assert client.delete('/api/safety/reports/'+rid,headers={'Authorization':'Bearer '+result['delete_token']}).status_code==200
    assert client.post('/api/safety/nearby',json=POINT).json()['reports']==[]

def test_response_roles_source_requirement_and_private_groups(client,monkeypatch):
    assert client.get('/api/safety/response').status_code==403
    group=client.post('/api/groups',json={'name':'Private trip','member_name':'Private person'}).json()
    result=client.post('/api/safety/reports',json=observation(kind='help')).json()
    rid=result['report']['id']
    assert client.post('/api/safety/response/reports/'+rid,json={'status':'corroborated'},headers=AUTH).status_code==422
    assert client.post('/api/safety/response/reports/'+rid,json={'status':'corroborated','source_url':'https://www.ready.gov/'},headers=AUTH).json()['trust']=='Corroborated'
    data=client.get('/api/safety/response',headers=AUTH).json()
    assert data['metrics']['need_help']==1 and data['metrics']['corroborated']==1
    assert 'Private person' not in json.dumps(data) and group['token'] not in json.dumps(data)
    monkeypatch.delenv('SAFETY_ADMIN_TOKEN')
    assert client.get('/api/safety/response',headers=AUTH).status_code==503

def test_signed_bulletins_geo_scope_tamper_and_registered_hosts(client,monkeypatch):
    key=Ed25519PrivateKey.generate()
    raw=key.private_bytes(serialization.Encoding.Raw,serialization.PrivateFormat.Raw,serialization.NoEncryption())
    monkeypatch.setenv('ALERT_SIGNING_KEY',base64.b64encode(raw).decode())
    assert client.post('/api/safety/response/bulletins',json=bulletin(),headers={}).status_code==403
    assert client.post('/api/safety/response/bulletins',json=bulletin(official=True),headers=AUTH).status_code==422
    monkeypatch.setenv('OFFICIAL_SOURCE_HOSTS','www.ready.gov')
    packet=client.post('/api/safety/response/bulletins',json=bulletin(official=True),headers=AUTH).json()
    key.public_key().verify(base64.b64decode(packet['signature']),base64.b64decode(packet['payload']))
    with pytest.raises(InvalidSignature):key.public_key().verify(base64.b64decode(packet['signature']),b'modified')
    assert len(client.post('/api/safety/alerts',json=POINT).json()['alerts'])==1
    assert client.post('/api/safety/alerts',json={'latitude':20,'longitude':20}).json()['alerts']==[]
    assert packet['bulletin']['impact_at'] is None

def test_geometry_checks_crossing_segments_and_boundary():
    assert safety.route_hits([[76.8,10],[77.2,10]],RING)
    assert safety.route_hits([[76.8,9.9],[77.2,9.9]],RING)
    assert not safety.route_hits([[76.8,10.2],[77.2,10.2]],RING)
    assert safety.in_polygon([77,10],RING)

def test_routes_avoid_loaded_polygon_not_unknown_guarantee(client,monkeypatch):
    client.post('/api/safety/response/bulletins',json=bulletin(),headers=AUTH)
    async def routing(*args,**kwargs):
        return {'code':'Ok','routes':[{'geometry':{'type':'LineString','coordinates':[[76.8,10],[77.2,10]]},'distance':5000,'duration':300},{'geometry':{'type':'LineString','coordinates':[[76.8,10.2],[77.2,10.2]]},'distance':8000,'duration':600}]}
    monkeypatch.setattr(module,'fetch',routing)
    body={'origin':POINT,'destination':{'latitude':11,'longitude':78},'consent':False}
    assert client.post('/api/safety/routes',json=body).status_code==422
    body['consent']=True
    result=client.post('/api/safety/routes',json=body).json()
    assert result['routes'][0]['avoid'] and not result['routes'][1]['avoid'] and result['suggested_id']==1
    assert 'not a safe route' in result['limitations']

def test_directories_expire_and_do_not_invent_listings(client,tmp_path,monkeypatch):
    assert client.post('/api/safety/shelters',json=POINT).json()['shelters']==[]
    assert client.get('/api/safety/contacts?nationality=India').json()['contacts']==[]
    path=tmp_path/'directory.json';now=datetime.now(timezone.utc)
    rows={'shelters':[{'name':'Source-listed test facility',**POINT,'source_url':'https://www.ready.gov/','expires_at':(now+timedelta(hours=2)).isoformat()}],'contacts':[{'name':'Test directory contact','nationality':'India','phone':'+123','source_url':'https://www.ready.gov/','expires_at':(now-timedelta(hours=1)).isoformat()}]}
    path.write_text(json.dumps(rows));monkeypatch.setenv('SAFETY_DIRECTORY_PATH',str(path))
    assert client.post('/api/safety/shelters',json=POINT).json()['shelters'][0]['distance_km']==0
    assert client.get('/api/safety/contacts?nationality=India').json()['contacts']==[]

def test_assistant_is_source_bounded_and_photo_requires_consent(client):
    data=client.post('/api/safety/assistant',json={'hazard':'Flood','language':'hi','question':'What should I do first?'}).json()
    assert len(data['steps'])==1 and data['language']=='hi' and data['source']['url']=='https://www.ready.gov/floods'
    assert client.post('/api/safety/assistant',json={'hazard':'Flood','question':'Is it safe to drive?'}).json()['steps']==[]
    assert client.post('/api/safety/photo',json={'image':'aaaa','consent':False}).status_code==422
    assert client.post('/api/safety/photo',json={'image':'aaaa','consent':True}).status_code==422
    assert client.post('/api/safety/photo',json={'image':base64.b64encode(b'\xff\xd8\xfftest').decode(),'consent':True}).status_code==503

def test_itinerary_uses_published_area_and_preserves_booking(client,monkeypatch):
    client.post('/api/safety/response/bulletins',json=bulletin(),headers=AUTH)
    async def forecast(place):return {'days':[],'source':{'title':'Test only','url':'https://example.com','trust':'Forecast'},'fetched_at':datetime.now(timezone.utc).isoformat()}
    monkeypatch.setattr(module,'weather_for',forecast)
    place=module.Place(name='Test place',**POINT).model_dump()
    stops=[{'id':str(i),'date':datetime.now(timezone.utc).date().isoformat(),'activity':activity,'kind':kind,'place':place} for i,(activity,kind) in enumerate([('Walk','outdoor'),('Booked hotel','booking')])]
    rows=client.post('/api/replan',json={'stops':stops,'preferences':'Prefer quiet indoor places'}).json()['stops']
    assert rows[0]['changed'] and rows[0]['bulletins']
    assert not rows[1]['changed'] and rows[1]['alternative']=='Booked hotel'

def test_push_consent_whitelist_queue_and_revoke(client,monkeypatch):
    assert not client.get('/api/safety/push/config').json()['available']
    for k in ['VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT']:monkeypatch.setenv(k,'test-value')
    body={**POINT,'consent':False,'endpoint':'https://fcm.googleapis.com/fcm/send/test','p256dh':'x'*80,'auth':'a'*24}
    assert client.post('/api/safety/push/subscriptions',json=body).status_code==422
    body['consent']=True
    assert client.post('/api/safety/push/subscriptions',json={**body,'endpoint':'https://localhost/metadata'}).status_code==422
    sub=client.post('/api/safety/push/subscriptions',json=body).json()
    client.post('/api/safety/response/bulletins',json=bulletin(),headers=AUTH)
    with safety.store() as conn:
        rows=conn.execute('SELECT * FROM push_jobs').fetchall()
        assert len(rows)==1 and rows[0]['status']=='queued'
    assert client.delete('/api/safety/push/subscriptions/'+sub['id']).status_code==403
    assert client.delete('/api/safety/push/subscriptions/'+sub['id'],headers={'Authorization':'Bearer '+sub['delete_token']}).status_code==200
    with safety.store() as conn:assert conn.execute('SELECT COUNT(*) FROM push_jobs').fetchone()[0]==0


def test_push_provider_acceptance_is_separate_from_device_receipt(client,monkeypatch):
    for k in ['VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT']:monkeypatch.setenv(k,'test-value')
    sub=client.post('/api/safety/push/subscriptions',json={**POINT,'consent':True,'endpoint':'https://fcm.googleapis.com/fcm/send/test','p256dh':'x'*80,'auth':'a'*24}).json()
    client.post('/api/safety/response/bulletins',json=bulletin(),headers=AUTH)
    captured=[]
    def provider(**kwargs):captured.append(json.loads(kwargs['data']))
    import pywebpush
    monkeypatch.setattr(pywebpush,'webpush',provider)
    assert push.deliver_pending()['provider_accepted']==1
    metrics=client.get('/api/safety/response',headers=AUTH).json()['metrics']
    assert metrics['push_provider_accepted']==1 and metrics['push_device_receipts']==0
    payload=captured[0]
    assert client.post('/api/safety/push/receipt',json={'id':payload['job_id'],'token':'wrong'+'x'*30}).status_code==403
    assert client.post('/api/safety/push/receipt',json={'id':payload['job_id'],'token':payload['receipt_token']}).status_code==200
    metrics=client.get('/api/safety/response',headers=AUTH).json()['metrics']
    assert metrics['push_device_receipts']==1 and metrics['push_devices_reached']==1


def test_weather_date_proposal_preserves_trip_window_and_booking(client,monkeypatch):
    first=datetime.now(timezone.utc).date();second=first+timedelta(days=1);third=first+timedelta(days=2)
    async def forecast(place):return {'days':[{'date':first.isoformat(),'rain_mm':30,'max_c':20,'wind_kmh':5,'weather_code':61},{'date':second.isoformat(),'rain_mm':0,'max_c':20,'wind_kmh':5,'weather_code':0}], 'source':{'title':'Test only','url':'https://example.com','trust':'Forecast'},'fetched_at':datetime.now(timezone.utc).isoformat()}
    monkeypatch.setattr(module,'weather_for',forecast)
    place=module.Place(name='Test place',**POINT).model_dump()
    stops=[{'id':'walk','date':first.isoformat(),'activity':'Walk','kind':'outdoor','place':place},{'id':'hotel','date':third.isoformat(),'activity':'Hotel booking','kind':'booking','place':place}]
    rows=client.post('/api/replan',json={'stops':stops}).json()['stops']
    assert rows[0]['alternative_date']==second.isoformat() and rows[0]['alternative']=='Walk'
    assert rows[1]['alternative_date']==third.isoformat() and not rows[1]['changed']
    assert rows[0]['original']['date']==first.isoformat()


def test_operator_simulation_changes_route_without_live_side_effects(client):
    body={'severity':'information','polygon':RING,'route':[[76.8,10],[77.2,10]],'participants':5,'safe':3,'need_help':1}
    assert client.post('/api/safety/response/simulate',json=body).status_code==403
    low=client.post('/api/safety/response/simulate',json=body,headers=AUTH).json()
    high=client.post('/api/safety/response/simulate',json={**body,'severity':'critical'},headers=AUTH).json()
    assert not low['route_affected'] and high['route_affected'] and high['trust']=='Simulated'
    assert high['metrics']['simulated_unknown']==1 and high['metrics']['actual_notifications_sent']==0
    assert client.get('/api/safety/response',headers=AUTH).json()['reports']==[]
    assert client.post('/api/safety/alerts',json=POINT).json()['alerts']==[]
    assert client.post('/api/safety/response/simulate',json={**body,'safe':10},headers=AUTH).status_code==422
