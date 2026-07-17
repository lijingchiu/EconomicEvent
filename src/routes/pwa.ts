const MANIFEST = {
  name: "Macro Pulse Economic Events",
  short_name: "Macro Pulse",
  description: "Official U.S. economic event calendar and release values",
  start_url: "/admin",
  scope: "/",
  display: "standalone",
  background_color: "#e7e5df",
  theme_color: "#2a1f17",
  icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
};

const SERVICE_WORKER = `const CACHE='macro-pulse-v2';
const CORE=['/admin','/favicon.svg','/paper-texture.svg','/manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/admin/')||url.pathname.startsWith('/auth/'))return;if(url.pathname.startsWith('/api/')){event.respondWith(fetch(request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>caches.match(request)));return}event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));return response}).catch(()=>caches.match(request).then(response=>response||caches.match('/admin'))))});
self.addEventListener('push',event=>{let data={};try{data=event.data?event.data.json():{}}catch(error){data={body:event.data?event.data.text():''}}event.waitUntil(self.registration.showNotification(data.title||'Macro Pulse',{body:data.body||'Economic event update',icon:'/favicon.svg',badge:'/favicon.svg',data:{url:data.url||'/admin'},tag:data.tag||'economic-event'}))});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(items=>{const target=event.notification.data&&event.notification.data.url||'/admin';for(const item of items){if('focus'in item){item.navigate(target);return item.focus()}}return clients.openWindow(target)}))});`;

export function manifestRoute(): Response {
  return new Response(JSON.stringify(MANIFEST), { headers: { "content-type": "application/manifest+json; charset=utf-8", "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" } });
}

export function serviceWorkerRoute(): Response {
  return new Response(SERVICE_WORKER, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache", "service-worker-allowed": "/", "x-content-type-options": "nosniff" } });
}
