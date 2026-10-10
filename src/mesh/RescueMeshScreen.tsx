import {useEffect, useState} from 'react';
import {ArrowLeft, CheckCircle2, MapPin, MessageCircle,
  RadioTower, Navigation, Send, ShieldAlert, ShieldCheck, Users, X} from 'lucide-react';
import type {MeshController, MeshBeacon} from './useRescueMesh';

type Tab = 'Chats'|'Nearby'|'Beacons'|'SOS';
export function RescueMeshScreen({mesh,onBack,onGuide,standaloneSOS=false,initialTab='Chats'}:
  {mesh:MeshController;onBack:()=>void;onGuide?:()=>void;standaloneSOS?:boolean;initialTab?:Tab}) {
  const [tab,setTab] = useState<Tab>(initialTab);
  const [connectionMode,setConnectionMode]=useState<'help'|'verified'>('help');
  const [role,setRole]=useState<'auto'|'host'|'join'>('auto');
  const [deviceName,setDeviceName]=useState('Meridian traveler');
  const [draft,setDraft]=useState('');
  const [beaconText,setBeaconText]=useState('Community meeting point');
  const [minutes,setMinutes]=useState(30);
  const [confirmSOS,setConfirmSOS]=useState(false);
  const [sosText,setSosText]=useState('I need assistance. Please relay my SOS to someone who can help.');
  const [checkinConsent,setCheckinConsent]=useState(false);
  const [capacity,setCapacity]=useState('');
  const [offer,setOffer]=useState('Meeting point');
  const [busy,setBusy]=useState(false);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  const run = (fn:()=>Promise<unknown>)=>{setBusy(true);void fn().catch(()=>{}).finally(()=>setBusy(false));};
  useEffect(()=>()=>mesh.stopCompass(),[]);
  const connected=mesh.state.peers.length;
  const title=standaloneSOS?'Emergency SOS':initialTab==='Beacons'?'Safety beacon':'RescueMesh';
  const linked=mesh.available&&connected>0;

  return <div className="mesh-live">
    <header className="back-header"><button type="button" className="icon-button" aria-label="Back" onClick={onBack}><ArrowLeft size={20}/></button><h1>{title}</h1></header>
    <div className="mesh-live-intro"><div className="mesh-live-icon"><RadioTower size={28}/></div><div><h2>{standaloneSOS?'Ask nearby travellers for help.':initialTab==='Beacons'?'Share a meeting point.':'Stay connected, even offline.'}</h2><p>{standaloneSOS ? 'Describe where you are and what help you need. If you can make a call, contact local emergency services.' : mesh.available ? connected ? 'Your nearby phone connection is active.' : mesh.state.advertising&&mesh.state.role==='host' ? 'Waiting for the other phone to join.' : mesh.state.discovering ? 'Nearby discovery is active on this Android phone.' : mesh.state.running ? mesh.error ? 'Discovery could not start. Check the message below and try again.' : 'Starting nearby discovery…' : 'Connect directly to participating Android phones.' : 'Keep your group in touch when mobile data is unavailable.'}</p></div></div>
    {mesh.error&&<p className="mesh-live-alert" role="alert">{mesh.error}</p>}
    {mesh.notice&&<p className="mesh-live-notice" role="status">{mesh.notice}</p>}
    {!standaloneSOS&&<div className="mesh-tabs" role="tablist" aria-label="RescueMesh sections">{(['Chats','Nearby','Beacons','SOS'] as const).map(t=><button key={t} type="button" role="tab" aria-selected={tab===t} onClick={()=>setTab(t)} className={tab===t?'selected':''}>{t}</button>)}</div>}
    <section key={tab} className="mesh-live-section">
    {tab==='Chats'&&<>
      <div className="mesh-live-sectionhead"><h3>Nearby messages</h3><span>{connected?`${connected} linked phones`:'No active link'}</span></div>
      <div className="mesh-live-chat" aria-live="polite">
        {mesh.messages.filter(m=>m.type==='chat'||m.type==='checkin').length===0 && <div className="mesh-live-empty"><MessageCircle size={32}/><h4>Your chat starts here</h4><p>Open Nearby and join the help network. Participating phones can connect without meeting first; messages appear here when a link is available.</p></div>}
        {mesh.messages.filter(m=>m.type==='chat'||m.type==='checkin').map(m=><div key={m.id} className={`mesh-live-bubble ${m.received?'received':'sent'}`}><strong>{m.received?m.fromName:'You'}</strong><p>{m.type==='checkin'?`Check-in: ${m.body}`:m.body}</p><small>{m.received?'Received over Nearby':m.status||'Sending'}</small></div>)}
      </div>
      <form className="mesh-live-compose" onSubmit={e=>{e.preventDefault();if(!draft.trim())return;const text=draft.trim();run(async()=>{await mesh.sendChat(text);setDraft('')})}}><input aria-label="Message" value={draft} maxLength={500} onChange={e=>setDraft(e.target.value)} placeholder="Message nearby phones" disabled={!mesh.available||connected===0}/><button type="submit" disabled={!linked||busy||!draft.trim()} aria-label="Send message"><Send size={19}/></button></form>
      {!connected&&<button className="secondary-button mesh-live-cta" onClick={()=>setTab('Nearby')}>Connect nearby phones</button>}
      {!mesh.available&&<p className="mesh-live-hint">Nearby messaging is unavailable in this browser. You can still prepare your trip, save guidance and manage your private group.</p>}
    </>}
    {tab==='Nearby'&&<>
      <div className="mesh-live-sectionhead"><h3>Phone connections</h3><span>{connected?'Connected':mesh.state.advertising&&mesh.state.role==='host'?'Waiting for phone':mesh.state.discovering?'Searching':mesh.state.running?'Starting…':'Stopped'}</span></div>
      {!mesh.state.running&&<label className="mesh-live-field">Connection mode<select aria-label="Connection mode" value={connectionMode} onChange={e=>setConnectionMode(e.target.value as 'help'|'verified')}><option value="help">Nearby help network</option><option value="verified">Pair with a known traveller</option></select></label>}
      {!mesh.state.running&&<label className="mesh-live-field">Connection setup<select aria-label="Connection setup" value={role} onChange={e=>setRole(e.target.value as 'auto'|'host'|'join')}><option value="auto">Automatic nearby network</option><option value="host">Two phones: host</option><option value="join">Two phones: join</option></select></label>}
      {(mesh.state.role||role)!=='auto'&&<p className="mesh-live-hint">Choose Host on one phone and Join on the other. Start the host first. Keep Bluetooth, Wi-Fi and Location on, and both apps open.</p>}
      {!mesh.state.running&&<label className="mesh-live-field">Name shown to other phones<input disabled={!mesh.available||busy} value={deviceName} maxLength={32} onChange={e=>setDeviceName(e.target.value)}/></label>}
      <button type="button" className="primary-button mesh-live-cta" disabled={!mesh.available||busy} onClick={()=>run(()=>mesh.state.running?mesh.stop():mesh.start(deviceName,connectionMode==='help',role))}>{mesh.state.running?'Stop discovery':'Start Nearby discovery'}</button>
      <p className="mesh-live-hint">{(mesh.state.running?mesh.state.allowUnverified:connectionMode==='help')?'Starting discovery allows nearby participants to connect automatically. You do not need to meet or exchange codes. Names and messages are unverified; share only what you choose.':'For a known travel partner, compare the code through a channel you trust and approve on both phones.'}</p>
      {mesh.requests.map(p=><div className="mesh-live-peer-request" key={p.id}><div><strong>{p.name}</strong><p>Compare on both devices: <b>{p.code}</b></p></div><div className="mesh-live-actions"><button type="button" onClick={()=>run(()=>mesh.approve(p.id))} disabled={busy}><CheckCircle2 size={16}/> Codes match</button><button type="button" onClick={()=>run(()=>mesh.reject(p.id))} disabled={busy}><X size={16}/> Reject</button></div></div>)}
      {mesh.state.peers.map(p=><div key={p.id} className="mesh-live-peer"><ShieldCheck size={20}/><span><strong>{p.name}</strong><small>Connected · self-reported name</small></span></div>)}
      {!mesh.state.peers.length&&!mesh.requests.length&&<div className="mesh-live-empty"><Users size={30}/><h4>No connected phones</h4><p>{mesh.state.running?mesh.state.role==='host'?'Waiting for a Meridian phone set to Join.':'Searching for other Meridian phones nearby.':'Start discovery to find participating phones within radio range.'}</p></div>}
      <section className="tool-card"><h3>Nearby check-in</h3><p className="mesh-live-hint">Share your name and chosen status with participating phones, separately from your private online group. No location is included. A disconnected check-in stays encrypted on this phone until sent or expired.</p><label className="mesh-live-confirm"><input type="checkbox" disabled={!mesh.available} checked={checkinConsent} onChange={e=>setCheckinConsent(e.target.checked)}/>I agree to share my name and chosen status nearby.</label><div className="mesh-live-actions">{(['safe','needHelp','unknown'] as const).map(status=><button key={status} disabled={!mesh.available||!checkinConsent||busy} onClick={()=>run(async()=>{await mesh.sendCheckIn(status);setCheckinConsent(false)})}>{status==='safe'?"I'm safe":status==='needHelp'?'Need help':'Status unknown'}</button>)}</div><p className="mesh-live-hint">Check-ins awaiting receipt: {mesh.state.queuedCheckIns||0}</p>{(mesh.state.checkIns||[]).map(m=><div className="mesh-live-peer" key={m.from}><Users size={18}/><span><strong>{m.fromName}</strong><p>{m.body==='safe'?"I'm safe":m.body==='needHelp'?'Need help':'Status unknown'}</p><small>Last status {new Date(m.createdAt).toLocaleString()}</small></span></div>)}</section>
    </>}
    {tab==='Beacons'&&<>
      <div className="mesh-live-sectionhead"><h3>Community beacons</h3><span>Self-reported</span></div>
      {!connected&&<button type="button" className="secondary-button mesh-live-cta" onClick={()=>setTab('Nearby')}>Connect phones to share a beacon</button>}
      <p className="mesh-live-hint">A temporary, unverified meeting point. Sharing precise GPS location is voluntary and visible to participating nearby phones.</p>
      <label className="mesh-live-field">Meeting point<input maxLength={88} disabled={!linked||busy} value={beaconText} onChange={e=>setBeaconText(e.target.value)}/></label>
      <div className="tool-inline"><label className="mesh-live-field tool-field">Offering<select disabled={!linked||busy} value={offer} onChange={e=>setOffer(e.target.value)}><option>Meeting point</option><option>Temporary refuge</option><option>Assistance</option></select></label><label className="mesh-live-field tool-field">Available space (optional)<input type="number" min={1} max={999} value={capacity} disabled={!linked||busy} onChange={e=>setCapacity(e.target.value)}/></label></div>
      <label className="mesh-live-field">Automatically expire after<select disabled={!linked||busy} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option></select></label>
      <button type="button" className="primary-button mesh-live-cta" disabled={!linked||busy||!beaconText.trim()||(capacity!==''&&(!Number.isInteger(Number(capacity))||Number(capacity)<1||Number(capacity)>999))} onClick={()=>run(()=>mesh.publishBeacon(`${offer}: ${beaconText}${capacity?` · Space reported for ${Number(capacity)} people`:''}`,minutes))}>Share my location temporarily</button>
      {mesh.ownBeacon&&<button type="button" className="secondary-button mesh-live-cta" disabled={busy} onClick={()=>run(()=>mesh.withdrawBeacon())}>Stop sharing beacon</button>}
      <button type="button" className="secondary-button mesh-live-cta" disabled={!mesh.available||busy||!mesh.state.beacons.some(b=>b.expiresAt>now)} onClick={()=>run(()=>mesh.locate())}>Show approximate distance & bearing</button>
      {mesh.state.beacons.map(b=><BeaconItem key={b.beaconId} item={b} position={mesh.position} heading={mesh.heading} now={now}/>)}
      {!mesh.state.beacons.some(b=>b.expiresAt>now)&&<div className="mesh-live-empty"><MapPin size={32}/><h4>No active community beacons</h4><p>A beacon appears here only after a nearby participant shares one.</p></div>}
      <p className="mesh-live-hint">A beacon is not an officially approved shelter. Direction is a straight-line bearing, never a guarantee of a safe route.</p>
    </>}
    {tab==='SOS'&&<>
      <div className="mesh-live-sos"><ShieldAlert size={32}/><h3>Emergency relay</h3><p>Ask participating nearby phones to relay a request for help. This is not a call to emergency services.</p></div>
      <label className="mesh-live-field">SOS message<textarea disabled={!mesh.available||busy} value={sosText} maxLength={500} rows={3} onChange={e=>setSosText(e.target.value)}/></label>
      <label className="mesh-live-confirm"><input type="checkbox" disabled={!mesh.available||busy} checked={confirmSOS} onChange={e=>setConfirmSOS(e.target.checked)}/><span>I agree to share this message with participating nearby phones. Delivery is not guaranteed; a pending SOS expires within 24 hours. Stopping Mesh or cancelling removes the local pending message. Phones that already received it may still relay it.</span></label>
      <button type="button" className="primary-button mesh-live-cta mesh-live-danger" disabled={!mesh.available||busy||!confirmSOS||!sosText.trim()} onClick={()=>run(async()=>{await mesh.sendSOS(sosText);setConfirmSOS(false)})}><ShieldAlert size={20}/> {linked?'Relay SOS to nearby phones':'Queue SOS on this phone'}</button>
      {onGuide&&<button className="secondary-button mesh-live-cta" type="button" onClick={onGuide}><ShieldCheck size={18}/> View emergency guidance</button>}
      <p className="mesh-live-hint">Queued on this phone: {mesh.state.queuedSOS}. An SOS is acknowledged only when a peer confirms receipt.</p>
      {mesh.state.queuedSOS>0&&<button type="button" className="secondary-button mesh-live-cta" disabled={busy} onClick={()=>run(()=>mesh.cancelQueuedSOS())}>Cancel pending SOS ({mesh.state.queuedSOS})</button>}
      {mesh.messages.filter(m=>m.type==='sos').map(m=><div key={m.id} className="mesh-live-peer"><ShieldAlert size={20}/><span><strong>{m.received?`From ${m.fromName}`:'Your SOS'}</strong><p>{m.body}</p><small>{m.received?'Received':m.status||'Not confirmed'}</small></span></div>)}
    </>}
    </section>
  </div>;
}

