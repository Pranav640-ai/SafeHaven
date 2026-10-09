import {useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {ArrowLeft, CheckCircle2, ChevronRight, CircleHelp, MapPin, MessageCircle,
  RadioTower, Send, ShieldAlert, ShieldCheck, Users, WifiOff, X} from 'lucide-react';
import type {MeshController, MeshBeacon} from './useRescueMesh';

type Tab = 'Chats'|'Nearby'|'Beacons'|'SOS';
export function RescueMeshScreen({mesh,onBack,initialTab='Chats'}:
  {mesh:MeshController;onBack:()=>void;initialTab?:Tab}) {
  const [tab,setTab] = useState<Tab>(initialTab);
  const [deviceName,setDeviceName]=useState('SafeHaven traveler');
  const [draft,setDraft]=useState('');
  const [beaconText,setBeaconText]=useState('Community meeting point');
  const [minutes,setMinutes]=useState(30);
  const [confirmSOS,setConfirmSOS]=useState(false);
  const [sosText,setSosText]=useState('I need assistance. Please relay my SOS to someone who can help.');
  const [busy,setBusy]=useState(false);
  const run = (fn:()=>Promise<unknown>)=>{setBusy(true);void fn().catch(()=>{}).finally(()=>setBusy(false));};
  const connected=mesh.state.peers.length;
  return <div className="mesh-live">
    <header className="back-header"><button type="button" className="icon-button" aria-label="Back" onClick={onBack}><ArrowLeft size={20}/></button><h1>RescueMesh</h1><span className="mesh-live-indicator">{connected} nearby</span></header>
    <div className="mesh-live-intro"><div className="mesh-live-icon"><RadioTower size={28}/></div><div><h2>Stay connected, even offline.</h2><p>{mesh.available ? mesh.state.running ? 'Nearby discovery is active on this Android phone.' : 'Connect directly to participating Android phones.' : 'This feature needs the SafeHaven Android app.'}</p></div></div>
    {mesh.error&&<p className="mesh-live-alert" role="alert">{mesh.error}</p>}
    {mesh.notice&&<p className="mesh-live-notice" role="status">{mesh.notice}</p>}
    <div className="mesh-tabs" role="tablist" aria-label="RescueMesh sections">{(['Chats','Nearby','Beacons','SOS'] as const).map(t=><button key={t} type="button" role="tab" aria-selected={tab===t} onClick={()=>setTab(t)} className={tab===t?'selected':''}>{t}</button>)}</div>
    <AnimatePresence mode="wait" initial={false}><motion.section key={tab} className="mesh-live-section" initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} transition={{duration:.2}}>
    {tab==='Chats'&&<>
      <div className="mesh-live-sectionhead"><h3>Group messages</h3><span>{connected?`${connected} linked phones`:'No active link'}</span></div>
      <div className="mesh-live-chat" aria-live="polite">
        {mesh.messages.filter(m=>m.type==='chat'||m.type==='checkin').length===0 && <div className="mesh-live-empty"><MessageCircle size={32}/><h4>Your chat starts here</h4><p>Messages travel over nearby phone connections. Both people must approve the matching code.</p></div>}
        {mesh.messages.filter(m=>m.type==='chat'||m.type==='checkin').map(m=><div key={m.id} className={`mesh-live-bubble ${m.received?'received':'sent'}`}><strong>{m.received?m.fromName:'You'}</strong><p>{m.type==='checkin'?`Check-in: ${m.body}`:m.body}</p><small>{m.received?'Received over Nearby':m.status||'Sending'}</small></div>)}
      </div>
      <form className="mesh-live-compose" onSubmit={e=>{e.preventDefault();if(!draft.trim())return;const text=draft.trim();run(async()=>{await mesh.sendChat(text);setDraft('')})}}><input aria-label="Message" value={draft} maxLength={500} onChange={e=>setDraft(e.target.value)} placeholder="Message nearby phones" disabled={!mesh.available||connected===0}/><button type="submit" disabled={busy||connected===0||!draft.trim()} aria-label="Send message"><Send size={19}/></button></form>
      {!mesh.available&&<p className="mesh-live-hint">The hosted website cannot use Android Nearby Connections.</p>}
    </>}
    {tab==='Nearby'&&<>
      <div className="mesh-live-sectionhead"><h3>Phone connections</h3><span>{mesh.state.running?'Searching':'Stopped'}</span></div>
      {!mesh.state.running&&<label className="mesh-live-field">Name shown to other phones<input value={deviceName} maxLength={32} onChange={e=>setDeviceName(e.target.value)}/></label>}
      <button type="button" className="primary-button mesh-live-cta" disabled={!mesh.available||busy} onClick={()=>run(()=>mesh.state.running?mesh.stop():mesh.start(deviceName))}>{mesh.state.running?'Stop discovery':'Start Nearby discovery'}</button>
      <p className="mesh-live-hint">Keep this screen open on both phones. Compare the authentication digits before accepting.</p>
      {mesh.requests.map(p=><div className="mesh-live-peer-request" key={p.id}><div><strong>{p.name}</strong><p>Compare on both devices: <b>{p.code}</b></p></div><div className="mesh-live-actions"><button type="button" onClick={()=>run(()=>mesh.approve(p.id))} disabled={busy}><CheckCircle2 size={16}/> Codes match</button><button type="button" onClick={()=>run(()=>mesh.reject(p.id))} disabled={busy}><X size={16}/> Reject</button></div></div>)}
      {mesh.state.peers.map(p=><div key={p.id} className="mesh-live-peer"><ShieldCheck size={20}/><span><strong>{p.name}</strong><small>Connected</small></span></div>)}
      {!mesh.state.peers.length&&!mesh.requests.length&&<div className="mesh-live-empty"><Users size={30}/><h4>No connected phones</h4><p>{mesh.state.running?'Searching for other SafeHaven phones nearby.':'Start discovery on two Android phones.'}</p></div>}
    </>}
    {tab==='Beacons'&&<>
      <div className="mesh-live-sectionhead"><h3>Community beacons</h3><span>Self-reported</span></div>
      <p className="mesh-live-hint">A temporary, unverified meeting point. Sharing precise GPS location is voluntary and visible to participating nearby phones.</p>
      <label className="mesh-live-field">Meeting point<input maxLength={140} value={beaconText} onChange={e=>setBeaconText(e.target.value)}/></label>
      <label className="mesh-live-field">Automatically expire after<select value={minutes} onChange={e=>setMinutes(Number(e.target.value))}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option></select></label>
      <button type="button" className="primary-button mesh-live-cta" disabled={!mesh.available||busy||!beaconText.trim()} onClick={()=>run(()=>mesh.publishBeacon(beaconText,minutes))}>Share my location temporarily</button>
      {mesh.ownBeacon&&<button type="button" className="secondary-button mesh-live-cta" disabled={busy} onClick={()=>run(()=>mesh.withdrawBeacon())}>Stop sharing beacon</button>}
      {mesh.state.beacons.filter(b=>b.expiresAt>Date.now()).map(b=><BeaconItem key={b.beaconId} item={b} position={mesh.position}/>)}
      {!mesh.state.beacons.length&&<div className="mesh-live-empty"><MapPin size={32}/><h4>No active community beacons</h4><p>A beacon appears here only after a nearby participant shares one.</p></div>}
      <p className="mesh-live-hint">A beacon is not an officially approved shelter. Direction is a straight-line bearing, never a guarantee of a safe route.</p>
    </>}
    {tab==='SOS'&&<>
      <div className="mesh-live-sos"><ShieldAlert size={32}/><h3>Emergency relay</h3><p>Ask participating nearby phones to relay a request for help. This is not a call to emergency services.</p></div>
      <label className="mesh-live-field">SOS message<textarea value={sosText} maxLength={500} rows={3} onChange={e=>setSosText(e.target.value)}/></label>
      <label className="mesh-live-confirm"><input type="checkbox" checked={confirmSOS} onChange={e=>setConfirmSOS(e.target.checked)}/><span>I understand delivery is not guaranteed, and an offline queue is lost when the app closes.</span></label>
      <button type="button" className="primary-button mesh-live-cta mesh-live-danger" disabled={!mesh.available||busy||!confirmSOS||!sosText.trim()} onClick={()=>run(async()=>{await mesh.sendSOS(sosText);setConfirmSOS(false)})}><ShieldAlert size={20}/> Queue / relay SOS</button>
      <p className="mesh-live-hint">Queued on this phone: {mesh.state.queuedSOS}. An SOS is acknowledged only when a peer confirms receipt.</p>
      {mesh.messages.filter(m=>m.type==='sos').map(m=><div key={m.id} className="mesh-live-peer"><ShieldAlert size={20}/><span><strong>{m.received?`From ${m.fromName}`:'Your SOS'}</strong><small>{m.received?'Received':m.status||'Not confirmed'}</small></span></div>)}
      <button className="mesh-live-guide" type="button" onClick={onBack}>Return to safety features <ChevronRight size={16}/></button>
    </>}
    </motion.section></AnimatePresence>
  </div>;
}

function BeaconItem({item,position}:{item:MeshBeacon;position:{latitude:number;longitude:number}|null}) {
  const rad = Math.PI/180;
  const rlat1=(position?.latitude||0)*rad, rlat2=item.latitude*rad;
  const dlat=(item.latitude-(position?.latitude||0))*rad, dlon=(item.longitude-(position?.longitude||0))*rad;
  const a=Math.sin(dlat/2)**2+Math.cos(rlat1)*Math.cos(rlat2)*Math.sin(dlon/2)**2;
  const km=6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  const y=Math.sin(dlon)*Math.cos(rlat2), x=Math.cos(rlat1)*Math.sin(rlat2)-Math.sin(rlat1)*Math.cos(rlat2)*Math.cos(dlon);
  const bearing=(Math.atan2(y,x)/rad+360)%360;
  return <div className="mesh-live-beacon"><MapPin size={24}/><div><strong>{item.body}</strong><small>Shared by {item.fromName} · Unverified · Expires {new Date(item.expiresAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>{position&&<p>Approx. {km<1?`${Math.round(km*1000)} m`:`${km.toFixed(1)} km`} · Bearing {Math.round(bearing)}° from north</p>}</div></div>;
}
