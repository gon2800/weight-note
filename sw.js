const CACHE="weight-note-v4";
// index.html은 캐시 목록에 넣지 않는다 (Cloudflare가 /index.html을 리다이렉트하므로).
// 루트 "/"만 앱 셸로 캐시한다.
const ASSETS=["/","/manifest.webmanifest","/icon-192.png","/icon-512.png"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET") return;

  // 페이지 이동(navigation): 네트워크 우선 → 실패 시 캐시된 루트.
  // (리다이렉트된 응답을 절대 캐시에서 내보내지 않음)
  if(req.mode==="navigate"){
    e.respondWith(fetch(req).catch(()=>caches.match("/")));
    return;
  }

  // 그 외 정적 자원: 캐시 우선.
  e.respondWith(
    caches.match(req).then(hit=> hit || fetch(req).then(res=>{
      if(res.ok && res.type==="basic"){
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
      }
      return res;
    }).catch(()=>caches.match("/")))
  );
});
