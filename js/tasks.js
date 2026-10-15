// @ts-nocheck
// Rewards are keyed by stable IDs, independent of the current recommendation.
export const MILESTONES = [
 [100,'100','萌新博主',50,1], [1000,'1,000','小透明UP',100,2],
 [10000,'1万','潜力新人',200,3], [100000,'10万','人气博主',400,4],
 [1000000,'100万','百万大V',800,5], [10000000,'1,000万','顶流博主',1600,6],
 [100000000,'1亿','超级巨星',3200,8], [500000000,'5亿','全球传奇',5000,10],
 [1000000000,'10亿','世界级顶流',10000,12]
];
export function migrateTasks(s) {
 const valid=new Set(['first','upgrade','lamp','topic','score','works',...MILESTONES.map(m=>'fan_'+m[0])]);
 if(!s.tasks || s.tasks.version!==1) {
  // Legacy saves had exactly two spendable points per settled work.
  const spent=Math.max(0,s.works.length*2-s.points);
  s.tasks={version:1,claimed:[],manualUpgrades:spent};
 }
 s.tasks.claimed=[...new Set((Array.isArray(s.tasks.claimed)?s.tasks.claimed:[]).filter(id=>valid.has(id)))];
 s.tasks.manualUpgrades=Number.isFinite(s.tasks.manualUpgrades)?Math.max(0,s.tasks.manualUpgrades):0;
 // The first task is settled by the existing work-claim transaction, never twice.
 if(s.works.length && !s.tasks.claimed.includes('first'))s.tasks.claimed.push('first');
 return s.tasks;
}
export function taskList(s) {
 const claimed=new Set(s.tasks.claimed),works=s.works;
 const make=(id,title,description,current,target,coins,points,action,group='growth',extra={})=>({
  id,title,description,current,target,coins,points,action,group,...extra,
  status:claimed.has(id)?'claimed':current>=target?'ready':'progress',
  complete:current>=target
 });
 const growth=[
  make('first','完成首条创作','拍摄、剪辑、发布，推流结束后领取作品结算。',works.length,1,120,0,'phone','growth',{workReward:true}),
  make('upgrade','提升一项能力','前往成长，手动升级任意属性一次。',s.tasks.manualUpgrades,1,0,1,'growth'),
  make('lamp','点亮创作角落','购买第一盏补光灯，提升未来作品质量。',s.lamp?1:0,1,30,0,'equipment'),
  make('topic','尝试新题材','完成两种不同题材的作品并领取结算。',new Set(works.map(w=>w.topicId).filter(Boolean)).size,2,0,2,'phone'),
  make('score','找到拍摄节奏','任意已结算作品的拍摄评分达到80分。',works.reduce((best,w)=>Math.max(best,Number(w.shot)||0),0),80,30,0,'phone'),
  make('works','坚持更新','累计完成并结算3条作品。',works.length,3,0,2,'phone')
 ];
 const milestones=MILESTONES.map(([target,label,rank,coins,points])=>make('fan_'+target,'冲刺 '+label+' 粉丝',
  target===1000?'达成小透明UP；满千粉后发布的新作品开放播放收入。':target===1e9?'达成世界级顶流，获得顶流纪念徽章。':'达成称号：'+rank+'。',
  s.fans,target,coins,points,'phone','milestones',{rank,badge:target===1e9}));
 // The last teaching objective leads to the same 100-fan transaction.
 const hundred=milestones[0];
 growth.push({...hundred,title:'收获第一批关注',description:'收获100粉丝，领取首个粉丝里程碑奖励。',group:'growth',linked:true});
 return {growth,milestones};
}
export function recommendedTask(s) {
 const {growth,milestones}=taskList(s),all=[...growth,...milestones];
 return all.find(t=>t.status==='ready')||growth.find(t=>t.status==='progress')||milestones.find(t=>t.status==='progress')||null;
}
export function rankTitle(s) {return [...MILESTONES].reverse().find(m=>s.fans>=m[0])?.[2]||'新人博主';}
