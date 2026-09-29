import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
export const assets=['index.html','style.css','viewer.mjs','crypto.mjs','format.mjs','timeline.mjs','progress.mjs','map.mjs','leaflet.js','leaflet.css','land.json','icon.svg','manifest.webmanifest','sw.js','LEAFLET-LICENSE.txt'];
export function validate(e){if(Object.keys(e||{}).sort().join(',')!=='ciphertext,encoding,format,iv,version')throw Error('Unexpected source fields');if(e?.format!=='family-journey:v1'||e.encoding!=='gzip'||!/^[-\w]{43}$/.test(e.version)||!/[A-Za-z0-9+/]{16}/.test(e.iv)||typeof e.ciphertext!=='string'||e.ciphertext.length<20||e.ciphertext.length>20000000)throw Error('Encrypted source is invalid');return e}
const origin='https://guanyi-andrew-asia-2026.gyang331.chatgpt.site';
async function fetchJSON(url){const response=await fetch(url,{signal:AbortSignal.timeout(45000),redirect:'error',headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0 FamilyJourneyMirror/1.0'}});if(!response.ok)throw Error('Source unavailable, status '+response.status);return response.json()}
export async function sync(){await mkdir('_site',{recursive:true});await mkdir('.photo-cache',{recursive:true});const snapshot=validate(await fetchJSON(origin+'/api/family-mirror'));const {versions}=await fetchJSON(origin+'/family-photo-manifest.json');if(!Array.isArray(versions)||versions.length!==16)throw Error('Photo manifest invalid');
 for(const file of assets)await copyFile(file,join('_site',file));
 await writeFile('_site/snapshot.json',JSON.stringify(snapshot));
 for(let i=0;i<versions.length;i++){let envelope;const cache=join('.photo-cache',i+'.json');try{envelope=validate(JSON.parse(await readFile(cache,'utf8')))}catch{}if(envelope?.version!==versions[i]){envelope=validate(await fetchJSON(origin+'/family-photos-'+i+'.json'));if(envelope.version!==versions[i])throw Error('Photo revision changed during sync');await writeFile(cache,JSON.stringify(envelope))}await writeFile('_site/photos-'+i+'.json',JSON.stringify(envelope))}
 await writeFile('_site/version.json',JSON.stringify({version:snapshot.version,photosVersions:versions,checkedAt:new Date().toISOString(),sourceCommit:process.env.GITHUB_SHA||'local-validation'}));
 await writeFile('_site/.nojekyll','');console.log('Encrypted snapshot and viewer prepared. No plaintext itinerary is published.');
}
if(process.argv[1]?.endsWith('/sync.mjs'))await sync();
