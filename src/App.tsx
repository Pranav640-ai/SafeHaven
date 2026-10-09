import { useEffect, useRef, useState, type ReactNode, type UIEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import {
  AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, Bell, Bookmark,
  BookOpen, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  Clock3, CloudRain, Compass, Download, Globe2, Heart, Home,
  Languages, LocateFixed, LockKeyhole, Map, MapPin, Menu, MessageCircle,
  Navigation, Phone, Plus, Radio, RefreshCw, Search, Send, Settings,
  Shield, ShieldAlert, ShieldCheck, Smartphone, Sun, ThermometerSun,
  Users, WifiOff, X, Zap, FileText, Save, Leaf, Mountain, Waves, Trees, BatteryCharging, Crosshair, Wifi, Signal, LifeBuoy, type LucideIcon,
} from 'lucide-react';

type Page = 'home' | 'explore' | 'risk' | 'replan' | 'guide' | 'mesh' | 'beacon' | 'pack' | 'profile';
type GuideKind = 'Flood' | 'Extreme heat' | 'Earthquake';
type Dialog = 'sos' | 'profile' | 'help' | 'alerts' | null;

const features: { title: string; detail: string; icon: LucideIcon; art: string; accent: string; page: Page }[] = [
  { title: 'Risk insights', detail: 'Alerts & reports', icon: ShieldAlert, art: '🌩️', accent: 'rose', page: 'risk' },
  { title: 'Trip replanner', detail: 'Change plans', icon: Navigation, art: '🧭', accent: 'blue', page: 'replan' },
  { title: 'Emergency guide', detail: 'What to do', icon: BookOpen, art: '🚨', accent: 'amber', page: 'guide' },
  { title: 'RescueMesh', detail: 'Offline messaging', icon: Radio, art: '📡', accent: 'violet', page: 'mesh' },
  { title: 'Safety beacon', detail: 'Nearby help', icon: MapPin, art: '📍', accent: 'teal', page: 'beacon' },
  { title: 'Safety pack', detail: 'Your essentials', icon: Bookmark, art: '🎒', accent: 'indigo', page: 'pack' },
];

const guides: Record<GuideKind, {icon:LucideIcon; lead:string; steps:string[]}> = {
  Flood: { icon: CloudRain, lead: 'If flooding threatens your area', steps: [
    'Move to higher ground when it is safe to do so.', 'Do not walk, swim or drive through floodwater.',
    'Check instructions from local emergency authorities.', 'Contact someone you trust when communication is available.'
  ] },
  'Extreme heat': { icon: ThermometerSun, lead: 'During periods of dangerous heat', steps: [
    'Find shade or a cooler indoor space.', 'Drink water regularly when available.',
    'Avoid strenuous activity during the hottest hours.', 'Get urgent help if someone shows signs of heatstroke.'
  ] },
  Earthquake: { icon: Zap, lead: 'If the ground starts shaking', steps: [
    'Drop, cover and hold on until the shaking stops.', 'Stay away from windows and objects that can fall.',
    'Avoid elevators and visibly damaged structures.', 'Listen for instructions from local emergency authorities.'
  ] }
};

const itinerary = [
  { day: '01', title: 'Arrive & explore', time: '4:00 PM', old: 'Old town walking tour', revised: 'Old town walking tour', changed: false },
  { day: '02', title: 'Scenic viewpoint', time: '10:00 AM', old: 'Outdoor viewpoint', revised: 'Indoor museum visit', changed: true },
  { day: '03', title: 'Coffee & departure', time: '11:30 AM', old: 'Coffee before checkout', revised: 'Coffee before checkout', changed: false },
];

const destinations = [
  { name:'Manali', region:'Himachal Pradesh', label:'Mountain escape', image:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=760&q=80', mood:'Mountains' },
  { name:'Munnar', region:'Kerala', label:'Misty hills', image:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=760&q=80', mood:'Nature' },
  { name:'Goa', region:'West coast', label:'Sun and coast', image:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=760&q=80', mood:'Coast' },
  { name:'Coorg', region:'Karnataka', label:'Quiet trails', image:'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=760&q=80', mood:'Nature' },
  { name:'Kodaikanal', region:'Tamil Nadu', label:'Lakes and forests', image:'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=760&q=80', mood:'Mountains' },
];

const reports = [
  { icon: CloudRain, title: 'Heavy rainfall example', subtitle: 'Mountain district · Weather scenario', time: 'Sample', tone: 'amber' },
  { icon: MapPin, title: 'Road access report', subtitle: 'Community report · Unverified', time: 'Sample', tone: 'violet' },
];

function Brand({ compact = false }: {compact?:boolean}) {
  return <span className={`brand ${compact ? 'brand-small' : ''}`}><span className="brand-symbol"><ShieldCheck size={compact ? 19 : 25} strokeWidth={2.5}/></span><span>safehaven<span className="brand-ai">.ai</span></span></span>;
}
function IconButton({ icon: Icon, onClick, label, className = '' }: {icon:LucideIcon;onClick:()=>void;label:string;className?:string}) {
  return <button type="button" aria-label={label} className={`icon-button ${className}`} onClick={onClick}><Icon size={21} strokeWidth={1.9}/></button>;
}
function Heading({title, sub, right}: {title:string;sub?:string;right?:ReactNode}) {
  return <div className="section-heading"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{right}</div>;
}
function BackHeader({title, back, action}: {title:string;back:()=>void;action?:ReactNode}) {
  return <header className="back-header"><IconButton icon={ArrowLeft} onClick={back} label="Go back"/><h1>{title}</h1><div className="back-header-action">{action}</div></header>;
}
function DemoNote({children}: {children:ReactNode}) {
  return <p className="demo-note"><AlertCircle size={15}/><span>{children}</span></p>;
}
function FeatureCard({feature, index, open}: {feature:typeof features[number];index:number;open:()=>void}) {
  const Icon = feature.icon;
  return <motion.button type="button" className={`feature-card tint-${feature.accent}`} onClick={open}
    initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:index*.035,duration:.28}} whileTap={{scale:.96}}>
    <span className="feature-art" aria-hidden="true"><span className="feature-halo"/><span className="feature-illustration">{feature.art}</span><span className="feature-corner-icon"><Icon size={15} strokeWidth={2}/></span></span>
    <strong>{feature.title}</strong><span className="feature-detail">{feature.detail}</span>
  </motion.button>;
}
function SkeletonScreen({ profile = false }: {profile?:boolean}) {
  const c = {baseColor:'#26252b',highlightColor:'#4b4857',duration:1.25};
  return <div className="loading-scene" aria-busy="true" aria-label="Loading preview content">
    <Skeleton height={19} width="48%" {...c}/><Skeleton height={34} width="72%" {...c}/>
    <Skeleton height={profile?220:182} borderRadius={24} {...c}/>
    <div className="skeleton-group">{Array.from({length:profile?3:6},(_,i)=><Skeleton key={i} height={profile?76:130} borderRadius={19} {...c}/>)}</div>
    <Skeleton height={38} width="52%" {...c}/><Skeleton height={145} borderRadius={20} {...c}/>
  </div>;
}
/* Native overflow carousel: phone momentum + desktop mouse dragging, no forced snap. */
function SwipeRow({children, label}:{children:ReactNode;label:string}) {
  const ref=useRef<HTMLDivElement>(null);
  const drag=useRef({x:0,left:0,down:false,moved:false});
  const [canPrev,setCanPrev]=useState(false);
  const [canNext,setCanNext]=useState(true);
  const update=()=>{const el=ref.current;if(!el)return;setCanPrev(el.scrollLeft>5);setCanNext(el.scrollLeft+el.clientWidth<el.scrollWidth-5)};
  useEffect(()=>{update();const element=ref.current;if(!element)return;const observer=new ResizeObserver(update);observer.observe(element);return()=>observer.disconnect()},[children]);
  return <div className="swipe-block"><div className="swipe-toolbar"><span>Swipe to see more</span><div><button aria-label={`Scroll ${label} left`} type="button" disabled={!canPrev} onClick={()=>ref.current?.scrollBy({left:-260,behavior:'smooth'})}><ChevronLeft size={18}/></button><button aria-label={`Scroll ${label} right`} type="button" disabled={!canNext} onClick={()=>ref.current?.scrollBy({left:260,behavior:'smooth'})}><ChevronRight size={18}/></button></div></div>
    <div className="native-swipe-row" ref={ref} aria-label={label} onScroll={update}
      onPointerDown={e=>{if(e.pointerType!=='mouse'||e.button!==0)return;drag.current={x:e.clientX,left:e.currentTarget.scrollLeft,down:true,moved:false}}}
      onPointerMove={e=>{if(!drag.current.down)return;const delta=e.clientX-drag.current.x;if(Math.abs(delta)>7){drag.current.moved=true;if(!e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.setPointerCapture(e.pointerId)}if(drag.current.moved){e.preventDefault();e.currentTarget.scrollLeft=drag.current.left-delta}}}
      onPointerUp={e=>{drag.current.down=false;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);window.setTimeout(()=>{drag.current.moved=false},80)}}
      onPointerCancel={()=>{drag.current.down=false}} onDragStart={e=>e.preventDefault()}
      onClickCapture={e=>{if(drag.current.moved){e.preventDefault();e.stopPropagation();drag.current.moved=false}}}>
      {children}
    </div></div>;
}
function Carousel({items,onOpen}: {items:{kicker:string;title:string;subtitle:string;icon:LucideIcon;art:string;tint:string;page:Page}[];onOpen:(page:Page)=>void}) {
  return <SwipeRow label="Featured stories">{items.map(x=>{const Icon=x.icon;return <div className="native-carousel-item" key={x.title}>
    <button type="button" onClick={()=>onOpen(x.page)} className={`carousel-card carousel-${x.tint}`}><span className="carousel-overline">{x.kicker}</span><span className="carousel-art" aria-hidden="true"><span className="carousel-art-illustration">{x.art}</span><Icon className="carousel-art-symbol" size={24}/></span><h3>{x.title}</h3><p>{x.subtitle}</p></button>
  </div>})}</SwipeRow>;
}
function AppRow({icon:Icon,title,subtitle,end,onClick,tone='default'}:{icon:LucideIcon;title:string;subtitle?:string;end?:ReactNode;onClick:()=>void;tone?:string}) {
  return <button type="button" className="app-row" onClick={onClick}><span className={`row-icon row-${tone}`}><Icon size={20}/></span><span className="row-body"><strong>{title}</strong>{subtitle&&<small>{subtitle}</small>}</span>{end??<ChevronRight size={18} className="row-chevron"/>}</button>;
}
function Modal({kind,close,go,person,saveName}: {kind:Dialog;close:()=>void;go:(p:Page)=>void;person:string;saveName:(s:string)=>void}) {
  const [draft,setDraft]=useState(person);
  useEffect(()=>setDraft(person),[person,kind]);
  return <AnimatePresence>{kind && <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={close}>
    <motion.section className="bottom-sheet" role="dialog" aria-modal="true" aria-label={`${kind} dialog`} onClick={e=>e.stopPropagation()}
      initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',stiffness:340,damping:34}}>
      <div className="sheet-handle"/><IconButton icon={X} onClick={close} label="Close dialog" className="sheet-close"/>
      {kind==='sos'&&<><div className="sos-icon"><ShieldAlert size={39}/></div><h2>Emergency SOS</h2><p>This is a visual preview of the SOS experience. No message is sent and nobody is contacted.</p><div className="caution-inline"><AlertTriangle size={19}/> Emergency sending is not connected</div><button className="primary-button" type="button" onClick={()=>{close();go('guide')}}>View emergency guidance <ArrowRight size={18}/></button><button className="quiet-button" type="button" onClick={close}>Close preview</button></>}
      {kind==='profile'&&<><h2>Edit display name</h2><p>This change stays in your browser session.</p><label className="field-label" htmlFor="profile-name">Display name</label><input className="form-input" id="profile-name" maxLength={32} value={draft} onChange={e=>setDraft(e.target.value)}/><button className="primary-button" type="button" onClick={()=>{saveName(draft.trim()||'Traveler');close()}}>Save changes</button></>}
      {kind==='help'&&<><h2>About this preview</h2><p>SafeHaven currently demonstrates screens and interactions. It does not provide live alerts, emergency services, real mesh messaging, location tracking or offline downloads.</p><button className="primary-button" type="button" onClick={close}>Understood</button></>}
      {kind==='alerts'&&<><h2>Notifications</h2><p>Live notifications are not connected yet.</p><div className="sheet-list"><AppRow icon={CloudRain} title="Heavy rainfall example" subtitle="Illustrative weather notification" tone="amber" onClick={()=>{close();go('risk')}}/></div><button className="quiet-button" type="button" onClick={close}>Close</button></>}
    </motion.section>
  </motion.div>}</AnimatePresence>;
}

export default function App(){
  const [authenticated,setAuthenticated]=useState(false);
  const [phone,setPhone]=useState('');
  const [country,setCountry]=useState('+91');
  const [name,setName]=useState('Traveler');
  const [page,setPage]=useState<Page>('home');
  const [loading,setLoading]=useState(false);
  const [dialog,setDialog]=useState<Dialog>(null);
  const [compact,setCompact]=useState(false);
  const [toast,setToast]=useState('');
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('All');
  const [selectedDestination,setSelectedDestination]=useState('Manali');
  const [destinationMood,setDestinationMood]=useState('All');
  const [meshTab,setMeshTab]=useState<'Chats'|'Nearby'|'Beacons'|'SOS'>('Chats');
  const [meshScanning,setMeshScanning]=useState(false);
  const [tripNote,setTripNote]=useState('');
  const [noteOpen,setNoteOpen]=useState(false);
  const [noteSaved,setNoteSaved]=useState(false);
  const [guide,setGuide]=useState<GuideKind>('Flood');
  const [riskTab,setRiskTab]=useState('Overview');
  const [planMode,setPlanMode]=useState<'original'|'revised'>('revised');
  const [message,setMessage]=useState('');
  const [demoMessages,setDemoMessages]=useState<string[]>([]);
  const [beaconText,setBeaconText]=useState('Community meeting point');
  const [beaconDraft,setBeaconDraft]=useState(false);
  const [checklist,setChecklist]=useState<string[]>([]);
  const [checkedIn,setCheckedIn]=useState(false);
  const [showQuickGuide,setShowQuickGuide]=useState(false);
  const [homeGuide,setHomeGuide]=useState<GuideKind>('Flood');
  const [homeChecklist,setHomeChecklist]=useState<string[]>([]);
  const scrollRef=useRef<HTMLDivElement>(null);
  const lastTop=useRef(0);
  const reduceMotion=useReducedMotion();

  useEffect(()=>{if(!authenticated)return;setLoading(true);const t=window.setTimeout(()=>setLoading(false),page==='home'?640:420);return()=>window.clearTimeout(t)},[page,authenticated]);
  useEffect(()=>{if(!toast)return;const t=window.setTimeout(()=>setToast(''),2700);return()=>window.clearTimeout(t)},[toast]);
  const openDestination=(name:string)=>{setSelectedDestination(name);go('risk')};
  const go=(p:Page)=>{setPage(p);setCompact(false);lastTop.current=0;if(scrollRef.current) scrollRef.current.scrollTo({top:0,behavior:'instant'})};
  const handleScroll=(event:UIEvent<HTMLDivElement>)=>{const y=event.currentTarget.scrollTop;const diff=y-lastTop.current;if(y<66)setCompact(false);else if(diff>15)setCompact(true);else if(diff< -16)setCompact(false);lastTop.current=y;};
  const replay=()=>{go('home');setLoading(true);window.setTimeout(()=>setLoading(false),1850);setToast('Previewing loading states')};
  const tab:Page = ['risk','replan','guide','beacon'].includes(page)?'explore':page;
  const enter=(guest:boolean)=>{if(!guest && phone.replace(/\D/g,'').length<7){setToast('Enter a valid phone number or continue as guest');return;}setAuthenticated(true);setPage('home');setToast(guest?'Browsing in demo mode':'Signed in to demo mode — no SMS sent');};

  function login(){return <div className="login-screen">
    <section className="login-art"><div className="login-top"><Brand/><button className="login-skip" type="button" onClick={()=>enter(true)}>Skip</button></div>
      <div className="login-visual" aria-hidden="true"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><span className="login-point main-point"><ShieldCheck size={53} strokeWidth={1.5}/></span><span className="login-point side-point"><MapPin size={25}/></span><span className="login-point left-point"><Radio size={22}/></span></div>
      <div className="login-art-copy"><span>YOUR JOURNEY, YOUR SAFETY</span><h1>Go further.<br/><em>Stay prepared.</em></h1></div>
    </section>
    <section className="login-panel"><h2>Your journey starts here</h2><p>Plan ahead, keep informed and stay connected.</p>
      <label className="field-label" htmlFor="phone">Mobile number</label><div className="phone-field"><label className="country-select-wrap"><span className="sr-only">Country code</span><select value={country} onChange={e=>setCountry(e.target.value)} aria-label="Country code"><option value="+91">+91</option><option value="+973">+973</option><option value="+1">+1</option><option value="+44">+44</option></select><ChevronDown size={14}/></label><input id="phone" type="tel" autoComplete="tel-national" inputMode="tel" maxLength={16} placeholder="Enter your number" value={phone} onChange={e=>setPhone(e.target.value)}/></div>
      <button type="button" className="primary-button login-cta" onClick={()=>enter(false)}>Continue <ArrowRight size={18}/></button>
      <div className="or-divider"><span/>or<span/></div><button type="button" className="guest-button" onClick={()=>enter(true)}><Shield size={19}/> Explore as guest <ArrowRight size={17}/></button>
      <p className="login-legal">Demo sign-in only. No OTP is sent or account created.<br/>By continuing, you acknowledge this is a UI prototype.</p>
    </section>
  </div>}

  function home(){return <>
    <header className="home-header"><button className="home-location" type="button" onClick={()=>go('explore')}><MapPin size={21}/><span><small>YOUR DESTINATION</small><strong>Explore a location <ChevronDown size={14}/></strong></span></button><div className="header-actions"><IconButton icon={Bell} onClick={()=>setDialog('alerts')} label="Notifications"/><button className="avatar-button" type="button" onClick={()=>go('profile')} aria-label="Open profile"><span>{name.charAt(0).toUpperCase()}</span></button></div></header>
    <div className="home-welcome"><p>Welcome to SafeHaven</p><h1>A better way to be prepared.</h1></div>
    <button type="button" className="hero-risk" onClick={()=>go('risk')}><img className="hero-risk-photo" src="/visuals/sunset-trail.webp" alt="" loading="eager"/><div className="hero-risk-bg"/><div className="hero-risk-top"><span className="hero-shield"><ShieldCheck size={24}/></span><span className="hero-label">DESTINATION SAFETY</span><ArrowRight size={20}/></div><h2>Know before<br/>you go.</h2><p>Check weather, reports and local guidance for your next stop.</p><span className="hero-link">Explore risk insights <ChevronRight size={16}/></span></button>
    <DemoNote>Live safety alerts are not connected. All reports shown are examples.</DemoNote>
    <Heading title="What would you like to do?"/>
    <div className="feature-grid">{features.map((f,i)=><FeatureCard key={f.title} feature={f} index={i} open={()=>go(f.page)}/>)}</div>
    <section className="home-quick-section" aria-label="Quick safety actions">
      <Heading title="Quick actions" sub="Try these directly from Home"/>
      <div className="home-action-grid">
        <motion.button type="button" whileTap={{scale:.97}} className={`home-action ${checkedIn?'home-action-done':''}`} onClick={()=>{setCheckedIn(v=>!v);setToast('Check-in changed locally. Nothing was shared.')}}>
          <span className="home-action-icon"><CheckCheck size={25}/></span>
          <span><strong>{checkedIn?'Checked in locally':'Quick check-in'}</strong><small>{checkedIn?'Tap to reset · not shared':'Mark safe · demo only'}</small></span>
          <ChevronRight size={18}/>
        </motion.button>
        <motion.button type="button" whileTap={{scale:.97}} className={`home-action ${showQuickGuide?'home-action-done':''}`} aria-expanded={showQuickGuide} onClick={()=>setShowQuickGuide(v=>!v)}>
          <span className="home-action-icon home-action-guide"><BookOpen size={25}/></span>
          <span><strong>Emergency tips</strong><small>Read the basics here</small></span>
          <ChevronDown size={18}/>
        </motion.button>
      </div>
      <AnimatePresence initial={false}>{showQuickGuide&&<motion.div className="home-guide-inline" initial={{opacity:0,height:0,y:-6}} animate={{opacity:1,height:'auto',y:0}} exit={{opacity:0,height:0,y:-4}} transition={{type:'spring',stiffness:260,damping:30}}>
        <div className="home-guide-inner"><div className="home-guide-types" role="group" aria-label="Safety topic">{(Object.keys(guides) as GuideKind[]).map(k=><button key={k} type="button" className={homeGuide===k?'is-active':''} aria-pressed={homeGuide===k} onClick={()=>setHomeGuide(k)}>{k}</button>)}</div>
        <p>{guides[homeGuide].steps[0]}</p><small>General guidance · verify local authority instructions</small></div>
      </motion.div>}</AnimatePresence>
      <div className="home-prep"><div><strong>Before you head out</strong><span>{homeChecklist.length} of 3 reviewed</span></div>
        <div className="home-prep-tasks">{['Check forecast','Save emergency contacts','Share plans with your group'].map(t=><button type="button" key={t} aria-pressed={homeChecklist.includes(t)} className={homeChecklist.includes(t)?'done':''} onClick={()=>setHomeChecklist(old=>old.includes(t)?old.filter(v=>v!==t):[...old,t])}><span>{homeChecklist.includes(t)?<Check size={15}/>:null}</span>{t}</button>)}</div>
        <p>Checklist saved in this demo session only.</p>
      </div>
    </section>
    <section className="home-note-area"><Heading title="Trip note" sub="Keep a reminder handy on this device" right={<button className="section-link" type="button" onClick={()=>setNoteOpen(v=>!v)}>{noteOpen?'Close':'Edit'} <ChevronRight size={15}/></button>}/>
      <div className="home-note-card"><div className="home-note-head"><span><FileText size={20}/></span><div><strong>{noteSaved&&tripNote?'Your reminder':'A note for later'}</strong><small>Session only · not synced</small></div></div>
        {noteOpen?<><textarea maxLength={220} aria-label="Trip reminder" placeholder="For example: hotel address, bus stop, or who to call" value={tripNote} onChange={e=>{setTripNote(e.target.value);setNoteSaved(false)}} rows={3}/><button className="note-save" type="button" onClick={()=>{setNoteSaved(true);setNoteOpen(false);setToast('Reminder saved for this session')}}><Save size={16}/> Save note</button></>:<button className="note-display" type="button" onClick={()=>setNoteOpen(true)}>{tripNote||'Add a hotel address, contact or meeting point.'}<ArrowRight size={17}/></button>}
      </div>
    </section>
    <section className="home-section"><Heading title="For your next trip" right={<button className="section-link" onClick={()=>go('explore')}>See all <ChevronRight size={15}/></button>}/>
      <Carousel onOpen={go} items={[
        {kicker:'DESTINATION CHECK',title:'Before you leave',subtitle:'Review known conditions',icon:MapPin,art:'🌍',tint:'indigo',page:'risk'},
        {kicker:'YOUR ITINERARY',title:'Plans can change',subtitle:'Compare alternatives',icon:Navigation,art:'🧭',tint:'violet',page:'replan'},
        {kicker:'STAY IN TOUCH',title:'Keep your group close',subtitle:'Explore offline chat',icon:Radio,art:'📡',tint:'teal',page:'mesh'},
      ]}/>

    </section>
    <section className="home-section"><Heading title="Recent reports" sub="Examples of how updates will appear" right={<button className="section-link" onClick={()=>go('risk')}>View all <ChevronRight size={15}/></button>}/><div className="list-panel">{reports.map(r=><AppRow key={r.title} icon={r.icon} tone={r.tone} title={r.title} subtitle={r.subtitle} onClick={()=>go('risk')} end={<span className="row-end">Demo <ChevronRight size={16}/></span>}/>)}</div></section>
  </>}

  function explore(){
    const matched=destinations.filter(d=>(d.name+' '+d.region+' '+d.label).toLowerCase().includes(query.toLowerCase())&&(destinationMood==='All'||d.mood===destinationMood));
    return <><BackHeader title="Explore" back={()=>go('home')}/>
      <div className="explore-intro"><span className="eyebrow">DISCOVER PLACES</span><h2>Where to next?</h2><p>Find places worth exploring. Check conditions before making plans.</p></div>
      <div className="search-field explore-search"><Search size={21}/><input placeholder="Search a place or region" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search destinations"/>{query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery('')}><X size={17}/></button>}</div>
      <div className="explore-editorial" role="img" aria-label="Mountains and lakes scenic photograph"><div className="explore-editorial-art"/><div className="explore-editorial-shade"/><span className="explore-overline"><Compass size={15}/> THE OUTDOORS</span><div><h3>Take the scenic route.</h3><p>Great trips start with a little preparation.</p></div></div>
      <section className="explore-section"><Heading title="Find your kind of place"/><div className="explore-moods" role="group" aria-label="Filter destinations">{[
        {name:'All',icon:Compass},{name:'Mountains',icon:Mountain},{name:'Nature',icon:Trees},{name:'Coast',icon:Waves}
      ].map(x=>{const Icon=x.icon;return <button type="button" key={x.name} className={destinationMood===x.name?'selected':''} aria-pressed={destinationMood===x.name} onClick={()=>setDestinationMood(x.name)}><Icon size={17}/>{x.name}</button>})}</div></section>
      <section className="explore-section explore-destinations"><Heading title={query?'Search results':'Popular destinations'} sub="Browse sample locations"/>
        {matched.length>0?<SwipeRow label="Destination cards">{matched.map((d,i)=><button key={d.name} type="button" className="destination-tile" onClick={()=>openDestination(d.name)}><span className={`destination-photo destination-photo-${i%5}`} style={{backgroundImage:`linear-gradient(180deg,transparent 25%,#09110fdb 100%),url('${d.image}')`}}/><span className="destination-tile-copy"><span>{d.label}</span><strong>{d.name}</strong><small>{d.region}<ArrowRight size={14}/></small></span></button>)}</SwipeRow>:<div className="empty-feature empty-compact"><Search size={26}/><h3>No matches here</h3><p>Try another region or category.</p></div>}
      </section>
      <section className="explore-section"><Heading title="Check before you go" sub="Useful tools for your next stop"/><div className="explore-tools"><button type="button" onClick={()=>go('risk')}><span><ShieldCheck size={22}/></span><strong>Risk overview</strong><small>Understand report sources</small><ArrowRight size={17}/></button><button type="button" onClick={()=>go('guide')}><span><BookOpen size={22}/></span><strong>Safety essentials</strong><small>Guidance for common hazards</small><ArrowRight size={17}/></button></div></section>
      <DemoNote>Destinations and risk information are examples, not live recommendations.</DemoNote>
    </>
  }

  function risk(){return <><BackHeader title="Risk intelligence" back={()=>go('home')} action={<IconButton icon={CircleHelp} label="About this preview" onClick={()=>setDialog('help')}/>}/>
    <div className="destination-cover"><div className="destination-cover-art"/><span className="destination-overline">SAMPLE DESTINATION</span><h2>{selectedDestination}, India</h2><p><MapPin size={14}/> Destination preview</p></div>
    <div className="tab-strip tab-tight" role="tablist" aria-label="Risk views">{['Overview','Weather','Reports'].map(x=><button role="tab" aria-selected={riskTab===x} className={riskTab===x?'selected':''} key={x} onClick={()=>setRiskTab(x)}>{x}</button>)}</div>
    <DemoNote>Demonstration only. No official warnings or real-time data are connected.</DemoNote>
    {riskTab==='Overview'&&<><section className="risk-summary"><span className="risk-summary-symbol"><ShieldAlert size={27}/></span><span><small>EXAMPLE RISK SCENARIO</small><strong>Weather advisory preview</strong><p>Illustrates how a weather-related warning would be presented.</p></span></section><Heading title="What to check"/><div className="metric-two"><div><Sun size={22}/><span>Weather</span><strong>Not connected</strong></div><div><Shield size={22}/><span>Official alerts</span><strong>Not connected</strong></div></div></>}
    {riskTab==='Weather'&&<><Heading title="Weather outlook"/><div className="empty-feature"><CloudRain size={33}/><h3>Weather data isn't connected</h3><p>Live temperature and forecasts will be shown here when Open-Meteo is integrated.</p></div></>}
    {riskTab==='Reports'&&<><Heading title="Reported incidents"/><div className="list-panel">{reports.map(r=><AppRow key={r.title} icon={r.icon} title={r.title} subtitle={r.subtitle} tone={r.tone} onClick={()=>setDialog('help')}/>)}</div></>}
    <section className="content-section"><Heading title="Need guidance?"/><button type="button" className="simple-cta" onClick={()=>go('guide')}><BookOpen size={21}/><span>Open emergency guide</span><ArrowRight size={18}/></button></section>
  </>}

  function replan(){return <><BackHeader title="Trip replanner" back={()=>go('home')}/><div className="replan-banner"><span><Navigation size={24}/></span><small>ITINERARY PREVIEW</small><h2>Keep your plans flexible.</h2><p>See an example of a small itinerary adjustment.</p></div>
    <DemoNote>These are example changes. No AI recommendation or live risk check was performed.</DemoNote><div className="segmented" role="tablist" aria-label="Itinerary version"><button type="button" role="tab" aria-selected={planMode==='original'} className={planMode==='original'?'selected':''} onClick={()=>setPlanMode('original')}>Original plan</button><button type="button" role="tab" aria-selected={planMode==='revised'} className={planMode==='revised'?'selected':''} onClick={()=>setPlanMode('revised')}>Revised plan</button></div>
    <div className="itinerary-list">{itinerary.map((x,i)=><motion.div className="itinerary-day" key={x.day} layout><div className="day-track"><span>{x.day}</span><i/></div><div className="day-card"><span className="day-card-label">DAY {i+1} <span>·</span> {x.time}</span><h3>{x.title}</h3><p>{planMode==='original'?x.old:x.revised}</p>{planMode==='revised'&&x.changed&&<span className="plan-change"><Check size={14}/> Example alternative</span>}</div></motion.div>)}</div>
    <div className="why-card"><AlertCircle size={19}/><p><strong>What changed?</strong> On Day 2, the outdoor activity is swapped for an indoor stop. This is a sample comparison, not a safety assessment.</p></div>
    <button type="button" className="primary-button" onClick={()=>{setPlanMode('revised');setToast('Example revised plan displayed')}}>Preview revised itinerary <ArrowRight size={18}/></button>
  </>}

  function guidePage(){const g=guides[guide];const Icon=g.icon;return <><BackHeader title="Emergency guide" back={()=>go('home')} action={<IconButton icon={Languages} label="Language information" onClick={()=>setToast('Translated guidance will be available after integration')}/>}/><p className="page-lead">Clear steps for difficult situations.</p><div className="guide-picker" role="tablist" aria-label="Emergency type">{(Object.keys(guides) as GuideKind[]).map(k=>{const ItemIcon=guides[k].icon;return <button type="button" role="tab" aria-selected={guide===k} className={guide===k?'selected':''} key={k} onClick={()=>setGuide(k)}><ItemIcon size={22}/><small>{k}</small></button>})}</div>
    <div className="guide-cover"><div className="guide-cover-symbol"><Icon size={37}/></div><span>QUICK REFERENCE</span><h2>{guide} safety</h2><p>{g.lead}</p></div><DemoNote>General educational guidance. Verify instructions with the relevant local authority.</DemoNote>
    <Heading title="What should you do?"/>
    <div className="steps">{g.steps.map((step,i)=><div className="step" key={step}><span>{i+1}</span><p>{step}</p></div>)}</div>
    <button className="simple-cta guide-next" type="button" onClick={()=>go('pack')}><Bookmark size={21}/><span>View safety pack</span><ArrowRight size={18}/></button>
  </>}

  function mesh(){return <><BackHeader title="RescueMesh" back={()=>go('home')} action={<IconButton icon={CircleHelp} label="About RescueMesh" onClick={()=>setDialog('help')}/>}/>
    <div className="mesh-intro"><div className="mesh-orbits" aria-hidden="true"><span/><span/><Radio size={27}/></div><div><span className="eyebrow">OFFLINE NETWORK</span><h2>Stay in reach.</h2><p>Messages can travel between nearby phones once the Android mesh is connected.</p></div></div>
    <div className="mesh-status"><span className="mesh-status-icon"><WifiOff size={23}/></span><div><strong>No mesh connection</strong><p>Native Android connection not enabled in this preview</p></div><span className="mesh-state">DEMO</span></div>
    <div className="mesh-tabs" role="tablist" aria-label="RescueMesh sections">{(['Chats','Nearby','Beacons','SOS'] as const).map(t=><button role="tab" type="button" key={t} aria-selected={meshTab===t} className={meshTab===t?'selected':''} onClick={()=>setMeshTab(t)}>{t}</button>)}</div>
    <AnimatePresence mode="wait" initial={false}><motion.div key={meshTab} className="mesh-tab-content" initial={{opacity:0,x:9}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-9}} transition={{duration:.19}}>
    {meshTab==='Chats'&&<><Heading title="Travel group" sub="Message preview · nothing transmitted"/><div className="chat-panel"><div className="chat-top"><span className="chat-avatar"><Users size={23}/></span><div><strong>Group conversation</strong><small>Offline demo · no connected peers</small></div></div><div className="chat-content"><div className="bubble incoming">Is everyone at the meeting point?<small>Example message</small></div><div className="bubble outgoing">I'm checking the route now.<small>Example reply</small></div>{demoMessages.map((m,i)=><div className="bubble outgoing" key={`${i}-${m}`}>{m}<small>Local preview · Not sent</small></div>)}</div><form className="message-compose" onSubmit={e=>{e.preventDefault();if(message.trim()){setDemoMessages(a=>[...a,message.trim()]);setMessage('');setToast('Local message preview — not sent');}}}><input aria-label="Demo message" value={message} maxLength={150} placeholder="Type a message…" onChange={e=>setMessage(e.target.value)}/><button type="submit" aria-label="Preview message" disabled={!message.trim()}><Send size={18}/></button></form></div></>}
    {meshTab==='Nearby'&&<><Heading title="Nearby devices" sub="Available after Android setup"/><div className="mesh-empty"><div className="mesh-empty-art"><Radio size={35}/></div><h3>{meshScanning?'Looking for connections…':'No devices connected'}</h3><p>{meshScanning?'This is only a visual scan preview.':'Mesh discovery works between participating Android phones with permissions enabled.'}</p><button className="secondary-button" type="button" disabled={meshScanning} onClick={()=>{setMeshScanning(true);window.setTimeout(()=>setMeshScanning(false),1300)}}><RefreshCw size={16} className={meshScanning?'spin-icon':''}/> {meshScanning?'Scanning preview':'Preview scan'}</button></div></>}
    {meshTab==='Beacons'&&<><Heading title="Community safety beacons" sub="Opt-in places shared by people nearby"/><div className="mesh-beacon-feature"><MapPin size={27}/><h3>Need a meeting point?</h3><p>A person can share a temporary, self-reported location. These are never official shelters or verified safe routes.</p><button type="button" onClick={()=>go('beacon')}>Create beacon preview <ArrowRight size={17}/></button></div><DemoNote>No active beacons are available. Nothing has been shared.</DemoNote></>}
    {meshTab==='SOS'&&<><Heading title="SOS and relay" sub="Emergency messages when connectivity returns"/><div className="mesh-sos-card"><ShieldAlert size={31}/><div><strong>Emergency sending unavailable</strong><p>Queueing, relaying and acknowledgements will require the native Android bridge.</p></div></div><button className="secondary-button" type="button" onClick={()=>setDialog('sos')}><LifeBuoy size={18}/> View SOS demo <ArrowRight size={17}/></button><DemoNote>No SOS is queued, transmitted or delivered in this preview.</DemoNote></>}
    </motion.div></AnimatePresence>
  </>}

  function beacon(){return <><BackHeader title="Community beacon" back={()=>go('mesh')}/><div className="beacon-cover"><span className="beacon-map-halo one"/><span className="beacon-map-halo two"/><span className="beacon-map-halo three"/><span className="beacon-map-point"><MapPin size={27}/></span><span className="beacon-overline">COMMUNITY SAFETY</span></div><div className="beacon-heading"><h2>Share a temporary meeting point</h2><p>Only when you choose. Others may see your approximate location over RescueMesh once supported.</p></div>
    <DemoNote>Community locations are self-reported and unverified, not official shelters.</DemoNote><div className="beacon-form"><label className="field-label" htmlFor="beacon-text">Meeting point description</label><input className="form-input" id="beacon-text" maxLength={80} value={beaconText} onChange={e=>setBeaconText(e.target.value)} /><div className="beacon-info"><Clock3 size={19}/><span>Real beacons will have an expiry time and an off switch.</span></div><button type="button" className="primary-button" onClick={()=>{setBeaconDraft(true);setToast('Beacon draft created — not shared')}}>{beaconDraft?'Update local preview':'Preview beacon'}<ArrowRight size={18}/></button></div>
    {beaconDraft&&<div className="draft-beacon"><div><span><MapPin size={16}/> Local draft</span><strong>{beaconText}</strong><p>Unverified · No location shared</p></div><button type="button" onClick={()=>setBeaconDraft(false)}>Remove draft</button></div>}
    <div className="why-card"><AlertTriangle size={19}/><p>Beacon directions can show an approximate distance and bearing when native sensors are integrated. They cannot guarantee a safe route.</p></div>
  </>}

  function pack(){const tasks=[{title:'Emergency contacts',detail:'Add people to reach in an emergency',icon:Phone},{title:'Safety guidance',detail:'Review essential instructions',icon:BookOpen},{title:'Trip details',detail:'Keep your itinerary accessible',icon:Map},{title:'Group check-in',detail:'Decide who can see your status',icon:Users}];return <><BackHeader title="Safety pack" back={()=>go('home')} action={<IconButton icon={CircleHelp} label="About safety pack" onClick={()=>setDialog('help')}/>}/>
    <div className="pack-hero"><span className="pack-hero-mark"><Bookmark size={28}/></span><div><span>YOUR ESSENTIALS</span><h2>Prepared, wherever you go.</h2><p>Review key information before the connection drops.</p></div></div><DemoNote>Offline downloading and syncing are not enabled in this UI preview.</DemoNote>
    <Heading title="Before you go" sub="Checklist for this demo session"/><div className="list-panel checklist-panel">{tasks.map(t=>{const Icon=t.icon;const done=checklist.includes(t.title);return <button type="button" className="checklist-row" key={t.title} onClick={()=>setChecklist(p=>done?p.filter(x=>x!==t.title):[...p,t.title])}><span className="checklist-icon"><Icon size={21}/></span><span className="row-body"><strong>{t.title}</strong><small>{t.detail}</small></span><span className={`checkmark ${done?'is-checked':''}`}>{done&&<Check size={14}/>}</span></button>})}</div>
    <section className="content-section"><Heading title="Group check-in"/><div className="checkin-block"><span className="checkin-symbol"><Users size={23}/></span><h3>{checkedIn?'Marked safe in demo':'Let your group know'}</h3><p>{checkedIn?'This status has not been shared with anyone.':'Try how a consent-based group check-in would work.'}</p><button className="secondary-button" type="button" onClick={()=>{setCheckedIn(x=>!x);setToast('Status changed locally — not shared')}}>{checkedIn?'Reset preview':'Mark myself safe'} <ArrowRight size={17}/></button></div></section>
    <section className="content-section"><Heading title="Saved content"/><div className="list-panel"><AppRow icon={BookOpen} tone="violet" title="Emergency guide" subtitle="General safety instructions" onClick={()=>go('guide')}/><AppRow icon={Download} tone="blue" title="Offline downloads" subtitle="Not available in demo" onClick={()=>setToast('Offline downloading is not connected')}/></div></section>
  </>}

  function profile(){return <><BackHeader title="Profile" back={()=>go('home')} action={<IconButton icon={Settings} label="About this demo" onClick={()=>setDialog('help')}/>}/>
    <button type="button" className="profile-summary" onClick={()=>setDialog('profile')}><div className="profile-top"><span className="profile-ring"><span>{name.charAt(0).toUpperCase()}</span></span><span className="profile-identity"><strong>{name}</strong><small>{phone?`${country} ${phone}`:'Guest profile'}</small><small>Profile preview</small></span></div><span className="profile-divider"/><span className="profile-bottom">Edit your display name <ChevronRight size={20}/></span></button>
    <button type="button" className="profile-promo" onClick={()=>go('pack')}><span><ShieldCheck size={23}/></span><strong>Review your safety pack</strong><ChevronRight size={20}/></button>
    <section className="profile-section"><Heading title="Your essentials"/><div className="profile-shortcuts"><button onClick={()=>go('replan')}><span><Map size={25}/></span>My trips</button><button onClick={()=>go('pack')}><span><Phone size={25}/></span>Contacts</button><button onClick={()=>go('pack')}><span><Bookmark size={25}/></span>Offline pack</button></div></section>
    <section className="profile-section"><Heading title="Preferences"/><div className="list-panel"><AppRow icon={Languages} title="Language" subtitle="English · Demo only" onClick={()=>setToast('Language preferences are not connected')}/><AppRow icon={Bell} title="Notifications" subtitle="Not enabled" onClick={()=>setDialog('alerts')}/><AppRow icon={LockKeyhole} title="Privacy & sharing" subtitle="Nothing is shared in the demo" onClick={()=>setDialog('help')}/></div></section>
    <section className="profile-section"><Heading title="About SafeHaven"/><div className="list-panel"><AppRow icon={RefreshCw} title="Replay loading animation" subtitle="Watch the shimmer placeholders" onClick={replay}/><AppRow icon={CircleHelp} title="About this prototype" onClick={()=>setDialog('help')}/></div></section>
    <button type="button" className="signout" onClick={()=>{setAuthenticated(false);setPage('home');setPhone('');setName('Traveler');setToast('')}}>Return to welcome screen</button>
  </>}
  const content=()=>({home,explore,risk,replan,guide:guidePage,mesh,beacon,pack,profile}[page]());
  return <div className="preview-stage">
    <aside className="desktop-side"><Brand/><h1>Thoughtful design.<br/><span>Ready for the journey.</span></h1><p>Mobile UI prototype featuring real React components, motion and sample content.</p><div className="desktop-help"><Smartphone size={21}/><span>Use Chrome device mode for a phone-sized preview.<br/><b>F12 → Ctrl + Shift + M</b></span></div><p className="desktop-disclaimer">All location, incident and emergency features remain unconnected.</p></aside>
    <main className={`phone-shell ${!authenticated?'phone-onboarding':''}`} aria-label="SafeHaven application">
      <div className="phone-scroll" ref={scrollRef} onScroll={handleScroll}>
        {!authenticated ? login() : <AnimatePresence mode="wait" initial={false}><motion.div key={page} className="screen-content" initial={reduceMotion?false:{opacity:0,y:14,filter:'blur(3px)'}} animate={{opacity:1,y:0,filter:'blur(0px)'}} exit={reduceMotion?{}:{opacity:0,y:-9,filter:'blur(2px)'}} transition={{type:'spring',stiffness:310,damping:31,mass:.8}}>
          {loading?<SkeletonScreen profile={page==='profile'}/>:content()}
        </motion.div></AnimatePresence>}
      </div>
      {authenticated&&<nav className={`floating-dock ${compact?'dock-compact':''}`} aria-label="Main navigation">
        {([{id:'home',label:'Home',icon:Home},{id:'explore',label:'Explore',icon:Compass}] as const).map(t=>{const Icon=t.icon;return <button key={t.id} type="button" aria-label={t.label} aria-current={tab===t.id?'page':undefined} onClick={()=>go(t.id)} className={`dock-item ${tab===t.id?'dock-active':''}`}><span className="dock-active-bg" aria-hidden="true"/><Icon size={22} strokeWidth={2.1}/><span>{t.label}</span></button>})}
        <motion.button type="button" className="dock-sos" aria-label="Emergency SOS demo" onClick={()=>setDialog('sos')} whileTap={{scale:.92}}><ShieldAlert size={21}/><small>SOS</small></motion.button>
        {([{id:'mesh',label:'Mesh',icon:Radio},{id:'profile',label:'Profile',icon:Menu}] as const).map(t=>{const Icon=t.icon;return <button key={t.id} type="button" aria-label={t.label} aria-current={tab===t.id?'page':undefined} onClick={()=>go(t.id)} className={`dock-item ${tab===t.id?'dock-active':''}`}><span className="dock-active-bg" aria-hidden="true"/><Icon size={22} strokeWidth={2.1}/><span>{t.label}</span></button>})}
      </nav>}
      <Modal kind={dialog} close={()=>setDialog(null)} go={go} person={name} saveName={setName}/>
      <AnimatePresence>{toast&&<motion.div role="status" className="toast-message" initial={{opacity:0,y:13}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}>{toast}</motion.div>}</AnimatePresence>
    </main>
  </div>
}