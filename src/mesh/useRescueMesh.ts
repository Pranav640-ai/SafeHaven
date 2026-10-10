import { useEffect, useState, useRef } from 'react';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export type MeshPeer = { id: string; name: string };
export type MeshBeacon = {
  id: string; beaconId: string; body: string; from: string; fromName: string;
  latitude: number; longitude: number; expiresAt: number; createdAt: number; unverified: true;
};
export type MeshMessage = {
  id: string; type: 'chat' | 'sos' | 'checkin'; from: string; fromName: string;
  body: string; createdAt: number; received: boolean; status?: string;
};
export type MeshState = {
  ownBeaconId?: string; role?: 'auto'|'host'|'join'; running: boolean; advertising: boolean; discovering: boolean; peers: MeshPeer[];
  discovered: MeshPeer[]; beacons: MeshBeacon[]; queuedSOS: number; queuedCheckIns: number; carriedSOS: number; queueError: string; checkIns: MeshMessage[];
  identity: string; deviceName: string; allowUnverified: boolean;
};
export type ConnectionRequest = { id: string; name: string; code: string };
export type SendReceipt = { id: string; status: 'offered' | 'queued-on-device' | 'local-only' | 'none' };

type EventNames = 'state' | 'error' | 'connectionRequest' | 'connected' | 'disconnected' |
  'message' | 'ack' | 'beacon' | 'beaconRemoved' | 'queuedSOSOffered' | 'connectionFailed' | 'compass';
interface NativeRescueMesh {
  start(options: {deviceName: string;allowUnverified:boolean;role:'auto'|'host'|'join'}): Promise<MeshState>;
  stop(): Promise<MeshState>;
  getState(): Promise<MeshState>;
  accept(options: {id: string}): Promise<void>;
  rejectPeer(options: {id: string}): Promise<void>;
  sendChat(options: {text: string}): Promise<SendReceipt>;
  sendSOS(options: {text: string}): Promise<SendReceipt>;
  cancelQueuedSOS(): Promise<{cancelled:number}>;
  sendCheckIn(options: {status: 'safe' | 'needHelp' | 'unknown'}): Promise<SendReceipt>;
  publishBeacon(options: {text: string; latitude: number; longitude: number; minutes: number}): Promise<SendReceipt>;
  withdrawBeacon(): Promise<SendReceipt>;
  startCompass(options:{latitude:number;longitude:number}):Promise<{available:boolean}>;
  stopCompass():Promise<void>;
  addListener(eventName: EventNames, listener: (event: any) => void): Promise<PluginListenerHandle>;
}
const native = registerPlugin<NativeRescueMesh>('RescueMesh');
const available = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
const empty: MeshState = {
  running: false, advertising: false, discovering: false, peers: [], discovered: [],
  beacons: [], queuedSOS: 0, queuedCheckIns:0,carriedSOS:0,queueError:'',checkIns:[], identity: '', deviceName: '',allowUnverified:false,
};

