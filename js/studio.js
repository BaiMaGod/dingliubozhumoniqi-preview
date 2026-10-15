// @ts-nocheck
export const EQUIPMENT=[
 {id:'lamp',name:'二手补光灯',price:99,fans:0,icon:'bulb',benefit:'未来作品质量 +10%',effect:'照亮下一条作品',x:.75,y:.39},
 {id:'tripod',name:'稳定三脚架',price:149,fans:100,icon:'equipment',benefit:'内容质量 +3',effect:'拍摄更稳定',x:.72,y:.59},
 {id:'mic',name:'桌面麦克风',price:199,fans:1000,icon:'chat',benefit:'完播表现 +4',effect:'让声音更清楚',x:.92,y:.49},
 {id:'computer',name:'剪辑笔记本',price:399,fans:1000,icon:'film',benefit:'剪辑耗时缩短15%',effect:'更快剪出高光',x:.68,y:.48},
 {id:'camera',name:'高清创作相机',price:1299,fans:10000,icon:'equipment',benefit:'播放增长 +15%',effect:'吸引更多观众',x:.9,y:.56}
];
export const ROOMS=[
 {tier:0,name:'起步出租屋',price:0,fans:0,quality:0,editFactor:1,art:'room-interior-v103.webp'},
 {tier:1,name:'温馨创作间',price:249,fans:100,quality:2,editFactor:.95,art:'room-cozy-v130.webp'},
 {tier:2,name:'专业工作室',price:999,fans:1000,quality:4,editFactor:.90,art:'room-studio-v130.webp'}
];
export const STAGE_UNLOCKS={100:'稳定三脚架、温馨创作间；200钱币创作补助',1000:'桌面麦克风、剪辑笔记本、专业工作室；500钱币设备补助',10000:'高清创作相机'};
export function migrateStudio(s){
 const old=s.studio;
 if(!old||old.version!==1)s.studio={version:1,tier:0,gear:{},celebrations:[]};
 const st=s.studio;st.tier=Number.isInteger(st.tier)?Math.max(0,Math.min(2,st.tier)):0;
 if(!st.gear||typeof st.gear!=='object'||Array.isArray(st.gear))st.gear={};
 const lamp=!!s.lamp||st.gear.lamp===true;
 st.gear=Object.fromEntries(EQUIPMENT.map(e=>[e.id,e.id==='lamp'?lamp:st.gear[e.id]===true]));s.lamp=lamp;
 st.celebrations=[...new Set((Array.isArray(st.celebrations)?st.celebrations:[]).filter(n=>Number.isSafeInteger(n)&&n>=100&&n<=s.fans))];
 return st;
}
export function studioBenefits(s){
 const room=ROOMS[s.studio.tier],gear=s.studio.gear;
 return {quality:room.quality+(gear.tripod?3:0),editFactor:room.editFactor*(gear.computer?.85:1),completion:gear.mic?4:0,viewsFactor:gear.camera?1.15:1};
}
