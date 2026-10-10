import {test,expect} from '@playwright/test';

test('Fake call, cancellation and blank decoy are local and reversible',async({page})=>{
  const external:string[]=[];
  page.on('request',r=>{if(r.url().includes('/api/'))external.push(r.url());});
  await page.goto('/');await page.getByRole('button',{name:'Continue as guest'}).click();
  await page.locator('.home-action').filter({hasText:'Fake call & decoy'}).click();
  await page.getByLabel('Caller name').fill('Sam');await page.getByLabel('Play a local ringtone').uncheck();
  await page.getByRole('button',{name:'Start fake call'}).click();
  await expect(page.getByRole('dialog',{name:'Local simulated call'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Sam',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Answer simulated call'}).click();
  await expect(page.getByRole('button',{name:'End simulated call'})).toBeVisible();
  await page.getByRole('button',{name:'End simulated call'}).click();
  await page.getByLabel('Start after').selectOption('5');
  await page.getByRole('button',{name:'Start fake call'}).click();
  await page.getByRole('button',{name:'Cancel scheduled call'}).click();
  await page.getByRole('button',{name:'Open blank decoy screen'}).click();
  await expect(page.getByLabel('Blank decoy screen')).toBeVisible();
  await page.getByRole('button',{name:'Exit decoy screen'}).click();
  await expect(page.getByRole('heading',{name:'Fake call & decoy'})).toBeVisible();
  await page.waitForTimeout(5100);
  await expect(page.getByRole('dialog',{name:'Local simulated call'})).toHaveCount(0);
  expect(external).toEqual([]);
});

test('Vault encrypts metadata, rejects wrong passphrase and opens documents offline',async({page,context})=>{
  await page.addInitScript(()=>localStorage.setItem('safehaven:contacts',JSON.stringify([{name:'Test contact',phone:'+91 1234567890'}])));
  await page.goto('/');await page.getByRole('button',{name:'Continue as guest'}).click();
  await page.getByRole('button',{name:'Open profile',exact:true}).click();
  await page.getByRole('button',{name:'Document vault',exact:true}).click();
  const password='Long test-only vault passphrase';
  await page.getByLabel('Vault passphrase',{exact:true}).fill(password);
  await page.getByLabel('Confirm passphrase').fill(password);
  await page.getByRole('button',{name:'Create encrypted vault'}).click();
  await page.getByLabel('Document label').fill('Passport secret label');
  await page.getByLabel('Document file').setInputFiles({name:'passport.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64')});
  await page.getByRole('button',{name:'Encrypt and save document'}).click();
  await expect(page.getByRole('button',{name:'View Passport secret label'})).toBeVisible();
  await page.getByRole('button',{name:'Save encrypted contacts snapshot'}).click();
  await expect(page.getByRole('button',{name:'View Emergency contacts snapshot'})).toBeVisible();
  const stored=await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('meridian-document-vault',1);r.onsuccess=()=>resolve(r.result)});
    const row=await new Promise<any>(resolve=>{const r=db.transaction('vault').objectStore('vault').get('payload');r.onsuccess=()=>resolve(r.result)});db.close();
    return {keys:Object.keys(row),ciphertext:new TextDecoder().decode(row.ciphertext),iterations:row.iterations};
  });
  expect(stored.keys.sort()).toEqual(['ciphertext','iterations','iv','salt','version']);
  expect(stored.ciphertext).not.toContain('Passport secret label');expect(stored.ciphertext).not.toContain('Test contact');
  expect(stored.iterations).toBe(600000);
  await page.getByRole('button',{name:'Lock vault'}).click();
  await page.getByLabel('Vault passphrase',{exact:true}).fill('wrong passphrase');
  await page.getByRole('button',{name:'Unlock vault'}).click();
  await expect(page.getByRole('alert')).toContainText('incorrect passphrase');
  await context.setOffline(true);
  await page.getByLabel('Vault passphrase',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Unlock vault'}).click();
  await page.getByRole('button',{name:'View Passport secret label'}).click();
  await expect(page.getByRole('img',{name:'Passport secret label'})).toBeVisible();
  await page.getByRole('button',{name:'View Emergency contacts snapshot'}).click();
  await expect(page.getByRole('region',{name:'Document preview'})).toContainText('Test contact');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{value:false,configurable:true});});
  await expect(page.getByRole('heading',{name:'Unlock your vault'})).toBeVisible();
  await expect(page.getByRole('button',{name:'View Passport secret label'})).toHaveCount(0);
  // Authenticated encryption must reject modified persisted bytes even with the right passphrase.
  await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('meridian-document-vault',1);r.onsuccess=()=>resolve(r.result)});
    const tx=db.transaction('vault','readwrite');const store=tx.objectStore('vault');const r=store.get('payload');
    r.onsuccess=()=>{const row=r.result;new Uint8Array(row.ciphertext)[0]^=1;store.put(row,'payload')};
    await new Promise<void>(resolve=>{tx.oncomplete=()=>resolve()});db.close();
  });
  await context.setOffline(false);await page.reload();
  await page.getByRole('button',{name:'Continue as guest'}).click();
  await page.getByRole('button',{name:'Open profile',exact:true}).click();
  await page.getByRole('button',{name:'Document vault',exact:true}).click();
  await page.getByLabel('Vault passphrase',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Unlock vault'}).click();
  await expect(page.getByRole('alert')).toContainText('damaged vault');
});

