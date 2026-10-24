/*
 * Accounts and sync: sign in with email/password or Google, and keep saved
 * challenges (with their trackers and diaries) the same on every device.
 *
 * The backend is an adapter: Firebase by default (switched on by
 * FC26.config.firebase), or anything with the same methods via useAdapter().
 *   onUser(cb), signIn(email, pw), signUp(email, pw), reset(email), google(),
 *   signOut(), load(uid) → doc | null, save(uid, doc)
 * and, for profiles, following and Pro (js/subscriptions.js), an optional
 *   data: { get(path), set(path, value, merge?), remove(path), add(collection, value) → id,
 *           watch(path, cb) → stop, watchAll(collection, cb) → stop, call(name, payload) }
 *
 * Each user has one document: { v, updated, challenges, deleted, known },
 * with the lists stored as JSON text. Merging is per challenge: the most
 * recently changed copy wins, and a deletion wins over older copies.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
  const MAX_DOC = 900000; // Firestore documents top out at 1 MiB

  const stamp = (e) => Number(e.updatedAt || e.savedAt) || 0;

  /**
   * Merge two copies of the saves: { entries, deleted: { id: time }, known }.
   * Newest copy of each challenge wins; a deletion beats copies older than it.
   */
  function mergeSaves(a, b) {
    const deleted = Object.assign({}, a.deleted);
    Object.entries(b.deleted || {}).forEach(([id, t]) => { deleted[id] = Math.max(Number(deleted[id]) || 0, Number(t) || 0); });
    const byId = new Map();
    [...(a.entries || []), ...(b.entries || [])].forEach((e) => {
      if (!e || !e.id) return;
      const have = byId.get(e.id);
      if (!have || stamp(e) > stamp(have)) byId.set(e.id, e);
    });
    const entries = Array.from(byId.values())
      .filter((e) => !(deleted[e.id] >= stamp(e)))
      .sort((x, y) => (Number(y.savedAt) || 0) - (Number(x.savedAt) || 0));
    const seen = new Set();
    const known = [...(a.known || []), ...(b.known || [])].filter((k) => {
      const id = JSON.stringify(k);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return { entries, deleted, known };
  }

  /**
   * Stamp what changed between two versions of the saved list: entries whose
   * content differs get updatedAt = now, and removed ones a deletion time.
   */
  function stampChanges(before, after, deleted, now) {
    const old = new Map((before || []).map((e) => [e.id, JSON.stringify(Object.assign({}, e, { updatedAt: 0 }))]));
    after.forEach((e) => {
      if (old.get(e.id) !== JSON.stringify(Object.assign({}, e, { updatedAt: 0 }))) e.updatedAt = now;
    });
    const ids = new Set(after.map((e) => e.id));
    old.forEach((_, id) => { if (!ids.has(id)) deleted[id] = now; });
    return { entries: after, deleted };
  }

  const toDoc = (saves) => ({
    v: 1,
    updated: Date.now(),
    challenges: JSON.stringify(saves.entries || []),
    deleted: JSON.stringify(saves.deleted || {}),
    known: JSON.stringify(saves.known || []),
  });

  function fromDoc(doc) {
    const parse = (s, dflt) => { try { const v = JSON.parse(s); return v && typeof v === 'object' ? v : dflt; } catch (err) { return dflt; } };
    if (!doc) return { entries: [], deleted: {}, known: [] };
    const entries = parse(doc.challenges, []);
    return { entries: Array.isArray(entries) ? entries : [], deleted: parse(doc.deleted, {}), known: [].concat(parse(doc.known, [])) };
  }

  async function firebaseAdapter(config) {
    const [{ initializeApp }, A, F] = await Promise.all([
      import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`),
    ]);
    const app = initializeApp(config);
    const auth = A.getAuth(app);
    const db = F.getFirestore(app);
    const ref = (uid) => F.doc(db, 'users', uid);
    return {
      onUser: (cb) => A.onAuthStateChanged(auth, (u) => cb(u && {
        uid: u.uid, email: u.email || '', name: u.displayName || '', photo: u.photoURL || '',
        google: u.providerData.some((p) => p.providerId === 'google.com'),
      })),
      signIn: (email, pw) => A.signInWithEmailAndPassword(auth, email, pw),
      signUp: (email, pw) => A.createUserWithEmailAndPassword(auth, email, pw),
      reset: (email) => A.sendPasswordResetEmail(auth, email),
      google: () => A.signInWithPopup(auth, new A.GoogleAuthProvider()),
      signOut: () => A.signOut(auth),
      load: async (uid) => { const snap = await F.getDoc(ref(uid)); return snap.exists() ? snap.data() : null; },
      save: (uid, doc) => F.setDoc(ref(uid), doc),
      data: {
        get: async (path) => { const snap = await F.getDoc(F.doc(db, path)); return snap.exists() ? snap.data() : null; },
        set: (path, value, merge) => F.setDoc(F.doc(db, path), value, merge ? { merge: true } : {}),
        remove: (path) => F.deleteDoc(F.doc(db, path)),
        add: async (collection, value) => (await F.addDoc(F.collection(db, collection), value)).id,
        watch: (path, cb) => F.onSnapshot(F.doc(db, path), (snap) => cb(snap.exists() ? snap.data() : null), () => cb(null)),
        watchAll: (collection, cb) => F.onSnapshot(F.collection(db, collection), (q) => cb(q.docs.map((d) => Object.assign({ id: d.id }, d.data()))), () => cb([])),
        // A callable Cloud Function (the Stripe extension's customer portal link), without the Functions SDK.
        call: async (name, payload, region) => {
          const token = await auth.currentUser.getIdToken();
          const r = await fetch(`https://${region || 'us-central1'}-${config.projectId}.cloudfunctions.net/${name}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ data: payload || {} }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || j.error) throw new Error((j.error && j.error.message) || `Request failed (${r.status})`);
          return j.result;
        },
      },
    };
  }

  // Friendly words for the backend's error codes.
  const ERRORS = {
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/missing-password': 'Type your password.',
    'auth/user-not-found': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/email-already-in-use': 'There’s already an account with that email. Sign in instead.',
    'auth/weak-password': 'Pick a password of at least 6 characters.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
    'auth/cancelled-popup-request': 'Google sign-in was closed before it finished.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
    'auth/unauthorized-domain': 'Google sign-in isn’t allowed on this address yet. Add it under Authentication → Settings → Authorized domains in Firebase.',
    'auth/operation-not-allowed': 'This sign-in method is switched off. Turn it on under Authentication → Sign-in method in Firebase.',
    'auth/network-request-failed': 'No connection. Check your internet and try again.',
    'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
  };
  const friendly = (err) => ERRORS[err && err.code] || (err && err.message) || 'Something went wrong. Try again.';

  /**
   * Account state and sync. init() with the app's storage hooks:
   *   read() → { entries, deleted, known }, write(saves), onChange(state)
   */
  function createAccount() {
    let adapter = null;
    let hooks = null;
    let user = null;
    let status = 'off'; // off | loading | signed-out | signed-in
    let lastSync = 0;
    let syncError = '';
    let timer = null;
    let unsubscribe = null;

    const state = () => ({ status, user, lastSync, syncError, available: Boolean(adapter) || status === 'loading' });
    const emit = () => hooks && hooks.onChange && hooks.onChange(state());

    async function sync() {
      if (!adapter || !user) return false;
      clearTimeout(timer);
      try {
        const cloud = fromDoc(await adapter.load(user.uid));
        const local = hooks.read();
        const merged = mergeSaves(local, cloud);
        const doc = toDoc(merged);
        if (doc.challenges.length > MAX_DOC) throw new Error('Your saves are too big to sync (over about 1 MB). Delete a few old challenges and try again.');
        // Only touch the page when another device changed something.
        const same = JSON.stringify(merged) === JSON.stringify({ entries: local.entries, deleted: local.deleted || {}, known: local.known || [] });
        if (!same) hooks.write(merged);
        await adapter.save(user.uid, doc);
        lastSync = Date.now();
        syncError = '';
      } catch (err) {
        syncError = friendly(err);
      }
      emit();
      return !syncError;
    }

    function attach(next) {
      if (unsubscribe) unsubscribe();
      adapter = next;
      user = null;
      status = adapter ? 'signed-out' : 'off';
      unsubscribe = adapter ? adapter.onUser((u) => {
        user = u || null;
        status = user ? 'signed-in' : 'signed-out';
        emit();
        if (user) sync();
      }) : null;
      emit();
    }

    async function run(fn) {
      if (!adapter) return { error: 'Accounts aren’t switched on for this copy of the app.' };
      try {
        await fn();
        return { ok: true };
      } catch (err) {
        return { error: friendly(err) };
      }
    }

    return {
      mergeSaves,
      stampChanges,
      toDoc,
      fromDoc,
      state,
      /** Start up: connect the configured backend (if any). */
      init(h) {
        hooks = h;
        const config = FC26.config && FC26.config.firebase;
        if (!config || !config.apiKey) { attach(null); return; }
        status = 'loading';
        emit();
        firebaseAdapter(config).then(attach).catch(() => {
          status = 'off';
          syncError = 'Couldn’t reach the sign-in service. Check your connection.';
          emit();
        });
      },
      /** Swap in another backend (also used by the browser tests). */
      useAdapter: attach,
      /** Document access for the signed-in user (profiles, following, Pro), or null. */
      data: () => (adapter && user && adapter.data) || null,
      signIn: (email, pw) => run(() => adapter.signIn(email, pw)),
      signUp: (email, pw) => run(() => adapter.signUp(email, pw)),
      reset: (email) => run(() => adapter.reset(email)),
      google: () => run(() => adapter.google()),
      signOut: () => run(() => adapter.signOut()),
      sync,
      /** Call after every local save: pushes to the cloud shortly after (debounced). */
      changed() {
        if (!adapter || !user) return;
        clearTimeout(timer);
        timer = setTimeout(sync, 1500);
      },
    };
  }

  FC26.account = createAccount();
})(typeof window !== 'undefined' ? window : globalThis);
