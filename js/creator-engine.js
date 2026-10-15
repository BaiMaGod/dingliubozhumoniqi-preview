// @ts-nocheck
export const SAVE_KEY = 'creator-simulator-ftue-v10';
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const STAT_LABELS = {sense:'网感', luck:'幸运', filming:'拍摄', editing:'剪辑', trend:'热点敏感', persistence:'坚持'};
export const FAN_QUESTS = [
  [100, '冲刺 100 粉丝'],
  [1000, '冲刺 1,000 粉丝'],
  [10000, '冲刺 1 万粉丝'],
  [100000, '冲刺 10 万粉丝'],
  [1000000, '冲刺 100 万粉丝'],
  [10000000, '冲刺 1,000 万粉丝'],
  [100000000, '冲刺 1 亿粉丝'],
  [1000000000, '冲刺 10 亿粉丝']
];
export const TOPICS = [
 {id:'cat', title:'小博主的第一支舞', tag:'表情舞蹈', heat:0},
 {id:'pose', title:'表情包挑战', tag:'表情演绎', heat:4},
 {id:'dance', title:'星奇摇挑战', tag:'热门舞蹈', heat:8}
];
export function initial(seed = Math.floor(Math.random()*0xffffffff)) {
 return {version:1, seed:seed>>>0, fans:0, wallet:100, views:0, points:0, lamp:false,
  stats:{sense:1,luck:1,filming:1,editing:1,trend:1,persistence:1}, works:[], active:null, grantClaimed:false};
}
function random(seed, id, round, channel) {
 let h=2166136261;
 for(const c of `${seed}:${id}:${round}:${channel}`) h=Math.imul(h^c.charCodeAt(0),16777619);
 h^=h<<13; h^=h>>>17; h^=h<<5; return (h>>>0)/4294967296;
}
export function composition(x,y) { return Math.round(clamp(100-Math.hypot(x,y)*.85,0,100)); }
export class CreatorGame {
 constructor(state=initial(), storage=null) { this.s=state; this.storage=storage; this.storageFailed=false; }
 static load(storage) {
  try { const s=JSON.parse(storage.getItem(SAVE_KEY)||'null');
   if(s?.version===1 && Array.isArray(s.works) && s.stats &&
    Object.keys(STAT_LABELS).every(k=>Number.isFinite(s.stats[k])&&s.stats[k]>=1) &&
    ['fans','wallet','views','points'].every(k=>Number.isFinite(s[k])&&s[k]>=0) &&
    (!s.active || ['shoot','edit','ready','live','ended'].includes(s.active.phase))) {
    const g=new CreatorGame(s,storage); g.tick(Date.now()); return g;
   }
  } catch {}
  return new CreatorGame(initial(),storage);
 }
 save() { try { this.storage?.setItem(SAVE_KEY,JSON.stringify(this.s)); this.storageFailed=false; } catch { this.storageFailed=true; } }
 get first() { return this.s.works.length===0; }
 get unlocked() { return this.s.works.length>0; }
 get quest() {
  // Derive from the saved, claimed fan total; no old quest index can become stale.
  if(!this.unlocked)return {title:'拍摄你的第一条视频',current:0,target:1,complete:false};
  const next=FAN_QUESTS.find(([target])=>this.s.fans<target);
  return next
   ?{title:next[1],current:this.s.fans,target:next[0],complete:false}
   :{title:'10 亿粉丝达成！继续刷新纪录',current:1000000000,target:1000000000,complete:true};
 }
 start(topicId='cat') {
  if(this.s.active) return false;
  const topic=this.first?TOPICS[0]:TOPICS.find(t=>t.id===topicId)||TOPICS[0];
  this.s.active={id:this.s.works.length+1, topicId:topic.id, title:topic.title, phase:'shoot',
   x:0,y:0, shootAt:0, shootTaps:0, shootLast:0, shootSmooth:0, shot:0, taps:0, cuts:[],remaining:10000, editAt:0,
   views:0,likes:0,comments:0,fans:0,round:0,tier:0,event:'测试流量',history:[],claimed:false};
  this.save(); return true;
 }
 move(dx,dy) {
  const v=this.s.active;if(v?.phase!=='shoot')return false;
  v.x=clamp(v.x+dx,-130,130);v.y=clamp(v.y+dy,-100,100);this.save();return true;
 }
 beginShoot(now=Date.now()) {
  const v=this.s.active;if(v?.phase!=='shoot'||v.shootAt)return false;
  v.shootAt=now;v.shootTaps=0;v.shootSmooth=0;v.shootLast=0;this.save();return true;
 }
 shootTap(now=Date.now()) {
  const v=this.s.active;if(v?.phase!=='shoot'||!v.shootAt)return false;
  if(now-v.shootAt>=7000){this.capture(v.shootAt+7000);return false;}
  if(now<v.shootAt||now<v.shootLast)return false;
  const gap=v.shootLast?now-v.shootLast:0;
  if(gap>0&&gap<=350)v.shootSmooth++;
  v.shootTaps++;v.shootLast=now;this.save();return true;
 }
 shootScore() {
  const v=this.s.active;if(!v)return 0;
  return Math.round(clamp(20+Math.min(60,(v.shootTaps||0)*1.5)+Math.min(20,(v.shootSmooth||0)*.5),20,100));
 }
 capture(now=Date.now()) {
  const v=this.s.active;if(v?.phase!=='shoot'||!v.shootAt||now-v.shootAt<7000)return false;
  v.shot=this.shootScore();v.phase='edit';v.editAt=now;
  v.remaining=this.first?10000:Math.max(3500,10000/(1+.06*(this.s.stats.editing-1)));
  v.editTotal=v.remaining;this.save();return true;
 }
 tick(now=Date.now()) {
  const v=this.s.active;if(v?.phase==='shoot'){
   if(v.shootAt&&now-v.shootAt>=7000){this.capture(v.shootAt+7000);this.tick(now);return true;}
   return false;
  }
  if(v?.phase!=='edit')return false;
  const elapsed=Math.max(0,now-v.editAt);v.remaining=Math.max(0,v.remaining-elapsed);v.editAt=now;
  if(v.remaining===0)v.phase='ready';this.save();return v.phase==='ready';
 }
 edit(kind='tap',now=Date.now()) {
  this.tick(now);const v=this.s.active;if(v?.phase!=='edit')return false;
  if(kind!=='tap' && (!['open','highlight','end'].includes(kind)||v.cuts.includes(kind)))return false;
  if(kind!=='tap')v.cuts.push(kind);
  v.taps++;v.remaining=Math.max(0,v.remaining-(kind==='tap'?550:1800)*(1+.025*(this.s.stats.editing-1)));
  if(v.remaining===0)v.phase='ready';this.save();return true;
 }
 publish() {
  const v=this.s.active;if(v?.phase!=='ready')return false;
  const s=this.s,t=TOPICS.find(t=>t.id===v.topicId);
  v.inputs={...s.stats,lamp:s.lamp,audience:s.fans,first:this.first,heat:t.heat};
  v.quality=Math.round(clamp((28+v.shot*.4+v.cuts.length*5+Math.min(12,(s.stats.filming-1)*1.2))*(s.lamp?1.1:1),15,100));
  v.completion=Math.round(clamp(35+v.quality*.4+v.cuts.length*4,0,95));
  v.phase='live';v.views=Math.round(180+v.quality*2);v.likes=Math.floor(v.views*.04);
  v.comments=Math.floor(v.views*.004);v.fans=Math.max(1,Math.floor(v.views*.012));
  v.history.push({round:0,event:'测试流量',delta:v.views,target:v.views,tier:0});
  this.save();return true;
 }
 probabilities(v=this.s.active) {
  if(!v?.inputs)return null;
  const a=v.inputs, q=v.quality;
  const stop=clamp(.055+v.round*.025+(v.round>=5?.12:0),.055,.37);
  const sink=clamp(.24-(q-40)*.004-(a.persistence-1)*.008,.025,.32);
  const viral=clamp(.012+(q-50)*.0006+(a.sense-1)*.0015+(a.luck-1)*.002+(a.trend-1)*.001,.005,.12);
  const boost=clamp(.20+(q-50)*.004+(a.sense-1)*.008+v.inputs.heat*.004,.12,.46);
  // Normalize active events into the probability budget after stop and sink.
  const budget=1-stop-sink, factor=Math.min(1,budget/(viral+boost));
  return {stop,sink,viral:viral*factor,boost:boost*factor,hold:Math.max(0,budget-(viral+boost)*factor)};
 }
 refresh() {
  const v=this.s.active;if(v?.phase!=='live')return false;
  v.round++;
  let event,delta=0;
  const r=random(this.s.seed,v.id,v.round,'event'),p=this.probabilities(v);
  if(v.inputs.first)event=['维持','推流','维持','停流'][Math.min(v.round-1,3)];
  else if(v.round>=8)event='停流';
  else if(r<p.stop)event='停流';
  else if(r<p.stop+p.sink)event='沉没';
  else if(r<p.stop+p.sink+p.viral)event='爆火';
  else if(r<p.stop+p.sink+p.viral+p.boost)event='推流';
  else event='维持';
  const noise=random(this.s.seed,v.id,v.round,'gain');
  const maxTier=clamp(1+Math.floor(Math.log10(1+v.inputs.audience/100)) + Math.floor((v.inputs.sense-1)/12),1,6);
  if(event==='爆火')v.tier=Math.min(maxTier,v.tier+2);
  if(event==='推流')v.tier=Math.min(maxTier,v.tier+1);
  if(['维持','推流','爆火'].includes(event)) {
   const scale=[1,4,18,90,500,3000,15000][v.tier];
   delta=Math.round((100+v.quality*3)*scale*(.75+noise*.5)*(event==='爆火'?2.4:event==='推流'?1.25:.3));
   if(v.inputs.first)delta=Math.round((event==='推流'?520:100)*(1+v.quality/150));
  }
  v.views+=delta;v.likes+=Math.floor(delta*(.025+v.quality*.0004));v.comments+=Math.floor(delta*.006);
  v.fans+=Math.floor(delta*(.007+v.completion*.0001)*(1+Math.min(.8,(v.inputs.sense-1)*.012)));
  v.event=event;v.history.push({round:v.round,event,delta,target:v.views,tier:v.tier});
  if(event==='沉没'||event==='停流'){v.phase='ended';v.reason=event==='沉没'?'本轮测试未能获得更多推荐':'这一轮推荐结束，准备下一条作品吧';}
  this.save();return event;
 }
 get reward() {
  const v=this.s.active;if(v?.phase!=='ended')return null;
  const income=v.inputs.audience>=1000?Math.floor(v.views*.003):0;
  return {fans:v.fans,income,grant:this.s.grantClaimed?0:120,points:2};
 }
 claim() {
  const v=this.s.active,reward=this.reward;if(!reward||v.claimed)return false;
  v.claimed=true;this.s.fans+=reward.fans;this.s.wallet+=reward.income+reward.grant;
  this.s.views+=v.views;this.s.points+=reward.points;this.s.grantClaimed=true;
  this.s.stats.filming=Math.min(50,this.s.stats.filming+1);
  this.s.stats.editing=Math.min(50,this.s.stats.editing+1);
  this.s.stats.persistence=Math.min(50,this.s.stats.persistence+1);
  if(v.shot>=85)this.s.stats.sense=Math.min(50,this.s.stats.sense+1);
  this.s.works.push({...v,reward,phase:'done'});this.s.active=null;this.save();return reward;
 }
 upgrade(stat) {
  if(this.s.active||!this.unlocked||!Object.hasOwn(STAT_LABELS,stat)||this.s.points<1||this.s.stats[stat]>=50)return false;
  this.s.stats[stat]++;this.s.points--;this.save();return true;
 }
 buyLamp() {
  if(this.s.active||!this.unlocked||this.s.lamp||this.s.wallet<99)return false;
  this.s.wallet-=99;this.s.lamp=true;this.save();return true;
 }
}


