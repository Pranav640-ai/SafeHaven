import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from backend.app import app
from backend.intelligence.schemas.common import Coordinates, SourceStatus
from backend.intelligence.schemas.itinerary import Activity, ActivityCategory
from backend.intelligence.schemas.alerts import WarningAlert, HazardCategory, HazardSeverity, VerificationStatus
from backend.intelligence.services.risk_engine import risk_engine
from backend.intelligence.services.weather import weather_service
from backend.intelligence.services.warning_sources import warning_aggregator
from backend.intelligence.services.incident_search import incident_search_service
from backend.intelligence.services.places import places_service

def activity():
    start=(datetime.now(timezone.utc)+timedelta(days=1)).replace(hour=6,minute=0,second=0,microsecond=0)
    return Activity(id='test',title='Walk',category=ActivityCategory.OTHER_OUTDOOR,location_name='Test town',coordinates=Coordinates(latitude=10,longitude=77),start_time=start,end_time=start+timedelta(hours=12))

def test_missing_sources_never_become_low_risk_clearance():
    a=activity()
    result=asyncio.run(risk_engine.assess_activity(a,'Test town',a.coordinates,[],None,['Open-Meteo']))
    assert result.risk_score is None
    assert result.uncertainty.missing_variables
    assert 'not a safety conclusion' in result.recommended_action

def test_real_forecast_window_is_a_forecast_not_an_official_order():
    a=activity()
    data={'hourly':{'time':[(a.start_time+timedelta(hours=i)).strftime('%Y-%m-%dT%H:%M') for i in range(12)],'temperature_2m':[25]*12,'precipitation':[2]*12,'precipitation_probability':[90]*12,'wind_speed_10m':[20]*12,'wind_gusts_10m':[30]*12,'weather_code':[65]*12}}
    result=asyncio.run(risk_engine.assess_activity(a,'Test town',a.coordinates,[],data,[]))
    assert result.risk_score is not None
    assert result.evidence[0].verification_status==VerificationStatus.FORECAST
    assert result.mandatory_overrides==[]

def test_undated_event_is_not_an_active_warning():
    a=activity()
    alert=WarningAlert(id='earthquake',source_org='USGS',published_at=datetime.now(timezone.utc),title='Earthquake',original_text='Occurred',geographic_coverage='Test town',hazard_category=HazardCategory.EARTHQUAKE,severity=HazardSeverity.SEVERE,verification_status=VerificationStatus.HISTORICAL)
    assert incident_search_service.is_temporally_relevant(alert,a.start_time,a.end_time)==(False,0.0)

def test_risk_route_reports_provider_failures_without_erasing_old_api(monkeypatch):
    monkeypatch.setattr(weather_service,'fetch_forecast',AsyncMock(return_value=(None,SourceStatus(source_name='Open-Meteo',status='failed'))))
    monkeypatch.setattr(warning_aggregator,'fetch_all_warnings',AsyncMock(return_value=([],[SourceStatus(source_name='USGS',status='failed')])))
    response=TestClient(app).post('/api/intelligence/risk/assess',json={'place':{'name':'Test town','latitude':10,'longitude':77,'timezone':'Asia/Kolkata'},'date':activity().start_time.date().isoformat(),'kind':'outdoor'})
    assert response.status_code==200,response.text
    assert response.json()['summary']['activity_assessments'][0]['risk_score'] is None
    assert response.json()['summary']['source_statuses'][1]['status']=='failed'
    assert TestClient(app).post('/api/intelligence/risk/assess',json={'place':{'name':'X','latitude':999,'longitude':77},'date':'2026-10-11'}).status_code==422

def test_nearby_failure_does_not_fabricate_a_venue(monkeypatch):
    monkeypatch.setattr(places_service,'find_nearby_places',AsyncMock(return_value=([],SourceStatus(source_name='OpenStreetMap',status='failed'))))
    monkeypatch.setattr(warning_aggregator,'fetch_all_warnings',AsyncMock(return_value=([],[])))
    response=TestClient(app).get('/api/intelligence/destinations/nearby?latitude=10&longitude=77')
    assert response.status_code==200,response.text
    assert response.json()['candidates']==[]
    assert response.json()['source_status']['status']=='failed'


def test_unconfigured_local_adapter_is_not_a_successful_official_feed():
    from backend.intelligence.services.warning_sources import LocalAuthoritativeAdapter
    records,status=asyncio.run(LocalAuthoritativeAdapter().fetch_warnings())
    assert records==[] and status.status=='skipped'


def test_strong_earthquake_remains_a_report_not_an_evacuation(monkeypatch):
    import httpx
    from backend.intelligence.services import warning_sources
    from backend.intelligence.services.warning_sources import USGSAdapter
    real_client=httpx.AsyncClient
    body={'features':[{'id':'unit-quake','geometry':{'coordinates':[77,10,12]},'properties':{'mag':8,'place':'Test town','title':'M8 Test earthquake','time':datetime.now(timezone.utc).timestamp()*1000,'url':'https://earthquake.usgs.gov/example','status':'reviewed'}}]}
    transport=httpx.MockTransport(lambda request:httpx.Response(200,json=body))
    monkeypatch.setattr(warning_sources.httpx,'AsyncClient',lambda **options:real_client(transport=transport,**options))
    records,status=asyncio.run(USGSAdapter().fetch_warnings())
    assert status.status=='ok' and len(records)==1
    assert not records[0].is_mandatory_override
    assert records[0].valid_until is None
    assert records[0].verification_status==VerificationStatus.HISTORICAL
