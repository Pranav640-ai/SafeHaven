from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from backend import app as module
from backend import incident_evidence as evidence

@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setenv('DATABASE_PATH',str(tmp_path/'incident.db'))
    monkeypatch.delenv('GEMINI_API_KEY',raising=False)
    evidence.cache.clear()
    return TestClient(module.app)

def submit(client,**changes):
    body=dict(latitude=10,longitude=77,kind='blockedRoad',description='Observed obstruction by the bridge',category='road_blockage',severity='high',place_name='Test town',observed_at=datetime.now(timezone.utc).isoformat(),consent=True)
    return client.post('/api/safety/reports',json={**body,**changes})

def test_report_metadata_consent_ownership_and_evidence_failures(client,monkeypatch):
    assert submit(client,consent=False).status_code==422
    assert submit(client,category='invalid').status_code==422
    result=submit(client).json();rid=result['report']['id']
    assert result['report']['category']=='road_blockage'
    async def fail(*args,**kwargs):raise RuntimeError('provider private request detail')
    monkeypatch.setattr(evidence,'fetch_json',fail)
    response=client.get(f'/api/safety/reports/{rid}/evidence')
    assert response.status_code==200
    assert response.json()['verification_status']=='unverified'
    assert all(s['status']=='unavailable' for s in response.json()['sources'])
    assert 'private request' not in response.text
    assert client.delete(f'/api/safety/reports/{rid}').status_code==403
    assert client.delete(f'/api/safety/reports/{rid}',headers={'Authorization':'Bearer '+result['delete_token']}).status_code==200
    assert client.get(f'/api/safety/reports/{rid}/evidence').status_code==404

def test_public_weather_context_does_not_verify_incident(client,monkeypatch):
    rid=submit(client,category='flood',kind='risingWater').json()['report']['id']
    async def source(url,params=None):
        if 'open-meteo' in url:return {'current':{'precipitation':10,'wind_speed_10m':55},'daily':{'precipitation_sum':[40]}}
        if 'usgs' in url:return {'features':[{'properties':{'title':'Recorded earthquake','url':'javascript:alert(1)','time':None}}]}
        return {'features':[],'articles':[]}
    monkeypatch.setattr(evidence,'fetch_json',source)
    value=client.get(f'/api/safety/reports/{rid}/evidence').json()
    assert value['assessment']=='contextual_evidence_found'
    assert value['verification_status']=='unverified'
    usgs=next(s for s in value['sources'] if s['source']=='USGS')
    assert usgs['supports_context'] is False
    assert usgs['evidence'][0]['url'] is None

def test_unverified_report_is_trip_context_not_automatic_change(client,monkeypatch):
    rid=submit(client).json()['report']['id']
    today=datetime.now(timezone.utc).date().isoformat()
    async def weather(place):return {'days':[{'date':today,'rain_mm':0,'max_c':20,'wind_kmh':5,'weather_code':0}],'source':{},'fetched_at':datetime.now(timezone.utc).isoformat()}
    monkeypatch.setattr(module,'weather_for',weather)
    stop=dict(id='stop',date=today,activity='Walk',kind='outdoor',place={'name':'Test town','latitude':10,'longitude':77})
    value=client.post('/api/replan',json={'stops':[stop]}).json()['stops'][0]
    assert value['community_reports'][0]['id']==rid
    assert value['changed'] is False
    assert value['alternative']=='Walk'
    stop['place']['latitude']=30
    value=client.post('/api/replan',json={'stops':[stop]}).json()['stops'][0]
    assert value['community_reports']==[]

def test_resolved_reports_not_in_public_context(client,monkeypatch):
    result=submit(client).json();rid=result['report']['id']
    from backend.safety import store
    import json
    with store() as db:
        row=result['report'];row['status']='resolved'
        db.execute('UPDATE observations SET content=? WHERE id=?',(json.dumps(row),rid))
    assert client.get(f'/api/safety/reports/{rid}/evidence').status_code==404

def test_risk_includes_local_report_as_context(client,monkeypatch):
    rid=submit(client).json()['report']['id']
    from backend.intelligence import routes
    async def assess(_):return {'activity_assessments':[],'source_statuses':[]}
    async def warnings():return [],[]
    monkeypatch.setattr(routes.risk_engine,'assess_itinerary',assess)
    monkeypatch.setattr(routes.warning_aggregator,'fetch_all_warnings',warnings)
    result=client.post('/api/intelligence/risk/assess',json={'place':{'name':'Test town','latitude':10,'longitude':77},'date':datetime.now(timezone.utc).date().isoformat(),'kind':'outdoor'})
    assert result.status_code==200
    assert result.json()['community_reports'][0]['id']==rid
    assert result.json()['community_reports'][0]['trust']=='Unverified'
