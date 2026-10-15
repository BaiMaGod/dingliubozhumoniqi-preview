// @ts-nocheck
const DAY=86400000,OFFSET=8*3600000;
export const dailyDay=now=>Math.floor((now+OFFSET)/DAY);
export const DAILY_TASKS=[
 {key:'work',title:'今日首条创作',description:'今天完成并领取1条作品结算。',target:1,coins:20,points:0},
 {key:'topics',title:'换个题材试试',description:'今天完成并结算2种不同题材的作品。',target:2,coins:0,points:1},
 {key:'cuts',title:'点亮三段高光',description:'今天有效加入3段高光剪辑；同一作品的同一片段只计一次。',target:3,coins:20,points:0}
];
const progress=(d,key)=>key==='work'?d.works:key==='topics'?d.topics.length:d.cuts;
export function ensureDaily(s,now=Date.now()) {
 const day=dailyDay(now);let d=s.tasks.daily;
 if(!d||d.version!==1||!Number.isSafeInteger(d.day)||d.day<0){
  d=s.tasks.daily={version:1,day,works:0,topics:[],cuts:0,claimed:[],pending:{coins:0,points:0,count:0}};
 }
 for(const key of ['works','cuts'])d[key]=Number.isSafeInteger(d[key])&&d[key]>=0?d[key]:0;
 d.topics=[...new Set((Array.isArray(d.topics)?d.topics:[]).filter(x=>['cat','pose','dance'].includes(x)))];
 d.claimed=[...new Set((Array.isArray(d.claimed)?d.claimed:[]).filter(x=>DAILY_TASKS.some(t=>t.key===x)))];
 if(!d.pending||typeof d.pending!=='object'||Array.isArray(d.pending))d.pending={};
 for(const k of ['coins','points','count'])d.pending[k]=Number.isSafeInteger(d.pending[k])&&d.pending[k]>=0?d.pending[k]:0;
 // Never move the saved day backwards: clock rollback cannot reopen paid tasks.
 if(day>d.day){
  for(const t of DAILY_TASKS)if(!d.claimed.includes(t.key)&&progress(d,t.key)>=t.target){d.pending.coins+=t.coins;d.pending.points+=t.points;d.pending.count++;}
  d=s.tasks.daily={version:1,day,works:0,topics:[],cuts:0,claimed:[],pending:d.pending};
 }
 return d;
}
export function recordDaily(s,kind,topic,now=Date.now()) {
 const d=ensureDaily(s,now);if(!s.works.length)return;
 if(kind==='cut')d.cuts=Math.min(3,d.cuts+1);
 if(kind==='work'){d.works=Math.min(1,d.works+1);if(topic&&!d.topics.includes(topic))d.topics.push(topic);}
}
export function dailyList(s,now=Date.now()) {
 const d=ensureDaily(s,now);
 return DAILY_TASKS.map(t=>({...t,id:`daily_${d.day}_${t.key}`,group:'daily',action:'phone',current:progress(d,t.key),
  status:!s.works.length?'locked':d.claimed.includes(t.key)?'claimed':progress(d,t.key)>=t.target?'ready':'progress',complete:progress(d,t.key)>=t.target}));
}
export function dailyMeta(s,now=Date.now()) {
 const d=ensureDaily(s,now);
 return {date:new Date(d.day*DAY).toISOString().slice(0,10),next:(d.day+1)*DAY-OFFSET,pending:{...d.pending},unlocked:s.works.length>0};
}
