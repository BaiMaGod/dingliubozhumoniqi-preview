#!/usr/bin/env node
/** Gate for an actual LayaAir 3.4 browser game package, not a QA stub.
 * Inputs: compiled web dir, LAYA_SOURCE_COMMIT=40-character private source SHA.
 * Requires project build evidence + real-browser Playwright smoke proof.
 */
import { readFileSync, readdirSync, existsSync, lstatSync } from 'node:fs';
import { resolve, join, sep, relative, posix } from 'node:path';
import { createHash } from 'node:crypto';

function fail(message) { console.error('LAYA_RELEASE_REJECTED:', message); process.exit(2); }
const base=resolve(process.argv[2] || '.release-out/web');
const expected=process.env.LAYA_SOURCE_COMMIT;
if(!expected || !/^[0-9a-f]{40}$/.test(expected))fail('Export LAYA_SOURCE_COMMIT from git -C game-src rev-parse HEAD');
if(!existsSync(base) || !lstatSync(base).isDirectory())fail('Missing compiled Web output');
const evidencePath=join(base,'_build-evidence.json');
if(!existsSync(evidencePath))fail('Missing _build-evidence.json from official build + browser QA');
let manifest;
try {manifest=JSON.parse(readFileSync(evidencePath,'utf8'));}
catch(e) {fail('Invalid evidence JSON: '+e.message);}
if(manifest.officialBuild!==true)fail('Not officially built LayaAir runtime');
if(!/LayaAir/i.test(String(manifest.engine)))fail('Engine identity missing');
if(manifest.sourceCommit!==expected)fail('Compiled game source SHA does not match checked-out private repo');
if(manifest.browserSmokePassed!==true)fail('Actual browser gameplay smoke was not passed');
const viewports=new Set((manifest.browserSmokeViewport || []).map(v => typeof v === 'string' ? v : `${v.width}x${v.height}`));
if(!viewports.has('390x844') || !viewports.has('375x667'))fail('Missing one of two phone viewport checks');
if(!Array.isArray(manifest.files)||manifest.files.length<3)fail('Build evidence has no file hash inventory');
const prohibited=/(^|\/)(?:\.git|\.github|\.env(?:\.|$)|node_modules|src|tests?|docs?|\.qa-out|qa-evidence)(?:\/|$)|mock-laya|qa-bundle|playwright|(?:^|\/)\.DS_Store$/i;
const bannedExtensions=/\.(?:ts|tsx|md|map|pem|key|p12|pfx|sh|py|yaml|yml)$/i;
const actual=[];
function walk(folder) {
 for(const name of readdirSync(folder)) {
  const full=join(folder,name),s=lstatSync(full);
  if(s.isSymbolicLink())fail('Symlink may point outside package: '+relative(base,full));
  if(s.isDirectory())walk(full);
  else if(s.isFile())actual.push(relative(base,full).split(sep).join('/'));
  else fail('Unsupported file type: '+relative(base,full));
 }
}
walk(base);
const indexed=new Set();
for(const file of manifest.files) {
 if(!file||typeof file.path!=='string'||typeof file.sha256!=='string')fail('Invalid build inventory entry');
 const path=file.path;
 if(path.startsWith('/')||path.includes('\\')||path.split('/').some(x=>x===''||x==='..'||x==='.')||posix.normalize(path)!==path)fail('Unsafe relative asset path: '+path);
 if(prohibited.test(path)||bannedExtensions.test(path))fail('Release contains private source / QA / sensitive file: '+path);
 if(indexed.has(path))fail('Duplicate inventory path: '+path);
 indexed.add(path);
 const full=join(base,path);
 if(!existsSync(full)||!lstatSync(full).isFile())fail('Missing compiled file: '+path);
 const bytes=readFileSync(full);
 if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)fail('SHA256 mismatch: '+path);
 if(!Number.isSafeInteger(file.bytes)||file.bytes!==bytes.length)fail('Byte count mismatch: '+path);
}
for(const path of actual) {
 if(path==='_build-evidence.json')continue;
 if(prohibited.test(path)||bannedExtensions.test(path))fail('Forbidden file in real output: '+path);
 if(!indexed.has(path))fail('Unhashed file added after build: '+path);
}
for(const path of ['index.html','libs/laya.core.js','js/index.js'])if(!indexed.has(path))fail('Missing official LayaAir 3.4 Web runtime: '+path);
const html=readFileSync(join(base,'index.html'),'utf8');
if(/<base\b[^>]*\bhref\s*=\s*["']\//i.test(html))fail('Root-absolute base href breaks GitHub Pages project subpath');
for(const match of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
 const src=match[1].split(/[?#]/)[0];
 if(!src || src.startsWith('/') || /^(?:https?:)?\/\//i.test(src))fail('Unsafe or root-absolute script source: '+src);
 if(!indexed.has(src.replace(/^\.\//,'')))fail('Script referenced by index.html is absent: '+src);
}
console.log('LAYA_RELEASE_VERIFIED',manifest.sourceCommit,Array.from(viewports).join(','),indexed.size,'files');
