"""Compatibility routes for selected functionality imported from feature/backend."""
import asyncio
from datetime import date, datetime, time, timezone, timedelta
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from backend.intelligence.schemas.common import Coordinates
from backend.intelligence.schemas.itinerary import Activity, ActivityCategory, Itinerary, UserPreferences
from backend.intelligence.services.risk_engine import risk_engine
from backend.intelligence.services.incident_search import haversine_distance_km
from backend.intelligence.services.places import places_service
from backend.intelligence.services.warning_sources import warning_aggregator
from backend.intelligence.services.alternative_ranker import alternative_ranker

router = APIRouter(prefix='/api/intelligence', tags=['Travel intelligence'])

class Destination(Coordinates):
    name: str = Field(min_length=1,max_length=200)
    timezone: str = Field(default='UTC',max_length=100)

class DailyRiskRequest(BaseModel):
    place: Destination
    date: date
    kind: str = Field(default='outdoor',pattern='^(outdoor|indoor|water|booking)$')

@router.post('/risk/assess')
async def assess(request: DailyRiskRequest):
    try:
        tz = ZoneInfo(request.place.timezone)
    except ZoneInfoNotFoundError:
        raise HTTPException(422, 'Choose a destination with a valid timezone.')
    category = {'outdoor':ActivityCategory.OTHER_OUTDOOR,'indoor':ActivityCategory.OTHER_INDOOR,'water':ActivityCategory.OUTDOOR_BEACH,'booking':ActivityCategory.TRANSIT}[request.kind]
    activity = Activity(id='day',title=f'{request.kind.title()} planning window',category=category,
        location_name=request.place.name,coordinates=request.place,
        start_time=datetime.combine(request.date,time(6),tzinfo=tz),end_time=datetime.combine(request.date,time(18),tzinfo=tz))
    itinerary=Itinerary(destination_name=request.place.name,destination_coordinates=request.place,
        start_date=request.date,end_date=request.date,activities=[activity])
    try:
        summary = await asyncio.wait_for(risk_engine.assess_itinerary(itinerary),35)
    except TimeoutError:
        raise HTTPException(504,'Risk sources timed out. Existing briefing remains available.')
    alerts,_=await warning_aggregator.fetch_all_warnings()
    events=[]
    for alert in alerts:
        if alert.coordinates is None:
            continue
        distance=haversine_distance_km(request.place,alert.coordinates)
        if distance>100:
            continue
        url=alert.original_url
        events.append({'id':alert.id,'title':alert.title,'source':alert.source_org,
            'url':url if url and urlparse(url).scheme in ['http','https'] else None,
            'published_at':alert.published_at.isoformat(),'distance_km':round(distance,1),
            'status':'Reported event; current local impact unconfirmed.'})
    return {'reported_events':events[:10],'assessed_at':datetime.now(timezone.utc).isoformat(),'summary':summary,
        'window':'06:00–18:00 local time; your exact activity time is not recorded.',
        'limitations':'Prototype planning model, not a disaster probability or travel clearance. Event-centre proximity does not establish local impact. Official local instructions take priority.'}

@router.get('/destinations/nearby')
async def nearby(latitude:float=Query(ge=-90,le=90),longitude:float=Query(ge=-180,le=180),
    prefer_indoor:bool=True,radius_km:float=Query(default=10,ge=1,le=25)):
    origin=Coordinates(latitude=latitude,longitude=longitude)
    candidates,status=await places_service.find_nearby_places(origin=origin,radius_km=radius_km,
        preferred_category=ActivityCategory.INDOOR_MUSEUM if prefer_indoor else ActivityCategory.OTHER_OUTDOOR,limit=16)
    alerts,sources=await warning_aggregator.fetch_all_warnings()
    now=datetime.now(timezone.utc)
    activity=Activity(id='search',title='Alternative search',category=ActivityCategory.OTHER_OUTDOOR,
        location_name='Chosen destination',coordinates=origin,start_time=now,end_time=now+timedelta(hours=3))
    ranked,_=alternative_ranker.filter_and_rank_alternatives(activity,candidates,alerts,
        UserPreferences(max_alternative_distance_km=radius_km),prefer_indoor,radius_km)
    for candidate in ranked:
        candidate.risk_evidence_coverage='Limited source proximity check; opening/access/safety unconfirmed.'
    return {'candidates':ranked[:8],'source_status':status,'warning_sources':sources,
        'limitations':'Suggestions from OpenStreetMap, not verified open or safe venues. Distance is straight-line; routes, opening times and accessibility require confirmation.'}
