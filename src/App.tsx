import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useRef, useState, type ReactNode, type UIEvent } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { RescueMeshScreen } from './mesh/RescueMeshScreen';
import { useRescueMesh } from './mesh/useRescueMesh';
import './mesh/mesh.css';
import { RiskTool, ReplanTool, GuidanceTool, PackTool } from './features/TravelTools';
import { SavedAreaWarnings } from './features/AreaWarnings';
import type {Place} from './services/api';
import { useSaved, read } from './services/storage';
import {
  ArrowLeft, ArrowRight, Bell, Bookmark,
  BookOpen, CheckCheck, ChevronDown, ChevronRight, CircleHelp,
  CloudRain, Compass, Home,
  Menu, Languages, LockKeyhole, Map, MapPin, Navigation, Phone, Radio, Search, Settings,
  Shield, ShieldAlert, ShieldCheck, Smartphone, ThermometerSun,
  X, Zap, Pencil, Mountain, Waves, Trees, UserRound, CalendarCheck2, FolderOpen, type LucideIcon,
} from 'lucide-react';

type Page = 'home' | 'explore' | 'risk' | 'replan' | 'guide' | 'mesh' | 'beacon' | 'pack' | 'profile' | 'language' | 'privacy' | 'sos';
type GuideKind = 'Flood' | 'Extreme heat' | 'Earthquake';
type Dialog = 'profile' | 'help' | 'alerts' | 'menu' | 'settings' | null;

