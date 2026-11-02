/**
 * WebBook Client Runtime SDK (v0.1)
 * Standard bridge between the WebBook content (inside sandbox) and WebBook Player
 */
(function(window) {
  if (window.webbook) return;

  const eventListeners = new Map();
  let requestId = 0;
  const pendingRequests = new Map();

  // Send message to parent player
  function postToPlayer(type, payload = {}) {
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      pendingRequests.set(id, { resolve, reject });

      const msg = {
        source: 'webbook-client',
        version: '0.1',
        requestId: id,
        type,
        payload
      };

      if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      } else {
        // Standalone fallback mock
        handleMockResponse(type, payload, id);
      }
    });
  }

  // Handle mock responses when opened outside player
  function handleMockResponse(type, payload, id) {
    setTimeout(() => {
      const req = pendingRequests.get(id);
      if (!req) return;
      pendingRequests.delete(id);

      if (type === 'storage:get') {
        const val = localStorage.getItem(`webbook_standalone_${payload.key}`);
        req.resolve(val ? JSON.parse(val) : null);
      } else if (type === 'storage:set') {
        localStorage.setItem(`webbook_standalone_${payload.key}`, JSON.stringify(payload.value));
        req.resolve(true);
      } else if (type === 'ai:ask') {
        req.resolve({
          reply: `[Standalone Mock AI] "${payload.message}"에 대한 로컬 응답입니다. (현재 플레이어 외부에서 실행 중입니다.)`
        });
      } else {
        req.resolve({ status: 'ok' });
      }
    }, 50);
  }

  // Listen for messages from parent Player
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.source !== 'webbook-player') return;

    if (data.responseId && pendingRequests.has(data.responseId)) {
      const { resolve, reject } = pendingRequests.get(data.responseId);
      pendingRequests.delete(data.responseId);
      if (data.error) reject(new Error(data.error));
      else resolve(data.payload);
      return;
    }

    if (data.event) {
      const listeners = eventListeners.get(data.event) || [];
      listeners.forEach(fn => fn(data.payload));
    }
  });

  const webbook = {
    version: '0.1',

    navigation: {
      go: (sceneId) => postToPlayer('navigation:go', { sceneId }),
      next: () => postToPlayer('navigation:next'),
      prev: () => postToPlayer('navigation:prev')
    },

    progress: {
      save: (data) => postToPlayer('progress:save', data)
    },

    storage: {
      get: (key) => postToPlayer('storage:get', { key }),
      set: (key, value) => postToPlayer('storage:set', { key, value }),
      remove: (key) => postToPlayer('storage:remove', { key })
    },

    audio: {
      play: (src) => postToPlayer('audio:play', { src }),
      pause: () => postToPlayer('audio:pause')
    },

    ai: {
      ask: (options) => postToPlayer('ai:ask', options)
    },

    on: (eventName, handler) => {
      if (!eventListeners.has(eventName)) {
        eventListeners.set(eventName, []);
      }
      eventListeners.get(eventName).push(handler);
    },

    off: (eventName, handler) => {
      if (!eventListeners.has(eventName)) return;
      const arr = eventListeners.get(eventName).filter(h => h !== handler);
      eventListeners.set(eventName, arr);
    }
  };

  window.webbook = webbook;
})(window);