export function useRescueMesh() {
  const acknowledged=useRef(new Set<string>());
  const [state, setState] = useState<MeshState>(empty);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [messages, setMessages] = useState<MeshMessage[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ownBeacon, setOwnBeacon] = useState<string | null>(null);
  const [heading,setHeading]=useState<number|null>(null);
  const [position, setPosition] = useState<{latitude: number; longitude: number} | null>(null);

  useEffect(() => {
    if (!available) return;
    let mounted = true;
    const listeners: PluginListenerHandle[] = [];
    const listen = async (event: EventNames, cb: (detail: any) => void) => {
      const l = await native.addListener(event, detail => { if (mounted) cb(detail); });
      if (mounted) listeners.push(l); else void l.remove();
    };
    const syncState=()=>void native.getState().then(s=>{if(mounted)setState(s)}).catch(e=>{if(mounted)setError(String(e))});
    void (async () => {
      await listen('state', e => {setState(e as MeshState);if(e.queueError)setError(e.queueError)});
      await listen('compass', e=>setHeading(e.available?e.heading:null));
      await listen('connectionRequest', e => setRequests(list =>
        [...list.filter(p=>p.id!==e.id),e as ConnectionRequest]));
      await listen('message', e => setMessages(list =>
        list.some(p => p.id === e.id) ? list : [...list, {...e, received: true} as MeshMessage]));
      await listen('ack', e => {acknowledged.current.add(e.refId);if(acknowledged.current.size>1000)acknowledged.current.delete(acknowledged.current.values().next().value!);setMessages(list => list.map(m => m.id===e.refId?{...m,status:'Peer acknowledged'}:m))});
      for(const event of ['beacon','beaconRemoved'] as const)await listen(event,syncState);
      await listen('queuedSOSOffered', e => setMessages(list => list.map(m =>
        m.id === e.id ? {...m, status: 'Offered to nearby peers'} : m)));
      await listen('error', e => setError(e.message||'Nearby connection could not be completed.'));
      await listen('connectionFailed', e => {setRequests(list=>list.filter(p=>p.id!==e.id));setError(e.message || 'Connection failed')});
      for(const event of ['disconnected','connected'] as const)await listen(event,e=>{setRequests(list=>list.filter(p=>p.id!==e.id));if(event==='connected')setError('');syncState()});
      await native.getState().then(s => {if (mounted) setState(s)});
    })().catch(e => {if(mounted)setError(String(e))});
    return () => {mounted = false; listeners.forEach(l => void l.remove());};
  }, []);

  useEffect(()=>{setOwnBeacon(state.ownBeaconId||null)},[state.ownBeaconId]);

  const attempt = async <T,>(action: () => Promise<T>): Promise<T> => {
    setError('');
    if (!available) throw new Error('Offline nearby connections require the Android app.');
    try {return await action();} catch (e) {setError(e instanceof Error ? e.message : String(e));throw e;}
  };
  const refresh = () => attempt(async () => {const s = await native.getState();setState(s);return s;});
  const start = async (deviceName: string, allowUnverified=false, role:'auto'|'host'|'join'='auto') => attempt(async () => {
    const result = await native.start({deviceName,allowUnverified,role});setState(result);return result;
  });
  const stop = async () => attempt(async () => {const s=await native.stop();setState(s);setRequests([]);setOwnBeacon(null);setMessages(list=>list.map(m=>m.type==='sos'&&m.status==='Queued on this phone · expires within 24 hours'?{...m,status:'Cancelled — network stopped'}:m));return s;});
  const approve = (id: string) => attempt(async () => {await native.accept({id});setRequests(p=>p.filter(x=>x.id!==id));});
  const reject = (id: string) => attempt(async () => {await native.rejectPeer({id});setRequests(p=>p.filter(x=>x.id!==id));});
  const sendChat = (text: string) => attempt(async () => {
    const receipt = await native.sendChat({text});
    setMessages(old => [...old,{id:receipt.id,type:'chat',from:state.identity,fromName:state.deviceName,
      body:text,createdAt:Date.now(),received:false,status:acknowledged.current.has(receipt.id)?'Peer acknowledged':'Offered to nearby peers'}]);
    return receipt;
  });
  const sendSOS = (text: string) => attempt(async () => {
    const receipt = await native.sendSOS({text});
    setMessages(old=>[...old,{id:receipt.id,type:'sos',from:state.identity,fromName:state.deviceName,
      body:text,createdAt:Date.now(),received:false,
      status:acknowledged.current.has(receipt.id)?'Peer acknowledged':receipt.status==='queued-on-device'?'Queued on this phone · expires within 24 hours':'Offered to nearby peers'}]);
    await native.getState().then(setState);return receipt;
  });
  const cancelQueuedSOS = () => attempt(async () => {const r=await native.cancelQueuedSOS();await native.getState().then(setState);setMessages(list=>list.map(m=>m.type==='sos'&&m.status==='Queued on this phone · expires within 24 hours'?{...m,status:'Cancelled — not sent'}:m));return r;});
  const sendCheckIn = (status: 'safe'|'needHelp'|'unknown') => attempt(async () => {
    const receipt=await native.sendCheckIn({status});
    await native.getState().then(setState);
    setNotice(receipt.status==='queued-on-device'?'Check-in saved on this phone. Start Nearby to send it when you connect.':'Check-in offered to nearby peers. Await an acknowledgement.');
    return receipt;
  });
  const locate = () => attempt(async () => {
    const location = await Geolocation.getCurrentPosition({enableHighAccuracy:true,timeout:15000});
    const next={latitude:location.coords.latitude,longitude:location.coords.longitude};
    setPosition(next);await native.startCompass(next).catch(()=>setHeading(null));return next;
  });
  const publishBeacon = (text: string, minutes=30) => attempt(async () => {
    const {latitude,longitude}=await locate();
    const receipt=await native.publishBeacon({text,latitude,longitude,minutes});
    setOwnBeacon(receipt.id);
    await native.getState().then(setState);
    setNotice(receipt.status==='local-only'?'Beacon saved locally. No peer is connected.':'Beacon offered to nearby peers.');
    return receipt;
  });
  const withdrawBeacon = () => attempt(async () => {
    const receipt=await native.withdrawBeacon();setOwnBeacon(null);
    await native.getState().then(setState);setNotice('Beacon withdrawn locally; offline peers may retain it until the withdrawal relays or it expires.');
    return receipt;
  });
  const stopCompass=()=>{setHeading(null);if(available)void native.stopCompass()};
  return {available,state,requests,messages,error,notice,position,heading,stopCompass,ownBeacon,
    refresh,start,stop,approve,reject,sendChat,sendSOS,cancelQueuedSOS,sendCheckIn,publishBeacon,withdrawBeacon,locate};
}
export type MeshController = ReturnType<typeof useRescueMesh>;
