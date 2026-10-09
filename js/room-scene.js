// Layered, resolution-independent 2.5D room artwork: no external image requests.
// Furniture hotspots are HTML buttons, not an SVG click layer, for mobile accessibility.
export function roomScene(game){
  const s=game.s;
  const tier=s.roomTier||0;
  const working=game.making;
  const ready=game.ready;
  const streaming=game.streaming;
  const led=working?'#80d6ff':ready?'#ffce75':streaming?'#ff84c7':'#83cbbe';
  const screens=tier>=2?2:1;
  const wallArt=tier>=2?'<g class="trophy"><path d="M544 131h57v13q-1 25-29 25-28 0-28-25z" fill="#f2b85a" stroke="#885125" stroke-width="4"/><path d="M544 138h-16q-2 22 18 22m55-22h16q2 22-18 22" fill="none" stroke="#db9650" stroke-width="6"/><path d="M572 167v16m-25 0h50" stroke="#a96935" stroke-width="8"/></g>':tier>=1?'<g><rect x="540" y="114" width="72" height="88" rx="8" fill="#b98458"/><rect x="549" y="123" width="54" height="70" rx="4" fill="#fff1cf"/><path d="M554 174l18-30 17 20 11-23" stroke="#ff9b6c" stroke-width="7" fill="none"/></g>':'<g opacity=".9"><rect x="551" y="127" width="60" height="71" rx="3" transform="rotate(6 581 162)" fill="#f8db98"/><path d="M563 145h34m-30 10h27m-29 10h19" stroke="#c99a69" stroke-width="4"/><path d="M582 131v-18" stroke="#fff1ba" stroke-width="4"/></g>';
  return `<div class="room-art ${working?'working':''} ${ready?'ready':''} ${streaming?'viral':''}">
  <svg viewBox="0 0 750 645" preserveAspectRatio="xMidYMid meet" aria-label="简陋出租屋内有桌子、旧电脑、手机和床，随着升级逐步装饰成工作室" role="img" xmlns="http://www.w3.org/2000/svg">
  <defs>
   <linearGradient id="wall" x2="0.8" y2="1"><stop stop-color="${tier>=2?'#a8a4d7':'#a3a2ad'}"/><stop offset="1" stop-color="${tier>=2?'#c4b2c7':'#c4afa2'}"/></linearGradient>
   <linearGradient id="side" x2="1" y2=".6"><stop stop-color="#858a9c"/><stop offset="1" stop-color="#a9a3a9"/></linearGradient>
   <linearGradient id="floor" x2=".4" y2="1"><stop stop-color="#d09f87"/><stop offset="1" stop-color="#9b6b71"/></linearGradient>
   <linearGradient id="wood" x2="0" y2="1"><stop stop-color="${tier>=2?'#e7bb89':'#bd865b'}"/><stop offset="1" stop-color="${tier>=2?'#b27651':'#865c4d'}"/></linearGradient>
   <linearGradient id="monitor" x2=".4" y2="1"><stop stop-color="#3b5374"/><stop offset="1" stop-color="#20283b"/></linearGradient>
   <radialGradient id="glow"><stop stop-color="${led}" stop-opacity=".68"/><stop offset="1" stop-color="${led}" stop-opacity="0"/></radialGradient>
   <radialGradient id="windowLight"><stop stop-color="#fdf0be" stop-opacity=".75"/><stop offset="1" stop-color="#f9f0c6" stop-opacity="0"/></radialGradient>
   <filter id="shadow"><feGaussianBlur stdDeviation="13"/></filter>
   <pattern id="grain" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="4" cy="7" r="1.2" fill="#fff" opacity=".18"/><circle cx="22" cy="34" r=".8" fill="#574254" opacity=".15"/></pattern>
  </defs>
  <!-- room shell -->
  <path d="M17 48Q17 26 44 26h662q25 0 25 26v410L389 621 17 462z" fill="#544b64" opacity=".55"/>
  <path d="M32 53L388 102v353L32 421z" fill="url(#side)"/>
  <path d="M388 102L720 48v382L388 455z" fill="url(#wall)"/>
  <path d="M32 421L388 455 720 430 392 609z" fill="url(#floor)"/>
  <path d="M32 421L388 455 720 430" stroke="#7e6070" stroke-width="13" fill="none"/>
  <path d="M32 421L388 455 720 430 392 609z" fill="url(#grain)" opacity=".5"/>
  <path d="M165 490l249 82 183-95" fill="none" stroke="#ac7f77" stroke-width="3" opacity=".4"/>
  <path d="M269 546l75-92m75 126 45-131" stroke="#916979" stroke-width="2" opacity=".4"/>
  <!-- window -->
  <ellipse cx="603" cy="261" rx="156" ry="180" fill="url(#windowLight)"/>
  <path d="M440 136l185-21v177l-185 11z" fill="#785a6b" stroke="#f8dcc1" stroke-width="11"/>
  <path d="M452 146l162-18v151l-162 11z" fill="#8ac8df"/>
  <path d="M452 228l33-33 25 16 42-50 62 39v79l-162 11z" fill="#789fa9"/>
  <path d="M452 255l58-42 40 20 64-39v85l-162 11z" fill="#6d9ba1"/>
  <path d="M534 134v150m-82-60 162-9" stroke="#efe4d5" stroke-width="10"/>
  <path d="M434 126l26 10 1 174-27 17" fill="#d6a7a4"/><path d="M621 109l21-12v199l-25 12" fill="#d6a7a4"/>
  <!-- wall decorations -->
  ${wallArt}
  <path d="M83 125l87 11v104l-87-13z" fill="#7e6473" stroke="#e9d3b4" stroke-width="8"/>
  <path d="M94 141l64 8v72l-64-8z" fill="#e6c6ae"/><circle cx="126" cy="174" r="18" fill="#d08378"/><path d="M102 209l45-30 12 30" fill="#667b8b"/>
  <path d="M68 335l22 2v44l-22-2z" fill="#e8ddd0" stroke="#998a8f" stroke-width="2"/><circle cx="78" cy="349" r="3" fill="#ad9191"/>
  <!-- bed left -->
  <ellipse cx="144" cy="476" rx="111" ry="27" fill="#624d62" opacity=".25" filter="url(#shadow)"/>
  <path d="M55 358l165 26 98 78-163 14z" fill="#66506c"/>
  <path d="M56 342l169 25 96 75-164 9-102-73z" fill="#e0cab4" stroke="#71556b" stroke-width="7"/>
  <path d="M60 357l162 23 83 63-151 3z" fill="#${tier>=2?'b2c3d3':'86a7a6'}"/>
  <path d="M63 344l67 10 42 31-70-9z" fill="#f4e7ce" stroke="#d6c1ba" stroke-width="5"/>
  <path d="M62 389l105 60 140-9" fill="none" stroke="#bbd1be" stroke-width="8"/>
  <path d="M56 387v21l98 68 167-12v-22l-167 10z" fill="#9f7880"/>
  <path d="M74 425v29m214 4v26" stroke="#6a4e57" stroke-width="12" stroke-linecap="round"/>
  <!-- carpet -->
  <ellipse cx="451" cy="532" rx="228" ry="67" fill="#625d7e" opacity=".25"/>
  <ellipse cx="451" cy="520" rx="216" ry="62" fill="${tier>=2?'#b49ab7':'#bc9693'}" stroke="#efe2cd" stroke-width="8"/>
  <ellipse cx="451" cy="520" rx="165" ry="40" stroke="#e8c6bd" stroke-width="5" fill="none"/>
  <!-- desk and legs -->
  <ellipse cx="467" cy="471" rx="190" ry="30" fill="#55485b" opacity=".25" filter="url(#shadow)"/>
  <path d="M348 372l252-14 92 68-262 25z" fill="url(#wood)" stroke="#7a5252" stroke-width="8"/>
  <path d="M430 451l262-25v27l-262 24z" fill="#82565a"/><path d="M348 372l82 79v26l-82-79z" fill="#92625c"/>
  <path d="M373 409l4 129m278-85 3 87" stroke="#71565d" stroke-width="18" stroke-linecap="round"/>
  <path d="M460 470v80" stroke="#72545c" stroke-width="11"/>
  <!-- shelf props -->
  <path d="M681 278l-75 6 12 13 81-6" fill="#9b7165"/>
  <path d="M623 284l-6-44 19-4 9 46" fill="#e7cb9b"/><path d="M647 283l-4-64 21-2 3 64" fill="#d79a85"/>
  <path d="M673 278l-5-28 13-3 8 29" fill="#879e95"/>
  <!-- computer halo -->
  <ellipse cx="495" cy="338" rx="137" ry="112" fill="url(#glow)" opacity="${working||streaming?'.55':'.21'}"/>
  <!-- monitor -->
  <path d="M410 266l192-7v116l-193 12z" fill="#2f2e45" stroke="#a5b1b7" stroke-width="10"/>
  <path d="M423 278l166-6v91l-166 10z" fill="url(#monitor)"/>
  <rect x="437" y="290" width="94" height="10" rx="4" fill="${led}" opacity=".75"/>
  <rect x="437" y="310" width="137" height="6" rx="3" fill="#7797b2" opacity=".8"/>
  <rect x="437" y="326" width="112" height="6" rx="3" fill="#7797b2" opacity=".55"/>
  <path d="M440 355l32-14 23 7 24-26 33 13 26-16" fill="none" stroke="${led}" stroke-width="5" stroke-linecap="round"/>
  <circle cx="577" cy="290" r="5" fill="${led}" class="monitor-light"/>
  <path d="M502 382v29l-35 5h81l-27-7v-28" fill="#596071" stroke="#24283b" stroke-width="5"/>
  ${screens===2?'<g><path d="M610 289l67-2v71l-66 6z" fill="#2c303c" stroke="#b2b8c1" stroke-width="7"/><path d="M618 299l50-2v53l-50 4z" fill="#354465"/><path d="M627 341l8-18 10 8 12-25" stroke="#82e3c4" stroke-width="4" fill="none"/></g>':''}
  <!-- keyboard and mouse -->
  <path d="M451 420l106-8 30 18-109 8z" fill="#d3c3bd" stroke="#6f6874" stroke-width="4"/>
  <path d="M464 422l104-6m-87 15 79-6" fill="none" stroke="#9395a6" stroke-width="2" stroke-dasharray="7 6"/>
  <ellipse cx="620" cy="426" rx="13" ry="8" fill="#c3bac0"/>
  <!-- phone -->
  <g transform="rotate(-8 389 403)"><rect x="373" y="385" width="30" height="48" rx="7" fill="#3c3647" stroke="#ead7c9" stroke-width="4"/><rect x="378" y="391" width="20" height="32" rx="3" fill="#6d8da0"/><circle cx="388" cy="427" r="2.4" fill="#fff"/></g>
  <!-- desk lamp / advanced light -->
  <path d="M649 397l11-78m-17 82h38" stroke="#424455" stroke-width="7" stroke-linecap="round"/>
  <path d="M657 320l-27-12 6-28 45 8z" fill="${tier>=1?'#f9c38c':'#b6aaa2'}" stroke="#756573" stroke-width="5"/>
  <ellipse cx="643" cy="327" rx="38" ry="20" fill="url(#windowLight)"/>
  ${tier>=1?'<g><path d="M690 342l5 162" stroke="#5c5266" stroke-width="8"/><ellipse cx="689" cy="330" rx="24" ry="27" fill="#ffebc7" stroke="#b59788" stroke-width="10"/><path d="M696 502l-17 18m17-18 18 18" stroke="#6b5973" stroke-width="7"/></g>':''}
  <!-- chair and little creator figure -->
  <path d="M449 460l80-8 16 77-79 9z" fill="${tier>=2?'#7c5c9e':'#67576d'}" stroke="#534861" stroke-width="9"/>
  <path d="M494 509l-19 60m29-58 28 55" stroke="#555063" stroke-width="11" stroke-linecap="round"/>
  <path d="M454 436q-26-28-9-55 22-35 67-20 35 13 21 49l-25 32z" fill="${tier>=2?'#e19b74':'#db987a'}" stroke="#6b5066" stroke-width="7"/>
  <path d="M454 409q-25 25-14 70l75 10q27-33-2-75" fill="${tier>=2?'#9468ce':'#e2ae78'}" stroke="#725572" stroke-width="6"/>
  <path d="M453 397q-10-22 5-44t46-8q24 9 11 42-20 16-41 14z" fill="#f6c69c" stroke="#765b5d" stroke-width="5"/>
  <path d="M450 377q-2-44 30-47 39 1 44 36-16-7-31-19-17 18-43 30z" fill="#433a4b"/>
  <path d="M447 366q-20 8-7 25m70-35q25 4 12 32" fill="none" stroke="#514055" stroke-width="8"/>
  <ellipse cx="441" cy="383" rx="8" ry="13" fill="#e2a4a6"/><ellipse cx="520" cy="381" rx="8" ry="13" fill="#e2a4a6"/>
  <path d="M489 375h3m14-1h3" stroke="#60495e" stroke-width="4" stroke-linecap="round"/>
  <path d="M497 383q5 5 10 0" stroke="#9c6470" fill="none" stroke-width="3"/>
  <path d="M463 445l-18 34m60-30 34 19" stroke="${tier>=2?'#9468ce':'#e2ae78'}" stroke-width="15" stroke-linecap="round"/>
  <!-- foreground frames -->
  <path d="M26 36h692" stroke="#f1dfd1" stroke-width="8" opacity=".4"/>
  <path d="M29 35v386m688-379v388" stroke="#69596d" stroke-width="11" opacity=".55"/>
  </svg>
  <button class="room-hotspot pc-hotspot" data-action="pc" aria-label="点击电脑开始创作"><span class="hotspot-ico">💻</span><span>${ready?'发布视频':working?'剪辑中…':'电脑 · 创作'}</span></button>
  <button class="room-hotspot phone-hotspot" data-action="phone" aria-label="点击手机查看热点"><span class="hotspot-ico">📱</span><span>手机 · 热点</span></button>
  <button class="room-hotspot decor-hotspot" data-action="shop" aria-label="升级房间与设备"><span class="hotspot-ico">🛠</span><span>${tier?'升级工作室':'升级设备'}</span></button>
  <span class="scene-flavor">${tier>=3?'传说级直播工作室':tier>=2?'我的专业创作间':tier>=1?'升级中的出租屋':'我的第一间出租屋'}</span>
  </div>`;
}