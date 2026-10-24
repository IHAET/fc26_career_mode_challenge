/*
 * 📸 Proof: screenshots that show you completed an objective (or the whole
 * challenge). Photos are shrunk and kept on this device (IndexedDB); the save
 * only notes which objectives have proof, so it stays small enough to sync.
 * Signed in with a username, a copy also goes to proofs/{uid}/items/{id},
 * where other players can see it from the leaderboard.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const DB_NAME = 'fc26-proofs';
  const STORE = 'photos';

  // ---------- Shrinking a photo ----------

  /** A File → JPEG data URL, at most `max` pixels on its longest side. */
  function shrink(file, max, quality) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) { reject(new Error('That isn’t a picture.')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That picture couldn’t be opened.')); };
      img.src = url;
    });
  }

  // ---------- On this device ----------

  let dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      if (!root.indexedDB) { reject(new Error('This browser can’t store photos.')); return; }
      const req = root.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbp.catch(() => { dbp = null; });
    return dbp;
  }
  async function tx(mode, fn) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
    });
  }
  const putLocal = (id, photo) => tx('readwrite', (s) => s.put(photo, id));
  const getLocal = (id) => tx('readonly', (s) => s.get(id));
  const delLocal = (id) => tx('readwrite', (s) => s.delete(id));

  // ---------- Adding, viewing and removing ----------

  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const cloud = () => (FC26.account && FC26.account.data && FC26.account.data()) || null;
  const me = () => { const s = FC26.account && FC26.account.state(); return s && s.user ? s.user.uid : null; };

  /**
   * Add a photo as proof of `key` ("s1-0", "final") on a saved challenge.
   * Returns the new proof { id, key, at, shared }. `meta`: { title, objective }.
   */
  async function add(entryId, key, file, meta) {
    const [image, thumb, small] = await Promise.all([shrink(file, 1600, 0.82), shrink(file, 360, 0.7), shrink(file, 960, 0.6)]);
    const proof = { id: `${entryId}_${uid()}`, key, at: Date.now(), shared: false };
    await putLocal(proof.id, { image, thumb });
    const d = cloud();
    const user = me();
    if (d && user && small.length < 700000) {
      try {
        await d.set(`proofs/${user}/items/${proof.id}`, {
          entryId, key, image: small, title: String((meta && meta.title) || '').slice(0, 120),
          objective: String((meta && meta.objective) || '').slice(0, 200), at: proof.at,
        });
        proof.shared = true;
      } catch (e) { proof.shared = false; }
    }
    return proof;
  }

  async function remove(proof) {
    await delLocal(proof.id).catch(() => {});
    const d = cloud();
    const user = me();
    if (d && user && proof.shared) await d.remove(`proofs/${user}/items/${proof.id}`).catch(() => {});
  }

  /** A proof's photo (this device first, else the shared copy): { image, thumb } or null. */
  async function photo(proof) {
    const local = await getLocal(proof.id).catch(() => null);
    if (local) return local;
    const d = cloud();
    const user = me();
    if (d && user && proof.shared) {
      const doc = await d.get(`proofs/${user}/items/${proof.id}`).catch(() => null);
      if (doc && doc.image) return { image: doc.image, thumb: doc.image };
    }
    return null;
  }

  /** Someone's shared proofs (for the leaderboard), newest first. */
  async function sharedBy(userId) {
    const d = cloud();
    if (!d || !d.list) return [];
    const items = await d.list(`proofs/${userId}/items`);
    return items.sort((a, b) => (b.at || 0) - (a.at || 0));
  }

  // ---------- A viewer ----------

  let viewer = null;
  let removeCb = null;
  /** Show photos full size: [{ src, caption }], starting at `index`. opts.onRemove(i) adds a Remove button. */
  function show(photos, index, opts) {
    removeCb = (opts && opts.onRemove) || null;
    if (!viewer) {
      viewer = document.createElement('div');
      viewer.className = 'modal proof-viewer';
      viewer.setAttribute('role', 'dialog');
      viewer.setAttribute('aria-modal', 'true');
      viewer.setAttribute('aria-label', 'Proof photo');
      document.body.appendChild(viewer);
      viewer.addEventListener('click', (e) => {
        if (e.target === viewer || e.target.closest('[data-pv="close"]')) { viewer.hidden = true; document.body.classList.remove('modal-open'); return; }
        const step = e.target.closest('[data-pv-step]');
        if (step) render(Number(step.dataset.pvStep));
        const del = e.target.closest('[data-pv="remove"]');
        if (del && removeCb && window.confirm('Remove this proof?')) {
          removeCb(Number(del.dataset.i));
          viewer.hidden = true;
          document.body.classList.remove('modal-open');
        }
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && viewer && !viewer.hidden) { viewer.hidden = true; document.body.classList.remove('modal-open'); } });
    }
    let list = photos;
    let at = index || 0;
    function render(i) {
      at = (i + list.length) % list.length;
      const p = list[at];
      viewer.innerHTML = `
        <figure class="pv-card">
          <button type="button" class="icon-btn pv-close" data-pv="close" aria-label="Close">✕</button>
          <img src="${p.src}" alt="${(p.caption || 'Proof').replace(/"/g, '&quot;')}">
          <figcaption>${(p.caption || '').replace(/</g, '&lt;')}${list.length > 1 ? ` <span class="muted">(${at + 1} of ${list.length})</span>` : ''}</figcaption>
          <div class="pv-nav">
            ${list.length > 1 ? `<button type="button" class="btn btn-small" data-pv-step="${at - 1}">← Previous</button><button type="button" class="btn btn-small" data-pv-step="${at + 1}">Next →</button>` : ''}
            ${removeCb ? `<button type="button" class="btn btn-small btn-danger-soft" data-pv="remove" data-i="${at}">🗑️ Remove</button>` : ''}
          </div>
        </figure>`;
    }
    list = photos;
    render(at);
    viewer.hidden = false;
    document.body.classList.add('modal-open');
  }

  /** Points a save's proven objectives are worth: main 10, side 5, final goal 30, × difficulty. */
  function points(entry) {
    const ch = entry.challenge;
    const proofs = entry.proofs || {};
    const mult = [1, 1, 1.25, 1.5, 2][Number(ch.difficulty) || 1] || 1;
    let total = 0;
    ch.roadmap.forEach((s) => s.objectives.forEach((o, i) => {
      if ((proofs[`s${s.season}-${i}`] || []).length) total += o.type === 'main' ? 10 : 5;
    }));
    if ((proofs.final || []).length) total += 30;
    return Math.round(total * mult);
  }
  const proofCount = (entry) => Object.values(entry.proofs || {}).reduce((n, list) => n + list.length, 0);

  FC26.proofs = { add, remove, photo, show, sharedBy, points, proofCount, shrink };
})(typeof window !== 'undefined' ? window : globalThis);
