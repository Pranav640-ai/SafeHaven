import asyncio
from datetime import datetime, timezone, timedelta

import pytest
from fastapi.testclient import TestClient
from backend import app as module

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv('DATABASE_PATH', str(tmp_path / 'test.db'))
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    return TestClient(module.app)

PLACE = {'name':'Test town','latitude':10,'longitude':77,'country':'India'}

def test_private_groups_consent_and_conflict(client):
    group = client.post('/api/groups', json={'name':'Trip','member_name':'A'}).json()
    gid = group['group_id']
    assert client.get(f'/api/groups/{gid}').status_code == 403
    assert client.post(f'/api/groups/{gid}/join', json={'invite':'x'*32,'member_name':'intruder'}).status_code == 403
    second = client.post(f'/api/groups/{gid}/join', json={'invite':group['invite'],'member_name':'B'}).json()
    headers = {'Authorization':f"Bearer {second['token']}"}
    current = datetime.now(timezone.utc)
    event = {'status':'safe','consent':False,'event_at':current.isoformat()}
    assert client.post(f'/api/groups/{gid}/checkin', json=event, headers=headers).status_code == 422
    event['consent'] = True
    assert client.post(f'/api/groups/{gid}/checkin', json=event, headers=headers).json()['accepted']
    event.update(status='needHelp', event_at=(current-timedelta(hours=1)).isoformat())
    assert not client.post(f'/api/groups/{gid}/checkin', json=event, headers=headers).json()['accepted']
    snapshot = client.get(f'/api/groups/{gid}', headers=headers).json()
    assert next(m for m in snapshot['members'] if m['name']=='B')['status'] == 'safe'
    assert all('token_hash' not in m for m in snapshot['members'])
    assert client.delete(f'/api/groups/{gid}/membership', headers=headers).status_code == 200
    assert client.get(f'/api/groups/{gid}', headers=headers).status_code == 403

def test_replan_preserves_bookings_and_unknown_dates(client, monkeypatch):
    async def forecast(place):
        return {'days':[{'date':'2026-10-10','rain_mm':30,'max_c':25,'wind_kmh':10,'weather_code':61}], 'source':{'title':'fixture','url':'https://example.com','trust':'Forecast'},'fetched_at':'2026-10-10T00:00:00Z'}
    monkeypatch.setattr(module,'weather_for',forecast)
    stops = [{'id':str(i),'date':day,'activity':activity,'kind':kind,'place':PLACE} for i,(day,activity,kind) in enumerate([('2026-10-10','Waterfall','water'),('2026-10-10','Hotel','booking'),('2028-01-01','Walk','outdoor')])]
    r = client.post('/api/replan',json={'stops':stops})
    assert r.status_code == 200
    rows = r.json()['stops']
    assert rows[0]['changed']
    assert rows[1]['alternative'] == 'Hotel' and not rows[1]['changed']
    assert 'Unknown' in rows[2]['assessment'] and not rows[2]['changed']
    assert [row['original'] for row in rows] == [{**s,'place':module.Place(**PLACE).model_dump()} for s in stops]

def test_feed_history_and_distance():
    xml = '''<rss xmlns:geo="http://www.georss.org/georss"><channel><item><title>Old event</title><link>https://www.gdacs.org/report.aspx?eventid=1</link><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate><geo:point>10 77</geo:point></item><item><title>Distant</title><link>https://www.gdacs.org/report.aspx?eventid=2</link><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate><geo:point>50 10</geo:point></item></channel></rss>'''
    reports = module.parse_reports(xml,module.Place(**PLACE))
    assert len(reports)==1 and reports[0]['historical']
    assert reports[0]['distance_km']==0 and reports[0]['trust']!='Verified'

def test_no_fake_translation_without_key(client):
    r=client.get('/api/guidance?hazard=Flood&language=fr').json()
    assert r['language']=='en' and 'unavailable' in r['translation']
    assert r['source']['url']=='https://www.ready.gov/floods'

def test_prepared_translations_retain_english_and_provenance(client):
    r=client.get('/api/guidance?hazard=Flood&language=ta').json()
    assert r['language']=='ta' and len(r['steps'])==len(r['english_steps'])==3
    assert 'not professionally reviewed' in r['translation']

def test_invalid_coordinates_and_dates(client):
    assert client.post('/api/weather',json={**PLACE,'latitude':100}).status_code==422
    assert client.post('/api/replan',json={'stops':[]}).status_code==422

def test_feed_outage_never_becomes_a_safety_claim(client,monkeypatch):
    async def outage(*args,**kwargs):
        raise module.HTTPException(502,'Unavailable')
    monkeypatch.setattr(module,'fetch',outage)
    monkeypatch.delenv('GNEWS_API_KEY',raising=False)
    result=client.post('/api/incidents',json=PLACE).json()
    assert result['reports']==[]
    assert any('could not be checked' in e for e in result['errors'])
    assert 'does not mean no danger' in result['coverage']

def test_report_explanation_accepts_only_fetched_ids(client,monkeypatch):
    async def known(place):
        return {'reports':[{'id':'known','title':'Past event','trust':'Disaster monitoring report','published_at':'2024-01-01T00:00:00Z','scope':'Local relevance unknown.','source':'GDACS','url':'https://www.gdacs.org/'}],'fetched_at':module.now()}
    monkeypatch.setattr(module,'incidents',known)
    assert client.post('/api/incidents/explain',json={'place':PLACE,'report_id':'invented'}).status_code==404
    result=client.post('/api/incidents/explain',json={'place':PLACE,'report_id':'known','language':'en'}).json()
    assert 'does not establish a current threat' in result['text']
    assert result['source']['trust']!='Verified'

def test_server_ai_adapter_validates_structured_output(monkeypatch):
    from types import SimpleNamespace
    from google import genai
    class FakeClient:
        def __init__(self,**kwargs):
            self.aio=self
            self.models=self
        async def generate_content(self,**kwargs):
            assert kwargs['config'].response_schema is module.Alternative
            return SimpleNamespace(text='{"activity":"Consider an indoor activity after checking availability."}')
        async def aclose(self):
            pass
    monkeypatch.setenv('GEMINI_API_KEY','test-placeholder-not-a-real-key')
    monkeypatch.setattr(genai,'Client',FakeClient)
    result=asyncio.run(module.model_json('test prompt',module.Alternative))
    assert result.activity.startswith('Consider an indoor')
