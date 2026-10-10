// Presentation only. The original room pixels remain the source of every actor.
const WIDTH=1448,HEIGHT=1086;
const ACTORS=[
 {creator:[740,330,280,330],breath:[[819,381,46,40],[844,460,62,66],[907,549,41,39]],hands:[[966,537,22,15],[928,520,14,10]],cat:[470,780,240,120],sleep:[[559,828,52,31]],ear:[[641,811,12,14]]},
 {creator:[735,320,280,340],breath:[[800,366,46,40],[834,450,62,66],[897,550,41,39]],hands:[[954,533,22,15],[916,517,14,10]],cat:[465,775,250,125],sleep:[[566,830,55,32]],ear:[[652,810,12,14]]},
 {creator:[710,315,285,355],breath:[[770,356,44,39],[801,443,61,65],[855,546,40,38]],hands:[[912,537,22,15],[874,519,14,10]],cat:[435,750,240,140],sleep:[[524,801,53,32]],ear:[[612,785,12,14]]},
 {creator:[720,305,285,365],breath:[[785,351,45,39],[824,429,63,60],[878,545,42,40]],hands:[[943,533,22,15],[901,514,14,10]],cat:[450,750,245,145],sleep:[[540,803,54,32]],ear:[[627,787,12,14]]}
];
const cached=new Map();
function field(rect,ellipses){
 const [x,y,w,h]=rect;
 const shapes=ellipses.map(([cx,cy,rx,ry])=>`<ellipse cx="${cx-x}" cy="${cy-y}" rx="${rx}" ry="${ry}" fill="url(#g)"/>`).join('');
 return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><radialGradient id="g"><stop stop-color="#80c080"/><stop offset=".45" stop-color="#80b680"/><stop offset="1" stop-color="#808080"/></radialGradient></defs><path fill="#808080" d="M0 0H${w}V${h}H0Z"/>${shapes}</svg>`);
}
function layer(kind,tier,art,rect,maps){
 const [x,y,w,h]=rect,id=`room-${tier}-${kind}`;
 const filters=maps.map(([name,ellipses],i)=>`<feImage href="${field(rect,ellipses)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map${i}"/><feComponentTransfer in="map${i}" result="neutral${i}"><feFuncR type="table" tableValues=".5 .5"/><feFuncG type="linear" slope="1" intercept="-0.00196078431372549"/></feComponentTransfer><feDisplacementMap data-motion="${name}" in="${i?'move'+(i-1):'SourceGraphic'}" in2="neutral${i}" scale="0" xChannelSelector="R" yChannelSelector="G" result="move${i}"/>`).join('');
 return `<svg class="actor-motion actor-${kind}" aria-hidden="true" focusable="false" viewBox="0 0 ${w} ${h}" style="left:${100*x/WIDTH}%;top:${100*y/HEIGHT}%;width:${100*w/WIDTH}%;height:${100*h/HEIGHT}%"><defs><filter id="${id}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}" color-interpolation-filters="sRGB">${filters}</filter></defs><image href="./assets/${art}" x="${-x}" y="${-y}" width="${WIDTH}" height="${HEIGHT}" filter="url(#${id})"/></svg>`;
}
export function actorLayers(tier,art){
 if(!cached.has(tier)){
  const a=ACTORS[tier];
  cached.set(tier,layer('creator',tier,art,a.creator,[['breath',a.breath],['hands',a.hands]])+layer('cat',tier,art,a.cat,[['sleep',a.sleep],['ear',a.ear]])+`<span class="cat-dream" aria-hidden="true" style="left:${100*(a.cat[0]+a.cat[2]*.78)/WIDTH}%;top:${100*(a.cat[1]-20)/HEIGHT}%"><i>z</i><i>z</i></span><div class="desk-response" aria-hidden="true"><i></i><i></i><i></i><span>✓</span></div>`);
 }
 return cached.get(tier);
}

export class RoomMotion{
 node=null;runtime=null;running=false;maps=[];lastFrame=0;
 media=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(){
  this.media.addEventListener('change',()=>this.sync());
  document.addEventListener('visibilitychange',()=>this.sync());
  window.addEventListener('pagehide',()=>this.stop());
  window.addEventListener('pageshow',()=>this.sync());
 }
 setRuntime(runtime){this.runtime=runtime;this.sync();}
 connect(node){
  if(this.node!==node){this.stop();this.node=node;this.maps=node?[...node.querySelectorAll('[data-motion]')]:[];}
  this.sync();
 }
 sync(){
  const active=!!(this.runtime&&this.node?.isConnected&&!document.hidden&&!document.querySelector('.sheet')&&!this.media.matches);
  if(active&&!this.running){this.running=true;this.node.dataset.motionRunning='true';this.tick();this.runtime.timer.loop(50,this,this.tick);}
  else if(!active)this.stop();
 }
 stop(){
  this.runtime?.timer.clear(this,this.tick);this.running=false;
  if(this.node){this.node.dataset.motionRunning='false';if(this.media.matches)this.maps.forEach(el=>el.setAttribute('scale','0'));}
 }
 tick(){
  if(!this.node?.isConnected||document.hidden||document.querySelector('.sheet')||this.media.matches){this.stop();return;}
  // Absolute phase survives DOM updates; movement never changes the game clock.
  const t=performance.now()/1000,working=this.node.classList.contains('working');
  const earPhase=t%19,ear=earPhase<1.2?Math.sin(earPhase/1.2*Math.PI)*9:0;
  const scales={breath:Math.sin(t*1.6)*9,hands:working?Math.sin(t*12)*15:0,sleep:Math.sin(t*1.1+.8)*17,ear};
  this.maps.forEach(el=>el.setAttribute('scale',scales[el.getAttribute('data-motion')].toFixed(3)));
  this.node.dataset.motionFrame=String(++this.lastFrame);
 }
}

// Preserve this subtree, including image decoders, animation phase and feedback.
export function preserveRoom(previous,fresh){
 if(!previous||!fresh||previous.dataset.tier!==fresh.dataset.tier)return;
 const reacting=previous.classList.contains('responding');
 previous.className=fresh.className+(reacting?' responding':'');
 fresh.querySelectorAll('.room-hotspot').forEach(button=>{
  const old=previous.querySelector('.'+[...button.classList].find(c=>c.endsWith('-hotspot')));
  if(old)old.innerHTML=button.innerHTML;
 });
 previous.querySelector('.scene-state')?.remove();
 const badge=fresh.querySelector('.scene-state');if(badge)previous.appendChild(badge);
 fresh.replaceWith(previous);
}

let responseTimer;
export function roomResponse(kind){
 const room=document.querySelector('.room-art');
 if(!room||document.querySelector('.sheet')||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 clearTimeout(responseTimer);room.classList.remove('responding');void room.getBoundingClientRect();
 room.setAttribute('data-response',kind);room.classList.add('responding');
 responseTimer=setTimeout(()=>{room.classList.remove('responding');room.removeAttribute('data-response');},720);
}
export function rewardResponse(){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const wallet=document.querySelector('.resource.wallet');if(!wallet)return;
 wallet.querySelector('.reward-flare')?.remove();
 const flare=document.createElement('span');flare.className='reward-flare';flare.setAttribute('aria-hidden','true');
 flare.innerHTML=Array.from({length:7},(_,i)=>`<i style="--angle:${i*51.4}deg;--delay:${i*12}ms"></i>`).join('');
 wallet.appendChild(flare);setTimeout(()=>flare.remove(),800);
}
