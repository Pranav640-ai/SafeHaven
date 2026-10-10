self.addEventListener('push',event=>{
  let payload={};let bulletinId='';try{payload=event.data.json();bulletinId=String(payload.bulletin_id||'').slice(0,100)}catch{}
  if(!bulletinId)return;
  event.waitUntil(self.registration.showNotification('SafeHaven · Destination bulletin',{
    body:'A new source bulletin is available for your selected place. Open Risk insights to read its source and instructions.',
    icon:'/app-icon.svg',tag:'safehaven-'+bulletinId,data:{bulletinId}
  }).then(()=>{if(payload.job_id&&payload.receipt_token)return fetch((self.SAFEHAVEN_API_BASE||'')+'/api/safety/push/receipt',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify({id:payload.job_id,token:payload.receipt_token})}).catch(()=>{})}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{for(const w of windows){if(new URL(w.url).origin===self.location.origin)return w.focus()}return clients.openWindow('/')}))});