const features: { title: string; detail: string; icon: LucideIcon; accent: string; page: Page }[] = [
  { title: 'Risk insights', detail: 'Check before your visit', icon: ShieldAlert, accent: 'rose', page: 'risk' },
  { title: 'Trip replanner', detail: 'Plan your dated activities', icon: Navigation, accent: 'blue', page: 'replan' },
  { title: 'Emergency guide', detail: 'Find steps for an emergency', icon: BookOpen, accent: 'amber', page: 'guide' },
  { title: 'RescueMesh', detail: 'Connect nearby without internet', icon: Radio, accent: 'violet', page: 'mesh' },
  { title: 'Safety beacon', detail: 'Share a refuge location', icon: MapPin, accent: 'teal', page: 'beacon' },
  { title: 'Safety pack', detail: 'Save for offline use', icon: Bookmark, accent: 'indigo', page: 'pack' },
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

const destinations = [
  { name:'Manali', region:'Himachal Pradesh', label:'Mountain escape', image:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=760&q=80', mood:'Mountains' },
  { name:'Munnar', region:'Kerala', label:'Misty hills', image:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=760&q=80', mood:'Nature' },
  { name:'Goa', region:'West coast', label:'Sun and coast', image:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=760&q=80', mood:'Coast' },
  { name:'Coorg', region:'Karnataka', label:'Quiet trails', image:'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=760&q=80', mood:'Nature' },
  { name:'Kodaikanal', region:'Tamil Nadu', label:'Lakes and forests', image:'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=760&q=80', mood:'Mountains' },
];

function Brand({ compact = false }: {compact?:boolean}) {
  return <span className={`brand ${compact ? 'brand-small' : ''}`}><span className="brand-symbol"><ShieldCheck size={compact ? 19 : 25} strokeWidth={2.5}/></span><span>meridian</span></span>;
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
function FeatureCard({feature, index, open}: {feature:typeof features[number];index:number;open:()=>void}) {
  const Icon = feature.icon;
  return <motion.button type="button" className={`feature-card tint-${feature.accent}`} onClick={open}
    initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:index*.035,duration:.28}} whileTap={{scale:.96}}>
    <span className="feature-art" aria-hidden="true"><span className="feature-halo"/><span className="feature-illustration"><Icon size={43} strokeWidth={1.55}/></span><span className="feature-corner-icon"><Icon size={15} strokeWidth={2}/></span></span>
    <strong>{feature.title}</strong><span className="feature-detail">{feature.detail}</span>
  </motion.button>;
}
function SkeletonScreen({ profile = false }: {profile?:boolean}) {
  const c = {baseColor:'#dfe8e9',highlightColor:'#f7fbfa',duration:1.25};
  return <div className="loading-scene" aria-busy="true" aria-label="Loading content">
    <Skeleton height={19} width="48%" {...c}/><Skeleton height={34} width="72%" {...c}/>
    <Skeleton height={profile?220:182} borderRadius={24} {...c}/>
    <div className="skeleton-group">{Array.from({length:profile?3:6},(_,i)=><Skeleton key={i} height={profile?76:130} borderRadius={19} {...c}/>)}</div>
    <Skeleton height={38} width="52%" {...c}/><Skeleton height={145} borderRadius={20} {...c}/>
  </div>;
}
/* Native momentum scrolling, with a small springy pull past either edge. */
function SwipeRow({children, label}:{children:ReactNode;label:string}) {
  const ref = useRef<HTMLDivElement>(null);
  const overshoot = useMotionValue(0);
  const gesture = useRef({startX:0,startY:0,scrollStart:0,pressed:false,moved:false});
  const animation = useRef<{stop:()=>void}|null>(null);
  const reducedMotion = useReducedMotion();
  const settle = () => {
    gesture.current.pressed = false;
    animation.current?.stop();
    if(reducedMotion){overshoot.set(0);return;}
    animation.current = animate(overshoot,0,{type:'spring',stiffness:410,damping:25,mass:.7});
  };
  const pull = (dx:number,dy:number) => {
    const el=ref.current;
    if(!el || Math.abs(dx)<Math.abs(dy)*1.18){overshoot.set(0);return;}
    const max=Math.max(0,el.scrollWidth-el.clientWidth);
    const beyondStart=gesture.current.scrollStart-dx<0;
    const beyondEnd=gesture.current.scrollStart-dx>max;
    if(beyondStart || beyondEnd){
      const excess=beyondStart ? dx-gesture.current.scrollStart : dx+(max-gesture.current.scrollStart);
      overshoot.set(Math.sign(excess)*Math.min(36,Math.pow(Math.abs(excess),.72)*1.6));
    } else overshoot.set(0);
  };
  return <div className="swipe-block">
    <div className="swipe-viewport">
      <motion.div ref={ref} style={{x:overshoot}} className="native-swipe-row" aria-label={label}
        onTouchStart={e=>{const t=e.touches[0];if(!t)return;animation.current?.stop();gesture.current={startX:t.clientX,startY:t.clientY,scrollStart:e.currentTarget.scrollLeft,pressed:true,moved:false};}}
        onTouchMove={e=>{if(!gesture.current.pressed)return;const t=e.touches[0];if(t)pull(t.clientX-gesture.current.startX,t.clientY-gesture.current.startY);}}
        onTouchEnd={settle} onTouchCancel={settle}
        onPointerDown={e=>{if(e.pointerType!=='mouse'||e.button!==0)return;animation.current?.stop();gesture.current={startX:e.clientX,startY:e.clientY,scrollStart:e.currentTarget.scrollLeft,pressed:true,moved:false};}}
        onPointerMove={e=>{if(e.pointerType!=='mouse'||!gesture.current.pressed)return;const dx=e.clientX-gesture.current.startX;if(Math.abs(dx)>6){gesture.current.moved=true;if(!e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();e.currentTarget.scrollLeft=gesture.current.scrollStart-dx;pull(dx,0);}}}
        onPointerUp={e=>{settle();if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);window.setTimeout(()=>{gesture.current.moved=false},90);}}
        onPointerCancel={settle} onDragStart={e=>e.preventDefault()}
        onClickCapture={e=>{if(gesture.current.moved){e.preventDefault();e.stopPropagation();gesture.current.moved=false;}}}>
        {children}
      </motion.div>
    </div>
  </div>;
}
function Carousel({items,onOpen}: {items:{kicker:string;title:string;subtitle:string;icon:LucideIcon;tint:string;page:Page}[];onOpen:(page:Page)=>void}) {
  return <SwipeRow label="Featured stories">{items.map(x=>{const Icon=x.icon;return <div className="native-carousel-item" key={x.title}>
    <button type="button" onClick={()=>onOpen(x.page)} className={`carousel-card carousel-${x.tint}`}><span className="carousel-overline">{x.kicker}</span><span className="carousel-art" aria-hidden="true"><span className="carousel-art-illustration"><Icon size={58} strokeWidth={1.35}/></span><Icon className="carousel-art-symbol" size={24}/></span><h3>{x.title}</h3><p>{x.subtitle}</p></button>
  </div>})}</SwipeRow>;
}
function AppRow({icon:Icon,title,subtitle,end,onClick,tone='default'}:{icon:LucideIcon;title:string;subtitle?:string;end?:ReactNode;onClick:()=>void;tone?:string}) {
  return <button type="button" className="app-row" onClick={onClick}><span className={`row-icon row-${tone}`}><Icon size={20}/></span><span className="row-body"><strong>{title}</strong>{subtitle&&<small>{subtitle}</small>}</span>{end??<ChevronRight size={18} className="row-chevron"/>}</button>;
}
function Modal({kind,close,person,saveName,navigate,checkDestination}: {kind:Dialog;close:()=>void;person:string;saveName:(s:string)=>void;navigate:(p:Page)=>void;checkDestination:()=>void}) {
  const [draft,setDraft]=useState(person);
  useEffect(()=>setDraft(person),[person,kind]);
  return <AnimatePresence>{kind && <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={close}>
    <motion.section className="bottom-sheet" role="dialog" aria-modal="true" aria-label={`${kind} dialog`} onClick={e=>e.stopPropagation()}
      initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',stiffness:340,damping:34}}>
      <div className="sheet-handle"/><IconButton icon={X} onClick={close} label="Close dialog" className="sheet-close"/>
      {kind==='profile'&&<><h2>Edit display name</h2><p>Your display name is saved until you close the app.</p><label className="field-label" htmlFor="profile-name">Display name</label><input className="form-input" id="profile-name" maxLength={32} value={draft} onChange={e=>setDraft(e.target.value)}/><button className="primary-button" type="button" onClick={()=>{saveName(draft.trim()||'Traveler');close()}}>Save changes</button></>}
      {kind==='alerts'&&<><h2>Destination warnings</h2><p>Review saved notices and check the latest information for your destination.</p><SavedAreaWarnings/><button className="primary-button" onClick={checkDestination}>Check latest warnings</button></>}
      {kind==='menu'&&<><h2>Your travel tools</h2><AppRow icon={Navigation} title="My trip plan" subtitle="Compare and approve proposed changes" onClick={()=>navigate('replan')}/><AppRow icon={Bookmark} title="Safety pack" onClick={()=>navigate('pack')}/><AppRow icon={Languages} title="Language settings" onClick={()=>navigate('language')}/><AppRow icon={CircleHelp} title="How to use Meridian" onClick={()=>navigate('guide')}/></>}
      {kind==='settings'&&<><h2>Settings</h2><AppRow icon={Languages} title="Language" subtitle="Choose your guidance language" onClick={()=>navigate('language')}/><AppRow icon={LockKeyhole} title="Privacy & sharing" subtitle="Manage consent and saved information" onClick={()=>navigate('privacy')}/></>}
      {kind==='help'&&<><h2>About Meridian</h2><p>Start with Explore to choose a destination and check its weather and reports. Add your activities in Trip replanner, then save contacts and guidance in Safety pack. On Android, open Mesh → Nearby to join the nearby help network without exchanging codes. Participants are unverified. Use SOS to ask connected travelers for help.</p><button className="primary-button" type="button" onClick={close}>Understood</button></>}
    </motion.section>
  </motion.div>}</AnimatePresence>;
}

function NotificationToast({message}:{message:string}) {
  const reduced=useReducedMotion();
  return <div className="toast-anchor" role="status" aria-live="polite">
    <motion.div className="notification-toast"
      initial={{opacity:0,y:reduced?0:14,scale:reduced?1:.97}}
      animate={{opacity:1,y:0,scale:1}}
      exit={{opacity:0,y:reduced?0:8,scale:reduced?1:.98,transition:{duration:.18}}}
      transition={reduced?{duration:.15}:{duration:.32,ease:[.22,1,.36,1]}}
    ><span className="toast-copy">{message}</span></motion.div>
  </div>;
}

export default function App(){
  const [enteredApp,setEnteredApp]=useState(false);


  const [name,setName]=useState('Traveler');
  const [page,setPage]=useState<Page>('home');
  const [loading,setLoading]=useState(false);
  const [dialog,setDialog]=useState<Dialog>(null);
  const [compact,setCompact]=useState(false);
  const [toast,setToast]=useState('');
  const [query,setQuery]=useState('');
  const packSection=useRef<'contacts'|'group'|null>(null);
  const [selectedDestination,setSelectedDestination]=useState<string|null>(null);
  const [destinationMood,setDestinationMood]=useState('All');
  const meshApi=useRescueMesh();
  const [checklist,setChecklist]=useSaved<string[]>('checklist',[]);
  const [showQuickGuide,setShowQuickGuide]=useState(false);
  const [homeGuide,setHomeGuide]=useState<GuideKind>('Flood');
  const scrollRef=useRef<HTMLDivElement>(null);
  const lastTop=useRef(0);
  const reduceMotion=useReducedMotion();

  useEffect(()=>{if(!enteredApp)return;setLoading(true);const t=window.setTimeout(()=>setLoading(false),640);return()=>window.clearTimeout(t)},[page,enteredApp]);
  useEffect(()=>{if(!toast)return;const t=window.setTimeout(()=>setToast(''),1600);return()=>window.clearTimeout(t)},[toast]);
  const openDestination=(name:string)=>{go('risk');setSelectedDestination(name);window.history.replaceState({...window.history.state,destination:name},'')};
  const pendingScroll=useRef<number|null>(null);
  const navigationDepth=useRef(0);
  const languageNames:Record<string,string>={en:'English',hi:'Hindi',ta:'Tamil',fr:'French',es:'Spanish'};
  const [language,setLanguage]=useSaved('language','en');
  const rememberScroll=()=>window.history.replaceState({...window.history.state,scroll:scrollRef.current?.scrollTop||0},'');
  const go=(p:Page)=>{
    if(p===page && !dialog)return;
    if(p!=='pack')packSection.current=null;
    if(p==='risk')setSelectedDestination(null);
    rememberScroll();
    if(!dialog)navigationDepth.current+=1;
    window.history[dialog?'replaceState':'pushState']({safehaven:true,page:p,scroll:0,depth:navigationDepth.current,dialog:null},'');
    setDialog(null);setPage(p);pendingScroll.current=0;setCompact(false);
  };
  const openDialog=(d:Dialog)=>{
    if(!d)return;
    rememberScroll();navigationDepth.current+=1;
    window.history.pushState({safehaven:true,page,scroll:scrollRef.current?.scrollTop||0,depth:navigationDepth.current,dialog:d},'');
    setDialog(d);
  };
  const back=()=>{if(navigationDepth.current>0)window.history.back();else if(page!=='home')go('home');};
  const closeDialog=()=>{if(dialog)back();};
  useEffect(()=>{
    window.history.replaceState({safehaven:true,page:'home',scroll:0,depth:0,dialog:null},'');
    const pop=(event:PopStateEvent)=>{
      const entry=event.state;
      navigationDepth.current=entry?.safehaven?entry.depth:0;
      setSelectedDestination(entry?.destination||null);
      setPage(entry?.safehaven?entry.page:'home');setDialog(entry?.safehaven?entry.dialog:null);
      pendingScroll.current=entry?.scroll||0;setCompact(false);
    };
    window.addEventListener('popstate',pop);
    return()=>window.removeEventListener('popstate',pop);
  },[]);
  useEffect(()=>{
    if(loading || pendingScroll.current===null)return;
    const timer=window.setTimeout(()=>{if(scrollRef.current){scrollRef.current.scrollTop=pendingScroll.current||0;lastTop.current=scrollRef.current.scrollTop;pendingScroll.current=null;}},250);
    return()=>window.clearTimeout(timer);
  },[page,loading,dialog,enteredApp]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape' && dialog)closeDialog();};
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  },[dialog,page]);
  const nativeBackAction=useRef<()=>void>(()=>{});
  nativeBackAction.current=()=>{
    if(dialog || navigationDepth.current>0 || page!=='home')back();else void NativeApp.exitApp();
  };
  useEffect(()=>{
    if(!Capacitor.isNativePlatform())return;
    // Keep one native listener; its action reads the current page/dialog through the ref.
    const listener=NativeApp.addListener('backButton',()=>nativeBackAction.current());
    return()=>{void listener.then(handle=>handle.remove());};
  },[]);
  const handleScroll=(event:UIEvent<HTMLDivElement>)=>{const y=event.currentTarget.scrollTop;const diff=y-lastTop.current;if(y<66)setCompact(false);else if(diff>15)setCompact(true);else if(diff< -16)setCompact(false);lastTop.current=y;};

  const tab:Page = ['language','privacy'].includes(page)?'profile':['risk','replan','guide','beacon','pack'].includes(page)?'explore':page;
  const enter=(_guest:boolean)=>{navigationDepth.current=0;window.history.replaceState({safehaven:true,page:'home',scroll:0,depth:0,dialog:null},'');setEnteredApp(true);setPage('home');setToast('Welcome to Meridian');};

  function login(){return <div className="login-screen">
    <section className="login-art"><div className="login-top"><Brand/><button className="login-skip" type="button" onClick={()=>enter(true)}>Skip</button></div>
      <div className="login-visual welcome-compass" aria-hidden="true"><span className="welcome-halo"/><span className="welcome-symbol"><Compass size={72} strokeWidth={1.25}/></span></div>
      <div className="login-art-copy"><span>YOUR JOURNEY, YOUR SAFETY</span><h1>Go further.<br/><em>Stay prepared.</em></h1></div>
    </section>
    <section className="login-panel"><h2>Your journey starts here</h2><p>Plan ahead, keep informed and stay connected.</p>
      <button type="button" className="guest-button" onClick={()=>enter(true)}><Shield size={19}/> Explore as guest <ArrowRight size={17}/></button>
      <p className="login-legal">Your preparation is saved on this device. No account is required.</p>
    </section>
  </div>}

  function home(){const currentPlace=read<Place|null>('destination',null);return <>
    <header className="home-header"><button className="home-location" type="button" onClick={()=>currentPlace?openDestination(currentPlace.name):go('explore')}><MapPin size={21}/><span><small>YOUR DESTINATION</small><strong><span className="home-destination-name">{currentPlace?.name||'Choose a location'}</span> <ChevronDown size={14}/></strong></span></button><div className="header-actions"><IconButton icon={Bell} onClick={()=>openDialog('alerts')} label="Notifications"/><IconButton icon={Menu} onClick={()=>openDialog('menu')} label="Open menu"/><button className="avatar-button" type="button" onClick={()=>go('profile')} aria-label="Open profile"><span>{name.charAt(0).toUpperCase()}</span></button></div></header>
    <div className="home-welcome"><p>Welcome to Meridian</p><h1>A better way to be prepared.</h1></div>
    <button type="button" className="hero-risk" onClick={()=>go('risk')}><img className="hero-risk-photo" src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1100&q=82" onError={e=>{e.currentTarget.style.display="none"}} alt="Mountain landscape" loading="eager"/><div className="hero-risk-bg"/><div className="hero-risk-top"><span className="hero-shield"><ShieldCheck size={24}/></span><span className="hero-label">DESTINATION SAFETY</span></div><h2>Know before<br/>you go.</h2><p>Check weather, reports and local guidance for your next stop.</p><span className="hero-link">Check a destination <ChevronRight size={16}/></span></button>
    
    <Heading title="What would you like to do?" sub="Planning a trip? Start with a destination check, then build your itinerary and save your pack. Already there? Use guidance, check-in or SOS."/>
    <div className="feature-grid">{features.map((f,i)=><FeatureCard key={f.title} feature={f} index={i} open={()=>go(f.page)}/>)}</div>
    <section className="home-quick-section" aria-label="Quick safety actions">
      <Heading title="Quick actions" />
      <div className="home-action-grid">
        <motion.button type="button" whileTap={{scale:.97}} className="home-action" onClick={()=>{packSection.current='group';go('pack')}}>
          <span className="home-action-icon"><CheckCheck size={25}/></span>
          <span><strong>Quick check-in</strong><small>Share with your private group</small></span>
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
    </section>
    <section className="home-section"><Heading title="For your next trip" right={<button className="section-link" onClick={()=>go('explore')}>See all <ChevronRight size={15}/></button>}/>
      <Carousel onOpen={go} items={[
        {kicker:'DESTINATION CHECK',title:'Before you leave',subtitle:'Review known conditions',icon:MapPin,tint:'indigo',page:'risk'},
        {kicker:'YOUR ITINERARY',title:'Plans can change',subtitle:'Compare alternatives',icon:Navigation,tint:'violet',page:'replan'},
        {kicker:'STAY IN TOUCH',title:'Keep your group close',subtitle:'Explore offline chat',icon:Radio,tint:'teal',page:'mesh'},
      ]}/>

    </section>
  </>}

  function explore(){
    const matched=destinations.filter(d=>(d.name+' '+d.region+' '+d.label).toLowerCase().includes(query.toLowerCase())&&(destinationMood==='All'||d.mood===destinationMood));
    return <><BackHeader title="Explore" back={back}/>
      <div className="explore-intro"><span className="eyebrow">DISCOVER PLACES</span><h2>Where to next?</h2><p>Find places worth exploring. Check conditions before making plans.</p></div>
      <div className="search-field explore-search"><Search size={21}/><input placeholder="Search a place or region" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search destinations"/>{query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery('')}><X size={17}/></button>}</div>
      <div className="explore-editorial" role="img" aria-label="Mountains and lakes scenic photograph"><div className="explore-editorial-art"/><div className="explore-editorial-shade"/><span className="explore-overline"><Compass size={15}/> THE OUTDOORS</span><div><h3>Take the scenic route.</h3><p>Great trips start with a little preparation.</p></div></div>
      <section className="explore-section"><Heading title="Find your kind of place"/><div className="explore-moods" role="group" aria-label="Filter destinations">{[
        {name:'All',icon:Compass},{name:'Mountains',icon:Mountain},{name:'Nature',icon:Trees},{name:'Coast',icon:Waves}
      ].map(x=>{const Icon=x.icon;return <button type="button" key={x.name} className={destinationMood===x.name?'selected':''} aria-pressed={destinationMood===x.name} onClick={()=>setDestinationMood(x.name)}><Icon size={17}/>{x.name}</button>})}</div></section>
      <section className="explore-section explore-destinations"><Heading title={query?'Search results':'Popular destinations'} sub="Explore destinations"/>
        {matched.length>0?<SwipeRow label="Destination cards">{matched.map((d,i)=><button key={d.name} type="button" className="destination-tile" onClick={()=>openDestination(d.name)}><span className={`destination-photo destination-photo-${i%5}`} style={{backgroundImage:`linear-gradient(180deg,transparent 25%,#09110fdb 100%),url('${d.image}')`}}/><span className="destination-tile-copy"><span>{d.label}</span><strong>{d.name}</strong><small>{d.region}<ArrowRight size={14}/></small></span></button>)}</SwipeRow>:<div className="empty-feature empty-compact"><Search size={26}/><h3>No matches here</h3><p>Try another region or category.</p></div>}
      </section>
      <section className="explore-section"><Heading title="Check before you go" sub="Useful tools for your next stop"/><div className="explore-tools"><button type="button" onClick={()=>go('risk')}><span><ShieldCheck size={22}/></span><strong>Risk overview</strong><small>Understand report sources</small><ArrowRight size={17}/></button><button type="button" onClick={()=>go('guide')}><span><BookOpen size={22}/></span><strong>Safety essentials</strong><small>Guidance for common hazards</small><ArrowRight size={17}/></button></div></section>
      
    </>
  }

  function risk(){return <RiskTool onChoose={place=>{setSelectedDestination(place.name);window.history.replaceState({...window.history.state,destination:place.name},'')}} key={selectedDestination||"choose-destination"} destination={selectedDestination} back={back} notify={setToast} navigate={go}/>;}

  function replan(){return <ReplanTool back={back} notify={setToast} navigate={go}/>;}

  function guidePage(){return <GuidanceTool back={back} notify={setToast} navigate={go}/>;}

  function mesh(){return <RescueMeshScreen mesh={meshApi} onBack={back} onGuide={()=>go('guide')}/>;}
  function sos(){return <RescueMeshScreen mesh={meshApi} onBack={back} initialTab="SOS" onGuide={()=>go('guide')} standaloneSOS/>;}
  function beacon(){return <RescueMeshScreen key="beacon" mesh={meshApi} onBack={back} initialTab="Beacons" onGuide={()=>go('guide')}/>;}

  function pack(){return <PackTool initialSection={packSection.current} back={back} notify={setToast} navigate={go} checklist={checklist} toggleChecklist={title=>setChecklist(old=>old.includes(title)?old.filter(x=>x!==title):[...old,title])} nearbyShare={meshApi.available&&meshApi.state.peers.length>0?meshApi.sendCheckIn:undefined}/>;}

  function profile(){return <>
    <BackHeader title="Profile" back={back} action={<IconButton icon={Settings} label="Profile settings" onClick={()=>openDialog('settings')}/>}/>
    <section className="profile-revamp" aria-label="Your profile">
      <div className="profile-revamp-top">
        <div className="profile-revamp-avatar"><UserRound size={32} strokeWidth={1.5}/></div>
        <div className="profile-revamp-person"><span>YOUR ACCOUNT</span><h2>{name}</h2><p>Guest account</p></div>
        <button type="button" className="profile-revamp-edit" onClick={()=>openDialog('profile')} aria-label="Edit profile"><Pencil size={18}/></button>
      </div>
      <div className="profile-revamp-divider"/>
      <div className="profile-revamp-bottom"><span><ShieldCheck size={19}/> Your safety essentials, together</span><button type="button" onClick={()=>go('pack')}>View pack <ArrowRight size={16}/></button></div>
    </section>
    <section className="profile-section profile-essential-section"><Heading title="Quick access"/>
      <div className="profile-shortcuts profile-shortcuts-final">
        <button type="button" onClick={()=>go('replan')}><span><Map size={27} strokeWidth={1.65}/></span>My trips</button>
        <button type="button" onClick={()=>{packSection.current='contacts';go('pack')}}><span><Phone size={27} strokeWidth={1.65}/></span>Contacts</button>
        <button type="button" onClick={()=>go('pack')}><span><FolderOpen size={27} strokeWidth={1.65}/></span>Offline pack</button>
      </div>
    </section>
    <section className="profile-section profile-progress-section">
      <div className="profile-progress-head"><span className="profile-progress-mark"><CalendarCheck2 size={23}/></span><div><strong>Ready for the journey</strong><small>Review the essentials before you go</small></div><span className="profile-progress-total">{checklist.length}/4</span></div>
      <div className="profile-progress-track"><span style={{width:`${checklist.length * 25}%`}}/></div>
      <button type="button" onClick={()=>go('pack')}>Continue checklist <ChevronRight size={17}/></button>
    </section>
    <section className="profile-section"><Heading title="Preferences"/>
      <div className="list-panel profile-settings-list">
        <AppRow icon={Languages} title="Language" subtitle={languageNames[read('language','en')]||'English'} onClick={()=>go('language')}/>
        <AppRow icon={LockKeyhole} title="Privacy & sharing" subtitle="Review consent and local storage" onClick={()=>go('privacy')}/>
      </div>
    </section>
    <section className="profile-section"><Heading title="More"/>
      <div className="list-panel profile-settings-list">
        <AppRow icon={CircleHelp} title="Help & information" onClick={()=>openDialog('help')}/>
      </div>
    </section>
    <button type="button" className="signout" onClick={()=>{setEnteredApp(false);setPage('home');navigationDepth.current=0;window.history.replaceState({safehaven:true,page:'home',scroll:0,depth:0,dialog:null},'');setName('Traveler');setToast('')}}>Back to welcome screen</button>
  </>}
  function languagePage(){return <><BackHeader title="Language settings" back={back}/><section className="content-section"><h2>Preferred language</h2><p>Used for safety guidance and report explanations. The rest of the interface currently remains in English.</p><label className="tool-field">Language<select aria-label="Preferred language" value={read('language',language)} onChange={event=>{setLanguage(event.target.value);setToast('Language preference saved');}}>{Object.entries(languageNames).map(([code,title])=><option key={code} value={code}>{title}</option>)}</select></label><p className="tool-muted">Hindi and Tamil have prepared translations. French and Spanish require the online AI service. Translations are unreviewed; English source text stays available.</p><button className="secondary-button" onClick={()=>go('guide')}>Preview safety guidance <ArrowRight size={17}/></button></section></>}
  function privacy(){return <><BackHeader title="Privacy & sharing" back={back}/><section className="content-section"><h2>Your choices</h2><p>Contacts, plans, saved guidance and language preferences are stored on this device. Editing your display name lasts for this session.</p><p>Private group check-ins require consent and an online service. Nearby check-ins require a connected phone and separate consent. Beacons share your location only when you publish one.</p><p>Stopping RescueMesh disconnects peers and removes saved pending SOS/check-ins and beacons. Pending messages are encrypted on this phone, survive an app restart and expire within 24 hours. No background delivery is guaranteed. Leaving a private group removes your membership from that group.</p><button className="secondary-button" onClick={()=>go('pack')}>Manage group sharing</button><button className="secondary-button" onClick={()=>go('mesh')}>Manage nearby connections</button></section></>}
  const content=()=>({home,explore,risk,replan,guide:guidePage,mesh,beacon,pack,profile,language:languagePage,privacy,sos}[page]());
  return <div className="preview-stage">
    <aside className="desktop-side"><Brand/><h1>Thoughtful design.<br/><span>Ready for the journey.</span></h1><p>Discover places, prepare for the unexpected, and keep your plans in one place.</p><div className="desktop-help"><Smartphone size={21}/><span>Choose a destination, review your trip, and save your safety essentials before you travel.</span></div><p className="desktop-disclaimer">Emergency information is source-dependent. Always check local authorities.</p></aside>
    <main className={`phone-shell ${!enteredApp?'phone-onboarding':''}`} aria-label="Meridian application">
      <div className="phone-scroll" ref={scrollRef} onScroll={handleScroll}>
        {!enteredApp ? login() : <AnimatePresence mode="wait" initial={false}><motion.div key={page} className="screen-content" initial={reduceMotion?false:{opacity:0,y:14,filter:'blur(3px)'}} animate={{opacity:1,y:0,filter:'blur(0px)'}} exit={reduceMotion?{}:{opacity:0,y:-9,filter:'blur(2px)'}} transition={{type:'spring',stiffness:310,damping:31,mass:.8}}>
          {loading?<SkeletonScreen profile={page==='profile'}/>:content()}
        </motion.div></AnimatePresence>}
      </div>
      {enteredApp&&<nav className={`floating-dock ${compact?'dock-compact':''}`} aria-label="Main navigation">
        {([{id:'home',label:'Home',icon:Home},{id:'explore',label:'Explore',icon:Compass}] as const).map(t=>{const Icon=t.icon;return <button key={t.id} type="button" aria-label={t.label} aria-current={tab===t.id?'page':undefined} onClick={()=>go(t.id)} className={`dock-item ${tab===t.id?'dock-active':''}`}><span className="dock-active-bg" aria-hidden="true"/><Icon size={22} strokeWidth={2.1}/><span>{t.label}</span></button>})}
        <motion.button type="button" className="dock-sos" aria-label="Emergency SOS" aria-current={page==='sos'?'page':undefined} onClick={()=>go('sos')} whileTap={{scale:.92}}><ShieldAlert size={21}/><small>SOS</small></motion.button>
        {([{id:'mesh',label:'Mesh',icon:Radio},{id:'profile',label:'Profile',icon:UserRound}] as const).map(t=>{const Icon=t.icon;return <button key={t.id} type="button" aria-label={t.label} aria-current={tab===t.id?'page':undefined} onClick={()=>go(t.id)} className={`dock-item ${tab===t.id?'dock-active':''}`}><span className="dock-active-bg" aria-hidden="true"/><Icon size={22} strokeWidth={2.1}/><span>{t.label}</span></button>})}
      </nav>}
      <Modal kind={dialog} close={closeDialog} person={name} saveName={setName} navigate={go} checkDestination={()=>{const place=read<Place|null>('destination',null);if(place)openDestination(place.name);else go('risk')}}/>
      <AnimatePresence mode="wait">{toast&&<NotificationToast key={toast} message={toast}/>}</AnimatePresence>
    </main>
  </div>
}