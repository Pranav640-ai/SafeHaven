"""Isolated operator simulation. Never writes to the real application database."""
import json,os,sys,tempfile
from pathlib import Path
from datetime import datetime,timedelta,timezone
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from backend import app as module
from backend.safety import in_polygon
async def fixture_routes(*args,**kwargs):
    return {'code':'Ok','routes':[{'geometry':{'type':'LineString','coordinates':[[76.8,10],[77.2,10]]},'distance':5000,'duration':300}]}
def run(severity):
    with tempfile.TemporaryDirectory(prefix='safehaven-simulation-') as tmp:
        os.environ['DATABASE_PATH']=str(Path(tmp)/'scenario.db')
        os.environ['SAFETY_SIMULATION']='1';os.environ['SAFETY_ADMIN_TOKEN']='isolated-test-only-'+'x'*40
        os.environ.pop('VAPID_PRIVATE_KEY',None)
        client=TestClient(module.app);module.fetch=fixture_routes
        auth={'Authorization':'Bearer '+os.environ['SAFETY_ADMIN_TOKEN']};now=datetime.now(timezone.utc)
        warning=client.post('/api/safety/response/bulletins',headers=auth,json={'title':'[SIMULATED] Flood severity change','hazard':'Flood','severity':severity,'instructions':['[SIMULATED] Avoid the affected area and follow the scenario operator.'],'source_url':'https://www.ready.gov/floods','issuer':'Isolated test scenario','published_at':now.isoformat(),'expires_at':(now+timedelta(hours=1)).isoformat(),'polygon':[[76.9,9.9],[77.1,9.9],[77.1,10.1],[76.9,10.1],[76.9,9.9]]}).json()
        route=client.post('/api/safety/routes',json={'origin':{'latitude':10,'longitude':76.8},'destination':{'latitude':10,'longitude':77.2},'consent':True}).json()
        report=client.post('/api/safety/reports',json={'latitude':10,'longitude':77,'kind':'help','description':'[SIMULATED] Traveler requests assistance','consent':True,'observed_at':now.isoformat()}).json()['report']
        client.post('/api/safety/response/reports/'+report['id'],headers=auth,json={'status':'resolved'})
        metrics=client.get('/api/safety/response',headers=auth).json()['metrics']
        result={'simulation':True,'severity':severity,'route_affected':route['routes'][0]['avoid'],'bulletin_trust':warning['bulletin']['trust'],'metrics':metrics,'notifications_delivered':0,'users_reached':'Not measured; no real recipients'}
        client.close();return result
if __name__=='__main__':print(json.dumps([run('information'),run('critical')],indent=2))
