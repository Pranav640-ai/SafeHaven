import {useEffect,useState} from 'react';
import {ShieldAlert} from 'lucide-react';
import {api,type Place} from '../services/api';
import {read,save,stamp} from '../services/storage';
import './safety.css';
type Bulletin={id:string;title:string;hazard:string;severity:string;instructions:string[];polygon:number[][];source_url:string;issuer:string;trust:string;published_at:string;expires_at:string;impact_at:string|null};
type Packet={bulletin:Bulletin;payload:string;signature:string|null;public_key:string|null};
function safeLink(url:string){return url.startsWith('https://')?url:undefined;}
function stable(value:unknown):string {return JSON.stringify(value,(_key,v)=>v && typeof v==='object' && !Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}
async function signatureStatus(packet:Packet) {
    if(!packet.signature||!packet.public_key)return 'Unsigned bulletin';
    const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
    try {
        if(stable(JSON.parse(new TextDecoder().decode(bytes(packet.payload))))!==stable(packet.bulletin))return 'Bulletin changed · signature invalid';
        const pin=import.meta.env.VITE_ALERT_PUBLIC_KEY;
        if(!pin || pin!==packet.public_key)return 'Publisher key not trusted on this device';
        const key=await crypto.subtle.importKey('raw',bytes(pin),{name:'Ed25519'},false,['verify']);
        return await crypto.subtle.verify('Ed25519',key,bytes(packet.signature),bytes(packet.payload))?'Publisher signature verified':'Invalid publisher signature';
    } catch {return 'Signature could not be checked';}
}
export function AlertCard({packet}:{packet:Packet}) {
    const [verification,setVerification]=useState('Checking publisher signature…');
    useEffect(()=>{let active=true;void signatureStatus(packet).then(s=>{if(active)setVerification(s)});return()=>{active=false}},[packet]);
    const b=packet.bulletin;
    if(new Date(b.expires_at).getTime()<=Date.now())return <article className="tool-card"><h3>{b.title}</h3><p>Expired saved bulletin · not a current instruction.</p><a href={safeLink(b.source_url)} target="_blank" rel="noreferrer">Read the original source</a></article>;
    return <article className="tool-card"><div className="safety-card-label"><ShieldAlert size={18}/>{b.trust} · {b.severity}</div><h3>{b.title}</h3><p>{b.issuer} · {stamp(b.published_at)}</p><p>{verification}</p>{verification!=='Publisher signature verified'?<p role="alert">Publisher verification is incomplete. Read the original source before relying on these instructions.</p>:<><p>Estimated time to impact: {b.impact_at?stamp(b.impact_at):'Unknown'}</p><ol>{b.instructions.map((step,i)=><li key={i}>{step}</li>)}</ol></>}<a href={safeLink(b.source_url)} target="_blank" rel="noreferrer">Read source bulletin</a><small>Expires {stamp(b.expires_at)} · Follow the issuing authority's instructions.</small></article>;
}
export function AreaWarnings({place}:{place:Place}){
    const key=`alerts:${place.latitude},${place.longitude}`;const [data,setData]=useState<{alerts:Packet[];fetched_at:string}>(()=>read(key,{alerts:[],fetched_at:''}));const [failed,setFailed]=useState(false);
    useEffect(()=>{let active=true;void api<typeof data>('/safety/alerts',place).then(r=>{if(active){setData(r);save(key,r);const all=read<Record<string,{place:string;alerts:Packet[];fetched_at:string}>>('saved-area-warnings',{});save('saved-area-warnings',{...all,[key]:{place:place.name,...r}})}}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[place.latitude,place.longitude]);
    return <section><h3>Source-linked area warnings</h3>{failed&&<p className="tool-notice">Unable to refresh area warnings. Any saved records below may be out of date.</p>}{data.alerts.map(p=><AlertCard key={p.bulletin.id} packet={p}/>)}{!data.alerts.length&&<p className="tool-muted">No matching published bulletin is available. Local official warning coverage is incomplete.</p>}<small className="tool-muted">Last checked {stamp(data.fetched_at)}</small></section>;
}
export function SavedAreaWarnings(){const all=read<Record<string,{place:string;alerts:Packet[];fetched_at:string}>>('saved-area-warnings',{});return <section className="content-section"><h2>Saved area warnings</h2>{Object.values(all).filter(r=>r.alerts.length).map((r,i)=><section key={i}><h3>{r.place}</h3><p className="tool-muted">Saved snapshot · Checked {stamp(r.fetched_at)}</p>{r.alerts.map(p=><AlertCard key={p.bulletin.id} packet={p}/>)}</section>)}{!Object.values(all).some(r=>r.alerts.length)&&<p className="tool-muted">Published area warnings are saved when you check a destination. No warning has been downloaded yet.</p>}</section>}
