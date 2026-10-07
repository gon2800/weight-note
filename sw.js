const CACHE="weight-note-v26";
// Pretendard 글꼴(CDN)은 버전이 바뀌어도 다시 받지 않도록 별도 캐시에 보관한다.
const FONT_CACHE="weight-note-fonts-v1";
const FONT_HOST="https://cdn.jsdelivr.net";
// index.html은 캐시 목록에 넣지 않는다 (Cloudflare가 /index.html을 리다이렉트하므로).
// 루트 "/"만 앱 셸로 캐시한다.
const ASSETS=["/","/manifest.webmanifest","/icon-192.png","/icon-512.png"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k!==FONT_CACHE).map(k=>caches.delete(k))))
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

  // 글꼴(CDN): 캐시 우선. 오프라인에서 실패해도 HTML을 대신 내보내지 않는다(시스템 글꼴로 표시됨).
  if(req.url.startsWith(FONT_HOST)){
    e.respondWith(
      caches.open(FONT_CACHE).then(c=>c.match(req).then(hit=> hit || fetch(req).then(res=>{
        if(res.ok) c.put(req,res.clone()).catch(()=>{});
        return res;
      })))
    );
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
