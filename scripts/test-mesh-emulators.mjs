import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, expect as baseExpect } from '@playwright/test';

// Only touches two explicitly selected running emulators, never a physical phone.
const adb=process.env.ADB_PATH||path.join(process.env.LOCALAPPDATA||'', 'Android/Sdk/platform-tools/adb.exe');
const apk=process.env.MESH_APK_PATH||['android/app/build/outputs/apk/debug/app-debug.apk','android/app/build/intermediates/apk/debug/app-debug.apk'].map(p=>path.resolve(p)).find(p=>fs.existsSync(p));
if(!apk)throw new Error('Build a debug APK first with :app:assembleDebug.');
const pkg='com.safehaven.ai';
const expect=baseExpect.configure({timeout:15000});
const output=path.resolve('test-results/mesh-emulators');
fs.mkdirSync(output,{recursive:true});
const invoke=(args)=>execFileSync(adb,args,{encoding:'utf8',timeout:120000}).trim();
const devices=invoke(['devices']).split(/\r?\n/).filter(line=>/^emulator-\d+\s+device\b/.test(line)).map(line=>line.split(/\s+/)[0]);
const selected=process.argv.slice(2).length?process.argv.slice(2):devices.slice(0,2);
if(selected.length!==2||selected.some(serial=>!devices.includes(serial)))throw new Error('Start two emulators first. Optional arguments must be two running emulator serials. Physical phones are excluded.');
const clients=[];
const forwards=[];
const records=[];
const record=(step,details)=>{const item={time:new Date().toISOString(),step,...details};records.push(item);console.log(JSON.stringify(item));fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(records,null,2));};
// WebViews can throttle pointer-stability checks. Drive the actual React handlers through DOM events; native operations still use Nearby.
const fill=async(field,value)=>field.evaluate((element,text)=>{const prototype=element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,text);element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));},value);
const bounded=async(promise,ms=10000)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Diagnostic timeout')),ms);})]);}finally{clearTimeout(timer);}};
const waitUntil=async(fn,timeout=30000)=>{const until=Date.now()+timeout;let last;while(Date.now()<until){try{const value=await fn();if(value)return value;}catch(e){last=e;}await new Promise(resolve=>setTimeout(resolve,500));}throw last||new Error('Timed out waiting for device');};

