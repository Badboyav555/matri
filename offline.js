// ============ OFFLINE SUPPORT (IndexedDB Queue) ============

const OfflineQueue = {
  db: null,

  async init() {
    return new Promise((resolve) => {
      const req = indexedDB.open('swasthyasaathi_db', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('pending_records')) {
          db.createObjectStore('pending_records', { keyPath: 'localId' });
        }
      };
      req.onsuccess = (e) => { OfflineQueue.db = e.target.result; resolve(); };
      req.onerror = () => resolve();
    });
  },

  async enqueue(operation) {
    if (!OfflineQueue.db) await OfflineQueue.init();
    return new Promise((resolve) => {
      const tx = OfflineQueue.db.transaction(['sync_queue'], 'readwrite');
      tx.objectStore('sync_queue').add({
        ...operation,
        created_at: new Date().toISOString(),
        attempts: 0
      });
      tx.oncomplete = () => {
        OfflineQueue.updateBadge();
        resolve();
      };
      tx.onerror = () => resolve();
    });
  },

  async getPending() {
    if (!OfflineQueue.db) await OfflineQueue.init();
    return new Promise((resolve) => {
      const tx = OfflineQueue.db.transaction(['sync_queue'], 'readonly');
      const req = tx.objectStore('sync_queue').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  },

  async remove(id) {
    if (!OfflineQueue.db) return;
    return new Promise((resolve) => {
      const tx = OfflineQueue.db.transaction(['sync_queue'], 'readwrite');
      tx.objectStore('sync_queue').delete(id);
      tx.oncomplete = () => { OfflineQueue.updateBadge(); resolve(); };
    });
  },

  async syncAll() {
    if (!navigator.onLine) return;
    const pending = await OfflineQueue.getPending();
    if (!pending.length) {
      OfflineQueue.setStatus('online');
      return;
    }
    OfflineQueue.setStatus('syncing');
    for (const item of pending) {
      try {
        if (supabaseClient) {
          const { error } = await supabaseClient.from(item.table).insert(item.payload);
          if (!error) {
            await OfflineQueue.remove(item.id);
          }
        }
      } catch (e) {
        console.warn('Sync failed for item', item.id, e.message);
      }
    }
    const remaining = await OfflineQueue.getPending();
    if (remaining.length === 0) {
      OfflineQueue.setStatus('online');
      showToast('success', t('sync.synced'), '');
    } else {
      OfflineQueue.setStatus('offline');
    }
  },

  async updateBadge() {
    const pending = await OfflineQueue.getPending();
    const badges = document.querySelectorAll('.pending-sync-badge');
    badges.forEach(b => {
      b.textContent = pending.length;
      b.style.display = pending.length > 0 ? 'inline-block' : 'none';
    });
  },

  setStatus(status) {
    const els = document.querySelectorAll('.sync-status');
    els.forEach(el => {
      el.classList.remove('online', 'offline', 'syncing');
      el.classList.add(status);
      const dot = el.querySelector('.dot');
      const txt = el.querySelector('.txt');
      if (txt) {
        if (status === 'online') txt.textContent = t('sync.online');
        else if (status === 'offline') txt.textContent = t('sync.offline');
        else if (status === 'syncing') txt.textContent = t('sync.syncing');
      }
    });
  },

  initListeners() {
    window.addEventListener('online', () => {
      OfflineQueue.setStatus('syncing');
      setTimeout(() => OfflineQueue.syncAll(), 500);
    });
    window.addEventListener('offline', () => {
      OfflineQueue.setStatus('offline');
    });
    // Initial status
    OfflineQueue.setStatus(navigator.onLine ? 'online' : 'offline');
    OfflineQueue.updateBadge();
    // Auto-sync every 60s if online and pending
    setInterval(() => {
      if (navigator.onLine) OfflineQueue.syncAll();
    }, 60000);
  }
};

window.OfflineQueue = OfflineQueue;
document.addEventListener('DOMContentLoaded', () => {
  OfflineQueue.init().then(() => OfflineQueue.initListeners());
});
