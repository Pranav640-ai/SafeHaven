// Encrypted local payload only; passwords, keys, filenames and documents are never persisted in plaintext here.
export type VaultEntry={id:string;title:string;category:string;mime:string;data:string;addedAt:string};
export type VaultEnvelope={version:1;iterations:600000;salt:Uint8Array;iv:Uint8Array;ciphertext:ArrayBuffer};
const aad=new TextEncoder().encode('meridian-document-vault:v1');
const ITERATIONS=600000;
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('meridian-document-vault',1);r.onupgradeneeded=()=>r.result.createObjectStore('vault');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('Local vault storage is unavailable.'));});}
export async function readVault():Promise<VaultEnvelope|null>{const db=await database();try{return await new Promise((resolve,reject)=>{const r=db.transaction('vault','readonly').objectStore('vault').get('payload');r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(new Error('Could not read the local vault.'));});}finally{db.close();}}
export async function writeVault(value:VaultEnvelope,expected:VaultEnvelope|null):Promise<void>{
  const db=await database();
  try{await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('vault','readwrite');const store=tx.objectStore('vault');const request=store.get('payload');
    let message='Could not save the vault. Storage may be full.';
    request.onsuccess=()=>{
      const current=request.result as VaultEnvelope|undefined;
      const matches=expected?current&&expected.iv.length===current.iv.length&&expected.iv.every((b,i)=>b===current.iv[i]):!current;
      if(!matches){message='Vault changed in another window. Leave and reopen before retrying.';tx.abort();return;}
      store.put(value,'payload');
    };
    tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(new Error(message));
  });}finally{db.close();}
}
export async function deriveVaultKey(password:string,salt:Uint8Array):Promise<CryptoKey>{
  if(!crypto.subtle)throw new Error('Secure encryption is unavailable on this device.');
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:new Uint8Array(salt),iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function sealVault(entries:VaultEntry[],key:CryptoKey,salt:Uint8Array):Promise<VaultEnvelope>{
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plaintext=new TextEncoder().encode(JSON.stringify(entries));
  try{return {version:1,iterations:ITERATIONS,salt,iv,ciphertext:await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},key,plaintext)};}finally{plaintext.fill(0);}
}
export async function openVault(envelope:VaultEnvelope,password:string):Promise<{key:CryptoKey;entries:VaultEntry[]}>{
  if(envelope.version!==1||envelope.iterations!==ITERATIONS)throw new Error('Unsupported vault format.');
  const key=await deriveVaultKey(password,envelope.salt);
  let plaintext:ArrayBuffer;
  try{plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(envelope.iv),additionalData:aad},key,envelope.ciphertext);}catch{throw new Error('Could not unlock: incorrect passphrase or damaged vault.');}
  try{const entries=JSON.parse(new TextDecoder().decode(plaintext));if(!Array.isArray(entries))throw new Error('Invalid vault content.');return {key,entries};}finally{new Uint8Array(plaintext).fill(0);}
}
export function fileData(file:File):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Could not read this file.'));reader.readAsDataURL(file);});}
