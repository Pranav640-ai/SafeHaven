"""Public context adapted from the user-supplied incident-module ZIP.

Uses existing observations/ownership/moderation; context never verifies a report.
"""
import asyncio
import json
import ssl
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse
import httpx
from fastapi import HTTPException
from backend.safety import router, observations

def safe_url(url):
    return url if isinstance(url,str) and urlparse(url).scheme in ['https','http'] else None

async def fetch_json(url,params=None):
    async with httpx.AsyncClient(timeout=8.5,verify=ssl.create_default_context()) as client:
        response=await client.get(url,params=params)
        response.raise_for_status()
        if len(response.content)>2_000_000:
            raise ValueError('Source response too large')
        data=response.json()
        if not isinstance(data,dict):
            raise ValueError('Unexpected source format')
        return data

def item(source,title,url,detail,time=None):
    return dict(source=source,title=str(title)[:180],url=safe_url(url),detail=detail,time=time)

async def weather(report):
    data=await fetch_json('https://api.open-meteo.com/v1/forecast',dict(latitude=report['latitude'],longitude=report['longitude'],current='precipitation,weather_code,wind_speed_10m',daily='precipitation_sum,wind_speed_10m_max',timezone='auto',forecast_days=2))
    if not isinstance(data.get('current'),dict):raise ValueError('Weather context unavailable')
    current=data.get('current',{});daily=data.get('daily',{}).get('precipitation_sum',[])
    rain=current.get('precipitation');wind=current.get('wind_speed_10m');total=daily[0] if daily else None
    signal=report.get('category') in ['flood','landslide','weather','road_blockage'] and ((isinstance(total,(int,float)) and total>=20) or (isinstance(rain,(int,float)) and rain>=5) or (isinstance(wind,(int,float)) and wind>=50))
    return dict(supports_context=bool(signal),evidence=[item('Open-Meteo','Weather context','https://open-meteo.com/en/docs',f'Model current rain: {rain if rain is not None else "unknown"} mm; wind: {wind if wind is not None else "unknown"} km/h; daily rain forecast: {total if total is not None else "unknown"} mm.',current.get('time'))],note='Model conditions/forecasts at check time, not confirmation of the reported incident.')

async def earthquakes(report):
    data=await fetch_json('https://earthquake.usgs.gov/fdsnws/event/1/query',dict(format='geojson',latitude=report['latitude'],longitude=report['longitude'],maxradiuskm=150,starttime=(datetime.now(timezone.utc)-timedelta(days=7)).date().isoformat(),minmagnitude=2.5,orderby='time',limit=10))
    if not isinstance(data.get('features'),list):raise ValueError('Event records unavailable')
    evidence=[]
    for event in data.get('features',[])[:5]:
        p=event.get('properties',{});published=p.get('time')
        stamp=datetime.fromtimestamp(published/1000,timezone.utc).isoformat() if isinstance(published,(int,float)) else None
        evidence.append(item('USGS',p.get('title','Recorded earthquake'),p.get('url'),f'Magnitude {p.get("mag","unknown")}; nearby record, local effects unconfirmed.',stamp))
    return dict(supports_context=False,evidence=evidence,note='Nearby earthquake records do not verify a separately reported hazard or imply an evacuation order.')

async def disasters(report):
    from backend.app import distance
    data=await fetch_json('https://www.gdacs.org/gdacsapi/api/events/geteventlist/events4app')
    if not isinstance(data.get('features'),list):raise ValueError('Disaster records unavailable')
    evidence=[]
    for feature in data.get('features',[]):
        coords=feature.get('geometry',{}).get('coordinates',[])
        if len(coords)<2 or not all(isinstance(v,(int,float)) for v in coords[:2]) or distance(report['latitude'],report['longitude'],coords[1],coords[0])>250:
            continue
        p=feature.get('properties',{});urls=p.get('url');url=urls.get('report') or urls.get('details') if isinstance(urls,dict) else urls
        evidence.append(item('GDACS',p.get('name') or p.get('title') or 'Nearby disaster report',url or 'https://www.gdacs.org/',f'Type {p.get("eventtype","unknown")}; alert {p.get("alertlevel","unknown")}; event-centre proximity only.',p.get('fromdate')))
        if len(evidence)>=5:break
    return dict(supports_context=False,evidence=evidence,note='Nearby reports may concern another event; proximity does not verify this observation.')

async def news(report):
    import re
    place=re.sub(r'[^\w .\'-]','',report.get('place_name',''))[:80]
    if len(place.strip())<3:return dict(status='not_checked',supports_context=False,evidence=[],note='A city/district name is needed for relevant news discovery.')
    terms={'flood':'flood','landslide':'landslide','road_blockage':'road closure','fire':'wildfire','weather':'storm'}
    data=await fetch_json('https://api.gdeltproject.org/api/v2/doc/doc',dict(query=f'"{place}" {terms.get(report.get("category"),"disaster")}',mode='artlist',format='json',maxrecords=10,timespan='7d'))
    if not isinstance(data.get('articles'),list):raise ValueError('News discovery unavailable')
    evidence=[item('GDELT',a.get('title','Related article'),a['url'],f'Publisher: {a.get("domain","unknown")}; keyword match only.',a.get('seendate')) for a in data.get('articles',[])[:5] if safe_url(a.get('url'))]
    return dict(supports_context=False,evidence=evidence,note='News discovery only; article contents are not independently verified.')

async def gather_evidence(report):
    async def check(name,fn):
        try:return {'source':name,'status':'available',**await fn(report)}
        except Exception:return dict(source=name,status='unavailable',supports_context=False,evidence=[],note='Source could not be checked. Missing coverage is not evidence against the report.')
    sources=await asyncio.gather(*(check(n,f) for n,f in [('Open-Meteo',weather),('USGS',earthquakes),('GDACS',disasters),('GDELT',news)]))
    return dict(verification_status='unverified',assessment='contextual_evidence_found' if any(s['supports_context'] for s in sources) else 'no_supporting_context',explanation='Public sources provide context only. They neither verify this report nor establish it is false.',checked_at=datetime.now(timezone.utc).isoformat(),sources=sources)

cache={}
@router.get('/reports/{rid}/evidence')
async def evidence(rid:str):
    report=next((r for r in observations() if r['id']==rid and r['status'] not in ['rejected','resolved']),None)
    if not report:raise HTTPException(404,'Active report not found.')
    key=json.dumps(report,sort_keys=True);now=datetime.now(timezone.utc)
    if key in cache and cache[key][0]>now:return cache[key][1]
    result=dict(report_id=rid,**await gather_evidence(report))
    if len(cache)>=200:cache.pop(next(iter(cache)))
    cache[key]=(now+timedelta(minutes=5),result)
    return result
