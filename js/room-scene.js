// @ts-nocheck
import {icon} from './icons.js?v=0.7.0';
export const ROOM_ART=['room-rental-v05.webp','room-cozy-v05.webp','room-pro-v05.webp','room-star-v05.webp'];
export function roomScene(game){
 const tier=Math.max(0,Math.min(3,game.s.roomTier||0));
 const state=game.making?'working':game.ready?'ready':game.streaming?'viral':'idle';
 const label=game.ready?'发布':game.making?'剪辑中':'创作';
 return `<div class="room-art tier-${tier} ${state}">
 <img class="room-illustration" src="./assets/${ROOM_ART[tier]}" alt="${['阳光照进初创出租屋，博主在旧电脑前工作','带补光灯和灵感墙的温馨小工作室','双屏和专业拍摄设备的创作间','配备专业器材与奖杯的顶流工作室'][tier]}" width="1448" height="1086" fetchpriority="high" draggable="false">
 <div class="sun-motes" aria-hidden="true"><i></i><i></i><i></i></div>
 <button class="room-hotspot pc-hotspot" data-action="pc" aria-label="点击电脑开始创作"><span class="hotspot-pill">${icon(game.ready?'play':'pen')}<span>${label}</span></span></button>
 <button class="room-hotspot phone-hotspot" data-action="phone" aria-label="点击手机查看热点"><span class="hotspot-pill">${icon('flame')}<span>热点</span></span>${game.s.pendingEvent!==null?'<i class="notification-dot"></i>':''}</button>
 <button class="room-hotspot decor-hotspot" data-action="shop" aria-label="升级房间与设备"><span class="hotspot-pill">${icon('equipment')}<span>升级</span></span></button>
 ${state!=='idle'?`<span class="scene-state">${icon(state==='working'?'film':state==='ready'?'check':'chart')}${state==='working'?'正在创作':state==='ready'?'作品已就绪':'推荐进行中'}</span>`:''}
 </div>`;
}
