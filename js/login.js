/*
 * The sign-in screen and the account button in the top bar. Opens by itself
 * on a first visit when accounts are switched on; "Continue without an
 * account" keeps everything on the device, as before.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const GUEST_KEY = 'fc26-guest-v1';
  const SIGNED_KEY = 'fc26-signed-in-before-v1';

  const GOOGLE_G = '<svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  function init(deps) {
    const { esc, toast, storageGet, storageSet } = deps;
    const Account = FC26.account;
    const $ = (sel, el) => (el || document).querySelector(sel);
    const modal = $('#login');
    const btn = $('#account-btn');
    let mode = 'signin'; // signin | signup
    let busy = false;
    let promptedOnce = false;

    const initials = (u) => ((u.name || u.email || '?').trim().split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
    const ago = (t) => {
      if (!t) return 'not yet';
      const s = Math.round((Date.now() - t) / 1000);
      return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(t).toLocaleString();
    };

    function renderButton(st) {
      if (st.status === 'signed-in') {
        btn.innerHTML = `<span class="avatar">${esc(initials(st.user))}</span><span class="account-label">${st.syncError ? '⚠️ ' : ''}Account</span>`;
        btn.title = `Signed in as ${st.user.email || st.user.name}${st.syncError ? ` · ${st.syncError}` : ''}`;
      } else {
        btn.innerHTML = '<span aria-hidden="true">👤</span><span class="account-label">Sign in</span>';
        btn.title = 'Sign in to sync your challenges across devices';
      }
    }

    function render() {
      const st = Account.state();
      const card = $('.login-card', modal);
      if (st.status === 'signed-in') {
        const u = st.user;
        card.innerHTML = `
          <button type="button" class="icon-btn login-close" data-login="close" aria-label="Close">✕</button>
          <div class="login-avatar">${u.photo ? `<img src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">` : esc(initials(u))}</div>
          <h2 id="login-title">${esc(u.name || 'Your account')}</h2>
          <p class="muted">${esc(u.email)}${u.google ? ' · Google' : ''}</p>
          <p class="login-sync ${st.syncError ? 'neg' : ''}">${st.syncError ? `⚠️ ${esc(st.syncError)}` : st.lastSync ? `☁️ Challenges synced ${esc(ago(st.lastSync))}` : '☁️ Not synced yet'}</p>
          <div class="login-actions">
            <button type="button" class="btn" data-login="sync">🔄 Sync now</button>
            <button type="button" class="btn" data-login="signout">Sign out</button>
          </div>
          <div class="login-settings">
            <h3>⚙️ Settings</h3>
            <label class="toggle"><input type="checkbox" name="autosync" ${Account.autoSync() ? 'checked' : ''}>
              <span>Auto sync <small class="muted">${Account.autoSync() ? 'keeps your challenges up to date on every device' : 'off: press Sync now when you want to sync'}</small></span></label>
          </div>
          <p class="muted small">Your saved challenges, trackers, diaries and the players you've marked as real follow you to any device you sign in on.</p>`;
        return;
      }
      const off = st.status === 'off';
      const loading = st.status === 'loading';
      card.innerHTML = `
        <button type="button" class="icon-btn login-close" data-login="close" aria-label="Close">✕</button>
        <div class="brand-mark">FC26</div>
        <h2 id="login-title">${mode === 'signup' ? 'Create your account' : 'Welcome back, gaffer'}</h2>
        <p class="muted">Sign in to keep your challenges, trackers and diaries in sync across your devices.</p>
        ${off ? `<p class="login-note">Accounts aren't switched on for this copy of the app yet: whoever hosts it needs to add a Firebase project (see "Accounts and Spotify" in the README). ${esc(st.syncError || '')} Until then, everything is saved on this device.</p>` : ''}
        <button type="button" class="btn btn-google" data-login="google" ${off || loading ? 'disabled' : ''}>${GOOGLE_G}<span>Continue with Google</span></button>
        <div class="login-or"><span>or use your email</span></div>
        <form class="login-form" novalidate>
          <div class="segmented login-mode">
            <label><input type="radio" name="mode" value="signin" ${mode === 'signin' ? 'checked' : ''}><span>Sign in</span></label>
            <label><input type="radio" name="mode" value="signup" ${mode === 'signup' ? 'checked' : ''}><span>Create account</span></label>
          </div>
          <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required maxlength="120" ${off ? 'disabled' : ''}></label>
          <label class="field"><span>Password${mode === 'signup' ? ' <small>(6+ characters)</small>' : ''}</span>
            <span class="pw-wrap"><input type="password" name="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" required minlength="6" maxlength="128" ${off ? 'disabled' : ''}>
            <button type="button" class="pw-toggle" data-login="toggle-pw" aria-label="Show password" ${off ? 'disabled' : ''}>👁️</button></span></label>
          <p class="login-error" role="alert" hidden></p>
          <button type="submit" class="btn btn-primary btn-big" ${off || loading ? 'disabled' : ''}>${loading ? 'Connecting…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
          ${mode === 'signin' ? `<button type="button" class="login-link" data-login="reset" ${off ? 'disabled' : ''}>Forgot your password?</button>` : ''}
        </form>
        <button type="button" class="login-link login-guest" data-login="guest">Continue without an account →</button>`;
    }

    function showError(text, good) {
      const el = $('.login-error', modal);
      if (!el) return;
      el.hidden = !text;
      el.textContent = text || '';
      el.classList.toggle('ok', Boolean(good));
    }

    function open() {
      render();
      modal.hidden = false;
      document.body.classList.add('modal-open');
      const first = $('input[name=email]:not([disabled])', modal) || $('[data-login]', modal);
      if (first) first.focus();
    }

    function close() {
      modal.hidden = true;
      document.body.classList.remove('modal-open');
      btn.focus();
    }

    async function act(fn, done) {
      if (busy) return;
      busy = true;
      modal.classList.add('is-busy');
      const res = await fn();
      busy = false;
      modal.classList.remove('is-busy');
      if (res.error) showError(res.error);
      else if (done) done();
    }

    btn.addEventListener('click', open);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) return close();
      const el = e.target.closest('[data-login]');
      if (!el || el.disabled) return undefined;
      const form = $('.login-form', modal);
      const email = form ? form.elements.email.value.trim() : '';
      switch (el.dataset.login) {
        case 'close': return close();
        case 'guest':
          storageSet(GUEST_KEY, true);
          close();
          return toast('No problem: your challenges stay on this device');
        case 'google': return act(() => FC26.account.google());
        case 'toggle-pw': {
          const pw = form.elements.password;
          pw.type = pw.type === 'password' ? 'text' : 'password';
          el.setAttribute('aria-label', pw.type === 'password' ? 'Show password' : 'Hide password');
          return undefined;
        }
        case 'reset':
          if (!/^\S+@\S+\.\S+$/.test(email)) return showError('Type your email above first, then press "Forgot your password?" again.');
          return act(() => FC26.account.reset(email), () => showError(`Check ${email} for a link to reset your password.`, true));
        case 'sync': return act(async () => ((await FC26.account.sync()) ? { ok: true } : { error: Account.state().syncError }), () => toast('Synced ☁️'));
        case 'signout': return act(() => FC26.account.signOut(), () => { close(); toast('Signed out. Your challenges stay on this device.'); });
        default: return undefined;
      }
    });
    modal.addEventListener('change', (e) => {
      if (e.target.name === 'autosync') {
        FC26.account.setAutoSync(e.target.checked);
        render();
        toast(e.target.checked ? 'Auto sync on ☁️' : 'Auto sync off: use Sync now to sync');
        return;
      }
      if (e.target.name !== 'mode') return;
      const form = $('.login-form', modal);
      const keep = { email: form.elements.email.value };
      mode = e.target.value;
      render();
      $('.login-form', modal).elements.email.value = keep.email;
    });
    modal.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const email = form.elements.email.value.trim();
      const pw = form.elements.password.value;
      if (!/^\S+@\S+\.\S+$/.test(email)) return showError('That email address doesn’t look right.');
      if (pw.length < 6) return showError(mode === 'signup' ? 'Pick a password of at least 6 characters.' : 'Type your password.');
      return act(() => (mode === 'signup' ? FC26.account.signUp(email, pw) : FC26.account.signIn(email, pw)));
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

    // Called by the app whenever the account state changes.
    return function onAccountChange(st) {
      renderButton(st);
      const wasOpen = !modal.hidden;
      if (wasOpen) {
        const welcome = st.status === 'signed-in' && !$('.login-avatar', modal);
        render();
        if (welcome) toast(`Signed in as ${st.user.email || st.user.name} ☁️`);
      }
      // Remember that this device has signed in: never pop the sign-in offer up for a returning user.
      if (st.status === 'signed-in') storageSet(SIGNED_KEY, true);
      // First visit with accounts switched on: offer to sign in once.
      if (st.status === 'signed-out' && !promptedOnce && !storageGet(GUEST_KEY, false) && !storageGet(SIGNED_KEY, false)) {
        promptedOnce = true;
        open();
      }
    };
  }

  FC26.login = { init };
})(typeof window !== 'undefined' ? window : globalThis);
