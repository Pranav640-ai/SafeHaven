import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, CloudRain, Download, MapPin, Plus, RefreshCw, ShieldAlert, Trash2, Users, ThermometerSun, Zap, Phone, Map } from 'lucide-react';
import { api, type Place, type Weather, type Incidents, type Plan, type Stop, type Guidance, type Membership, type Group, type Source } from '../services/api';
import { read, save, useSaved, stamp, today } from '../services/storage';
import './travel.css';
import { offlineReady, updateAvailable, updateApp } from '../services/pwa';
type Props = {
    back: () => void;
    notify: (s: string) => void;
};
type Explanation = {
    text: string;
    english_text: string;
    language: string;
    translation: string;
    source: Source;
    published_at: string | null;
    fetched_at: string;
};
function Header({ title, back }: {
    title: string;
    back: () => void;
}) { return <header className="back-header"><button className="icon-button" aria-label="Back" onClick={back}><ArrowLeft size={20}/></button><h1>{title}</h1></header>; }
function Provenance({ source, time }: {
    source: Source;
    time?: string;
}) { return <p className="source-line"><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><span>{source.trust}{time ? ` · Retrieved ${stamp(time)}` : ''}</span></p>; }
function ErrorNote({ error }: {
    error: string;
}) { return error ? <p role="alert" className="tool-notice tool-error">{error}</p> : null; }
function PlaceSearch({ select }: {
    select: (p: Place) => void;
}) {
    const [q, setQ] = useState('');
    const [places, setPlaces] = useState<Place[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const search = async () => { setBusy(true); setError(''); try {
        const r = await api<{
            places: Place[];
        }>(`/destinations?q=${encodeURIComponent(q)}`);
        setPlaces(r.places);
        if (!r.places.length)
            setError('No destinations found. Try a nearby town or a different spelling.');
    }
    catch (e) {
        setError(String(e instanceof Error ? e.message : e));
    }
    finally {
        setBusy(false);
    } };
    return <div className="place-search"><form onSubmit={e => { e.preventDefault(); void search(); }} className="tool-inline"><input aria-label="Destination search" placeholder="Search a town or city" value={q} minLength={2} maxLength={100} required onChange={e => setQ(e.target.value)}/><button className="secondary-button" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button></form><ErrorNote error={error}/>{places.length > 0 && <div className="list-panel">{places.map((p, i) => <button className="tool-place" key={`${p.latitude}-${p.longitude}-${i}`} onClick={() => { select(p); setPlaces([]); setQ(''); }}><MapPin size={18}/><span><strong>{p.name}</strong><small>{p.region}, {p.country}</small></span><ArrowRight size={17}/></button>)}</div>}</div>;
}
const DEFAULT: Place = { name: 'Manali', latitude: 32.2396, longitude: 77.1887, country: 'India', region: 'Himachal Pradesh', timezone: 'Asia/Kolkata' };
export function RiskTool({ back, notify, destination }: Props & {
    destination: string;
}) {
    const [explanation, setExplanation] = useState<{
        id: string;
        data: Explanation;
    } | null>(null);
    const [place, setPlace] = useSaved<Place>('destination', DEFAULT);
    const [date, setDate] = useState(today());
    const [tab, setTab] = useState('Overview');
    const [weather, setWeather] = useState<Weather | null>(() => read(`weather:${place.latitude},${place.longitude}`, null));
    const [incidents, setIncidents] = useState<Incidents | null>(() => read(`incidents:${place.latitude},${place.longitude}`, null));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [cached, setCached] = useState(true);
    const requestId = useRef(0);
    useEffect(() => { if (destination === place.name)
        return; let active = true; api<{
        places: Place[];
    }>(`/destinations?q=${encodeURIComponent(destination)}`).then(r => { if (active && r.places[0])
        setPlace(r.places[0]); }).catch(() => { }); return () => { active = false; }; }, [destination]);
    const refresh = async () => {
        const id = ++requestId.current;
        setBusy(true);
        setError('');
        const results = await Promise.allSettled([api<Weather>('/weather', place), api<Incidents>('/incidents', place)]);
        if (id !== requestId.current)
            return;
        const failures: string[] = [];
        if (results[0].status === 'fulfilled') {
            setWeather(results[0].value);
            save(`weather:${place.latitude},${place.longitude}`, results[0].value);
        }
        else
            failures.push(results[0].reason.message);
        if (results[1].status === 'fulfilled') {
            setIncidents(results[1].value);
            save(`incidents:${place.latitude},${place.longitude}`, results[1].value);
        }
        else
            failures.push(results[1].reason.message);
        setCached(results.some(r => r.status === 'rejected'));
        setError(failures.join(' '));
        setBusy(false);
    };
    useEffect(() => { setWeather(read(`weather:${place.latitude},${place.longitude}`, null)); setIncidents(read(`incidents:${place.latitude},${place.longitude}`, null)); setCached(true); void refresh(); return () => { requestId.current++; }; }, [place.latitude, place.longitude]);
    const day = weather?.days.find(d => d.date === date);
    return <><Header title="Risk intelligence" back={back}/><div className="destination-cover"><div className="destination-cover-art"/><span className="destination-overline">DESTINATION</span><h2>{place.name}</h2><p><MapPin size={14}/>{place.region}, {place.country}</p></div><PlaceSearch select={setPlace}/><label className="tool-field">Travel date<input type="date" value={date} onChange={e => setDate(e.target.value)}/></label>
    <div className="tab-strip tab-tight risk-view-tabs" role="tablist" aria-label="Risk views">{['Overview', 'Weather', 'Reports'].map(t => <button role="tab" aria-selected={tab === t} className={tab === t ? 'selected' : ''} key={t} onClick={() => setTab(t)}>{t}</button>)}</div>
    <div className="tool-inline"><p className="tool-muted">{cached ? 'Saved/partial information · check timestamps' : 'Fetched from providers · check timestamps'}</p><button className="icon-button" aria-label="Refresh destination data" disabled={busy} onClick={() => void refresh()}><RefreshCw size={18}/></button></div><ErrorNote error={error}/>{busy && <p role="status">Checking sources…</p>}
    {tab === 'Overview' && <><section className="risk-summary"><span className="risk-summary-symbol"><ShieldAlert size={27}/></span><span><small>PLANNING SIGNALS · MODEL ESTIMATE</small><strong>{day?.signals.length ? 'Review these activities' : 'No safety conclusion'}</strong><p>{day ? day.signals.length ? day.signals.join(' ') : 'No app threshold triggered. This does not mean the destination is safe.' : 'Forecast unavailable for the chosen date.'}</p></span></section><p className="tool-notice">Local official instructions take priority. Reports near an event centre do not establish that your destination is affected.</p>{incidents && <p className="tool-muted">{incidents.reports.length} source reports found. {incidents.coverage}</p>}</>}
    {tab === 'Weather' && <><h2>Weather outlook</h2>{day ? <div className="metric-two"><div><CloudRain size={22}/><span>Rain / wind</span><strong>{day.rain_mm ?? 'Unknown'} mm</strong><small>{day.wind_kmh ?? 'Unknown'} km/h</small></div><div><span>Temperature</span><strong>{day.min_c ?? '?'}–{day.max_c ?? '?'}°C</strong><small>{weather?.timezone}</small></div></div> : <p className="tool-notice">This date is outside available forecast coverage, or the provider is unavailable.</p>}{weather && <><Provenance source={weather.source} time={weather.fetched_at}/><p className="tool-muted">{weather.limitations}</p><div className="forecast-list">{weather.days.map(d => <button key={d.date} className={d.date === date ? 'selected' : ''} onClick={() => setDate(d.date)}><span>{d.date}</span><strong>{d.max_c ?? '?'}°C</strong><small>{d.rain_mm ?? '?'} mm rain</small></button>)}</div></>}</>}
    {tab === 'Reports' && <><h2>Source reports</h2>{incidents?.reports.map(r => <article className="tool-card" key={r.id}><h3>{r.title}</h3><p>{r.trust} · {!r.published_at ? 'Publication time unknown' : r.historical ? 'Past event/report — not a current threat' : 'Recent report — local relevance unconfirmed'}</p><small>Published: {stamp(r.published_at)}{r.distance_km !== null ? ` · Event centre ${r.distance_km} km away` : ''}</small><p>{r.scope}</p><a href={r.url} target="_blank" rel="noreferrer">Read {r.source} report</a><button className="secondary-button" onClick={() => { setError(''); void api<Explanation>('/incidents/explain', { place, report_id: r.id, language: read('language', 'en') }).then(data => setExplanation({ id: r.id, data })).catch(e => setError(e.message)); }}>Explain in preferred language</button>{explanation?.id === r.id && <div className="tool-notice"><p lang={explanation.data.language}>{explanation.data.text}</p><small>{explanation.data.translation}</small>{explanation.data.language !== 'en' && <details><summary>English metadata</summary><p>{explanation.data.english_text}</p></details>}</div>}</article>)}{!incidents?.reports.length && <p className="tool-notice">No matching reports available. This does not establish that there are no hazards.</p>}{incidents?.errors.map(e => <p className="tool-notice" key={e}>{e}</p>)}</>}
    <button className="secondary-button" disabled={!weather} onClick={() => { save('briefing', { weather, incidents, saved_at: new Date().toISOString() }); notify('Briefing saved on this device'); }}><Bookmark size={18}/> Save briefing to safety pack</button>
  </>;
}
export function ReplanTool({ back, notify }: Props) {
    const [stops, setStops] = useSaved<Stop[]>('itinerary', []);
    const [place, setPlace] = useSaved<Place>('destination', DEFAULT);
    const [activity, setActivity] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [date, setDate] = useState(today());
    const [kind, setKind] = useState<Stop['kind']>('outdoor');
    const [plan, setPlan] = useSaved<Plan | null>('proposal', null);
    const [version, setVersion] = useState('original');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const analyze = async () => { setBusy(true); setError(''); try {
        setPlan(await api<Plan>('/replan', { stops }));
        setVersion('revised');
    }
    catch (e) {
        setError(e instanceof Error ? e.message : String(e));
    }
    finally {
        setBusy(false);
    } };
    const invalidate = () => { setPlan(null); setVersion('original'); };
    return <><Header title="Trip replanner" back={back}/><div className="replan-banner"><small>YOUR ITINERARY</small><h2>Keep your plans flexible.</h2><p>Change affected activities while retaining dates and bookings.</p></div><PlaceSearch select={p => setPlace(p)}/><p className="tool-muted">Adding activities in {place.name}</p><form className="tool-card" onSubmit={e => { e.preventDefault(); setStops(old => editingId ? old.map(s => s.id === editingId ? { id: s.id, date, activity: activity.trim(), kind, place } : s) : [...old, { id: crypto.randomUUID(), date, activity: activity.trim(), kind, place }]); setActivity(''); setEditingId(null); invalidate(); }}><label className="tool-field">Activity<input value={activity} maxLength={200} required onChange={e => setActivity(e.target.value)} placeholder="Waterfall visit, museum, hotel booking…"/></label><div className="tool-inline"><label className="tool-field">Date<input type="date" required value={date} onChange={e => setDate(e.target.value)}/></label><label className="tool-field">Type<select aria-label="Activity type" value={kind} onChange={e => setKind(e.target.value as Stop['kind'])}><option value="outdoor">Outdoor</option><option value="water">Water activity</option><option value="indoor">Indoor</option><option value="booking">Fixed booking</option></select></label></div><button className="secondary-button" disabled={(!editingId && stops.length >= 20) || !activity.trim()}><Plus size={17}/> {editingId ? 'Save activity changes' : 'Add activity'}</button></form>
    <ErrorNote error={error}/><div className="segmented" role="tablist" aria-label="Itinerary version">{['original', 'revised'].map(v => <button role="tab" aria-selected={version === v} className={version === v ? 'selected' : ''} disabled={v === 'revised' && !plan} key={v} onClick={() => setVersion(v)}>{v === 'original' ? 'Original plan' : 'Proposed plan'}</button>)}</div>
    {!stops.length && <p className="tool-notice">Add your first activity to build a trip.</p>}{stops.map((s, i) => { const result = plan?.stops.find(p => p.original.id === s.id); return <article className="tool-card" key={s.id}><div className="tool-inline"><small>{s.date} · {s.place.name} · {s.kind}</small><button className="section-link" onClick={() => { setEditingId(s.id); setActivity(s.activity); setDate(s.date); setKind(s.kind); setPlace(s.place); }}>Edit</button><button className="icon-button" aria-label={`Remove activity ${i + 1}`} onClick={() => { setStops(old => old.filter(x => x.id !== s.id)); invalidate(); }}><Trash2 size={17}/></button></div><h3>{version === 'revised' && result ? result.alternative : s.activity}</h3>{result && <><p>{result.assessment}</p>{result.changed && <p>Original: {s.activity}</p>}{result.reasons.map(r => <p key={r}>{r}</p>)}{result.source && <Provenance source={result.source} time={result.fetched_at || undefined}/>}</>}</article>; })}
    <button className="primary-button" disabled={!stops.length || busy} onClick={() => void analyze()}>{busy ? 'Checking forecast and alternatives…' : 'Review itinerary'}</button>{plan && <><p className="tool-muted">{plan.engine} · {stamp(plan.generated_at)}</p><p className="tool-notice">{plan.limitations}</p><div className="tool-inline"><button className="secondary-button" onClick={() => { setStops(old => old.map(s => ({ ...s, activity: plan.stops.find(r => r.original.id === s.id)?.alternative || s.activity }))); invalidate(); notify('Revised itinerary saved on this device'); }}><Check size={17}/> Accept proposal</button><button className="secondary-button" onClick={() => { invalidate(); notify('Original itinerary retained'); }}>Reject proposal</button></div></>}
  </>;
}
export function GuidanceTool({ back, notify }: Props) {
    const [hazard, setHazard] = useState('Flood');
    const [language, setLanguage] = useSaved('language', 'en');
    const [guide, setGuide] = useState<Guidance | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [cached, setCached] = useState(false);
    useEffect(() => { let active = true; const key = `guidance:${hazard}:${language}`; setGuide(read(key, null)); setCached(true); setBusy(true); setError(''); api<Guidance>(`/guidance?hazard=${encodeURIComponent(hazard)}&language=${language}`).then(g => { if (active) {
        setGuide(g);
        save(key, g);
        setCached(false);
    } }).catch(e => { if (active)
        setError(e.message); }).finally(() => { if (active)
        setBusy(false); }); return () => { active = false; }; }, [hazard, language]);
    return <><Header title="Emergency guide" back={back}/><label className="tool-field">Preferred language<select aria-label="Preferred language" value={language} onChange={e => setLanguage(e.target.value)}><option value="en">English</option><option value="hi">Hindi</option><option value="ta">Tamil</option><option value="fr">French</option><option value="es">Spanish</option></select></label><div className="guide-picker" role="tablist" aria-label="Emergency type">{['Flood', 'Extreme heat', 'Earthquake'].map(h => <button role="tab" aria-selected={hazard === h} className={hazard === h ? 'selected' : ''} key={h} onClick={() => setHazard(h)}>{h === 'Flood' ? <CloudRain size={22}/> : h === 'Extreme heat' ? <ThermometerSun size={22}/> : <Zap size={22}/>}<small>{h}</small></button>)}</div><div className="guide-cover"><span>GENERAL GUIDANCE</span><h2>{hazard} safety</h2><p>Follow local authority instructions first.</p></div>{busy && <p role="status">Loading source-linked guidance…</p>}<ErrorNote error={error}/>{guide ? <><p className="tool-notice">{guide.translation}{cached ? ' · Saved copy' : ''}</p><div className="steps" lang={guide.language}>{guide.steps.map((step, i) => <div className="step" key={i}><span>{i + 1}</span><p>{step}</p></div>)}</div>{guide.language !== 'en' && <details className="tool-card"><summary>Compare English source summary</summary>{guide.english_steps.map(s => <p key={s}>{s}</p>)}</details>}<Provenance source={guide.source}/><p className="tool-muted">Prepared {stamp(guide.prepared_at)} · Content review {guide.content_review_date}. {guide.limitations}</p><button className="secondary-button" onClick={() => { const guides = read<Record<string, Guidance>>('saved-guides', {}); save('saved-guides', { ...guides, [`${hazard}:${guide.language}`]: guide }); notify('Guidance saved on this device'); }}><Download size={18}/> Save for offline use</button></> : <p className="tool-notice">No guidance saved for this topic. Connect to the API before travelling.</p>}</>;
}
type Pending = {
    status: 'safe' | 'needHelp' | 'unknown';
    consent: true;
    event_at: string;
    group_id: string;
};
function PwaState() {
    const [, update] = useState(0);
    useEffect(() => { const refresh = () => update(n => n + 1); window.addEventListener('safehaven:pwa', refresh); return () => window.removeEventListener('safehaven:pwa', refresh); }, []);
    return <div className="tool-notice"><p>{offlineReady ? 'App ready to reopen offline. Save safety information before travelling.' : 'Open the app while online before travelling to prepare offline access. Saved information is also available in the installed Android app.'}</p>{updateAvailable && <button className="secondary-button" onClick={() => void updateApp()}>Update app and reload</button>}</div>;
}
function GroupCheckIn() {
    const [membership, setMembership] = useSaved<Membership | null>('membership', null);
    const [snapshot, setSnapshot] = useSaved<Group | null>('group-snapshot', null);
    const [pending, setPending] = useSaved<Pending | null>('pending-checkin', null);
    const [name, setName] = useState('');
    const [groupName, setGroupName] = useState('');
    const [invite, setInvite] = useState('');
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const run = async (fn: () => Promise<void>) => { setBusy(true); setError(''); try {
        await fn();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : String(e));
    }
    finally {
        setBusy(false);
    } };
    const refresh = async () => { if (membership)
        setSnapshot(await api<Group>(`/groups/${membership.group_id}`, undefined, membership.token)); };
    const sync = async () => { if (!membership || !pending || pending.group_id !== membership.group_id)
        return; await api(`/groups/${membership.group_id}/checkin`, pending, membership.token); setPending(null); await refresh(); };
    useEffect(() => { if (!membership)
        return; void run(refresh); }, [membership?.group_id]);
    useEffect(() => { if (!membership || !pending)
        return; const connected = () => { if (navigator.onLine)
        void run(sync); }; connected(); window.addEventListener('online', connected); return () => window.removeEventListener('online', connected); }, [membership?.group_id, pending?.event_at]);
    return <section className="content-section"><h2 id="pack-group">Private group check-in</h2><p className="tool-muted">Share your display name and status with invited companions. No GPS location is sent. Anyone holding an invite can join; keep it private.</p><ErrorNote error={error}/>{!membership ? <><label className="tool-field">Your display name<input value={name} maxLength={40} onChange={e => setName(e.target.value)}/></label><label className="tool-field">New group name<input value={groupName} maxLength={60} onChange={e => setGroupName(e.target.value)}/></label><label className="tool-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/> I agree to share my name and chosen status with this group.</label><button className="secondary-button" disabled={busy || !name.trim() || !groupName.trim() || !consent} onClick={() => void run(async () => { const m = await api<Membership>('/groups', { name: groupName.trim(), member_name: name.trim() }); setMembership(m); setSnapshot(null); setConsent(false); })}>Create private group</button><label className="tool-field">Invite from a companion<input value={invite} onChange={e => setInvite(e.target.value)} placeholder="group ID / private invite"/></label><button className="secondary-button" disabled={busy || !name.trim() || !invite.includes('/') || !consent} onClick={() => void run(async () => { const [gid, secret] = invite.trim().split('/'); const m = await api<Membership>(`/groups/${encodeURIComponent(gid)}/join`, { invite: secret, member_name: name.trim() }); setMembership(m); setSnapshot(null); setConsent(false); })}>Join with consent</button></> : <><div className="tool-card"><h3>{membership.name}</h3>{membership.invite && <><p className="tool-muted">Private invite — share only with your companions</p><input className="invite-code" aria-label="Private group invite" readOnly value={`${membership.group_id}/${membership.invite}`}/></>}<button className="secondary-button" disabled={busy} onClick={() => void run(refresh)}><RefreshCw size={17}/> Refresh statuses</button>{snapshot?.members.map(m => <div className="group-member" key={m.id}><Users size={18}/><span><strong>{m.name}</strong><small>{m.status === 'safe' ? 'Reported safe' : m.status === 'needHelp' ? 'Needs help' : 'Status unknown'} · {stamp(m.event_at)}</small></span></div>)}<p className="tool-muted">Last received {stamp(snapshot?.fetched_at)}. A past safe status does not establish current safety.</p></div><label className="tool-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/> Share my next status with this group.</label><div className="tool-inline">{(['safe', 'needHelp', 'unknown'] as const).map(status => <button className="secondary-button" key={status} disabled={busy || !consent} onClick={() => { setPending({ status, consent: true, event_at: new Date().toISOString(), group_id: membership.group_id }); setConsent(false); }}>{status === 'safe' ? "I'm safe" : status === 'needHelp' ? 'Need help' : 'Unknown'}</button>)}</div>{pending && <div className="tool-notice"><p>Queued until synchronized: {pending.status} · {stamp(pending.event_at)}</p><div className="tool-inline"><button className="secondary-button" disabled={busy} onClick={() => void run(sync)}>Sync queued status</button><button className="secondary-button" onClick={() => setPending(null)}>Cancel queued status</button></div></div>}<button className="secondary-button" disabled={busy} onClick={() => void run(async () => { await api(`/groups/${membership.group_id}/membership`, undefined, membership.token, 'DELETE'); setMembership(null); setSnapshot(null); setPending(null); setConsent(false); })}>Leave group and remove my shared status</button></>}</section>;
}
export function PackTool({ back, notify, nearbyShare, checklist, toggleChecklist, initialSection }: Props & {
    initialSection?: 'contacts'|'group'|null;
    checklist: string[];
    toggleChecklist: (title:string)=>void;
    nearbyShare?: (status: 'safe' | 'needHelp') => Promise<unknown>;
}) {
    const [nearbyConsent, setNearbyConsent] = useState(false);
    useEffect(()=>{if(!initialSection)return;const timer=window.setTimeout(()=>document.getElementById(`pack-${initialSection}`)?.scrollIntoView({block:'start'}),300);return()=>window.clearTimeout(timer);},[initialSection]);
    const [contacts, setContacts] = useSaved<{
        name: string;
        phone: string;
    }[]>('contacts', []);
    const [contact, setContact] = useState('');
    const [phone, setPhone] = useState('');
    const [hotel, setHotel] = useSaved('hotel', '');
    const [packTime, setPackTime] = useSaved<string | null>('pack-time', null);
    const [offline, setOffline] = useState(!navigator.onLine);
    const [error, setError] = useState('');
    const briefing = read<{
        weather: Weather | null;
        incidents: Incidents | null;
        saved_at: string;
    } | null>('briefing', null);
    const guides = read<Record<string, Guidance>>('saved-guides', {});
    const stops = read<Stop[]>('itinerary', []);
    useEffect(() => { const change = () => setOffline(!navigator.onLine); window.addEventListener('online', change); window.addEventListener('offline', change); return () => { window.removeEventListener('online', change); window.removeEventListener('offline', change); }; }, []);
    const prepare = async () => { setError(''); try {
        for (const hazard of ['Flood', 'Extreme heat', 'Earthquake']) {
            const g = await api<Guidance>(`/guidance?hazard=${encodeURIComponent(hazard)}&language=en`);
            const previous = read<Record<string, Guidance>>('saved-guides', {});
            save('saved-guides', { ...previous, [`${hazard}:en`]: g });
        }
        setPackTime(new Date().toISOString());
        notify('Safety pack saved on this device');
    }
    catch (e) {
        setError(e instanceof Error ? e.message : String(e));
    } };
    return <><Header title="Safety pack" back={back}/><section className="list-panel checklist-panel" aria-label="Preparation checklist">{[{title:'Emergency contacts',icon:Phone},{title:'Safety guidance',icon:BookOpen},{title:'Trip details',icon:Map},{title:'Group check-in',icon:Users}].map(t=>{const Icon=t.icon;const done=checklist.includes(t.title);return <button className="checklist-row" type="button" key={t.title} aria-pressed={done} onClick={()=>toggleChecklist(t.title)}><span className="checklist-icon"><Icon size={21}/></span><span className="row-body"><strong>{t.title}</strong><small>Mark as reviewed on this device</small></span><span className={`checkmark ${done?'is-checked':''}`}>{done&&<Check size={14}/>}</span></button>})}</section><div className="pack-hero"><Bookmark size={28}/><div><h2>Prepared, wherever you go.</h2><p>Your itinerary, contacts and saved guidance on this device.</p></div></div><p className="tool-notice">{offline ? 'Offline · showing saved information' : 'Online'} · Last pack preparation {stamp(packTime)}. Downloads stay on this browser/device; clearing app data removes them.</p><PwaState /><ErrorNote error={error}/><button className="primary-button" onClick={() => void prepare()}><Download size={18}/> Prepare offline guidance</button><label className="tool-field">Hotel details and meeting point<textarea rows={3} maxLength={1000} value={hotel} onChange={e => setHotel(e.target.value)} placeholder="Hotel address, booking reference, meeting point…"/></label><h2 id="pack-contacts">Emergency contacts</h2><p className="tool-muted">Add numbers you have checked for your destination. No automatic call or rescue dispatch.</p><form className="tool-card" onSubmit={e => { e.preventDefault(); setContacts(old => [...old, { name: contact.trim(), phone: phone.trim() }]); setContact(''); setPhone(''); }}><label className="tool-field">Contact name<input required value={contact} maxLength={60} onChange={e => setContact(e.target.value)}/></label><label className="tool-field">Phone number<input required type="tel" pattern="[+0-9 ()-]{3,30}" value={phone} onChange={e => setPhone(e.target.value)}/></label><button className="secondary-button" disabled={!contact.trim()}>Save contact locally</button></form>{contacts.map((c, i) => <div className="group-member" key={i}><span><strong>{c.name}</strong><a href={`tel:${c.phone.replace(/[^+0-9]/g, '')}`}>{c.phone}</a></span><button className="icon-button" aria-label={`Remove contact ${c.name}`} onClick={() => setContacts(old => old.filter((_, j) => j !== i))}><Trash2 size={17}/></button></div>)}
    <section className="content-section"><h2>Saved itinerary</h2>{stops.length ? stops.map(s => <article className="tool-card" key={s.id}><small>{s.date} · {s.place.name}</small><h3>{s.activity}</h3></article>) : <p className="tool-muted">Add activities in Trip replanner first.</p>}</section><section className="content-section"><h2>Saved destination briefing</h2>{briefing?.weather ? <article className="tool-card"><h3>{briefing.weather.place.name}</h3><Provenance source={briefing.weather.source} time={briefing.weather.fetched_at}/><p>Saved {stamp(briefing.saved_at)}. This is a snapshot, not a current alert.</p>{briefing.weather.days.map(d => <p key={d.date}>{d.date}: {d.max_c ?? '?'}°C · {d.rain_mm ?? '?'} mm · {d.signals.join(' ')}</p>)}{briefing.incidents?.reports.map(r => <p key={r.id}><a href={r.url}>{r.title}</a> · {stamp(r.published_at)} · {r.trust}</p>)}</article> : <p className="tool-muted">Save a briefing from Risk intelligence.</p>}</section><section className="content-section"><h2>Saved guidance</h2>{Object.values(guides).map(g => <details className="tool-card" key={`${g.hazard}:${g.language}`}><summary>{g.hazard} · {g.language}</summary>{g.steps.map(s => <p key={s}>{s}</p>)}<Provenance source={g.source}/><small>{g.translation} · {stamp(g.prepared_at)}</small></details>)}{!Object.keys(guides).length && <p className="tool-muted">Prepare guidance while connected before your trip.</p>}</section><GroupCheckIn />{nearbyShare && <section className="content-section"><h2>Nearby check-in</h2><label className="tool-consent"><input type="checkbox" checked={nearbyConsent} onChange={e => setNearbyConsent(e.target.checked)}/> Share my chosen status with connected RescueMesh phones.</label><div className="tool-inline">{(['safe', 'needHelp'] as const).map(status => <button className="secondary-button" key={status} disabled={!nearbyConsent} onClick={() => { setNearbyConsent(false); void nearbyShare(status).then(() => notify('Check-in offered to nearby phones; await acknowledgement')).catch(() => notify('Nearby check-in not sent')); }}>{status === 'safe' ? 'Share safe status nearby' : 'Share need-help status nearby'}</button>)}</div></section>}</>;
}
