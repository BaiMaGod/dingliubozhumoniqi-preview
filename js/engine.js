// @ts-nocheck
import {TOPICS,MODES,POOLS,EVENTS} from './config.js';
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const number=(n)=>n>=1e8?(n/1e8).toFixed(2)+'亿':n>=1e4?(n/1e4).toFixed(2)+'万':Math.floor(n).toLocaleString('zh-CN');
export function seeded(...parts){let h=2166136261;for(const ch of parts.join('|'))h=Math.imul(h^ch.charCodeAt(0),16777619);h>>>=0;h^=h<<13;h^=h>>>17;h^=h<<5;return(h>>>0)/4294967296;}
export const need=(l)=>Math.ceil(30+12*(l-1)+4*Math.pow(l-1,1.25));
export const cap=(fans)=>fans>=1e8?100:fans>=1e7?80:fans>=1e6?60:fans>=1e5?40:20;
const KEY='creator-simulator-save-v01',DAY=90000,POOL_INTERVAL=1100;
export function initial(seed=20261009){return{version:1,balanceVersion:'1.1',seed,day:1,dayMs:0,fans:0,views:0,wallet:100,fraction:0,reputation:70,level:1,exp:0,points:0,stats:{sense:3,creativity:4,speed:2,luck:1,operation:2,business:1},nicheXp:{搞笑:0,游戏:0,美食:0,知识:0},videos:[],transactions:[],selectedNiche:'搞笑',selectedTopic:'T004',selectedMode:'casual',eventCursor:0,pendingEvent:null,nextBonus:0,firstBonus:false,roomTier:0,lastSavedAt:Date.now()};}
export class Game{
constructor(state){this.s=state||initial();}
static load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s?.version===1&&Array.isArray(s.videos)&&s.stats){const g=new Game(s);g.advance(clamp(Date.now()-(s.lastSavedAt||Date.now()),0,8*3600000),true);g.save();return g;}}catch(e){console.warn('存档加载失败',e);}return new Game();}
save(){this.s.lastSavedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(this.s));}catch(e){console.warn(e);}}
reset(seed=20261009){this.s=initial(seed);this.save();}
book(key){if(this.s.transactions.includes(key))return false;this.s.transactions.push(key);return true;}
get topic(){return TOPICS.find(t=>t.id===this.s.selectedTopic)||TOPICS[0];}
get mode(){return MODES.find(m=>m.id===this.s.selectedMode)||MODES[0];}
get topics(){return TOPICS.filter(t=>t.niche===this.s.selectedNiche);}
get hotspots(){return TOPICS.filter(t=>t.duration>0).map(t=>({topic:t,score:t.heat+seeded(this.s.seed,'trend',this.s.day,t.id)*24})).sort((a,b)=>b.score-a.score).slice(0,4).map(x=>x.topic.id);}
get making(){return this.s.videos.find(v=>v.status==='producing');}
get ready(){return this.s.videos.find(v=>v.status==='ready');}
get streaming(){return this.s.videos.find(v=>v.status==='recommending');}
get latest(){return this.s.videos.at(-1);}
get seconds(){return Math.max(8,this.mode.seconds/(1+.11*(this.s.stats.speed-1))*(1-.03*(this.s.roomTier||0)));}
get specialChance(){return clamp(.01+.0007*(this.s.stats.luck-1),.01,.08);}
get canStart(){return !this.making&&!this.ready&&!this.streaming&&this.s.pendingEvent===null&&this.s.wallet>=this.mode.cost;}
chooseNiche(niche){if(!this.s.nicheXp.hasOwnProperty(niche))return;this.s.selectedNiche=niche;this.s.selectedTopic=TOPICS.find(t=>t.niche===niche).id;this.save();}
chooseTopic(id){if(this.topics.some(t=>t.id===id)){this.s.selectedTopic=id;this.save();}}
chooseMode(id){if(MODES.some(m=>m.id===id)){this.s.selectedMode=id;this.save();}}
start(){if(!this.canStart)return false;const s=this.s,id=s.videos.length+1;if(!this.book('video-cost:'+id))return false;const t=this.topic,m=this.mode;s.wallet-=m.cost;s.videos.push({id,title:t.title,topicId:t.id,niche:t.niche,modeId:m.id,createdDay:s.day,status:'producing',remaining:this.seconds*1000,total:this.seconds*1000,pool:0,nextTick:POOL_INTERVAL,views:0,fans:0,likes:0,comments:0,metrics:null,history:[],report:'正在制作中'});this.save();return true;}
exp(value){const s=this.s;s.exp+=Math.max(0,value);while(s.level<50&&s.exp>=need(s.level)){s.exp-=need(s.level);s.level++;s.points+=3;}}
upgrade(k){const s=this.s;if(!(k in s.stats)||s.points<1||s.stats[k]>=cap(s.fans))return false;s.points--;s.stats[k]++;this.save();return true;}
makeQuality(v){const s=this.s,t=TOPICS.find(t=>t.id===v.topicId),m=MODES.find(x=>x.id===v.modeId),prof=1+Math.floor(Math.sqrt(s.nicheXp[v.niche]/3));const hot=this.hotspots.includes(t.id)?4:0,fit=clamp((t.heat-55)*.22-(t.competition-1)*2+hot+Math.min(12,(s.stats.sense-1)*.25),-10,18),fatigue=s.videos.slice(-4,-1).filter(o=>o.topicId===t.id).length*2,noise=k=>seeded(s.seed,v.id,k)*10-5;const opening=clamp(45+.3*(s.stats.creativity-1)+m.opening+(s.roomTier||0)+fit-fatigue+noise('open'),0,100),completion=clamp(46+.42*(s.stats.creativity-1)+.2*(prof-1)+m.completion+(s.roomTier||0)+fit/2-fatigue+noise('complete'),0,100),engagement=clamp(40+.22*(s.stats.creativity-1)+m.engagement+noise('engage'),0,100),sharing=clamp(38+.2*(s.stats.creativity-1)+m.sharing+fit/2+noise('share'),0,100),match=clamp(50+fit+noise('match')*.3,0,100);return{opening,completion,engagement,sharing,match,originality:clamp(50+noise('original'),0,100),score:.2*opening+.3*completion+.2*engagement+.15*sharing+.15*match};}
finishProduction(v){if(v.status==='producing'){v.remaining=0;v.status='ready';v.report='作品已经剪辑完成，点击发布视频！';this.save();}}
publishReady(){const v=this.ready;if(!v)return false;this.publish(v);return true;}
publish(v){if(v.status!=='ready')return;v.remaining=0;v.status='recommending';v.metrics=this.makeQuality(v);v.specialBonus=seeded(this.s.seed,v.id,'special')<this.specialChance?5:0;this.exp(20+(this.s.firstBonus?0:20));this.s.firstBonus=true;this.s.nicheXp[v.niche]++;this.save();}
report(v,idx){const m=v.metrics;const entry=[['开头吸引力',m.opening],['完播表现',m.completion],['互动率',m.engagement],['分享率',m.sharing],['受众匹配',m.match]].sort((a,b)=>a[1]-b[1])[0];return '止步「'+POOLS[idx].name+'」：'+entry[0]+'偏弱，建议调整选题和制作方式。';}
settle(v){const s=this.s,i=v.pool;if(v.status!=='recommending'||i>=POOLS.length)return;const key='video:'+v.id+':pool:'+i;if(!this.book(key)){v.pool++;return;}const p=POOLS[i],q=v.metrics.score,rank=clamp((q-p.threshold+12)/24,0,1),target=Math.max(v.views,Math.round(p.min+(p.max-p.min)*(.2*seeded(s.seed,v.id,i,'views')+.8*rank))),delta=target-v.views,mode=MODES.find(x=>x.id===v.modeId),operation=Math.min(2.2,1+.012*(s.stats.operation-1)),nonFollower=clamp(.9-s.fans/30000000,.15,.9),newFans=Math.floor(delta*.7*.015*mode.follow*operation*clamp(.6+s.reputation/175,.6,1.15)*nonFollower);
const gross=s.fans>=1000?delta*.005:0,total=s.fraction+gross,earned=Math.floor(total);s.fraction=total-earned;
const eventBonus=clamp((i===0?s.nextBonus:0)+(i===0?(v.specialBonus||0):0),-5,5);
const passed=i<4&&q+seeded(s.seed,v.id,i,'pass')*8-4+eventBonus>=POOLS[i+1].threshold;
v.views=target;v.fans+=newFans;v.likes+=Math.floor(delta*(.025+v.metrics.engagement/1600));v.comments+=Math.floor(delta*.004);s.views+=delta;s.fans+=newFans;s.wallet+=earned;if(i>0)this.exp(p.exp);v.history.push({index:i,target,delta,fans:newFans,earned,passed});v.pool++;
if(!passed||i===4){v.status='done';v.report=passed?'现象级爆款！内容吸引了全站关注。':this.report(v,i);s.nextBonus=0;if(v.id%2===0&&s.pendingEvent===null){s.pendingEvent=s.eventCursor++%EVENTS.length;}}else v.nextTick=POOL_INTERVAL;this.save();}
roomUpgrade(){const s=this.s,tier=s.roomTier||0,needFans=[0,1000,100000][tier],prices=[80,300,2500][tier];if(tier>=3||s.fans<needFans||s.wallet<prices)return false;const key='room-upgrade:'+tier;if(!this.book(key))return false;s.wallet-=prices;s.roomTier=tier+1;this.save();return true;}
skip(){const v=this.streaming;if(!v)return;for(let i=0;i<5&&v.status==='recommending';i++)this.settle(v);}
chooseEvent(i){const s=this.s;if(s.pendingEvent===null)return false;const e=EVENTS[s.pendingEvent],c=e?.choices[i];if(!c||!this.book('event:'+s.eventCursor))return false;const commercialMultiplier=s.pendingEvent===5&&c[1]>0?Math.min(2.5,1+.018*(s.stats.business-1)):1;s.wallet=Math.max(0,s.wallet+Math.round(c[1]*commercialMultiplier));s.reputation=clamp(s.reputation+c[2],0,100);s.fans=Math.max(0,s.fans+c[3]);this.exp(c[4]||30);s.nextBonus=clamp(s.nextBonus+c[5],-5,5);s.pendingEvent=null;this.save();return true;}
nextDay(offline){const s=this.s;s.day++;s.dayMs=0;if(s.day>3)s.fans=Math.max(0,s.fans-Math.floor(s.fans*.0003));if(!offline&&s.day%5===0&&s.videos.length&&!this.making&&!this.ready&&!this.streaming&&s.pendingEvent===null)s.pendingEvent=s.eventCursor++%EVENTS.length;}
advance(ms,offline=false){let remaining=clamp(ms,0,8*3600000);for(let n=0;n<10000&&remaining>0.001;n++){const v=this.making||this.streaming;const dt=Math.min(remaining,DAY-this.s.dayMs,v?(v.status==='producing'?Math.max(0,v.remaining):Math.max(0,v.nextTick)):Infinity);if(dt<=0){if(v?.status==='producing')this.finishProduction(v);else if(v?.status==='recommending')this.settle(v);else this.nextDay(offline);continue;}this.s.dayMs+=dt;if(v?.status==='producing')v.remaining-=dt;else if(v?.status==='recommending')v.nextTick-=dt;remaining-=dt;if(this.s.dayMs>=DAY-.001)this.nextDay(offline);if(v?.status==='producing'&&v.remaining<=.001)this.finishProduction(v);if(v?.status==='recommending'&&v.nextTick<=.001)this.settle(v);}}
}
