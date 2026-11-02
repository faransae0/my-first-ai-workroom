(function () {
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var current = scenes[0].id;
  var wb = window.webbook;
  var themes = ['light', 'sepia', 'dark'];

  function save(key, value) { try { if (wb) wb.storage.set(key, value); else localStorage.setItem('wb_' + key, JSON.stringify(value)); } catch (e) {} }
  function load(key) {
    if (wb) return wb.storage.get(key).catch(function () { return null; });
    try { var v = localStorage.getItem('wb_' + key); return Promise.resolve(v ? JSON.parse(v) : null); } catch (e) { return Promise.resolve(null); }
  }

  var inPlayer = window.parent !== window;   // inside the Read Copilot player the player owns navigation/history

  function show(id, anchor, silent, noHistory) {
    var target = document.getElementById(id);
    if (!target) return;
    scenes.forEach(function (s) { s.classList.remove('active'); });
    target.classList.add('active');
    current = id;
    var anchorEl = anchor ? document.getElementById(anchor) : null;
    if (anchorEl) anchorEl.scrollIntoView(); else window.scrollTo(0, 0);
    document.title = target.getAttribute('data-title') + ' · 나의 첫 AI 작업실';
    var num = scenes.indexOf(target) + 1;
    if (!inPlayer && !noHistory && window.history && history.pushState) {
      try { history.pushState(null, '', '#' + (anchor || id)); } catch (e) {}
    }
    if (!silent) {
      save('scene', id);
      if (wb) wb.progress.save({ sceneId: id, sceneNumber: num, percent: Math.round(num / scenes.length * 100), title: target.getAttribute('data-title') });
    }
  }
  function fromHash(noHistory) {
    var h = location.hash.slice(1);
    var el = h && document.getElementById(h);
    if (!el) return false;
    var scene = el.classList.contains('scene') ? el : el.closest('.scene');
    if (!scene) return false;
    show(scene.id, scene === el ? null : h, false, noHistory);
    return true;
  }
  function step(d) { var i = scenes.findIndex(function (s) { return s.id === current; }) + d; if (i >= 0 && i < scenes.length) show(scenes[i].id); }

  document.addEventListener('click', function (e) {
    var go = e.target.closest('[data-scene]');
    if (go) { e.preventDefault(); show(go.getAttribute('data-scene'), go.getAttribute('data-anchor')); return; }
    var cp = e.target.closest('.copy');
    if (cp) {
      var text = cp.closest('.codeblock').querySelector('code').innerText;
      var done = function () { cp.textContent = '복사됨'; setTimeout(function () { cp.textContent = '복사'; }, 1400); };
      var fallback = function () { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (x) { cp.textContent = '선택해서 복사'; } document.body.removeChild(t); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.target.matches('input,textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1);
  });

  function theme(t) { document.documentElement.setAttribute('data-theme', t); save('theme', t); }
  document.getElementById('theme').addEventListener('click', function () {
    var now = document.documentElement.getAttribute('data-theme') || 'light';
    theme(themes[(themes.indexOf(now) + 1) % themes.length]);
  });

  if (wb) {
    wb.on('navigation:go', function (d) { if (d && d.sceneId) show(d.sceneId, d.anchor); });
    wb.on('navigation:next', function () { step(1); });
    wb.on('navigation:prev', function () { step(-1); });
  }
  load('theme').then(function (t) { if (t) document.documentElement.setAttribute('data-theme', t); });
  window.addEventListener('popstate', function () { if (!fromHash(true)) show(scenes[0].id, null, true, true); });
  if (!fromHash(true)) load('scene').then(function (id) { if (id && document.getElementById(id)) show(id, null, true, true); });
})();
