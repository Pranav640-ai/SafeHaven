import {test,expect} from '@playwright/test';

test('Firebase sign-in keeps the same desktop phone frame as Meridian',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  const phone=page.locator('.sh-login-phone.phone-shell');
  await expect(phone).toBeVisible();
  await expect(page.getByRole('button',{name:/Continue with Google/})).toBeVisible();
  const r=await phone.boundingBox();
  expect(r).not.toBeNull();
  expect(Math.abs((r!.x+r!.width/2)-720)).toBeLessThan(4);
  expect(r!.width).toBeGreaterThanOrEqual(400);
  expect(r!.width).toBeLessThanOrEqual(412);
  expect(r!.height).toBeGreaterThan(800);
});

test('Welcome artwork, title, buttons and full phone width fit on mobile',async({page})=>{
  for (const [width,height] of [[320,640],[390,844],[430,932]] as const){
    await page.setViewportSize({width,height});
    await page.goto('/');
    const phone=page.locator('.sh-login-phone');
    await expect(phone).toBeVisible();
    await expect(page.getByRole('button',{name:/Continue with Google/})).toBeVisible();
    await expect(page.getByRole('button',{name:'Continue as guest'})).toBeVisible();
    const frame=await phone.boundingBox();
    const hero=await page.locator('.sh-login-hero').boundingBox();
    const title=await page.locator('.sh-hero-copy h1').boundingBox();
    expect(frame).not.toBeNull();expect(hero).not.toBeNull();expect(title).not.toBeNull();
    expect(frame!.x).toBeCloseTo(0,0);
    expect(frame!.width).toBeCloseTo(width,0);
    expect(frame!.height).toBeCloseTo(height,0);
    expect(title!.y+title!.height).toBeLessThanOrEqual(hero!.y+hero!.height+1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.locator('.sh-login-phone').evaluate(el=>{el.scrollTop=el.scrollHeight});
    await expect(page.getByRole('button',{name:'Continue as guest'})).toBeInViewport();
  }
});

test('Guest login retains Home features and navigation alignment',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.getByRole('button',{name:'Continue as guest'}).click();
  await expect(page.locator('.feature-grid > .feature-card')).toHaveCount(6);
  const nav=page.locator('.floating-dock');
  await expect(nav).toBeVisible();
  const buttons=await nav.locator('button').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right}}));
  expect(buttons).toHaveLength(5);
  for(let i=1;i<buttons.length;i++)expect(buttons[i].left).toBeGreaterThanOrEqual(buttons[i-1].right-1);
  await page.getByRole('button',{name:'Profile',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Profile'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