function BeaconItem({item,position,heading,now}:{item:MeshBeacon;position:{latitude:number;longitude:number}|null;heading:number|null;now:number}) {
  const expired=item.expiresAt<=now;
  const rad = Math.PI/180;
  const rlat1=(position?.latitude||0)*rad, rlat2=item.latitude*rad;
  const dlat=(item.latitude-(position?.latitude||0))*rad, dlon=(item.longitude-(position?.longitude||0))*rad;
  const a=Math.sin(dlat/2)**2+Math.cos(rlat1)*Math.cos(rlat2)*Math.sin(dlon/2)**2;
  const km=6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
  const y=Math.sin(dlon)*Math.cos(rlat2), x=Math.cos(rlat1)*Math.sin(rlat2)-Math.sin(rlat1)*Math.cos(rlat2)*Math.cos(dlon);
  const bearing=(Math.atan2(y,x)/rad+360)%360;
  return <div className={`mesh-live-beacon ${expired?'is-expired':''}`}><MapPin size={24}/><div><strong>{item.body}</strong><small>Shared by {item.fromName} · Unverified · Expires {new Date(item.expiresAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small><small>Last shared {new Date(item.createdAt).toLocaleString()}</small>{expired&&<p>Expired · do not use this beacon as a current refuge location.</p>}{position&&!expired&&<div className="beacon-direction"><Navigation aria-hidden="true" style={{transform:`rotate(${bearing-(heading??0)-45}deg)`}}/><div><strong>{['N','NE','E','SE','S','SW','W','NW'][Math.round(bearing/45)%8]}</strong><small>{heading===null?'North is the top of this arrow; compass unavailable':'Arrow follows device compass · keep phone level'}</small></div></div>}{position&&!expired&&<p>Approx. {km<1?`${Math.round(km*1000)} m`:`${km.toFixed(1)} km`} · Bearing {Math.round(bearing)}° from north</p>}</div></div>;
}
