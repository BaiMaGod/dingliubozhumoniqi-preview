// @ts-nocheck
// Native vector equipment layers stay separate from painted room upgrades.
export function equipmentArt(id){
 const shapes={
 lamp:'<ellipse cx="60" cy="38" rx="25" ry="32" fill="#fff3bd" stroke="#747663" stroke-width="6"/><ellipse cx="60" cy="38" rx="17" ry="24" fill="#fff9e9"/><path d="M60 72V132M36 145L60 132L85 145" stroke="#73715d" stroke-width="6" fill="none"/><ellipse cx="60" cy="147" rx="31" ry="6" fill="#676957"/>',
 tripod:'<path d="M60 55V150M59 65L24 147M62 65L97 147" stroke="#4c554c" stroke-width="7" stroke-linecap="round"/><path d="M37 18h47v39H37z" fill="#777d70" stroke="#3e473e" stroke-width="4"/><rect x="42" y="10" width="36" height="44" rx="5" fill="#b7b99d" stroke="#3f4941" stroke-width="3"/><rect x="47" y="15" width="26" height="33" rx="2" fill="#d9e8d6"/><path d="M56 54h10" stroke="#444d40" stroke-width="3"/>',
 mic:'<ellipse cx="60" cy="139" rx="34" ry="9" fill="#565c50"/><path d="M60 94v43" stroke="#545c4d" stroke-width="8"/><path d="M33 50v24c0 36 54 36 54 0V50" fill="none" stroke="#5e6658" stroke-width="5"/><rect x="43" y="17" width="34" height="68" rx="17" fill="#717b69" stroke="#434d41" stroke-width="4"/><path d="M49 33h22M48 42h24M48 51h24M48 60h24" stroke="#b5baa0" stroke-width="3"/>',
 computer:'<path d="M16 31h88v65H16Z" fill="#778175" stroke="#444f46" stroke-width="4"/><rect x="22" y="37" width="76" height="51" rx="2" fill="#b3c6b3"/><rect x="28" y="44" width="27" height="22" fill="#e9dbad"/><path d="M62 46h30M62 53h20M27 75h64M27 81h48" stroke="#617c68" stroke-width="4"/><path d="M16 96L3 120h114l-13-24Z" fill="#a8b09e" stroke="#576252" stroke-width="3"/><path d="M20 104h78M16 110h87" stroke="#6a7763" stroke-width="3"/><path d="M48 114h25" stroke="#64725e" stroke-width="4"/>',
 camera:'<path d="M60 85v61M60 103l-30 43M60 103l31 43" stroke="#52594e" stroke-width="5"/><rect x="20" y="43" width="82" height="53" rx="10" fill="#535e4e" stroke="#394537" stroke-width="4"/><path d="M35 43l10-16h30l10 16" fill="#66725d" stroke="#394537" stroke-width="4"/><circle cx="64" cy="68" r="24" fill="#9cae8f" stroke="#394537" stroke-width="5"/><circle cx="64" cy="68" r="16" fill="#344c46"/><ellipse cx="60" cy="62" rx="8" ry="6" fill="#b5d2ba"/><rect x="28" y="49" width="12" height="6" rx="2" fill="#e1d7a9"/>'
 };
 return `<svg viewBox="0 0 120 160" class="studio-device-art" aria-hidden="true"><ellipse cx="60" cy="152" rx="40" ry="5" fill="#3e3e3429"/>${shapes[id]||''}</svg>`;
}
export function roomEquipment(s){
 const items=[['lamp',.75,.39,.12],['tripod',.61,.59,.14],['mic',.94,.49,.085],['computer',.69,.48,.20],['camera',.91,.59,.15]];
 return items.filter(([id])=>s.studio.gear[id]&&(id!=='lamp'||s.studio.tier>0)).map(([id,x,y,w])=>`<span class="scene-device" data-scene-gear="${id}" data-x="${x}" data-y="${y}" data-w="${w}">${equipmentArt(id)}</span>`).join('');
}
