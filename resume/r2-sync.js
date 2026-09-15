/**
 * Bridges the resume app's localStorage versions <-> Cloudflare R2.
 * Storage key matches the built app: dcgrouphq_resume_versions
 *
 * Cost: R2 free tier (10GB + 1M writes/mo). A personal resume library
 * is a few KB — effectively $0 forever at normal use.
 */
(function () {
  var KEY = "dcgrouphq_resume_versions";
  var API = "/api/resume-versions";
  var originalGet = localStorage.getItem.bind(localStorage);
  var originalSet = localStorage.setItem.bind(localStorage);
  var originalRemove = localStorage.removeItem.bind(localStorage);
  var saveTimer = null;
  var ready = false;

  function pushToR2(value) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      fetch(API, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: value,
      }).catch(function () {
        /* offline / not unlocked — keep local copy */
      });
    }, 400);
  }

  localStorage.setItem = function (key, value) {
    originalSet(key, value);
    if (key === KEY && ready) pushToR2(value);
  };

  localStorage.removeItem = function (key) {
    originalRemove(key);
    if (key === KEY && ready) pushToR2("[]");
  };

  // Keep getItem native; we seed before the app boots.
  window.__dcgrouphqR2Sync = {
    key: KEY,
    flush: function () {
      var value = originalGet(KEY);
      if (value != null) pushToR2(value);
    },
  };

  // Synchronous XHR so versions are in localStorage before the React module runs.
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", API, false);
    xhr.withCredentials = true;
    xhr.send(null);
    if (xhr.status === 200) {
      var remote = xhr.responseText;
      try {
        var parsed = JSON.parse(remote);
        if (Array.isArray(parsed)) {
          var localRaw = originalGet(KEY);
          var local = [];
          try {
            local = localRaw ? JSON.parse(localRaw) : [];
          } catch (_) {
            local = [];
          }
          // Prefer remote if it has data; otherwise keep local and upload later.
          if (parsed.length > 0) {
            originalSet(KEY, JSON.stringify(parsed));
          } else if (Array.isArray(local) && local.length > 0) {
            originalSet(KEY, JSON.stringify(local));
            // migrate browser copies up to R2
            pushToR2(JSON.stringify(local));
          } else {
            originalSet(KEY, "[]");
          }
        }
      } catch (_) {
        /* ignore bad payload */
      }
    }
  } catch (_) {
    /* API not reachable — app still works offline via localStorage */
  }

  ready = true;
})();
