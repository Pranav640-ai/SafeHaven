import {useEffect, useRef, useState} from 'react';
import {ArrowRight, MapPin} from 'lucide-react';
import {api, type Place} from '../services/api';

export function PlaceSearch({select,query,onQueryChange,hideInput=false}:{select:(p:Place)=>void;query?:string;onQueryChange?:(q:string)=>void;hideInput?:boolean}) {
  const [localQuery,setLocalQuery]=useState('');
  const q=query??localQuery;
  const change=(value:string)=>onQueryChange?onQueryChange(value):setLocalQuery(value);
  const [places,setPlaces]=useState<Place[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const generation=useRef(0);
  const [name,setName]=useState('');
  const [latitude,setLatitude]=useState('');
  const [longitude,setLongitude]=useState('');
  const [timezone,setTimezone]=useState('UTC');
  useEffect(()=>{generation.current++;setPlaces([]);setBusy(false);setError('');},[q]);
  useEffect(()=>()=>{generation.current++;},[]);
  const choose=(p:Place)=>{select(p);setPlaces([]);change('');};
  const search=async()=>{
    const request=++generation.current;setBusy(true);setError('');setPlaces([]);
    try {
      const result=await api<{places:Place[]}>(`/destinations?q=${encodeURIComponent(q.trim())}`);
      if(request!==generation.current)return;
      setPlaces(result.places);
      if(!result.places.length)setError('No named locations found. Try a nearby town, or choose the exact coordinates below.');
    } catch(e) {if(request===generation.current)setError(e instanceof Error?e.message:String(e));}
    finally {if(request===generation.current)setBusy(false);}
  };
  return <div className="place-search">
    <form className="tool-inline" onSubmit={e=>{e.preventDefault();void search();}}>
      {!hideInput&&<input aria-label="Destination search" placeholder="Search any town or city" minLength={2} maxLength={100} required value={q} onChange={e=>change(e.target.value)}/>}
      <button className="secondary-button" disabled={busy||q.trim().length<2}>{busy?'Searching…':hideInput?'Search all locations':'Search'}</button>
    </form>
    {error&&<p role="alert" className="tool-notice tool-error">{error}</p>}
    {places.length>0&&<div className="list-panel">{places.map((p,i)=><button type="button" className="tool-place" key={`${p.latitude}-${p.longitude}-${i}`} onClick={()=>choose(p)}><MapPin size={18}/><span><strong>{p.name}</strong><small>{[p.region,p.country].filter(Boolean).join(', ')}</small></span><ArrowRight size={17}/></button>)}</div>}
    <details className="tool-card"><summary>Choose an exact map point</summary><p className="tool-muted">For a trail, landmark or place missing from search, copy its latitude and longitude from your map. Set its local timezone for dated risk checks; UTC is the default.</p>
      <form onSubmit={e=>{e.preventDefault();const lat=Number(latitude),lon=Number(longitude);if(!name.trim()||!latitude.trim()||!longitude.trim()||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){setError('Enter a name and valid latitude/longitude.');return;}try{new Intl.DateTimeFormat('en',{timeZone:timezone.trim()});}catch{setError('Enter a valid timezone, such as Asia/Kolkata or UTC.');return;}setError('');choose({name:name.trim(),latitude:lat,longitude:lon,timezone:timezone.trim(),country:'',region:''});}}>
        <label className="tool-field">Location name<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
        <div className="tool-inline"><label className="tool-field">Latitude<input type="number" step="any" min={-90} max={90} required value={latitude} onChange={e=>setLatitude(e.target.value)}/></label><label className="tool-field">Longitude<input type="number" step="any" min={-180} max={180} required value={longitude} onChange={e=>setLongitude(e.target.value)}/></label></div>
        <label className="tool-field">Location timezone<input required maxLength={100} placeholder="Asia/Kolkata" value={timezone} onChange={e=>setTimezone(e.target.value)}/></label>
        <button className="secondary-button">Use this location</button>
      </form>
    </details>
  </div>;
}
