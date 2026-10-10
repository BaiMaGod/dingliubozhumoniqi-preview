import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),modules=process.env.QA_MODULES;
const {chromium}=require(modules+'/playwright'),{PNG}=require(modules+'/pngjs');
const out=(process.env.QA_OUT||'evidence/browser')+'/motion';mkdirSync(out,{recursive:true});
const url=process.env.QA_URL||'http://127.0.0.1:4173/',KEY='creator-simulator-save-v01';
const report={version:'0.8.1',time:new Date().toISOString(),errors:[],shots:[],tiers:[]};
const b=await chromium.launch({headless:true});
async function shot(page,name,locator){const path=out+'/'+name+'.png';await (locator||page).screenshot({path});report.shots.push({name,path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});return path;}
function pixelMotion(aPath,bPath,regions){
 const a=PNG.sync.read(readFileSync(aPath)),c=PNG.sync.read(readFileSync(bPath));assert.equal(a.width,c.width);assert.equal(a.height,c.height);
 const counts={creator:0,cat:0,outside:0,chair:0};
 for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
  const k=(y*a.width+x)*4;let delta=0;for(let n=0;n<3;n++)delta+=Math.abs(a.data[k+n]-c.data[k+n]);if(delta<3)continue;
  const sx=x/a.width*1448,sy=y/a.height*1086;
  const inside=([rx,ry,rw,rh])=>sx>=rx&&sx<rx+rw&&sy>=ry&&sy<ry+rh;
  if(inside(regions.creator))counts.creator++;else if(inside(regions.cat))counts.cat++;else counts.outside++;
  if(inside(regions.chair))counts.chair++;
 }
 assert(counts.creator>80,'creator pixels actually move: '+JSON.stringify(counts));assert(counts.cat>80,'cat pixels actually move: '+JSON.stringify(counts));
 assert.equal(counts.outside,0,'original room outside actors stays stable');assert.equal(counts.chair,0,'chair remains steady');return counts;
}
try{
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});p.on('requestfailed',r=>report.errors.push(r.url()));
 await p.goto(url);await p.locator('.room-illustration').evaluate(i=>i.decode());await p.waitForFunction(()=>document.querySelector('.room-art').dataset.motionRunning==='true');
 const room=p.locator('.room-art'),original=await room.elementHandle();
 assert.equal(await p.locator('.actor-motion').count(),2);
 const begin=Number(await room.getAttribute('data-motion-frame'));await p.waitForTimeout(250);assert(Number(await room.getAttribute('data-motion-frame'))>begin,'Laya timer drives real local movement');
 await p.locator('.pc-hotspot').tap();await p.locator('.edit-tools').waitFor();assert.equal(await p.locator('.pc-hotspot .hotspot-pill span').innerText(),'剪辑中');assert.equal(await p.locator('.phone-hotspot .hotspot-pill span').innerText(),'热点');assert.equal(await p.locator('.decor-hotspot .hotspot-pill span').innerText(),'升级');assert(await original.evaluate(el=>el.isConnected),'same room subtree survives gameplay render');
 await p.waitForTimeout(130);assert(Math.abs(Number(await p.locator('[data-motion="hands"]').getAttribute('scale')))>0.1,'working hands move');assert.equal(await room.getAttribute('data-response'),'start');await shot(p,'real-start');
 await p.locator('.edit-tools [data-action="edit"][data-id="cut"]').tap();assert.equal(await room.getAttribute('data-response'),'edit');await p.waitForTimeout(130);await shot(p,'real-edit');
 await p.locator('.main-cta[data-action="publish"]').waitFor();await p.locator('.main-cta[data-action="publish"]').tap();
 assert.equal(await room.getAttribute('data-motion-running'),'false');const frozen=await room.getAttribute('data-motion-frame');await p.waitForTimeout(400);assert.equal(await room.getAttribute('data-motion-frame'),frozen,'modal pauses the animation timer');
 await p.locator('.sheet .close').tap();await p.waitForTimeout(160);assert.equal(await room.getAttribute('data-motion-running'),'true');
 await p.locator('.main-cta[data-action="publish"]').tap();await p.locator('[data-action="publishWith"][data-id="reply"]').tap();await p.getByRole('dialog',{name:'本条作品成绩出炉！'}).waitFor();await p.locator('[data-action="closeLive"]').tap();
 const wallet=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).wallet,KEY);await p.locator('[data-action="claimJourney"]').tap();
 assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).wallet,KEY),wallet+40,'real reward is applied exactly once');assert.equal(await p.locator('.reward-flare i').count(),7);await p.waitForTimeout(140);await shot(p,'real-reward');await p.waitForTimeout(850);assert.equal(await p.locator('.reward-flare').count(),0,'reward feedback is reclaimed');
 for(let n=0;n<6;n++){await p.locator('.phone-hotspot').tap();await p.getByRole('dialog',{name:'随身手机'}).waitFor();assert.equal(await room.getAttribute('data-motion-running'),'false');await p.keyboard.press('Escape');await p.locator('.game-nav [data-id="growth"]').tap();assert.equal(await original.evaluate(el=>el.isConnected),false);await p.locator('.game-nav [data-id="room"]').tap();await p.waitForFunction(()=>document.querySelector('.room-art').dataset.motionRunning==='true');}
 assert.equal(await p.locator('.actor-motion').count(),2);const before=Number(await room.getAttribute('data-motion-frame'));await p.waitForTimeout(1000);const ticks=Number(await room.getAttribute('data-motion-frame'))-before;assert(ticks>=15&&ticks<=24,'one bounded 20 Hz timer after repeated navigation: '+ticks);
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>document.querySelector('.room-art').dataset.motionRunning==='false');assert.equal(await room.getAttribute('data-motion-running'),'false');assert(await p.locator('.actor-motion').evaluateAll(es=>es.every(el=>getComputedStyle(el).display==='none')));await p.locator('.phone-hotspot').tap();await p.keyboard.press('Escape');assert.equal(await room.getAttribute('data-motion-running'),'false');await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(160);assert.equal(await room.getAttribute('data-motion-running'),'true');
 const save=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);report.realInput={start:true,editing:true,modalPause:true,rewardDelta:40,rewardParticleCap:7,reclaimed:true,repeatedNavigation:6,ticksPerSecond:ticks,reducedMotion:true,roomNodePreserved:true};await ctx.close();
 const regions=[
  {creator:[740,330,280,330],cat:[470,780,240,120],chair:[780,575,70,55]},
  {creator:[735,320,280,340],cat:[465,775,250,125],chair:[780,580,65,55]},
  {creator:[710,315,285,355],cat:[435,750,240,140],chair:[730,585,70,55]},
  {creator:[720,305,285,365],cat:[450,750,245,145],chair:[760,575,65,55]}
 ];
 // Isolated tier fixtures test appearance only; the real-input assertions above use genuine progression.
 for(let tier=0;tier<4;tier++){
  const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});await c.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:KEY,state:{...save,roomTier:tier,pendingEvent:null,lastSavedAt:Date.now()}});
  const page=await c.newPage();await page.goto(url);await page.locator('.room-illustration').evaluate(i=>i.decode());await page.addStyleTag({content:'.sun-motes,.cat-dream,.room-hotspot,.scene-state,.desk-response{visibility:hidden!important}'});
  await page.waitForFunction(()=>Number(document.querySelector('[data-motion="sleep"]').getAttribute('scale'))>15);
  const a=await shot(page,'tier-'+tier+'-inhale',page.locator('.room-art'));
  await page.waitForFunction(()=>Number(document.querySelector('[data-motion="sleep"]').getAttribute('scale'))<-15);
  const z=await shot(page,'tier-'+tier+'-exhale',page.locator('.room-art'));
  const pixels=pixelMotion(a,z,regions[tier]);assert.equal(await page.locator('[data-motion="hands"]').getAttribute('scale'),'0.000','idle hands rest');
  if(tier===1){for(let n=0;n<24;n++){await shot(page,'loop-'+String(n).padStart(2,'0'),page.locator('.room-art'));await page.waitForTimeout(150);}}
  await page.emulateMedia({reducedMotion:'reduce'});const s1=await shot(page,'tier-'+tier+'-still',page.locator('.room-art'));await page.waitForTimeout(250);const s2=await page.locator('.room-art').screenshot();assert.equal(createHash('sha256').update(readFileSync(s1)).digest('hex'),createHash('sha256').update(s2).digest('hex'),'reduced-motion room is pixel stable');
  report.tiers.push({tier,localPixelMotion:pixels,backgroundStable:true,chairStable:true,reducedMotionPixelStable:true});await c.close();
 }
 // A real browser with WebGL disabled exercises the shipped compatibility path.
 const noGL=await chromium.launch({headless:true,args:['--disable-webgl']});
 try{
  const c=await noGL.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await c.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url);await page.locator('.room-illustration').evaluate(i=>i.decode());await page.waitForFunction(()=>document.querySelector('.room-art').dataset.motionRunning==='true');
  assert.equal(await page.evaluate(()=>!!document.createElement('canvas').getContext('webgl')),false,'WebGL is genuinely disabled');assert.equal(await page.locator('.room-art').getAttribute('data-motion-driver'),'dom');
  await page.addStyleTag({content:'.sun-motes,.cat-dream,.room-hotspot,.scene-state,.desk-response{visibility:hidden!important}'});
  await page.waitForFunction(()=>Number(document.querySelector('[data-motion="sleep"]').getAttribute('scale'))>15);const a=await shot(page,'no-webgl-inhale',page.locator('.room-art'));
  await page.waitForFunction(()=>Number(document.querySelector('[data-motion="sleep"]').getAttribute('scale'))<-15);const z=await shot(page,'no-webgl-exhale',page.locator('.room-art'));const pixels=pixelMotion(a,z,regions[0]);
  await page.addStyleTag({content:'.sun-motes,.cat-dream,.room-hotspot,.scene-state,.desk-response{visibility:visible!important}'});
  await page.locator('.pc-hotspot').tap();await page.locator('.edit-tools').waitFor();await page.locator('.main-cta[data-action="publish"]').waitFor();await page.locator('.main-cta[data-action="publish"]').tap();assert.equal(await page.locator('.room-art').getAttribute('data-motion-running'),'false');await page.locator('.sheet .close').tap();assert.equal(await page.locator('.room-art').getAttribute('data-motion-running'),'true');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.room-art').dataset.motionRunning==='false');await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.querySelector('.room-art').dataset.motionRunning==='true');
  const frames=await page.evaluate(()=>new Promise(resolve=>{const times=[];let last;function f(t){if(last)times.push(t-last);last=t;if(times.length<180)requestAnimationFrame(f);else resolve(times.sort((a,b)=>a-b));}requestAnimationFrame(f);}));const p95=frames[Math.floor(frames.length*.95)];assert(p95<=35,'no-WebGL frame budget '+p95);assert.equal(errors.length,0);
  report.noWebGL={realInput:true,localPixelMotion:pixels,modalPause:true,reducedMotion:true,p95,errors};await c.close();
 }finally{await noGL.close();}
 assert.equal(report.errors.length,0);report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack||String(e);process.exitCode=1;}finally{await b.close();writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
