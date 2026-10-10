import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const modules=process.env.QA_MODULES||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=require(modules?modules+'/playwright':'playwright');
const url=process.env.QA_URL||'http://127.0.0.1:4173/';
const out=process.env.QA_OUT||'evidence/browser';mkdirSync(out,{recursive:true});
const b=await chromium.launch({headless:true});
const profiles=[{name:'mobile-360',width:360,height:740},{name:'mobile-390',width:390,height:844},{name:'mobile-430',width:430,height:932},{name:'desktop',width:1280,height:900}];
const report={time:new Date().toISOString(),profiles:[],errors:[]};
const shots=[];const KEY='creator-simulator-save-v01';
async function shot(p,name){const path=out+'/'+name+'.png';await p.screenshot({path});shots.push({name,path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});}
try{
for(const profile of profiles){
 const ctx=await b.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:2,isMobile:profile.name.startsWith('mobile'),hasTouch:profile.name.startsWith('mobile')});
 const p=await ctx.newPage();const errors=[];
 p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 const activate=async(selector)=>{const el=p.locator(selector).first();if(profile.name.startsWith('mobile'))await el.tap();else await el.click();};
 await p.goto(url);await p.locator('.room-illustration').evaluate(img=>img.decode());
 assert.equal(await p.evaluate(()=>window.__qa),undefined,'production exposes no mutable debug bridge');
 assert(await p.locator('#fan-counter').innerText()==='0');
 const geometry=await p.evaluate(()=>{
  const nav=document.querySelector('.game-nav').getBoundingClientRect(),cta=document.querySelector('.room-bottom .main-cta').getBoundingClientRect();
  return {overflow:document.documentElement.scrollWidth>innerWidth,ctaBottom:cta.bottom,navTop:nav.top,ctaWidth:cta.width,viewport:innerHeight,hotspots:[...document.querySelectorAll('.room-hotspot')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,clickable:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e};})};
 });
 assert(!geometry.overflow,'no horizontal overflow');assert(geometry.ctaBottom<geometry.navTop,'CTA and navigation do not overlap');assert(geometry.ctaWidth>250);assert(geometry.hotspots.every(h=>h.clickable&&h.w>=44&&h.h>=40),'room controls visible and hit-testable');
 const missionBottom=await p.locator('.mission-card').evaluate(e=>e.getBoundingClientRect().bottom);console.log(JSON.stringify({profile:profile.name,geometry,missionBottom}));await shot(p,profile.name+'-home');assert(missionBottom<=await p.locator('.room-bottom .main-cta').evaluate(e=>e.getBoundingClientRect().top-10),'mission and action cards fully above CTA');
 await activate('.pc-hotspot');await p.locator('.edit-tools').waitFor();
 await shot(p,profile.name+'-editing');await activate('[data-action="edit"][data-id="cut"]');
 await p.locator('.main-cta[data-action="publish"]').waitFor({timeout:10000});
 await activate('.main-cta[data-action="publish"]');await p.getByRole('dialog',{name:'选择发布策略'}).waitFor();await shot(p,profile.name+'-publish');
 await activate('[data-action="publishWith"][data-id="reply"]');await p.getByRole('dialog',{name:'本条作品成绩出炉！'}).waitFor({timeout:10000});
 await shot(p,profile.name+'-result');
 const views=await p.locator('.live-stats b').first().innerText();assert(Number(views.replaceAll(',',''))>=300&&Number(views.replaceAll(',',''))<=800);
 await activate('[data-action="closeLive"]');await p.locator('.shade').waitFor({state:'detached'});
 await activate('[data-action="claimJourney"]');await p.waitForTimeout(180);assert(await p.locator('.journey-text small').innerText()==='创作进阶 2 / 8');
 await activate('.phone-hotspot');await p.getByRole('dialog',{name:'随身手机'}).waitFor();assert.equal(await p.locator('.feed-item[data-action="hotpick"]').count(),4);await shot(p,profile.name+'-phone');await activate('[data-action="close"]');
 await activate('.game-nav [data-id="growth"]');await p.locator('.stat-card').first().waitFor();assert.equal(await p.locator('.stat-card').count(),6);await shot(p,profile.name+'-growth');
 await activate('.game-nav [data-id="works"]');await p.locator('.work-card').waitFor();assert.equal(await p.locator('.work-card').count(),1);await shot(p,profile.name+'-works');
 await activate('.game-nav [data-id="shop"]');await p.locator('.upgrade-preview img').evaluate(img=>img.decode());await shot(p,profile.name+'-shop');
 await activate('[data-action="buyroom"]');await p.locator('.room-illustration[src*="cozy"]').waitFor();await p.locator('.room-illustration').evaluate(img=>img.decode());await shot(p,profile.name+'-upgraded');
 await activate('.main-cta[data-action="pc"]');await p.getByRole('dialog',{name:'创作者工作台'}).waitFor();await activate('[data-action="next"]');await activate('[data-action="next"]');await activate('[data-action="start"]');await p.locator('.main-cta[data-action="publish"]').waitFor({timeout:10000});await activate('.main-cta[data-action="publish"]');await activate('[data-action="publishWith"][data-id="share"]');await p.getByRole('dialog',{name:'本条作品成绩出炉！'}).waitFor({timeout:10000});await activate('[data-action="closeLive"]');
 await p.reload();await p.locator('.room-illustration').evaluate(img=>img.decode());assert(await p.locator('#view-counter').innerText()!=='0','save persists');
 const frames=await p.evaluate(()=>new Promise(resolve=>{const v=[];let last;function f(t){if(last!==undefined)v.push(t-last);last=t;if(v.length<180)requestAnimationFrame(f);else resolve(v.sort((a,b)=>a-b));}requestAnimationFrame(f);}));const p95=frames[Math.floor(frames.length*.95)];console.log(JSON.stringify({profile:profile.name,p95}));assert(p95<=35,'browser frame budget: '+p95);
 report.profiles.push({name:profile.name,status:'passed',firstVideoViews:views,realInput:true,secondVideo:true,roomPurchase:true,saveRestore:true,p95,geometry,errors});report.errors.push(...errors);
 await ctx.close();
}
// State fixtures below are visual-only, separate from genuine playthrough above.
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});const p=await ctx.newPage();await p.goto(url);
// Complete a genuine first video, then copy its save into isolated visual-only contexts.
await p.locator('.main-cta').click();await p.locator('.main-cta[data-action="publish"]').waitFor({timeout:10000});await p.locator('.main-cta[data-action="publish"]').click();await p.locator('[data-action="publishWith"][data-id="reply"]').click();await p.getByRole('dialog',{name:'本条作品成绩出炉！'}).waitFor({timeout:10000});await p.locator('[data-action="closeLive"]').click();await p.reload();
const visualState=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);await ctx.close();
for(let tier=0;tier<4;tier++){
 const visual=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
 const fixture={...visualState,roomTier:tier,day:26,level:4,fans:404,views:27500,wallet:185,guideStep:4,pendingEvent:null,lastSavedAt:Date.now()};
 await visual.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:KEY,state:fixture});
 const page=await visual.newPage();await page.goto(url);await page.locator('.room-illustration').evaluate(img=>img.decode());
 assert.equal(await page.locator('.room-illustration').getAttribute('src'),'./assets/'+['room-rental-v05.webp','room-cozy-v05.webp','room-pro-v05.webp','room-star-v05.webp'][tier]);
 assert.equal(await page.locator('#fan-counter').innerText(),'404');await shot(page,'visual-room-tier-'+tier);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.sun-motes').evaluate(e=>getComputedStyle(e).display),'none');await visual.close();
}
assert.equal(report.errors.length,0,JSON.stringify(report.errors));report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}finally{await b.close();report.screenshots=shots;writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,failure:report.failure,profiles:report.profiles.map(p=>({name:p.name,p95:p.p95})),screenshots:shots.length,errors:report.errors}));}
