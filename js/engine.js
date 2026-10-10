// @ts-nocheck
import {TOPICS,MODES,POOLS,EVENTS} from './config.js?v=0.7.0';
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const number=(n)=>n>=1e8?(n/1e8).toFixed(2)+'亿':n>=1e4?(n/1e4).toFixed(2)+'万':Math.floor(n).toLocaleString('zh-CN');
export function seeded(...parts){let h=2166136261;for(const ch of parts.join('|'))h=Math.imul(h^ch.charCodeAt(0),16777619);h>>>=0;h^=h<<13;h^=h>>>17;h^=h<<5;return(h>>>0)/4294967296;}
export const need=(l)=>Math.ceil(30+12*(l-1)+4*Math.pow(l-1,1.25));
export const cap=(fans)=>fans>=1e8?100:fans>=1e7?80:fans>=1e6?60:fans>=1e5?40:20;
export const JOURNEY=[
{title:'发布你的第一条视频',hint:'先拍出作品，再让全世界看到',reward:40},
{title:'拿到第一批200播放',hint:'看看视频如何进入第一个流量池',reward:30},
{title:'升级一项博主能力',hint:'去成长页分配刚获得的属性点',reward:40},
{title:'用手机跟拍一次热点',hint:'打开手机，选一个正在火的题材',reward:55},
{title:'完成3条视频',hint:'试试不同题材，找到自己的风格',reward:70},
{title:'收获10个粉丝',hint:'关注数是你最真实的成长',reward:85},
{title:'升级一次出租屋',hint:'把第一笔积蓄投入创作环境',reward:90},
{title:'冲到100个粉丝',hint:'从素人晋级真正的新锐博主',reward:160}
];
const KEY='creator-simulator-save-v01',DAY=90000,POOL_INTERVAL=1100;
export function initial(seed=20261009){return{version:1,balanceVersion:'1.1',seed,day:1,dayMs:0,fans:0,views:0,wallet:100,fraction:0,reputation:70,level:1,exp:0,points:0,stats:{sense:3,creativity:4,speed:2,luck:1,operation:2,business:1},nicheXp:{搞笑:0,游戏:0,美食:0,知识:0},videos:[],transactions:[],selectedNiche:'搞笑',selectedTopic:'T001',selectedMode:'casual',eventCursor:0,pendingEvent:null,nextBonus:0,firstBonus:false,roomTier:0,guideStep:0,trendShots:0,trendPicked:null,lastSavedAt:Date.now()};}
export class Game{
constructor(state){this.s=state||initial();}
static load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s?.version===1&&Array.isArray(s.videos)&&s.stats){const g=new Game(s);if(!g.s.videos.length){g.s.day=1;g.s.dayMs=0;}const pending=g.making;if(pending){const ratio=pending.total?clamp(pending.remaining/pending.total,0,1):1;pending.total=Math.min(pending.total||3500,6500);pending.remaining=ratio*pending.total;pending.edits||={};}g.advance(clamp(Date.now()-(s.lastSavedAt||Date.now()),0,8*3600000),true);g.save();return g;}}catch(e){console.warn('存档加载失败',e);}return new Game();}
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
get seconds(){return Math.max(1.2,this.mode.seconds/(1+.11*(this.s.stats.speed-1))*(1-.05*(this.s.roomTier||0)));}
get specialChance(){return clamp(.01+.0007*(this.s.stats.luck-1),.01,.08);}
get journeyStep(){return Math.min(JOURNEY.length,Math.max(0,this.s.guideStep||0));}
get journey(){return JOURNEY[this.journeyStep]||null;}
get journeyReady(){switch(this.journeyStep){
case 0:return this.s.videos.some(v=>v.status==='recommending'||v.status==='done');
case 1:return this.s.views>=200;
case 2:return Object.values(this.s.stats).reduce((a,b)=>a+b,0)>13;
case 3:return (this.s.trendShots||0)>0;
case 4:return this.s.videos.filter(v=>v.status==='done').length>=3;
case 5:return this.s.fans>=10;
case 6:return (this.s.roomTier||0)>=1;
case 7:return this.s.fans>=100;
default:return false;}}
claimJourney(){const stage=this.journeyStep,task=this.journey;if(!task||!this.journeyReady)return false;if(!this.book('journey:'+stage))return false;this.s.guideStep=stage+1;this.s.wallet+=task.reward;this.save();return true;}
chooseHotTopic(id){const t=TOPICS.find(x=>x.id===id);if(!t||!this.hotspots.includes(id))return false;this.chooseNiche(t.niche);this.chooseTopic(id);this.s.trendPicked=id;this.save();return true;}
get canStart(){return !this.making&&!this.ready&&!this.streaming&&this.s.pendingEvent===null&&this.s.wallet>=this.mode.cost;}
chooseNiche(niche){if(!this.s.nicheXp.hasOwnProperty(niche))return;this.s.selectedNiche=niche;this.s.selectedTopic=TOPICS.find(t=>t.niche===niche).id;this.save();}
chooseTopic(id){if(this.topics.some(t=>t.id===id)){this.s.selectedTopic=id;this.save();}}
chooseMode(id){if(MODES.some(m=>m.id===id)){this.s.selectedMode=id;this.save();}}
start(){if(!this.canStart)return false;const s=this.s,id=s.videos.length+1;if(!this.book('video-cost:'+id))return false;const t=this.topic,m=this.mode;s.wallet-=m.cost;if(s.trendPicked===t.id){s.trendShots=(s.trendShots||0)+1;}s.trendPicked=null;s.videos.push({id,title:t.title,topicId:t.id,niche:t.niche,modeId:m.id,createdDay:s.day,status:'producing',remaining:this.seconds*1000,total:this.seconds*1000,edits:{},pool:0,nextTick:POOL_INTERVAL,views:0,fans:0,likes:0,comments:0,metrics:null,history:[],report:'正在制作中'});this.save();return true;}
editVideo(kind){const v=this.making;if(!v||!['cut','hook','cover'].includes(kind))return false;v.edits||={};if(v.edits[kind])return false;v.edits[kind]=true;v.remaining=Math.max(0,v.remaining-(1300+this.s.stats.speed*110));if(v.remaining<=0)this.finishProduction(v);this.save();return true;}
exp(value){const s=this.s;s.exp+=Math.max(0,value);while(s.level<50&&s.exp>=need(s.level)){s.exp-=need(s.level);s.level++;s.points+=3;}}
upgrade(k){const s=this.s;if(!(k in s.stats)||s.points<1||s.stats[k]>=cap(s.fans))return false;s.points--;s.stats[k]++;this.save();return true;}
makeQuality(v){const s=this.s,t=TOPICS.find(t=>t.id===v.topicId),m=MODES.find(x=>x.id===v.modeId),prof=1+Math.floor(Math.sqrt(s.nicheXp[v.niche]/3));const hot=this.hotspots.includes(t.id)?4:0,fit=clamp((t.heat-55)*.22-(t.competition-1)*2+hot+Math.min(12,(s.stats.sense-1)*.25),-10,18),fatigue=s.videos.slice(-4,-1).filter(o=>o.topicId===t.id).length*2,noise=k=>seeded(s.seed,v.id,k)*10-5;const edits=v.edits||{},opening=clamp(45+.3*(s.stats.creativity-1)+m.opening+(s.roomTier||0)+fit-fatigue+noise('open')+(edits.cover?2:0),0,100),completion=clamp(46+.42*(s.stats.creativity-1)+.2*(prof-1)+m.completion+(s.roomTier||0)+fit/2-fatigue+noise('complete')+(edits.cut?2:0),0,100),engagement=clamp(40+.22*(s.stats.creativity-1)+m.engagement+noise('engage'),0,100),sharing=clamp(38+.2*(s.stats.creativity-1)+m.sharing+fit/2+noise('share')+(edits.hook?2:0),0,100),match=clamp(50+fit+noise('match')*.3,0,100);return{opening,completion,engagement,sharing,match,originality:clamp(50+noise('original'),0,100),score:.2*opening+.3*completion+.2*engagement+.15*sharing+.15*match};}
finishProduction(v){if(v.status==='producing'){v.remaining=0;v.status='ready';v.report='作品已经剪辑完成，点击发布视频！';this.save();}}
publishReady(strategy='reply'){const v=this.ready;if(!v)return false;v.strategy=strategy==='share'?'share':'reply';this.publish(v);return true;}
publish(v){if(v.status!=='ready')return;v.remaining=0;v.status='recommending';v.metrics=this.makeQuality(v);v.specialBonus=seeded(this.s.seed,v.id,'special')<this.specialChance?5:0;this.exp(20+(this.s.firstBonus?0:20));this.s.firstBonus=true;this.s.nicheXp[v.niche]++;this.save();}
report(v,idx){const m=v.metrics;const entry=[['开头吸引力',m.opening],['完播表现',m.completion],['互动率',m.engagement],['分享率',m.sharing],['受众匹配',m.match]].sort((a,b)=>a[1]-b[1])[0];return '止步「'+POOLS[idx].name+'」：'+entry[0]+'偏弱，建议调整选题和制作方式。';}
settle(v){const s=this.s,i=v.pool;if(v.status!=='recommending'||i>=POOLS.length)return;const key='video:'+v.id+':pool:'+i;if(!this.book(key)){v.pool++;return;}const p=POOLS[i],q=v.metrics.score,rank=clamp((q-p.threshold+12)/24,0,1),target=Math.max(v.views,v.id===1&&i===0?300:0,Math.round(p.min+(p.max-p.min)*(.2*seeded(s.seed,v.id,i,'views')+.8*rank))),delta=target-v.views,mode=MODES.find(x=>x.id===v.modeId),operation=Math.min(2.2,1+.012*(s.stats.operation-1)),nonFollower=clamp(.9-s.fans/30000000,.15,.9),newFans=Math.floor(delta*.7*.015*mode.follow*operation*clamp(.6+s.reputation/175,.6,1.15)*nonFollower*(v.strategy==='reply'?1.35:1));
const gross=s.fans>=1000?delta*.005:0,total=s.fraction+gross,earned=Math.floor(total);s.fraction=total-earned;
const eventBonus=clamp((i===0?s.nextBonus:0)+(i===0?(v.specialBonus||0):0),-5,5);
const passed=i<4&&v.id!==1&&q+seeded(s.seed,v.id,i,'pass')*8-4+eventBonus+(v.strategy==='share'?3:0)>=POOLS[i+1].threshold;
v.views=target;v.fans+=newFans;v.likes+=Math.floor(delta*(.025+v.metrics.engagement/1600));v.comments+=Math.floor(delta*.004);s.views+=delta;s.fans+=newFans;s.wallet+=earned;if(i>0)this.exp(p.exp);v.history.push({index:i,target,delta,fans:newFans,earned,passed});v.pool++;
if(!passed||i===4){v.status='done';v.report=passed?'现象级爆款！内容吸引了全站关注。':this.report(v,i);s.nextBonus=0;if(v.id%2===0&&s.pendingEvent===null){s.pendingEvent=s.eventCursor++%EVENTS.length;}}else v.nextTick=POOL_INTERVAL;this.save();}
roomUpgrade(){const s=this.s,tier=s.roomTier||0,needFans=[0,1000,100000][tier],prices=[80,300,2500][tier];if(tier>=3||s.fans<needFans||s.wallet<prices)return false;if(!s.videos.some(v=>v.status==='done'))return false;const key='room-upgrade:'+tier;if(!this.book(key))return false;s.wallet-=prices;s.roomTier=tier+1;this.save();return true;}
skip(){const v=this.streaming;if(!v)return;for(let i=0;i<5&&v.status==='recommending';i++)this.settle(v);}
chooseEvent(i){const s=this.s;if(s.pendingEvent===null)return false;const e=EVENTS[s.pendingEvent],c=e?.choices[i];if(!c||!this.book('event:'+s.eventCursor))return false;const commercialMultiplier=s.pendingEvent===5&&c[1]>0?Math.min(2.5,1+.018*(s.stats.business-1)):1;s.wallet=Math.max(0,s.wallet+Math.round(c[1]*commercialMultiplier));s.reputation=clamp(s.reputation+c[2],0,100);s.fans=Math.max(0,s.fans+c[3]);this.exp(c[4]||30);s.nextBonus=clamp(s.nextBonus+c[5],-5,5);s.pendingEvent=null;this.save();return true;}
nextDay(offline){const s=this.s;s.day++;s.dayMs=0;if(s.day>3)s.fans=Math.max(0,s.fans-Math.floor(s.fans*.0003));if(!offline&&s.day%5===0&&s.videos.length&&!this.making&&!this.ready&&!this.streaming&&s.pendingEvent===null)s.pendingEvent=s.eventCursor++%EVENTS.length;}
advance(ms,offline=false){if(!this.s.videos.length){this.s.day=1;this.s.dayMs=0;return;}let remaining=clamp(ms,0,8*3600000);for(let n=0;n<10000&&remaining>0.001;n++){const v=this.making||this.streaming;const dt=Math.min(remaining,DAY-this.s.dayMs,v?(v.status==='producing'?Math.max(0,v.remaining):Math.max(0,v.nextTick)):Infinity);if(dt<=0){if(v?.status==='producing')this.finishProduction(v);else if(v?.status==='recommending')this.settle(v);else this.nextDay(offline);continue;}this.s.dayMs+=dt;if(v?.status==='producing')v.remaining-=dt;else if(v?.status==='recommending')v.nextTick-=dt;remaining-=dt;if(this.s.dayMs>=DAY-.001)this.nextDay(offline);if(v?.status==='producing'&&v.remaining<=.001)this.finishProduction(v);if(v?.status==='recommending'&&v.nextTick<=.001)this.settle(v);}}
}
