import {test,expect} from '@playwright/test';
const place={name:'Fixture town',latitude:10,longitude:77,country:'India',region:'Test',timezone:'Asia/Kolkata'};
test('Detailed risk distinguishes missing data and shows provider coverage',async({page})=>{
  await page.addInitScript(p=>localStorage.setItem('safehaven:destination',JSON.stringify(p)),place);
  await page.route('**/api/**',route=>{
    const url=route.request().url();
    if(url.includes('/intelligence/risk/assess'))return route.fulfill({json:{assessed_at:new Date().toISOString(),window:'06:00–18:00 local time',limitations:'Model estimate, not travel clearance.',reported_events:[],summary:{source_statuses:[{source_name:'USGS',status:'failed'}],activity_assessments:[{risk_score:null,risk_category:'low',recommended_action:'No safety conclusion.',uncertainty:{description:'Forecast unavailable.'},evidence:[]}]}}});
    if(url.includes('/weather'))return route.fulfill({json:{place,days:[],source:{title:'Fixture',url:'https://example.com',trust:'Forecast'},fetched_at:new Date().toISOString()}});
    if(url.includes('/incidents'))return route.fulfill({json:{reports:[],errors:[],coverage:'Fixture',fetched_at:new Date().toISOString()}});
    return route.fulfill({json:{alerts:[],fetched_at:new Date().toISOString()}});
  });
  await page.goto('/');await page.getByRole('button',{name:'Continue as guest'}).click();
  await page.locator('.home-location').click();
  const details=page.getByRole('region',{name:'Detailed activity risk'});
  await expect(details.getByText('No safety conclusion',{exact:true}).first()).toBeVisible();
  await details.getByText('Evidence and source coverage').click();
  await expect(details.getByText('USGS')).toBeVisible();
  await details.getByLabel('Risk activity type').selectOption('indoor');
  await expect(details.getByLabel('Risk activity type')).toHaveValue('indoor');
});

test('Nearby alternative fills a draft without overwriting a saved booking',async({page})=>{
  const booking={id:'booking',activity:'Existing hotel booking',kind:'booking',date:'2026-10-11',place};
  await page.addInitScript(({place,booking})=>{localStorage.setItem('safehaven:destination',JSON.stringify(place));localStorage.setItem('safehaven:itinerary',JSON.stringify([booking]));},{place,booking});
  await page.route('**/api/intelligence/destinations/nearby?*',route=>route.fulfill({json:{candidates:[{id:'osm-1',name:'Fixture museum',category:'indoor_museum',distance_km:2,ranking_explanation:'Nearby indoor option',information_gaps:['Opening hours unconfirmed']}],source_status:{source_name:'OpenStreetMap',status:'ok'},limitations:'Not verified open or safe.'}}));
  await page.goto('/');await page.getByRole('button',{name:'Continue as guest'}).click();
  await page.locator('.feature-card').filter({hasText:'Trip replanner'}).click();
  await page.getByText('Find nearby alternatives',{exact:true}).click();
  await page.getByRole('button',{name:'Find nearby places'}).click();
  await expect(page.getByText('Opening hours unconfirmed')).toBeVisible();
  await page.getByRole('button',{name:'Use as activity draft'}).click();
  await expect(page.getByLabel('Activity',{exact:true})).toHaveValue('Fixture museum');
  await expect(page.getByLabel('Activity type')).toHaveValue('indoor');
  await expect(page.getByRole('heading',{name:'Existing hotel booking'})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('safehaven:itinerary')||'[]')[0].activity)).toBe('Existing hotel booking');
});