try{
 for(let i=0;i<selected.length;i++){
  const serial=selected[i];const shell=(...args)=>invoke(['-s',serial,'shell',...args]);
  await waitUntil(()=>shell('getprop','sys.boot_completed')==='1',120000);
  record('emulator-booted',{serial});
  record('install',{serial,result:invoke(['-s',serial,'install','-r','-t',apk])});
  const sdk=Number(shell('getprop','ro.build.version.sdk'));
  // Explicit testing grants avoid native permission dialogs blocking the WebView driver.
  const permissions=['ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION',...(sdk>=31?['BLUETOOTH_SCAN','BLUETOOTH_CONNECT','BLUETOOTH_ADVERTISE']:[]),...(sdk>=33?['NEARBY_WIFI_DEVICES']:[])];
  for(const permission of permissions)shell('pm','grant',pkg,`android.permission.${permission}`);
  shell('svc','wifi','enable');shell('svc','bluetooth','enable');
  shell('am','force-stop',pkg);
  shell('input','keyevent','224');
  shell('wm','dismiss-keyguard');
  shell('am','start','-n',`${pkg}/.MainActivity`);
  const focus=shell('dumpsys','window').split(/\r?\n/).find(line=>line.includes('mCurrentFocus='))||'';
  record('android-window-focus',{serial,focus:focus.trim()});
  if(focus.includes('Application Not Responding'))throw new Error(`${serial}: Android ANR dialog blocks input. Cold boot the emulator and retry. ${focus.trim()}`);
  const pid=await waitUntil(()=>shell('pidof',pkg));
  const socket=await waitUntil(()=>{const lines=shell('cat','/proc/net/unix');const match=lines.match(new RegExp(`@([^\\s]*webview_devtools_remote_${pid}[^\\s]*)`));return match?.[1];});
  const port=invoke(['-s',serial,'forward','tcp:0',`localabstract:${socket}`]);
  forwards.push({serial,port});
  const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{noDefaults:true});
  const page=await waitUntil(()=>browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('localhost')));
  page.setDefaultTimeout(30000);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  // Clear native listeners from the old JS context before the test-only reload.
  await page.evaluate(async()=>{await window.Capacitor.Plugins.App.removeAllListeners();await window.Capacitor.Plugins.RescueMesh.removeAllListeners();});
  // Motion reads the preference at mount; reload after setting it.
  await page.reload({waitUntil:'domcontentloaded'});
  clients.push({serial,shell,port,browser,page});
  await page.getByRole('button',{name:'Explore as guest'}).dispatchEvent('click');
  await expect(page.getByText('A better way to be prepared.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Mesh',exact:true}).dispatchEvent('click');
  await expect(page.getByRole('heading',{name:'RescueMesh',exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'Nearby',exact:true}).dispatchEvent('click');
  await page.getByLabel('Connection mode').selectOption('verified');
  await fill(page.getByLabel('Name shown to other phones'),`MESH TEST ${i?'B':'A'}`);
  await expect(page.getByRole('button',{name:'Start Nearby discovery'})).toBeEnabled();
  record('native-bridge-ready',{serial,sdk});
 }
 const [a,b]=clients;
 // Validate offline queue/cancellation and the SOS route even if simulator radios cannot pair.
 record('before-sos-route',{history:await a.page.evaluate(()=>window.history.state)});
 await a.page.getByRole('button',{name:'Emergency SOS',exact:true}).dispatchEvent('click');
 await expect(a.page.getByRole('heading',{name:'Emergency SOS',exact:true})).toBeVisible();
 await expect(a.page.getByRole('button',{name:'Mesh',exact:true})).not.toHaveAttribute('aria-current','page');
 await fill(a.page.getByLabel('SOS message'),`TEST — no emergency — initial queue ${Date.now()}`);
 await a.page.locator('.mesh-live-confirm input').evaluate(element=>element.click());
 await a.page.getByRole('button',{name:'Queue SOS on this phone'}).dispatchEvent('click');
 await expect(a.page.getByRole('button',{name:'Cancel pending SOS (1)',exact:true})).toBeVisible();
 await a.page.getByRole('button',{name:'Cancel pending SOS (1)',exact:true}).dispatchEvent('click');
 await expect(a.page.getByText('Cancelled — not sent',{exact:true}).last()).toBeVisible();
 record('initial-offline-queue-cancel-passed',{});
 await expect(a.page.locator('.mesh-live-confirm input')).not.toBeChecked();
 record('before-android-back',{focus:a.shell('dumpsys','window').split(/\r?\n/).find(line=>line.includes('mCurrentFocus=')),history:await a.page.evaluate(()=>window.history.state)});
 a.shell('input','keyevent','4');
 try{await expect(a.page.getByRole('heading',{name:'RescueMesh',exact:true})).toBeVisible();record('initial-sos-route-android-back-passed',{});}catch(error){record('android-back-failed',{message:error.message,history:await a.page.evaluate(()=>window.history.state)});await a.page.getByRole('button',{name:'Mesh',exact:true}).dispatchEvent('click');await expect(a.page.getByRole('heading',{name:'RescueMesh',exact:true})).toBeVisible();}
 await a.page.getByRole('tab',{name:'Nearby',exact:true}).dispatchEvent('click');
 await a.page.getByRole('button',{name:'Start Nearby discovery'}).dispatchEvent('click');
 await b.page.getByRole('button',{name:'Start Nearby discovery'}).dispatchEvent('click');
 record('discovery-started',{devices:selected});
 let recordDiscoveryError='';
 const codes=await waitUntil(async()=>{
  const read=async(client,peerName)=>{const request=client.page.locator('.mesh-live-peer-request').filter({hasText:peerName}).first();return await request.count()?await request.locator('b').innerText():null;};
  const errors=await Promise.all(clients.map(c=>c.page.locator('.mesh-live-alert').allTextContents()));
  const pair=await Promise.all([read(a,'MESH TEST B'),read(b,'MESH TEST A')]);
  if(pair[0]&&pair[0]===pair[1])return pair;
  if(errors.flat().length)recordDiscoveryError=errors.flat().join('; ');
  return null;
 },60000).catch(error=>{throw new Error(`${error.message}${recordDiscoveryError?': '+recordDiscoveryError:''}`)});
 record('authentication-codes-match',{matched:true});
 // Compare automatically, then approve precisely the requests containing that code.
 for(const client of clients)await client.page.locator('.mesh-live-peer-request').filter({hasText:codes[0]}).getByRole('button',{name:'Codes match'}).dispatchEvent('click');
 for(const client of clients)await expect(client.page.locator('.mesh-live-peer').filter({hasText:'Connected'})).toHaveCount(1,{timeout:30000});
 record('paired',{devices:selected});
 for(const client of clients)await client.page.getByRole('tab',{name:'Chats',exact:true}).dispatchEvent('click');
 const tag=Date.now();
 for(const [sender,recipient,label] of [[a,b,'A to B'],[b,a,'B to A']]){
  const message=`TEST — no emergency — ${label} ${tag}`;
  await fill(sender.page.getByLabel('Message',{exact:true}),message);
  await sender.page.getByRole('button',{name:'Send message'}).dispatchEvent('click');
  await expect(recipient.page.locator('.mesh-live-bubble.received').filter({hasText:message})).toHaveCount(1,{timeout:20000});
  await expect(sender.page.locator('.mesh-live-bubble.sent').filter({hasText:message})).toContainText('Peer acknowledged',{timeout:20000});
  record('chat-acknowledged',{direction:label,message});
 }
 await a.page.getByRole('button',{name:'Emergency SOS',exact:true}).dispatchEvent('click');
 await expect(a.page.getByRole('heading',{name:'Emergency SOS',exact:true})).toBeVisible();
 await expect(a.page.getByRole('button',{name:'Mesh',exact:true})).not.toHaveAttribute('aria-current','page');
 await b.page.getByRole('tab',{name:'SOS',exact:true}).dispatchEvent('click');
 const sos=`TEST — no emergency — SOS ${tag}`;
 await fill(a.page.getByLabel('SOS message'),sos);
 await a.page.locator('.mesh-live-confirm input').evaluate(element=>element.click());
 await a.page.getByRole('button',{name:'Relay SOS to nearby phones'}).dispatchEvent('click');
 await expect(b.page.locator('.mesh-live-peer').filter({hasText:sos})).toContainText('Received',{timeout:20000});
 await expect(a.page.locator('.mesh-live-peer').filter({hasText:sos})).toContainText('Peer acknowledged',{timeout:20000});
 record('sos-acknowledged',{message:sos});
 for(const client of clients)fs.writeFileSync(path.join(output,`${client.serial}-connected.png`),execFileSync(adb,['-s',client.serial,'exec-out','screencap','-p'],{timeout:10000}));
 // Disconnect B, then verify A queues rather than claims delivery and cancels cleanly.
 await b.page.getByRole('tab',{name:'Nearby',exact:true}).dispatchEvent('click');
 await b.page.getByRole('button',{name:'Stop discovery'}).dispatchEvent('click');
 await expect(a.page.getByRole('button',{name:'Queue SOS on this phone'})).toBeVisible({timeout:20000});
 await fill(a.page.getByLabel('SOS message'),`TEST — no emergency — queued ${tag}`);
 await a.page.locator('.mesh-live-confirm input').evaluate(element=>element.click());
 await a.page.getByRole('button',{name:'Queue SOS on this phone'}).dispatchEvent('click');
 await expect(a.page.getByRole('button',{name:'Cancel pending SOS (1)',exact:true})).toBeVisible();
 await a.page.getByRole('button',{name:'Cancel pending SOS (1)',exact:true}).dispatchEvent('click');
 await expect(a.page.getByText('Cancelled — not sent',{exact:true}).last()).toBeVisible();
 record('queue-and-cancel-passed',{});
 // Android hardware Back must return from SOS to the previously viewed Mesh screen.
 a.shell('input','keyevent','4');
 await expect(a.page.getByRole('heading',{name:'RescueMesh',exact:true})).toBeVisible();
 record('android-back-passed',{});
 record('complete',{passed:!records.some(r=>r.step==='android-back-failed'),scope:'Two-emulator pairing, bidirectional chat ACK, SOS ACK, disconnect, queue cancellation, Android Back. Not physical-radio or multi-hop acceptance.'});
 if(records.some(r=>r.step==='android-back-failed'))process.exitCode=1;
}catch(error){
 record('failure',{message:error.message});
 for(const client of clients){
  try{fs.writeFileSync(path.join(output,`${client.serial}-screen.txt`),await bounded(client.page.locator('body').innerText(),3000));}catch{}
  try{fs.writeFileSync(path.join(output,`${client.serial}-failure.png`),execFileSync(adb,['-s',client.serial,'exec-out','screencap','-p'],{timeout:10000}));}catch{}
 }

 process.exitCode=1;
}finally{
 for(const client of clients){try{await bounded(client.browser.close(),5000);}catch{}}
 for(const {serial,port} of forwards){try{invoke(['-s',serial,'forward','--remove',`tcp:${port}`]);}catch{}}
}
