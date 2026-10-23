/*
 * Settings for the optional online features. Both are off until filled in,
 * and the app works fully without them (everything is saved on the device).
 * See "Accounts and Spotify" in the README for the setup steps.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  // Values already set before this file loads (by a host page or the tests) win.
  FC26.config = Object.assign({
    // Accounts (email/password and Google sign-in, with challenges synced
    // between devices) run on Firebase. Paste your web app's config here:
    // { apiKey: '...', authDomain: '....firebaseapp.com', projectId: '...', appId: '...' }
    firebase: null,
    // Spotify soundtracks: the Client ID of your app on developer.spotify.com.
    spotifyClientId: '',
  }, FC26.config);
})(typeof window !== 'undefined' ? window : globalThis);
