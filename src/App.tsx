import { useEffect, useRef, useState, type ReactNode, type UIEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import useEmblaCarousel from 'embla-carousel-react';
import {
  Activity, AlertCircle, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRight,
  Bell, Bookmark, BookOpen, Check, CheckCheck, ChevronDown, ChevronRight,
  CircleHelp, Clock3, CloudRain, Compass, Eye, Globe2, HeartHandshake,
  Home, Languages, LocateFixed, Map, MapPin, Menu, MessageCircle, Navigation,
  Phone, Plus, Radio, RefreshCw, Search, Send, Settings2, Shield,
  ShieldAlert, ShieldCheck, SignalZero, Sparkles, Users, WifiOff, X, Waves, Layers3, Zap,
  type LucideIcon,
} from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

type Page = 'home' | 'explore' | 'risk' | 'replan' | 'guide' | 'mesh' | 'beacon' | 'pack' | 'profile';
type MainTab = 'home' | 'explore' | 'mesh' | 'pack';
type Hazard = 'Flood' | 'Heatwave' | 'Earthquake';

interface Tile { name: string; subtitle: string; emoji: string; tint: string; page: Page; }

const tiles: Tile[] = [
  { name: 'Risk Radar', subtitle: 'Know before you go', emoji: '🌩️', tint: 'purple', page: 'risk' },
  { name: 'AI Replanner', subtitle: 'Adapt your plans', emoji: '🧭', tint: 'blue', page: 'replan' },
  { name: 'Emergency', subtitle: 'Know what to do', emoji: '🚨', tint: 'coral', page: 'guide' },
  { name: 'RescueMesh', subtitle: 'Stay in touch', emoji: '📶', tint: 'teal', page: 'mesh' },
  { name: 'Safety Pack', subtitle: 'Be ready offline', emoji: '🎒', tint: 'gold', page: 'pack' },
  { name: 'Safety Beacon', subtitle: 'Community support', emoji: '📍', tint: 'pink', page: 'beacon' },
];

const hazardData: Record<Hazard, { icon: string; short: string; steps: string[] }> = {
  Flood: {
    icon: '🌊', short: 'Move away from rising water',
    steps: ['Move to higher ground when safe to do so.', 'Never enter or drive through floodwater.', 'Follow local emergency services and official warnings.', 'Tell trusted contacts where you are if communications work.'],
  },
  Heatwave: {
    icon: '☀️', short: 'Stay cool and hydrated',
    steps: ['Move into shade or a cooler indoor area.', 'Drink water regularly if you can.', 'Avoid unnecessary activity in extreme heat.', 'Seek medical help for signs of heatstroke.'],
  },
  Earthquake: {
    icon: '🏚️', short: 'Protect yourself from falling objects',
    steps: ['Drop, cover and hold on during shaking.', 'Stay away from windows and unstable objects.', 'Do not use elevators during or immediately after shaking.', 'Follow local emergency instructions after shaking stops.'],
  },
};

const sampleAlerts = [
  { title: 'Heavy rainfall scenario', area: 'Sample destination • Mountain region', icon: CloudRain, kind: 'Weather scenario', tone: 'amber', detail: 'An example weather-risk card for UI testing. No live warning is connected.' },
  { title: 'Road access report', area: 'Example road • Unverified', icon: MapPin, kind: 'Community report', tone: 'purple', detail: 'Demonstrates how an unverified road report would be separated from official alerts.' },
  { title: 'Advisory source check', area: 'No official feed configured', icon: ShieldCheck, kind: 'Source status', tone: 'blue', detail: 'Real bulletins will display agency, source URL, issue time and verification level.' },
];

const plans = [
  { day: 'Day 01', place: 'Arrival & local walk', old: 'City walk · 4:00 PM', newPlan: 'City walk · 4:00 PM', outcome: 'Unchanged' },
  { day: 'Day 02', place: 'Outdoor viewpoint', old: 'Hill viewpoint · 10:00 AM', newPlan: 'Indoor museum · 10:30 AM', outcome: 'Adjusted' },
  { day: 'Day 03', place: 'Café & departure', old: 'Café stop · 11:00 AM', newPlan: 'Café stop · 11:00 AM', outcome: 'Unchanged' },
];

const bottomTabs: { id: MainTab; title: string; icon: LucideIcon }[] = [
  { id: 'home', title: 'Home', icon: Home },
  { id: 'explore', title: 'Explore', icon: Compass },
  { id: 'mesh', title: 'Mesh', icon: Radio },
  { id: 'pack', title: 'Pack', icon: Bookmark },
];

function DemoTag({ children = 'DEMO PREVIEW' }: { children?: ReactNode }) {
  return <span className="demo-tag"><span className="demo-dot" />{children}</span>;
}

function SectionTitle({ children, subtitle, action, onAction }: { children: ReactNode; subtitle?: string; action?: string; onAction?: () => void }) {
  return <div className="section-head"><div><h2>{children}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <button className="section-action" type="button" onClick={onAction}>{action}<ChevronRight size={17} /></button>}</div>;
}