test('Beacon direction appears for another phone, never the publishing phone',async({page})=>{
  await page.addInitScript(()=>{
    const win=window as any;win.androidBridge={};
    const now=Date.now();const beacon=(from:string,id:string)=>({id,beaconId:id,from,fromName:from,body:from==='me'?'My meeting point':'Other meeting point',latitude:10.01,longitude:77.01,createdAt:now,expiresAt:now+3600000,unverified:true});
    const state={identity:'me',deviceName:'Test',running:true,advertising:true,discovering:false,role:'host',peers:[{id:'peer',name:'Other'}],discovered:[],beacons:[beacon('me','mine'),beacon('other','theirs')],ownBeaconId:'mine',queuedSOS:0,queuedCheckIns:0,carriedSOS:0,queueError:'',checkIns:[],allowUnverified:true};
    win.Capacitor={PluginHeaders:['RescueMesh','App','Geolocation'].map(name=>({name,methods:[...['getState','getCurrentPosition','startCompass','stopCompass','removeListener'].map(name=>({name,rtype:'promise'})),{name:'addListener',rtype:'callback'}]})),nativeCallback:()=>Promise.resolve('listener'),nativePromise:async(_p:string,m:string)=>m==='getState'?state:m==='getCurrentPosition'?{coords:{latitude:10,longitude:77}}:{available:false}};
  });
  await page.goto('/');await page.getByRole('button',{name:'Continue as guest'}).click();
  await page.locator('.feature-card').filter({hasText:'Safety beacon'}).click();
  await page.getByRole('button',{name:'Show approximate distance & bearing'}).click();
  const own=page.locator('.mesh-live-beacon').filter({hasText:'My meeting point'});
  const other=page.locator('.mesh-live-beacon').filter({hasText:'Other meeting point'});
  await expect(own.locator('.beacon-direction')).toHaveCount(0);
  await expect(other.locator('.beacon-direction')).toBeVisible();
});

test('Incident submission shares explicit coordinates and keeps public evidence unverified',async({page})=>{
  const place={name:'Test town',latitude:10,longitude:77,country:'India',region:'Test',timezone:'Asia/Kolkata'};
  const report={id:'report-1',kind:'blockedRoad',category:'road_blockage',description:'Bridge obstruction observed',severity:'moderate',trust:'Unverified',status:'new',latitude:10,longitude:77,distance_km:0,observed_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()};
  let submitted=false;let body:any;
  await page.addInitScript(p=>localStorage.setItem('safehaven:destination',JSON.stringify(p)),place);
  await page.route('**/api/safety/**',route=>{
    const request=route.request();
    if(request.url().endsWith('/nearby'))return route.fulfill({json:{reports:submitted?[report]:[]}});
    if(request.url().endsWith('/reports')&&request.method()==='POST'){body=request.postDataJSON();submitted=true;return route.fulfill({json:{report,delete_token:'test-owner-token'}})}
    if(request.url().endsWith('/evidence'))return route.fulfill({json:{verification_status:'unverified',explanation:'Context does not verify this report.',checked_at:new Date().toISOString(),sources:[{source:'USGS',status:'unavailable',note:'Coverage missing.',evidence:[]}]}});
    if(request.method()==='DELETE'){submitted=false;return route.fulfill({json:{removed:true}})}
    return route.fulfill({json:{}});
  });
  await page.goto('/');await page.getByRole('button',{name:'Continue as guest'}).click();
  await page.locator('.home-action').filter({hasText:'Report an incident'}).click();
  await page.getByLabel('What did you observe?').fill(report.description);
  await expect(page.getByRole('button',{name:'Submit unverified report'})).toBeDisabled();
  await page.getByLabel('Publish this description and the selected coordinates publicly.').check();
  await page.getByRole('button',{name:'Submit unverified report'}).click();
  await page.getByRole('button',{name:'Check public evidence'}).click();
  await expect(page.getByText('Public check: unverified')).toBeVisible();
  expect(body).toMatchObject({latitude:10,longitude:77,consent:true,category:'road_blockage'});
  await page.getByRole('button',{name:'Remove my report'}).click();
  await expect(page.getByRole('button',{name:'Check public evidence'})).toHaveCount(0);
});
