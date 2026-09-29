export const validKey=value=>/^[A-Za-z0-9_-]{43}$/.test(value||'');
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export async function unlock(envelope,keyText){
 if(!validKey(keyText)||envelope?.format!=='family-journey:v1'||envelope.encoding!=='gzip')throw Error('Invalid encrypted snapshot');
 if(typeof envelope.ciphertext!=='string'||envelope.ciphertext.length>20000000)throw Error('Invalid snapshot size');
 const raw=bytes(keyText.replace(/-/g,'+').replace(/_/g,'/')+'=');
 const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(envelope.iv),additionalData:new TextEncoder().encode('family-journey:v1')},key,bytes(envelope.ciphertext));
 return JSON.parse(await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
}