function FeatureTile({ tile, onClick, index }: { tile: Tile; onClick: () => void; index: number }) {
  return <motion.button type="button" aria-label={`Open ${tile.name}`} className={`feature-tile ${tile.tint}`} onClick={onClick}
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035, duration: .25 }} whileTap={{ scale: .95 }}>
    <span className="feature-icon-stage" aria-hidden="true"><span className="feature-icon-orbit"/><span className="feature-illustration">{tile.emoji}</span><span className="feature-icon-spark">✦</span></span>
    <strong>{tile.name}</strong><small>{tile.subtitle}</small>
  </motion.button>;
}

function ArrowButton({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
  return <motion.button whileTap={{ scale: .97 }} type="button" className={`wide-button ${className}`} onClick={onClick}>{children}<ArrowRight size={18}/></motion.button>;
}

function PageHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: ReactNode }) {
  return <div className="page-head"><button type="button" className="back-button" aria-label="Go back" onClick={onBack}><ArrowLeft size={23}/></button><h1>{title}</h1><div className="head-action">{action}</div></div>;
}

function OverviewPoster({ onClick }: { onClick: () => void }) {
  return <motion.button whileTap={{ scale: .985 }} className="overview-poster" type="button" onClick={onClick}>
    <img className="poster-photo" src="/visuals/sunset-trail.webp" alt="" loading="lazy"/><div className="poster-aura poster-aura-one"/><div className="poster-aura poster-aura-two"/>
    <div className="poster-top"><span className="poster-overline"><Sparkles size={13}/> THE SAFER WAY TO EXPLORE</span><span className="poster-arrow"><ArrowDownRight size={18}/></span></div>
    <div className="poster-copy"><h2>Your next adventure,<br/><em>with peace of mind.</em></h2><p>One place to plan, prepare and stay connected.</p></div>
    <div className="poster-orb" aria-hidden="true"><span>✧</span></div>
    <span className="poster-footer">Explore your safety dashboard <ArrowRight size={16}/></span>
  </motion.button>;
}

function Spotlight({ go }: { go: (page: Page) => void }) {
  const [emblaRef] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps', dragFree: false });
  const items = [
    { eyebrow: 'STAY INFORMED', title: 'What’s happening around you?', subtitle: 'A clearer view of local risks', style: 'spotlight-purple', emoji: '🌍', page: 'risk' as Page },
    { eyebrow: 'PLAN WITH CONFIDENCE', title: 'New plans. Less disruption.', subtitle: 'See smarter itinerary choices', style: 'spotlight-orange', emoji: '🧭', page: 'replan' as Page },
    { eyebrow: 'STAY CONNECTED', title: 'Together, even offline.', subtitle: 'Explore RescueMesh', style: 'spotlight-blue', emoji: '📡', page: 'mesh' as Page },
  ];
  return <div className="embla" ref={emblaRef}><div className="embla-container">{items.map(item => <div className="embla-slide" key={item.title}>
    <button type="button" className={`spotlight-card ${item.style}`} onClick={() => go(item.page)}>
      <span className="spotlight-overline">{item.eyebrow}</span><span className="spotlight-emoji" aria-hidden="true">{item.emoji}</span>
      <strong>{item.title}</strong><small>{item.subtitle}</small><span className="spotlight-circle"><ArrowRight size={18}/></span>
    </button>
  </div>)}</div></div>;
}

function MockNotice({ kind = 'content' }: { kind?: string }) {
  return <div className="mock-notice"><AlertCircle size={16}/><span>This is a UI-only preview. {kind} is sample content, not a live safety update.</span></div>;
}

function LoadingCards() {
  return <div className="loading-grid" aria-label="Loading sample content"><span className="loading-kicker"><span/> PREPARING YOUR DEMO EXPERIENCE</span><Skeleton className="skeleton-banner" baseColor="#252529" highlightColor="#42404f" enableAnimation />
    <div className="loading-row">{[0, 1, 2].map(i => <Skeleton key={i} className="skeleton-tile" baseColor="#252529" highlightColor="#42404f" enableAnimation />)}</div>
    <Skeleton className="skeleton-wide" baseColor="#252529" highlightColor="#42404f" enableAnimation /></div>;
}


