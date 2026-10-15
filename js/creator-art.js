// @ts-nocheck
// Interior variants share phone center (83.5%, 46.3%); cover crop is mapped in creator.ts.
export function roomArt(lamp=false,interior=false) {
 if(interior)return `<img class="rental-art rental-interior" src="./assets/room-interior${lamp?'-lamp':''}-v103.webp" data-phone-x="0.835" data-phone-y="0.463" width="941" height="1672" alt="置身出租屋内：左边是床，右边是窗边书桌，手机放在桌上${lamp?'，补光灯已装备':''}" fetchpriority="high" decoding="async">`;
 return `<img class="rental-art rental-painted" src="./assets/ftue-rental${lamp?'-lamp':''}-v101.webp" width="1254" height="1254" alt="简陋出租屋：一张床、一张旧桌子和桌上的手机${lamp?'，新买的补光灯已摆好':''}" fetchpriority="high" decoding="async">`;
}
export function legacyRoomArt(lamp=false) {
 return `<svg viewBox="0 0 600 450" role="img" aria-label="简陋出租屋：一张床、一张旧桌子和桌上的手机${lamp?'，新买的补光灯已摆好':''}" class="rental-art"><defs><linearGradient id="wallL" x2="1" y2="1"><stop stop-color="#ecd9bf"/><stop offset="1" stop-color="#d4bca0"/></linearGradient><linearGradient id="wallR" x2="0" y2="1"><stop stop-color="#f5e6cb"/><stop offset="1" stop-color="#dcc8a8"/></linearGradient><linearGradient id="floor" x2="1" y2="1"><stop stop-color="#d3aa85"/><stop offset="1" stop-color="#b58560"/></linearGradient><linearGradient id="glass" x2="0" y2="1"><stop stop-color="#a6ced1"/><stop offset="1" stop-color="#dce5cb"/></linearGradient></defs>
 <ellipse cx="302" cy="393" rx="235" ry="24" fill="#7c8d79" opacity=".14"/>
 <g stroke="#95745a" stroke-width="2" stroke-linejoin="round"><path d="M50 250L300 150L550 250L300 410Z" fill="url(#floor)"/><path d="M50 250V92L300 12V150Z" fill="url(#wallL)"/><path d="M300 12L550 92V250L300 150Z" fill="url(#wallR)"/><path d="M50 250L300 410L550 250V262L300 425L50 262Z" fill="#8c684c"/>
 <g stroke="#ad825f" opacity=".55"><path d="M88 235L341 384M133 218L383 357M179 200L425 329M225 181L467 302M265 166L509 276"/><path d="M92 276L341 166M137 305L383 184M180 333L423 200M223 361L469 218M266 389L514 235"/></g>
 <g><path d="M377 59L470 91V173L377 138Z" fill="#93775c"/><path d="M385 70L462 96V162L385 132Z" fill="url(#glass)"/><path d="M423 83V147M385 104L462 131" stroke="#f8efdb" stroke-width="7"/><path d="M367 56L478 94" stroke="#8d7864" stroke-width="5"/><path d="M371 59L389 65V143L370 146Z" fill="#e9c49d"/><path d="M460 89L478 94V181L459 164Z" fill="#e9c49d"/></g>
 <path d="M382 141L485 178L408 302L299 252Z" fill="#fff4c7" stroke="none" opacity=".16"/>
 <g><path d="M83 204L154 176L272 239L195 278Z" fill="#b0a18b"/><path d="M83 204V236L195 314V278Z" fill="#85674f"/><path d="M195 278L272 239V276L195 314Z" fill="#765940"/><path d="M88 210L155 185L260 241L193 270Z" fill="#eee2cc"/><path d="M105 218L163 194L198 211L139 238Z" fill="#f5edd9"/><path d="M134 239L199 211L260 245L193 279Z" fill="#7d9a90"/><path d="M134 239V253L193 296V279Z" fill="#63867c"/><path d="M193 279L260 245V260L193 296Z" fill="#698b80"/><path d="M88 209V190L154 163V184" fill="#ac8662"/></g>
 <g><path d="M354 274L361 330L372 337L370 279M483 261L480 317L469 324L472 264" fill="#886347"/><path d="M322 247L421 208L518 258L419 305Z" fill="#a57a53"/><path d="M322 247V257L419 316V305Z" fill="#885e3d"/><path d="M419 305L518 258V269L419 316Z" fill="#785335"/><path d="M327 244L420 208L511 253L417 296Z" fill="#c49669"/><path d="M434 247L453 240L479 253L459 263Z" fill="#594b44"/><path d="M438 248L453 243L474 253L459 259Z" fill="#abd1c5"/><path d="M440 248L450 245" stroke="#f6f1df" stroke-width="2"/></g>
 <g><path d="M337 302L381 279L406 292L362 315Z" fill="#b79067"/><path d="M338 302V334M363 315V350M405 292V328" stroke="#8c674a" stroke-width="6"/><path d="M339 304V275L378 257V280" fill="#c4a07c"/></g>
 ${lamp?'<g class="lamp-art"><path d="M403 229L416 216" stroke="#6b7165" stroke-width="5"/><ellipse cx="420" cy="210" rx="14" ry="23" fill="#fff4bb" stroke="#758275" stroke-width="5"/><ellipse cx="419" cy="210" rx="8" ry="15" fill="#fffbe6" stroke="none"/><path d="M409 234L422 240L434 234L420 229Z" fill="#7c8a79"/></g>':''}
 <path d="M114 132L142 123V154L114 164Z" fill="#ebd5ac"/><path d="M122 140L136 135" stroke="#c99868"/><path d="M120 149L136 143" stroke="#c99868"/>
 </g><g fill="#fff4d5" opacity=".75" class="dust"><circle cx="349" cy="176" r="2"/><circle cx="458" cy="206" r="2"/><circle cx="305" cy="253" r="2"/></g></svg>`;
}
export function legacyCatArt(topic='cat') {
 return `<svg viewBox="0 0 240 300" class="cat-performer topic-${topic}" aria-label="正在摆姿势的卡通小猫" role="img"><defs><linearGradient id="cat-fur" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe1aa"/><stop offset=".6" stop-color="#e7b876"/><stop offset="1" stop-color="#c28b58"/></linearGradient><linearGradient id="cat-shirt" x2="1" y2="1"><stop stop-color="#b1ccaf"/><stop offset="1" stop-color="#698e76"/></linearGradient><linearGradient id="cat-paws" x2="1" y2="1"><stop stop-color="#f2cc92"/><stop offset="1" stop-color="#ce965d"/></linearGradient></defs><ellipse cx="120" cy="272" rx="65" ry="12" fill="#536d62" opacity=".16"/><g class="cat-body" stroke="#80664e" stroke-width="3" stroke-linejoin="round"><path class="cat-tail" d="M151 215Q213 241 199 171" fill="none" stroke="#c59866" stroke-width="17" stroke-linecap="round"/><path d="M86 233L78 262Q93 274 111 265L117 234M128 234L131 264Q150 273 166 262L153 232" fill="url(#cat-paws)"/><path d="M82 151Q61 209 88 242Q120 257 155 240Q178 202 156 151Z" fill="url(#cat-shirt)"/><path d="M97 175Q116 182 143 173V217Q123 228 99 216Z" fill="#c8d9bf" stroke="none"/><g class="cat-arms"><path d="M85 167Q56 199 36 164" fill="none" stroke="#cda16e" stroke-width="18" stroke-linecap="round"/><path d="M155 169Q177 145 193 117" fill="none" stroke="#cda16e" stroke-width="18" stroke-linecap="round"/></g><path d="M70 75L68 23L105 55Q122 49 142 57L180 28L173 86Q191 145 146 166Q103 179 70 150Q49 123 70 75Z" fill="url(#cat-fur)"/><path d="M75 38L92 57L75 64M164 58L175 42L172 73" fill="#e7a79a" stroke="none"/><path d="M116 60L119 80M134 62L130 81M72 83L86 90" stroke="#b78559" stroke-width="7" stroke-linecap="round"/>
 ${topic==='pose'?'<path d="M81 104L113 108L109 124L89 121ZM126 108L158 104L150 122L130 124Z" fill="#495e55"/><path d="M112 112L127 112"/>':'<path d="M86 110Q94 100 103 110M137 110Q146 99 155 108" fill="none" stroke-width="4" stroke-linecap="round"/>'}
 <path d="M115 123L126 123L121 129Z" fill="#a96e62" stroke="none"/><path d="M121 129Q120 143 110 137M121 129Q126 144 135 136" fill="none" stroke-width="2"/><ellipse cx="83" cy="128" rx="11" ry="6" fill="#e6a495" stroke="none"/><ellipse cx="158" cy="125" rx="11" ry="6" fill="#e6a495" stroke="none"/><path d="M94 160L117 169L151 157" fill="none" stroke="#e9d6a4" stroke-width="6"/><circle cx="121" cy="176" r="7" fill="#e8bc73" stroke-width="1"/></g></svg>`;
}

