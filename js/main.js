// @ts-nocheck
if (new URLSearchParams(location.search).get('classic') === '1') {
 const style=document.createElement('link');style.rel='stylesheet';style.href='./style.css?v=1.1.0';document.head.append(style);
 const load=src=>new Promise(resolve=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=resolve;document.head.append(script);});
 await load('./libs/laya.core.js');await load('./libs/laya.webgl_2D.js');
 document.querySelector('link[href*=creator]').remove();
 import('./classic.js?v=1.1.0');
} else {
 import('./creator.js?v=1.1.0');
}


