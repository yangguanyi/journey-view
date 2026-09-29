const CACHE='family-view-v3';
const ASSETS=['./','index.html','style.css','viewer.mjs','crypto.mjs','format.mjs','timeline.mjs','progress.mjs','map.mjs','leaflet.js','leaflet.css','land.json','icon.svg','manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('family-view-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin)return;
if(/(?:snapshot|photos-\d+|version)\.json$/.test(u.pathname))return;
event.respondWith((async()=>{const cache=await caches.open(CACHE);const response=await cache.match(event.request,{ignoreSearch:true});const network=fetch(event.request).then(r=>{if(r.ok)cache.put(event.request,r.clone());return r});if(response){event.waitUntil(network.catch(()=>{}));return response}try{return await network}catch{return await cache.match('./')||Response.error()}})())});