function SafetySnapshot({ onAction }: { onAction: () => void }) {
  return <motion.button type="button" className="safety-snapshot" onClick={onAction} whileTap={{ scale: .985 }}>
    <span className="snapshot-glow" aria-hidden="true"/>
    <span className="snapshot-top"><span className="snapshot-mark"><ShieldCheck size={17}/></span><span>YOUR SAFETY SPACE</span><span className="snapshot-live">PREVIEW <span/></span></span>
    <span className="snapshot-main"><span><small>Destination intelligence</small><strong>Stay a step ahead<span>.</span></strong><em>Explore sample warnings, guidance and route insights.</em></span><span className="snapshot-visual"><span className="snapshot-radar radar-a"/><span className="snapshot-radar radar-b"/><MapPin size={28} strokeWidth={1.8}/></span></span>
    <span className="snapshot-divider"/>
    <span className="snapshot-foot"><span><Zap size={14}/> Incident intelligence</span><span className="snapshot-foot-action">Take a look <ArrowRight size={16}/></span></span>
  </motion.button>;
}

function PreviewLoadingButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="preview-loading-button"><RefreshCw size={14}/> Preview shimmer loading</button>;
}

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [compactDock, setCompactDock] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [exploreFilter, setExploreFilter] = useState('All');
  const [hazard, setHazard] = useState<Hazard>('Flood');
  const [dayFilter, setDayFilter] = useState('Day 02');
  const [saved, setSaved] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState<string[]>([]);
  const [beaconDraft, setBeaconDraft] = useState(false);
  const [beaconText, setBeaconText] = useState('Community meeting point');
  const [checkIn, setCheckIn] = useState(false);
  const [checked, setChecked] = useState<string[]>(['Save emergency contacts']);
  const [replanVariant, setReplanVariant] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);

  useEffect(() => { const timer = setTimeout(() => setIsLoading(false), 950); return () => clearTimeout(timer); }, []);
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); setCompactDock(false); scrollTopRef.current = 0; }, [page]);
  useEffect(() => { const closeOnEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') setSosOpen(false); }; window.addEventListener('keydown', closeOnEsc); return () => window.removeEventListener('keydown', closeOnEsc); }, []);

  const go = (next: Page) => setPage(next);
  const onScroll = (ev: UIEvent<HTMLDivElement>) => {
    const top = ev.currentTarget.scrollTop;
    if (Math.abs(top - scrollTopRef.current) > 4) setCompactDock(top > 155 && top > scrollTopRef.current);
    if (top < 70) setCompactDock(false);
    scrollTopRef.current = top;
  };
  const currentTab: MainTab = page === 'mesh' || page === 'beacon' ? 'mesh' : page === 'pack' ? 'pack' : page === 'home' || page === 'profile' ? 'home' : 'explore';
  const replayLoading = () => { setIsLoading(true); window.setTimeout(() => setIsLoading(false), 1250); };
  const toggleSaved = (key: string) => setSaved(current => current.includes(key) ? current.filter(v => v !== key) : [...current, key]);

  function home() {
    return <>
      <div className="location-topline"><button className="location-trigger" onClick={() => go('explore')} type="button"><MapPin size={20} fill="#9581ff" color="#9581ff" /><span><small>EXPLORING FROM</small><strong>Chennai, India <ChevronDown size={15}/></strong></span></button>
        <button type="button" onClick={() => go('profile')} className="avatar" aria-label="Profile"><span>S</span><span className="avatar-indicator"/></button></div>
      <div className="home-welcome"><div><DemoTag /><h1>Go places.<br/><span>Feel prepared.</span></h1><p>Adventure is better when you are ready for anything.</p></div><span className="welcome-spark" aria-hidden="true">✳</span></div>
      <button type="button" className="search-launch" onClick={() => go('explore')}><Search size={21}/><span>Search destinations, alerts, guidance...</span><span className="search-key">⌕</span></button>
      {isLoading ? <LoadingCards /> : <>
        <SafetySnapshot onAction={() => go('risk')}/>
        <div className="toolkit-heading"><SectionTitle subtitle="Everything you need, close at hand">Your safety toolkit</SectionTitle><PreviewLoadingButton onClick={replayLoading}/></div>
        <div className="feature-grid">{tiles.map((tile, i) => <FeatureTile tile={tile} index={i} key={tile.name} onClick={() => go(tile.page)}/>)}</div>
        <div className="spaced-section"><SectionTitle action="Explore" onAction={() => go('risk')}>The spotlight</SectionTitle><Spotlight go={go}/></div>
        <div className="spaced-section"><SectionTitle subtitle="Your journey, with a little extra care">A safer way forward</SectionTitle><OverviewPoster onClick={() => go('risk')}/></div>
        <div className="spaced-section"><SectionTitle>Ready when it matters</SectionTitle>
          <div className="quick-grid"><motion.button whileTap={{ scale: .97 }} className="quick-card" type="button" onClick={() => go('guide')}><span className="quick-icon peach"><HeartHandshake size={24}/></span><strong>Need guidance?</strong><small>Emergency steps <ChevronRight size={15}/></small></motion.button>
            <motion.button whileTap={{ scale: .97 }} className="quick-card" type="button" onClick={() => go('mesh')}><span className="quick-icon lilac"><WifiOff size={24}/></span><strong>Going offline?</strong><small>Explore RescueMesh <ChevronRight size={15}/></small></motion.button></div>
        </div>
      </>}
      <footer className="content-footnote">Made for the moments that matter. <span>•</span> UI demonstration</footer>
    </>;
  }

  function explore() {
    const topics = ['All', 'Locations', 'Alerts', 'Guidance'];
    const destinations = [
      { name: 'Munnar', region: 'Kerala, India', emoji: '🌿', label: 'Scenic hills', tint: 'destination-green' },
      { name: 'Manali', region: 'Himachal Pradesh, India', emoji: '🏔️', label: 'Mountain escape', tint: 'destination-blue' },
      { name: 'Chennai', region: 'Tamil Nadu, India', emoji: '🌴', label: 'Coastal city', tint: 'destination-gold' },
    ].filter(item => (item.name + ' ' + item.region).toLowerCase().includes(search.toLowerCase()));
    return <><PageHeader title="Explore" onBack={() => go('home')} action={<button className="icon-button" type="button" onClick={() => go('profile')} aria-label="Preferences"><Settings2 size={20}/></button>}/>
      <div className="input-search"><Search size={21}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search destinations, alerts..." aria-label="Search sample destinations"/>{search && <button onClick={() => setSearch('')} type="button" aria-label="Clear search"><X size={18}/></button>}</div>
      <div className="chip-scroll">{topics.map(topic => <button key={topic} className={`filter-chip ${exploreFilter === topic ? 'selected' : ''}`} onClick={() => setExploreFilter(topic)} type="button">{topic}</button>)}</div>
      <div className="small-divider"/><MockNotice kind="Search results"/>
      {(exploreFilter === 'All' || exploreFilter === 'Locations') && <><SectionTitle subtitle="Tap a place to see its sample safety outlook">Explore destinations</SectionTitle>
        <div className="destination-list">{destinations.length ? destinations.map(item => <motion.button whileTap={{ scale: .985 }} type="button" className={`destination-card ${item.tint}`} onClick={() => go('risk')} key={item.name}><span className="destination-emoji">{item.emoji}</span><span className="destination-text"><small>{item.label}</small><strong>{item.name}</strong><span>{item.region}</span></span><span className="destination-arrow"><ArrowRight size={20}/></span></motion.button>) : <div className="empty-state">No sample destinations match your search.</div>}</div></>}
      {(exploreFilter === 'All' || exploreFilter === 'Alerts') && <div className="spaced-section"><SectionTitle action="View all" onAction={() => go('risk')}>Safety intelligence</SectionTitle>
        {sampleAlerts.slice(0, 2).map(a => <button type="button" onClick={() => go('risk')} key={a.title} className="thin-list-card"><span className={`thin-icon ${a.tone}`}><a.icon size={21}/></span><span><strong>{a.title}</strong><small>{a.kind} · Demo data</small></span><ChevronRight size={19}/></button>)}</div>}
      {(exploreFilter === 'All' || exploreFilter === 'Guidance') && <div className="spaced-section"><SectionTitle action="Open guide" onAction={() => go('guide')}>Quick guidance</SectionTitle><div className="guide-mini-row">{(Object.keys(hazardData) as Hazard[]).map(h => <button type="button" onClick={() => {setHazard(h); go('guide');}} key={h}><span>{hazardData[h].icon}</span><strong>{h}</strong></button>)}</div></div>}
    </>;
  }

  function risk() {
    return <><PageHeader title="Risk intelligence" onBack={() => go('explore')} action={<button type="button" className="icon-button" aria-label="Refresh sample cards" onClick={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 900); }}><RefreshCw size={19}/></button>}/>
      <DemoTag>ILLUSTRATIVE SCENARIO</DemoTag>
      <div className="risk-hero"><div className="risk-hero-top"><span className="risk-place"><MapPin size={15}/> Example destination</span><span className="risk-stat">SAMPLE ONLY</span></div><div className="risk-center"><span className="risk-emoji">🌧️</span><div><p>Scenario outlook</p><strong>Stay aware</strong><span>Sample rainfall-related concern</span></div></div><div className="risk-hero-bottom"><ShieldAlert size={16}/> No live incident feeds connected</div></div>
      <div className="spaced-section"><SectionTitle subtitle="Clear labels for every type of information">What we're tracking</SectionTitle>
        {isLoading ? <LoadingCards/> : sampleAlerts.map(item => <div key={item.title} className="alert-card"><span className={`thin-icon ${item.tone}`}><item.icon size={22}/></span><div className="alert-body"><span className="alert-kind">{item.kind}</span><strong>{item.title}</strong><small>{item.area}</small><p>{item.detail}</p></div></div>)}
      </div>
      <div className="info-block"><ShieldCheck size={22}/><div><strong>Built for trustworthy information</strong><p>Real integration will show source links, issue dates, verification status and uncertainty. Sample data will never be presented as an official bulletin.</p></div></div>
      <div className="spaced-section"><ArrowButton onClick={() => go('replan')}>See an example trip adjustment</ArrowButton></div>
    </>;
  }

  function replan() {
    return <><PageHeader title="Trip replanner" onBack={() => go('explore')} action={<span className="small-header-icon"><Sparkles size={20}/></span>}/><DemoTag>EXAMPLE AI OUTPUT</DemoTag>
      <div className="plan-hero"><span className="plan-glow"/><div className="plan-head"><span className="plan-icon">🧭</span><span className="plan-tag">PLAN PREVIEW</span></div><h2>Keep the adventure.<br/><span>Skip the disruption.</span></h2><p>An example of how SafeHaven could protect your itinerary while changing as little as possible.</p></div>
      <SectionTitle subtitle="Illustrative 3-day itinerary · not AI-generated">Your journey</SectionTitle>
      <div className="day-tabs">{plans.map(p => <button type="button" key={p.day} className={dayFilter === p.day ? 'selected' : ''} onClick={() => setDayFilter(p.day)}>{p.day}</button>)}</div>
      {plans.filter(p => p.day === dayFilter).map(p => <div className="comparison" key={p.day}><div className="comparison-label"><span className="compare-dot original"/> ORIGINAL PLAN <span className="compare-chip">{p.place}</span></div><div className="comparison-card muted"><strong>{p.old}</strong><span>Before adapting to the demo scenario</span></div><div className="comparison-arrow"><ArrowDownRight size={19}/></div><div className="comparison-label"><span className="compare-dot recommended"/> SUGGESTED CHANGE</div><div className="comparison-card recommended"><strong>{replanVariant && p.outcome === 'Adjusted' ? 'Local art gallery · 11:00 AM' : p.newPlan}</strong><span>{p.outcome === 'Adjusted' ? 'Indoor alternative in this mock scenario' : 'No change needed in this mock scenario'}</span><span className={`outcome-chip ${p.outcome === 'Adjusted' ? 'changed' : ''}`}>{p.outcome === 'Adjusted' ? '1 small adjustment' : 'Unchanged'}</span></div></div>)}
      <div className="explain-card"><Sparkles size={20}/><div><strong>Why this change?</strong><p>This sample shows how an outdoor stop could move indoors when credible weather risk affects the original plan.</p></div></div>
      <div className="spaced-section"><ArrowButton onClick={() => setReplanVariant(v => !v)}><RefreshCw size={17}/> Try a different example</ArrowButton></div><MockNotice kind="Replanning suggestions"/>
    </>;
  }

  function guide() {
    return <><PageHeader title="Emergency guide" onBack={() => go('explore')} action={<Languages size={20} color="#a99be8"/>}/><DemoTag>STATIC GUIDANCE PREVIEW</DemoTag>
      <div className="guide-hero"><span className="guide-hero-icon">🛟</span><h2>Know what to do.<br/><span>Even under pressure.</span></h2><p>Simple steps organized around the situation.</p></div>
      <SectionTitle>Choose a situation</SectionTitle><div className="hazard-selector">{(Object.keys(hazardData) as Hazard[]).map(h => <motion.button whileTap={{ scale: .96 }} type="button" className={hazard === h ? 'active' : ''} onClick={() => setHazard(h)} key={h}><span>{hazardData[h].icon}</span><strong>{h}</strong></motion.button>)}</div>
      <div className="instruction-head"><span>{hazardData[hazard].icon}</span><div><small>EXAMPLE EMERGENCY STEPS</small><h2>{hazardData[hazard].short}</h2></div></div>
      <div className="instruction-list">{hazardData[hazard].steps.map((step, i) => <div className="instruction-step" key={step}><span>{String(i + 1).padStart(2, '0')}</span><p>{step}</p></div>)}</div>
      <div className="source-empty"><BookOpen size={19}/><div><strong>Official sources not yet connected</strong><p>Production guidance will include agency name, bulletin link, issue time, and reviewed translations.</p></div></div>
      <ArrowButton className="secondary" onClick={() => setSosOpen(true)}>Emergency action preview</ArrowButton>
    </>;
  }

  function mesh() {
    return <><PageHeader title="RescueMesh" onBack={() => go('home')} action={<button className="icon-button" onClick={() => go('beacon')} type="button" aria-label="Community beacon"><MapPin size={20}/></button>}/><DemoTag>ANDROID NETWORKING NOT CONNECTED</DemoTag>
      <div className="mesh-visual"><div className="mesh-rings"><span className="mesh-ring ring-one"/><span className="mesh-ring ring-two"/><span className="mesh-ring ring-three"/><span className="mesh-node central"><Radio size={28}/></span><span className="mesh-node outer n1"><Shield size={15}/></span><span className="mesh-node outer n2"><MapPin size={15}/></span><span className="mesh-node outer n3"><Users size={15}/></span></div><h2>Connected, <em>when it counts.</em></h2><p>Offline peer-to-peer communication will run inside this app on Android.</p><span className="connection-pill"><SignalZero size={15}/> 0 actual peers connected</span></div>
      <SectionTitle action="Learn more" onAction={() => go('beacon')}>Community Safety Beacon</SectionTitle>
      <button type="button" className="beacon-preview-card" onClick={() => go('beacon')}><span className="beacon-graphic">📍</span><div><strong>A place to regroup</strong><small>Volunteer refuge broadcasts · Opt-in only</small><span>Explore beacon preview <ChevronRight size={15}/></span></div></button>
      <div className="spaced-section"><SectionTitle subtitle="Drafts stay on this screen; nothing is transmitted">Offline message UI</SectionTitle>
        <div className="message-panel"><div className="chat-date">UI EXAMPLE · NO ACTIVE CONNECTION</div><div className="sample-bubble"><span>Example chat appearance</span><small>Sample only</small></div>{drafts.map((text, index) => <div key={`${index}-${text}`} className="own-bubble"><span>{text}</span><small>Draft · Not sent</small></div>)}<form className="chat-form" onSubmit={e => {e.preventDefault(); if(message.trim()) {setDrafts(v => [...v, message.trim()]);setMessage('');}}}><input aria-label="Write a draft message" placeholder="Write a draft message..." value={message} onChange={e=>setMessage(e.target.value)}/><button type="submit" disabled={!message.trim()} aria-label="Save message draft"><Send size={18}/></button></form></div>
      </div><MockNotice kind="Mesh connections and messages"/>
    </>;
  }

  function beacon() {
    return <><PageHeader title="Safety Beacon" onBack={() => go('mesh')} action={<MapPin size={20} color="#b19aff"/>}/><DemoTag>SELF-REPORTED · UNVERIFIED</DemoTag>
      <div className="beacon-hero"><span className="beacon-ring br1"/><span className="beacon-ring br2"/><span className="beacon-pin">📍</span><h2>Find each other.<br/><span>Not just a signal.</span></h2><p>People nearby can voluntarily share a temporary meeting point over RescueMesh.</p></div>
      <SectionTitle subtitle="Illustration only, not a real refuge">How a community beacon looks</SectionTitle>
      <div className="example-beacon"><div className="example-beacon-top"><span className="beacon-type"><MapPin size={16}/> COMMUNITY BEACON</span><span className="unverified-label">UNVERIFIED</span></div><h3>{beaconDraft ? beaconText : 'Community meeting point'}</h3><p>A voluntary location shared by a nearby participant. Never assume it is an officially approved shelter.</p><div className="beacon-stats"><span><Navigation size={16}/> Distance: example only</span><span><Clock3 size={16}/> Expires automatically</span></div><span className="not-broadcast"><WifiOff size={15}/> Not broadcast or shared</span></div>
      <div className="spaced-section"><SectionTitle>Create a beacon draft</SectionTitle><label className="input-label" htmlFor="beacon-desc">Description</label><input className="dark-input" id="beacon-desc" maxLength={80} value={beaconText} onChange={e=>setBeaconText(e.target.value)}/><p className="input-help">A real beacon will require explicit opt-in, location permission and an expiry. This form only changes your local preview.</p><ArrowButton onClick={() => setBeaconDraft(true)}><Plus size={17}/> Preview beacon draft</ArrowButton></div>
      <div className="source-empty"><AlertTriangle size={19}/><div><strong>Directions are not safety guarantees</strong><p>When Android features are connected, distance and compass bearing will be approximate. Safe passage cannot be verified from a beacon.</p></div></div>
    </>;
  }

  function pack() {
    const tasks = ['Save emergency contacts', 'Download official guidance', 'Review your itinerary', 'Set up group check-ins'];
    return <><PageHeader title="Safety Pack" onBack={() => go('home')} action={<button type="button" className="icon-button" aria-label="Open help" onClick={() => go('guide')}><CircleHelp size={20}/></button>}/><DemoTag>OFFLINE CONTENT PREVIEW</DemoTag>
      <div className="pack-hero"><span className="pack-hero-icon">🎒</span><span className="pack-hero-label">YOUR ESSENTIALS</span><h2>A little preparation<br/>goes a long way.</h2><p>Keep important details close when connectivity is unreliable.</p><span className="preview-chip"><WifiOff size={14}/> Offline caching not enabled</span></div>
      <div className="spaced-section"><SectionTitle subtitle="Checklist stored only in this screen session">Before you go</SectionTitle><div className="checklist">{tasks.map(t=><button type="button" key={t} onClick={()=>setChecked(c=>c.includes(t)?c.filter(x=>x!==t):[...c,t])}><span className={`check-box ${checked.includes(t)?'checked':''}`}>{checked.includes(t) && <Check size={14}/>}</span><span className={checked.includes(t)?'completed':''}>{t}</span><ChevronRight size={17}/></button>)}</div></div>
      <div className="spaced-section"><SectionTitle>Group check-in</SectionTitle><div className="checkin-card"><div className="checkin-top"><span className="checkin-icon"><Users size={25}/></span><span className="checkin-status">NOT SHARED</span></div><h3>{checkIn ? 'I’m safe · local preview' : 'Let your people know'}</h3><p>{checkIn ? 'This status is visible only in this UI demonstration.' : 'Real check-ins will be shared only with your permission when online or through RescueMesh.'}</p><button type="button" onClick={()=>setCheckIn(x=>!x)}>{checkIn ? 'Reset demo status' : 'Try “I’m safe” preview'} <ArrowRight size={16}/></button></div></div>
      <div className="spaced-section"><SectionTitle>Essentials</SectionTitle><button type="button" className="thin-list-card" onClick={()=>go('guide')}><span className="thin-icon purple"><BookOpen size={22}/></span><span><strong>Emergency guidance</strong><small>Example safety steps · Online UI only</small></span><ChevronRight size={18}/></button><button type="button" className="thin-list-card" onClick={()=>go('profile')}><span className="thin-icon blue"><Phone size={22}/></span><span><strong>Emergency contacts</strong><small>No contacts configured yet</small></span><ChevronRight size={18}/></button></div>
    </>;
  }

  function profile() {
    return <><PageHeader title="Your space" onBack={() => go('home')}/><div className="profile-block"><div className="profile-avatar">S</div><h2>SafeHaven Explorer</h2><p>Personalized travel safety · UI preview</p></div><SectionTitle>App preferences</SectionTitle>
      <button className="thin-list-card" type="button" onClick={() => go('guide')}><span className="thin-icon purple"><Languages size={22}/></span><span><strong>Languages</strong><small>Multilingual guidance preview</small></span><ChevronRight size={18}/></button>
      <button className="thin-list-card" type="button" onClick={() => go('pack')}><span className="thin-icon blue"><Bookmark size={22}/></span><span><strong>Saved essentials</strong><small>{saved.length} locally saved demo items</small></span><ChevronRight size={18}/></button>
      <button className="thin-list-card" type="button" onClick={() => go('risk')}><span className="thin-icon amber"><Bell size={22}/></span><span><strong>Notifications and alerts</strong><small>Not connected to any source</small></span><ChevronRight size={18}/></button>
      <div className="spaced-section"><div className="info-block"><ShieldCheck size={20}/><div><strong>Designed with safety in mind</strong><p>Real alerts, location sharing, offline messaging and SOS will require backend and native integrations. No emergency service is contacted by this demo.</p></div></div></div>
    </>;
  }

  function content() {
    switch (page) {
      case 'home': return home(); case 'explore': return explore(); case 'risk': return risk();
      case 'replan': return replan(); case 'guide': return guide(); case 'mesh': return mesh();
      case 'beacon': return beacon(); case 'pack': return pack(); case 'profile': return profile();
    }
  }

  return <div className="desktop-stage"><aside className="desktop-intro"><img src="/safehaven-mark.svg" width="62" height="62" alt="SafeHaven mark"/><span className="desktop-kicker">MOBILE EXPERIENCE / CONCEPT 01</span><h1>Safer journeys.<br/><span>Beautifully simple.</span></h1><p>Interactive SafeHaven AI UI prototype inspired by the visual language of District and Uber.</p><div className="desktop-board"><img src="/visuals/visual-direction.webp" alt="AI-generated SafeHaven mobile visual direction board" loading="lazy"/><span><Sparkles size={13}/> AI-GENERATED VISUAL DIRECTION</span></div><div className="desktop-bullet"><span>01</span> Dark, expressive UI</div><div className="desktop-bullet"><span>02</span> Smooth, tactile motion</div><div className="desktop-bullet"><span>03</span> Five safety modules, one app</div><div className="desktop-caveat">All content shown is a demo. No emergency, weather, location or mesh services are connected.</div></aside>
    <main className="mobile-shell" aria-label="SafeHaven mobile app preview">
      <div className="content-scroll" onScroll={onScroll} ref={scrollRef}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={page} className="page-content" initial={{ opacity: 0, y: 11 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }}>{content()}</motion.div>
        </AnimatePresence>
      </div>
      <motion.nav aria-label="Main navigation" className={`bottom-dock ${compactDock ? 'compact' : ''}`} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        {bottomTabs.slice(0,2).map(tab => <button key={tab.id} type="button" className={`dock-tab ${currentTab === tab.id ? 'active' : ''}`} onClick={()=>go(tab.id)} aria-label={tab.title} aria-current={currentTab === tab.id ? 'page' : undefined}>{currentTab === tab.id && <motion.span layoutId="active-dock-pill" className="active-dock-pill" transition={{type:'spring',damping:30,stiffness:350}}/>}<tab.icon size={23} strokeWidth={2.35}/><small>{tab.title}</small></button>)}
        <motion.button type="button" aria-label="Emergency SOS demo" className="dock-sos" onClick={()=>setSosOpen(true)} whileTap={{ scale: .92 }}><ShieldAlert size={23} strokeWidth={2.2}/><span>SOS</span></motion.button>
        {bottomTabs.slice(2).map(tab => <button key={tab.id} type="button" className={`dock-tab ${currentTab === tab.id ? 'active' : ''}`} onClick={()=>go(tab.id)} aria-label={tab.title} aria-current={currentTab === tab.id ? 'page' : undefined}>{currentTab === tab.id && <motion.span layoutId="active-dock-pill" className="active-dock-pill" transition={{type:'spring',damping:30,stiffness:350}}/>}<tab.icon size={23} strokeWidth={2.35}/><small>{tab.title}</small></button>)}
      </motion.nav>
      <AnimatePresence>{sosOpen && <motion.div className="modal-shade" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><motion.div role="dialog" aria-modal="true" aria-labelledby="sos-title" className="sos-sheet" initial={{y:420}} animate={{y:0}} exit={{y:440}} transition={{type:'spring',damping:29,stiffness:320}}><div className="sheet-handle"/><button type="button" className="close-sheet" aria-label="Close SOS preview" onClick={()=>setSosOpen(false)}><X size={20}/></button><span className="sos-sheet-emoji">🆘</span><h2 id="sos-title">Emergency SOS</h2><p>This screen demonstrates how an emergency request would look. <strong>No SOS is sent, no contacts are notified and no emergency services are contacted.</strong></p><div className="sos-warning"><AlertTriangle size={20}/><span>Demo only · Messaging is not connected</span></div><button className="sos-dismiss" onClick={()=>setSosOpen(false)} type="button">Got it — close preview</button><button className="sos-guidance" onClick={()=>{setSosOpen(false);go('guide');}} type="button">Open emergency guidance <ArrowRight size={18}/></button></motion.div></motion.div>}</AnimatePresence>
    </main>
  </div>;
}