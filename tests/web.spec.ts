import { test, expect } from '@playwright/test';

test('Home stories accept native horizontal touch swipes and vertical scrolling', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:8000');
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    const row = page.getByLabel('Featured stories');
    await row.scrollIntoViewIfNeeded();
    const card = row.locator('.carousel-card').first();
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
    const cdp = await context.newCDPSession(page);
    const x = box!.x + box!.width * .82;
    const y = box!.y + box!.height * .5;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 12; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - step * 16, y }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => row.evaluate(el => el.scrollLeft)).toBeGreaterThan(40);
    const scroll = page.locator('.phone-scroll');
    const before = await scroll.evaluate(el => el.scrollTop);
    const bounds = await row.boundingBox();
    const touchY = Math.max(120, Math.min(700, bounds!.y + 100));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 210, y: touchY }] });
    for (let step = 1; step <= 12; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 210, y: touchY + step * 12 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => scroll.evaluate(el => el.scrollTop)).toBeLessThan(before - 30);
    await context.close();
});
test('itinerary edits persist and saved pack reopens offline', async ({ page, context }) => {
    await page.addInitScript(()=>localStorage.setItem('safehaven:destination',JSON.stringify({name:'Test town',latitude:10,longitude:77,country:'India',region:'Test',timezone:'Asia/Kolkata'})));
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    await page.getByRole('button', { name: /Trip replanner/ }).click();
    await page.getByRole('textbox', { name: 'Activity', exact: true }).fill('Museum visit');
    await page.getByLabel('Activity type', { exact: true }).selectOption('indoor');
    await page.getByRole('button', { name: 'Add activity' }).click();
    await expect(page.getByRole('heading', { name: 'Museum visit' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('textbox', { name: 'Activity', exact: true }).fill('Gallery visit');
    await page.getByRole('button', { name: 'Save activity changes' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    await page.getByRole('button', { name: /Safety pack Save for offline use/ }).click();
    await expect(page.getByRole('heading', { name: 'Gallery visit' })).toBeVisible();
    await page.getByRole('button', { name: 'Prepare offline guidance' }).click();
    await expect(page.getByText('Flood · en', { exact: true })).toBeVisible();
    await page.getByLabel('Hotel details and meeting point').fill('Test hotel, lobby meeting point');
    await page.getByLabel('Contact name', { exact: true }).fill('Travel companion');
    await page.getByLabel('Phone number', { exact: true }).fill('+910000000000');
    await page.getByRole('button', { name: 'Save contact locally' }).click();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBeTruthy();
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    await page.getByRole('button', { name: /Safety pack Save for offline use/ }).click();
    await expect(page.getByLabel('Hotel details and meeting point')).toHaveValue('Test hotel, lobby meeting point');
    await expect(page.getByText('Travel companion', { exact: true })).toBeVisible();
    await expect(page.getByText('Flood · en', { exact: true })).toBeVisible();
    await page.getByText('Flood · en', { exact: true }).click();
    await expect(page.getByText('Avoid walking, swimming or driving through floodwater.', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
});
test('prepared multilingual guidance preserves source and SOS access', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    await page.getByRole('button', { name: 'Emergency SOS', exact: true }).click();
    await page.getByRole('button', { name: 'View emergency guidance' }).click();
    await page.getByLabel('Preferred language').selectOption('ta');
    await expect(page.getByText(/Prepared translation/)).toBeVisible();
    await expect(page.locator('.steps')).toHaveAttribute('lang', 'ta');
    await expect(page.getByRole('link', { name: 'Ready.gov · Floods' })).toHaveAttribute('href', 'https://www.ready.gov/floods');
    await page.getByRole('button', { name: 'Emergency SOS', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Emergency SOS', exact: true })).toBeVisible();
});
for (const width of [320, 375, 430, 768]) {
    test(`mobile layout has no horizontal overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto('/');
        await page.getByRole('button', { name: 'Continue as guest' }).click();
        await page.getByRole('button', { name: /Trip replanner/ }).click();
        const overflow = await page.locator('.phone-scroll').evaluate(e => e.scrollWidth > e.clientWidth + 1);
        expect(overflow).toBeFalsy();
    });
}
test('private group consent, status synchronization and leaving work', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    await page.getByRole('button', { name: /Safety pack Save for offline use/ }).click();
    await page.getByLabel('Your display name').fill('Browser traveler');
    await page.getByLabel('New group name').fill('Browser verification group');
    await expect(page.getByRole('button', { name: 'Create private group' })).toBeDisabled();
    await page.getByLabel('I agree to share my name and chosen status with this group.').check();
    await page.getByRole('button', { name: 'Create private group' }).click();
    await expect(page.getByRole('heading', { name: 'Browser verification group' })).toBeVisible();
    await page.getByLabel('Share my next status with this group.').check();
    await page.getByRole('button', { name: "I'm safe", exact: true }).click();
    await expect(page.getByText(/Reported safe/)).toBeVisible();
    await page.getByRole('button', { name: 'Leave group and remove my shared status' }).click();
    await expect(page.getByLabel('New group name')).toBeVisible();
});


test('page Back and browser Back follow the last page and restore scroll', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    await page.getByRole('button', { name: 'Explore', exact: true }).click();
    await page.getByRole('button', { name: /Safety essentials/ }).click();
    await expect(page.getByRole('heading', { name: 'Emergency guide', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Explore', exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByText('A better way to be prepared.')).toBeVisible();
    await page.getByRole('button', { name: /Safety pack Save for offline use/ }).scrollIntoViewIfNeeded();
    const scroll = page.locator('.phone-scroll');
    const before = await scroll.evaluate(el => el.scrollTop);
    await page.getByRole('button', { name: /Safety pack Save for offline use/ }).click();
    await expect(page.getByRole('heading', { name: 'Safety pack', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect.poll(() => scroll.evaluate(el => el.scrollTop)).toBeGreaterThan(before - 10);
});

test('language settings, contacts shortcut and privacy routes work', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await page.getByRole('button', { name: /Language English/ }).click();
    await expect(page.getByRole('heading', { name: 'Language settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Emergency guide' })).toHaveCount(0);
    await page.getByLabel('Preferred language').selectOption('hi');
    await expect(page.getByLabel('Preferred language')).toHaveValue('hi');
    await page.getByRole('button', { name: 'Go back', exact: true }).click();
    await expect(page.getByRole('button', { name: /Language Hindi/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Notifications|Replay loading/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Contacts', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Emergency contacts', exact: true })).toBeInViewport();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: /Privacy & sharing/ }).click();
    await expect(page.getByRole('heading', { name: 'Privacy & sharing', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Manage nearby connections' }).click();
    await expect(page.getByRole('heading', { name: 'RescueMesh', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Nearby', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start Nearby discovery' })).toBeDisabled();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Privacy & sharing', exact: true })).toBeVisible();
});

test('dialogs close with Back and SOS guidance returns to its origin', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await page.getByLabel('Display name', { exact: true }).fill('Navigator');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { name: 'Navigator', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Emergency SOS', exact: true }).click();
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Emergency SOS', exact: true }).click();
    await page.getByRole('button', { name: 'View emergency guidance' }).click();
    await expect(page.getByRole('heading', { name: 'Emergency guide', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Emergency SOS', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
});


test('all home feature routes, destination links and profile shortcuts open their screens', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    for (const [label, title] of [
        ['Risk insights Check before your visit', 'Risk intelligence'],
        ['Trip replanner Plan your dated activities', 'Trip replanner'],
        ['Emergency guide Find steps for an emergency', 'Emergency guide'],
        ['RescueMesh Connect nearby without internet', 'RescueMesh'],
        ['Safety beacon Share a refuge location', 'Safety beacon'],
        ['Safety pack Save for offline use', 'Safety pack'],
    ]) {
        await page.getByRole('button', { name: label, exact: true }).click();
        await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Back', exact: true }).click();
        await expect(page.getByText('A better way to be prepared.')).toBeVisible();
    }
    await page.getByRole('button', { name: /Quick check-in/ }).click();
    await expect(page.getByRole('heading', { name: 'Private group check-in', exact: true })).toBeInViewport();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'Explore', exact: true }).click();
    await page.getByRole('button', { name: /Mountain escape Manali/ }).click();
    await expect(page.getByRole('heading', { name: 'Risk intelligence', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Explore', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    for (const [label, title] of [['My trips','Trip replanner'],['Offline pack','Safety pack'],['Continue checklist','Safety pack'],['View pack','Safety pack']]) {
        await page.getByRole('button', { name: label, exact: true }).click();
        await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Back', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
        await expect(page.getByLabel('Loading content')).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Help & information', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'About Meridian' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Continue as guest' })).toBeVisible();
    expect(errors).toEqual([]);
});


test('SOS has its own route and Mesh previews visible disabled controls', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    const nav=page.getByRole('navigation', {name:'Main navigation'});
    await nav.getByRole('button', { name: 'Emergency SOS', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Emergency SOS', exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Emergency SOS', exact: true })).toHaveAttribute('aria-current','page');
    await expect(nav.getByRole('button', { name: 'Mesh', exact: true })).not.toHaveAttribute('aria-current','page');
    await expect(page.getByRole('button', { name: 'Queue SOS on this phone' })).toBeDisabled();
    await nav.getByRole('button', { name: 'Mesh', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'RescueMesh', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Chats', exact: true })).toHaveAttribute('aria-selected','true');
    await expect(page.getByRole('textbox', {name:'Message',exact:true})).toBeVisible();
    await expect(page.getByRole('textbox', {name:'Message',exact:true})).toBeDisabled();
    await expect(page.getByRole('button', {name:'Send message'})).toBeDisabled();
    await page.getByRole('tab', { name: 'Nearby', exact: true }).click();
    await expect(page.getByRole('button', {name:'Start Nearby discovery'})).toBeVisible();
    await expect(page.getByRole('button', {name:'Start Nearby discovery'})).toBeDisabled();
    await page.getByRole('tab', { name: 'Beacons', exact: true }).click();
    await expect(page.getByRole('button', {name:'Share my location temporarily'})).toBeDisabled();
    await expect(page.getByRole('button', {name:'Show approximate distance & bearing'})).toBeDisabled();
    await page.getByRole('tab', { name: 'SOS', exact: true }).click();
    await expect(page.getByRole('button', {name:'Queue SOS on this phone'})).toBeDisabled();
    await page.getByRole('button', {name:'View emergency guidance'}).click();
    await expect(page.getByRole('heading', {name:'Emergency guide',exact:true})).toBeVisible();
});


test('Home risk entry asks for a destination instead of opening Manali', async ({page}) => {
    await page.goto('/');
    await page.getByRole('button', {name:'Continue as guest'}).click();
    await page.getByRole('button', {name:'Risk insights Check before your visit',exact:true}).click();
    await expect(page.getByRole('heading', {name:'Where are you travelling?'})).toBeVisible();
    await expect(page.getByRole('heading', {name:'Manali',exact:true})).toHaveCount(0);
    await expect(page.getByRole('textbox', {name:'Destination search'})).toBeVisible();
});

for (const width of [320,375,390,430]) {
    test(`SOS and Mesh have separate touch targets at ${width}px, including after scrolling`, async ({browser}) => {
        const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
        const page=await context.newPage();
        await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:8000');
        await page.getByRole('button',{name:'Continue as guest'}).click();
        const nav=page.getByRole('navigation',{name:'Main navigation'});
        for (const scroll of [0,700]) {
            await page.locator('.phone-scroll').evaluate((el,y)=>{el.scrollTop=y;},scroll);
            await expect(nav.getByRole('button',{name:'Emergency SOS'})).toBeVisible();
            const boxes=await nav.locator(':scope > button').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
            expect(boxes).toHaveLength(5);
            for(let i=0;i<4;i++) expect(boxes[i].x+boxes[i].w).toBeLessThanOrEqual(boxes[i+1].x);
            for(const b of boxes) {expect(b.w).toBeGreaterThanOrEqual(44);expect(b.h).toBeGreaterThanOrEqual(44);}
            await page.touchscreen.tap(boxes[2].x+boxes[2].w-4,boxes[2].y+boxes[2].h/2);
            await expect(page.getByRole('heading',{name:'Emergency SOS',exact:true})).toBeVisible();
            await nav.getByRole('button',{name:'Mesh',exact:true}).tap();
            await expect(page.getByRole('heading',{name:'RescueMesh',exact:true})).toBeVisible();
            await page.getByRole('tab',{name:'Nearby',exact:true}).tap();
            await expect(page.getByRole('button',{name:'Start Nearby discovery'})).toBeVisible();
            await nav.getByRole('button',{name:'Home',exact:true}).tap();
            await expect(page.getByText('A better way to be prepared.')).toBeVisible();
        }
        await context.close();
    });
}


test('destination choice flows into the itinerary and Back restores the same destination', async ({page})=>{
    const place={name:'Fixture town',latitude:10,longitude:77,country:'India',region:'Test region',timezone:'Asia/Kolkata'};
    await page.addInitScript(p=>localStorage.setItem('safehaven:destination',JSON.stringify(p)),place);
    await page.route('**/api/weather',r=>r.fulfill({json:{place,days:[],source:{title:'Test forecast',url:'https://open-meteo.com/',trust:'Forecast'},fetched_at:new Date().toISOString(),timezone:place.timezone,limitations:'Test only'}}));
    await page.route('**/api/incidents',r=>r.fulfill({json:{reports:[],fetched_at:new Date().toISOString(),coverage:'Test only',errors:[]}}));
    await page.goto('/');await page.getByRole('button',{name:'Continue as guest'}).click();
    await page.getByRole('button',{name:'Risk insights Check before your visit',exact:true}).click();
    await page.getByRole('button',{name:'Continue with Fixture town',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Fixture town',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Next: plan your activities'}).click();
    await expect(page.getByText('Adding activities in Fixture town')).toBeVisible();
    await page.getByRole('button',{name:'Next: prepare your safety pack'}).click();
    await expect(page.getByRole('heading',{name:'Safety pack',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Back',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Trip replanner',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Back',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Fixture town',exact:true})).toBeVisible();
});

test('local conditions map shares a consented report and lets its owner remove it',async ({page})=>{
    const place={name:'Fixture town',latitude:10,longitude:77,country:'India',region:'Test region',timezone:'Asia/Kolkata'};
    await page.addInitScript(p=>localStorage.setItem('safehaven:destination',JSON.stringify(p)),place);
    await page.route('**/api/weather',r=>r.fulfill({json:{place,days:[],source:{title:'Test forecast',url:'https://open-meteo.com/',trust:'Forecast'},fetched_at:new Date().toISOString(),timezone:place.timezone}}));
    await page.route('**/api/incidents',r=>r.fulfill({json:{reports:[],fetched_at:new Date().toISOString(),coverage:'Test only',errors:[]}}));
    await page.route('https://tile.openstreetmap.org/**',r=>r.abort());
    await page.goto('/');await page.getByRole('button',{name:'Continue as guest'}).click();
    await page.getByRole('button',{name:'Risk insights Check before your visit',exact:true}).click();
    await page.getByRole('button',{name:'Continue with Fixture town'}).click();
    await page.getByRole('tab',{name:'Map',exact:true}).click();
    await expect(page.getByRole('region',{name:'Local conditions map'})).toBeVisible();
    await page.getByText('Share an observation',{exact:true}).click();
    await page.getByRole('textbox',{name:'What did you observe?'}).fill('[TEST] Temporary browser check; removed after verification');
    await expect(page.getByRole('button',{name:'Share unverified report'})).toBeDisabled();
    await page.getByRole('checkbox',{name:'I agree to publish this report and the selected coordinates.'}).check();
    await page.getByRole('button',{name:'Share unverified report'}).click();
    await expect(page.getByRole('heading',{name:'[TEST] Temporary browser check; removed after verification'})).toBeVisible();
    await page.getByRole('button',{name:'Remove my report',exact:true}).click();
    await expect(page.getByRole('heading',{name:'[TEST] Temporary browser check; removed after verification'})).toHaveCount(0);
    await page.getByText('Review a road photo',{exact:true}).click();
    await expect(page.getByRole('button',{name:'Assess visible conditions'})).toBeDisabled();
});

test('guided emergency steps and source questions lead to offline phrases',async({page})=>{
    await page.goto('/');await page.getByRole('button',{name:'Continue as guest'}).click();
    await page.getByRole('button',{name:'Emergency guide Find steps for an emergency',exact:true}).click();
    await page.getByRole('button',{name:'One step at a time'}).click();
    await expect(page.locator('.step-focus')).toContainText('STEP 1 OF 3');
    await page.getByRole('button',{name:'Next step',exact:true}).click();
    await expect(page.locator('.step-focus')).toContainText('STEP 2 OF 3');
    await page.getByText('Ask about these safety instructions',{exact:true}).click();
    await page.getByRole('button',{name:'Show source-linked answer'}).click();
    await expect(page.getByText(/Only the source-linked general flood instructions below/)).toBeVisible();
    await page.getByRole('button',{name:'Save for offline use',exact:true}).click();
    await page.getByRole('button',{name:'Open your safety pack'}).click();
    await expect(page.getByRole('heading',{name:'Emergency phrases',exact:true})).toBeVisible();
    await expect(page.getByText('I need help.',{exact:true})).toBeVisible();
});

test('response dashboard refuses unauthorised access',async({page})=>{
    await page.goto('/response');
    await page.getByRole('textbox',{name:'Response access token'}).fill('invalid-token');
    await page.getByRole('button',{name:'Open response dashboard'}).click();
    await expect(page.getByRole('alert')).toContainText('Response team access required');
    await expect(page.getByRole('button',{name:'Publish bulletin',exact:true})).toHaveCount(0);
});


test('Home has one destination action and search controls align on a narrow phone',async({page})=>{
    await page.setViewportSize({width:320,height:844});
    await page.goto('/');
    await page.getByRole('button',{name:'Continue as guest'}).click();
    const hero=page.locator('.hero-risk');
    await expect(hero.locator('.hero-link')).toHaveText('Check a destination');
    await expect(hero.locator('.hero-risk-top svg')).toHaveCount(1);
    await hero.click();
    await expect(page.getByRole('heading',{name:'Where are you travelling?'})).toBeVisible();
    const boxes=await page.locator('.place-search .tool-inline').first().evaluate(el=>Array.from(el.children).map(c=>{const r=c.getBoundingClientRect();return {y:r.y,h:r.height,x:r.x,w:r.width}}));
    expect(Math.abs(boxes[0].y-boxes[1].y)).toBeLessThan(1);
    expect(boxes[0].h).toBe(boxes[1].h);
    expect(boxes[0].x+boxes[0].w).toBeLessThanOrEqual(boxes[1].x);
});


test('new itinerary requires a destination and private scenario changes remain isolated',async({page})=>{
    await page.goto('/');
    await page.getByRole('button',{name:'Continue as guest'}).click();
    await page.getByRole('button',{name:/Trip replanner/}).click();
    await expect(page.getByText('Choose a destination above before adding activities.')).toBeVisible();
    await page.getByRole('textbox',{name:'Activity',exact:true}).fill('Museum');
    await expect(page.getByRole('button',{name:'Add activity'})).toBeDisabled();
    const calls:string[]=[];
    await page.route('**/api/safety/response',route=>route.fulfill({json:{reports:[],metrics:{reports:0},privacy:'No private group data'}}));
    await page.route('**/api/safety/response/simulate',route=>{const body=route.request().postDataJSON();calls.push(body.severity);return route.fulfill({json:{simulation:true,route_affected:body.severity==='critical',next_action:'Fixture scenario only',metrics:{actual_notifications_sent:0},limitations:'Simulation only'}})});
    await page.goto('/response');
    await page.getByLabel('Response access token').fill('fixture-access-not-a-real-secret');
    await page.getByRole('button',{name:'Open response dashboard'}).click();
    await page.getByText('Run an isolated scenario',{exact:true}).click();
    await page.getByLabel('Scenario area').fill('[[0,0],[2,0],[2,2],[0,2],[0,0]]');
    await page.getByLabel('Candidate route').fill('[[-1,1],[3,1]]');
    await page.getByRole('button',{name:'Evaluate isolated scenario'}).click();
    await expect(page.getByText(/SIMULATED.*No scenario closure applied/)).toBeVisible();
    await page.getByLabel('Simulated severity').selectOption('critical');
    await expect(page.getByText(/SIMULATED.*Route intersects affected area/)).toBeVisible();
    expect(calls).toEqual(['information','critical']);
});
