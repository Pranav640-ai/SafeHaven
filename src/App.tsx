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
import GoogleLoginPage from "./GoogleLoginPage";

// Option 1: Render the Google Login Page directly as the entry point
export default function App() {
  return <GoogleLoginPage />;
}

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
