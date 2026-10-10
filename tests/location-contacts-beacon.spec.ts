import {test,expect} from '@playwright/test';
const place={name:'Unlisted destination',latitude:10,longitude:77,country:'India',region:'Tamil Nadu',timezone:'Asia/Kolkata'};

test.beforeEach(async({page})=>{
  await page.route('**/api/**',route=>{
    const url=route.request().url();
    if(url.includes('/destinations?'))return route.fulfill({json:{places:[place]}});
    if(url.endsWith('/weather'))return route.fulfill({json:{place,days:[],source:{title:'Test forecast',url:'https://example.com',trust:'Forecast'},fetched_at:new Date().toISOString(),limitations:'Test'}});
    if(url.endsWith('/incidents'))return route.fulfill({json:{reports:[],errors:[],coverage:'Test',fetched_at:new Date().toISOString()}});
    if(url.includes('/intelligence/risk/assess'))return route.fulfill({status:503,json:{detail:'Test source unavailable'}});
    return route.fulfill({json:{alerts:[],fetched_at:new Date().toISOString()}});
  });
});

test('Explore selects a searched location outside preset cards',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Continue as guest'}).click();
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Explore',exact:true}).click();
  await page.getByLabel('Search destinations').fill('Unlisted destination');
  await page.getByRole('button',{name:'Search all locations'}).click();
  await page.locator('.tool-place').filter({hasText:place.name}).click();
  await expect(page.getByRole('heading',{name:place.name,exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('safehaven:destination')||'{}').latitude)).toBe(10);
});

test('Exact map point accepts zero coordinates and validates timezone',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Continue as guest'}).click();
  await page.locator('.feature-card').filter({hasText:'Risk insights'}).click();
  await page.getByText('Choose an exact map point',{exact:true}).click();
  await page.getByLabel('Location name',{exact:true}).fill('My trail');
  await page.getByLabel('Latitude',{exact:true}).fill('0');
  await page.getByLabel('Longitude',{exact:true}).fill('0');
  await page.getByLabel('Location timezone').fill('Invalid/Zone');
  await page.getByRole('button',{name:'Use this location'}).click();
  await expect(page.getByRole('alert')).toContainText('valid timezone');
  await page.getByLabel('Location timezone').fill('UTC');
  await page.getByRole('button',{name:'Use this location'}).click();
  await expect(page.getByRole('heading',{name:'My trail',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('safehaven:destination')||'{}'))).toMatchObject({name:'My trail',latitude:0,longitude:0,timezone:'UTC'});
});

test('Profile contacts edit legacy data without duplicating it and persist offline',async({page,context})=>{
  await page.addInitScript(()=>{if(!localStorage.getItem('safehaven:contacts'))localStorage.setItem('safehaven:contacts',JSON.stringify([{name:'Old hotel',phone:'+91 1234567890'}]));});
  await page.goto('/');await page.getByRole('button',{name:'Continue as guest'}).click();
  await page.getByRole('button',{name:'Open profile',exact:true}).click();
  await page.getByRole('button',{name:'Contacts',exact:true}).click();
  await page.getByRole('button',{name:'Edit contact Old hotel'}).click();
  await page.getByLabel('Contact name').fill('Updated hotel');
  await page.getByLabel('Contact category').selectOption('Hotel');
  await page.getByRole('button',{name:'Save contact changes'}).click();
  const row=page.locator('.group-member').filter({hasText:'Updated hotel'});
  await expect(row).toContainText('Hotel');await expect(row.getByRole('link')).toHaveAttribute('href','tel:+911234567890');
  await page.getByLabel('Contact name').fill('Duplicate');await page.getByLabel('Phone number').fill('+91 1234567890');
  await page.getByRole('button',{name:'Save contact locally'}).click();
  await expect(page.getByRole('alert')).toContainText('already saved');
  await context.setOffline(true);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('safehaven:contacts')||'[]'))).toEqual([{name:'Updated hotel',phone:'+91 1234567890',category:'Hotel'}]);
  await expect(row.getByRole('link')).toBeVisible();
});

test('Beacon restores own native sharing state, validates capacity and calls location/publish/withdraw',async({page})=>{
  await page.addInitScript(()=>{
    const win=window as any;
    let state={running:true,advertising:true,discovering:false,role:'host',peers:[{id:'peer',name:'Peer'}],discovered:[],beacons:[],ownBeaconId:'existing',queuedSOS:0,queuedCheckIns:0,carriedSOS:0,queueError:'',checkIns:[],identity:'me',deviceName:'Test',allowUnverified:true};
    win.androidBridge={};win.testNativeCalls=[];
    win.Capacitor={PluginHeaders:['RescueMesh','App','Geolocation'].map(name=>({name,methods:[...['getState','getCurrentPosition','startCompass','stopCompass','publishBeacon','withdrawBeacon','removeListener'].map(name=>({name,rtype:'promise'})),{name:'addListener',rtype:'callback'}]})),
      nativeCallback:()=>Promise.resolve('listener'),
      nativePromise:async(plugin:string,method:string,options:any)=>{
        win.testNativeCalls.push({plugin,method,options});
        if(method==='getState')return state;
        if(method==='getCurrentPosition')return {coords:{latitude:10,longitude:77}};
        if(method==='withdrawBeacon'){state={...state,ownBeaconId:'',beacons:[]};return {id:'existing',status:'offered'};}
        if(method==='publishBeacon'){state={...state,ownBeaconId:'new'};return {id:'new',status:'offered'};}
        if(method==='startCompass')return {available:false};
        return {};
      }};
  });
  await page.goto('/');await page.getByRole('button',{name:'Continue as guest'}).click();
  await page.locator('.feature-card').filter({hasText:'Safety beacon'}).click();
  await page.getByRole('button',{name:'Stop sharing beacon'}).click();
  await expect(page.getByRole('button',{name:'Stop sharing beacon'})).toHaveCount(0);
  await page.getByLabel('Available space (optional)').fill('1000');
  await expect(page.getByRole('button',{name:'Share my location temporarily'})).toBeDisabled();
  await page.getByLabel('Available space (optional)').fill('2');
  await page.getByRole('button',{name:'Share my location temporarily'}).click();
  await expect(page.getByRole('button',{name:'Stop sharing beacon'})).toBeVisible();
  const calls=await page.evaluate(()=>(window as any).testNativeCalls);
  expect(calls.some((c:any)=>c.method==='getCurrentPosition')).toBeTruthy();
  expect(calls.find((c:any)=>c.method==='publishBeacon').options).toMatchObject({latitude:10,longitude:77,minutes:30});
  expect(calls.some((c:any)=>c.method==='withdrawBeacon')).toBeTruthy();
});