export function catArt(topic="cat"){return `<img class="cat-performer cat-sprite topic-${topic}" src="./assets/cat-performer-v102.webp" alt="跳舞的小猫" width="1213" height="1296">`;}


// V1.0.5: generated raster atlases, 256x352 cells; one tap advances one frame.
export const EXPRESSION_NAMES=['嘟嘴','震惊','得意','嫌弃','困惑','大笑','哭泣','困倦','点赞','比心','无语','欢呼'];
export function performerFrame(frame=0,topic='cat') {
 const expression=topic==='pose',count=expression?12:24;
 const index=((Math.floor(frame)||0)%count+count)%count,rows=expression?3:6;
 return {index,expression,rows,x:(index%4)*100/3,y:Math.floor(index/4)*100/(rows-1),label:expression?EXPRESSION_NAMES[index]:topic==='dance'?`星奇摇第 ${index+1} 帧`:`舞蹈第 ${index+1} 帧`};
}
export function performanceArt(frame=0,topic='cat') {
 const f=performerFrame(frame,topic);
 return `<div class="performer-sprite ${f.expression?'expression-sprite':topic==='dance'?'xingqiyao-sprite':'dance-sprite'}" role="img" aria-label="卡通小博主，${f.label}" data-frame="${f.index}" style="background-position:${f.x}% ${f.y}%"></div>`;
}
export function updatePerformanceSprite(el,frame,topic='cat') {
 const f=performerFrame(frame,topic);if(el.dataset.frame===String(f.index))return;
 el.dataset.frame=String(f.index);el.style.backgroundPosition=`${f.x}% ${f.y}%`;el.setAttribute('aria-label',`卡通小博主，${f.label}`);
}

