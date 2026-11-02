// Standalone app layer: connects the trip planner to Firebase (sign-in + shared, offline-capable data).
import { firebaseConfig } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
const provide = window.__provide;
let F, A, fs, auth, accessRef;

/* ---------- sign-in gate ---------- */
const gate = document.createElement('div');
gate.id = 'gate';
document.body.appendChild(gate);
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shell = inner => {
  gate.hidden = false;
  gate.innerHTML = `<div class="gate-card"><div class="gate-top"><span class="eyebrow" style="color:#F6C977">Trip planner</span><h1>Bangkok<i>.</i></h1><div class="thai">กรุงเทพมหานคร</div></div><div class="gate-body">${inner}</div></div>`;
};
const hideGate = () => { gate.hidden = true; gate.innerHTML = ''; };
const msg = (t, bad) => { const m = gate.querySelector('#gmsg'); if (m) { m.textContent = t; m.className = 'small ' + (bad ? 'neg' : 'muted'); } };
const errText = e => ({
  'auth/invalid-credential': 'That email and password don’t match.',
  'auth/wrong-password': 'That email and password don’t match.',
  'auth/user-not-found': 'No account with that email yet. Tap “Create account”.',
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/network-request-failed': 'You’re offline. Connect to the internet to sign in the first time.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/too-many-requests': 'Too many tries. Wait a minute and try again.'
}[e && e.code] || 'Something went wrong. Please try again.');

function showSignIn() {
  shell(`<p class="muted" style="margin:0 0 16px">Sign in to open the trip. Only people the trip owner has added can get in.</p>
    <button class="btn block" id="gGoogle" style="background:#fff;color:#1E1B2E;border:1.5px solid #EDE4D5"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg> Continue with Google</button>
    <div class="gate-or"><span>or use email</span></div>
    <form id="gForm" class="f">
      <label class="fld"><span>Email</span><input name="email" type="email" autocomplete="email" required></label>
      <label class="fld"><span>Password</span><input name="password" type="password" autocomplete="current-password" minlength="6" required></label>
      <div class="factions"><button type="button" class="btn ghost" id="gNew">Create account</button><button class="btn gold">Sign in</button></div>
      <button type="button" class="link small" id="gForgot" style="margin-top:4px">Forgot password?</button>
      <div id="gmsg" class="small muted"></div>
    </form>`);
  gate.querySelector('#gGoogle').onclick = async () => {
    const p = new A.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await A.signInWithPopup(auth, p); }
    catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') { try { await A.signInWithRedirect(auth, p); } catch (e2) { msg(errText(e2), 1); } }
      else msg(errText(e), 1);
    }
  };
  const f = gate.querySelector('#gForm');
  f.onsubmit = async e => { e.preventDefault(); msg('Signing in…'); try { await A.signInWithEmailAndPassword(auth, f.email.value.trim(), f.password.value); } catch (er) { msg(errText(er), 1); } };
  gate.querySelector('#gNew').onclick = async () => {
    if (!f.reportValidity()) return; msg('Creating your account…');
    try { const c = await A.createUserWithEmailAndPassword(auth, f.email.value.trim(), f.password.value); await A.sendEmailVerification(c.user); } catch (er) { msg(errText(er), 1); }
  };
  gate.querySelector('#gForgot').onclick = async () => {
    const em = f.email.value.trim(); if (!em) { msg('Type your email first, then tap “Forgot password?”', 1); return; }
    try { await A.sendPasswordResetEmail(auth, em); msg('Password reset email sent. Check your inbox.'); } catch (er) { msg(errText(er), 1); }
  };
}
function showVerify(user) {
  shell(`<h3 style="font-size:22px">Check your email</h3><p class="muted">We sent a verification link to <b style="color:#1E1B2E">${h(user.email)}</b>. Tap it, then come back here.</p>
    <div class="factions"><button class="btn ghost" id="gResend">Send again</button><button class="btn gold" id="gDone">I’ve verified</button></div>
    <button class="link small" id="gOut" style="margin-top:10px">Use a different account</button><div id="gmsg" class="small muted"></div>`);
  gate.querySelector('#gResend').onclick = async () => { try { await A.sendEmailVerification(user); msg('Sent. Check your inbox (and spam).'); } catch (e) { msg(errText(e), 1); } };
  gate.querySelector('#gDone').onclick = async () => { await user.reload(); if (auth.currentUser.emailVerified) { await auth.currentUser.getIdToken(true); afterSignIn(auth.currentUser); } else msg('Not verified yet. Tap the link in the email first.', 1); };
  gate.querySelector('#gOut').onclick = () => A.signOut(auth);
}
function showDenied(user) {
  shell(`<h3 style="font-size:22px">Almost there</h3><p class="muted"><b style="color:#1E1B2E">${h(user.email)}</b> isn’t on this trip’s list yet. Ask the trip owner to add you (Settings → Who can open the app), then tap Try again.</p>
    <div class="factions"><button class="btn ghost" id="gOut">Use a different account</button><button class="btn gold" id="gRetry">Try again</button></div>`);
  gate.querySelector('#gOut').onclick = () => A.signOut(auth);
  gate.querySelector('#gRetry').onclick = () => afterSignIn(auth.currentUser);
}
function showSetup() {
  shell(`<h3 style="font-size:22px">Almost ready</h3><p class="muted">This app hasn’t been connected to its Firebase project yet. Add the project’s settings to <code>firebase-config.js</code>.</p>`);
}
function showOffline() {
  shell(`<h3 style="font-size:22px">You’re offline</h3><p class="muted">Open the app once with an internet connection to sign in. After that it works offline.</p><div class="factions"><button class="btn gold" onclick="location.reload()">Try again</button></div>`);
}

/* ---------- data adapter (same shape the app already uses) ---------- */
const mapErr = e => ({ code: e && e.code === 'permission-denied' ? 'invalid_argument' : e && e.code === 'resource-exhausted' ? 'quota_exceeded' : 'unavailable', message: String(e && e.message || e) });
const wrapDoc = r => ({
  id: r.id, path: r.path,
  set: d => F.setDoc(r, d).catch(e => { throw mapErr(e); }),
  delete: () => F.deleteDoc(r).catch(e => { throw mapErr(e); }),
  get: async () => { const s = await F.getDoc(r); return { id: s.id, exists: s.exists(), data: () => s.data(), metadata: s.metadata }; },
  onSnapshot: (next, err) => F.onSnapshot(r, { includeMetadataChanges: true },
    s => next({ id: s.id, exists: s.exists(), data: () => s.data(), metadata: s.metadata }),
    e => err && err(e.code === 'permission-denied' ? { code: 'revoked' } : mapErr(e)))
});
const db = {
  doc: p => { const [c, i] = p.split('/'); return wrapDoc(F.doc(fs, c, i)); },
  collection: c => ({
    path: c,
    doc: id => wrapDoc(F.doc(fs, c, id || Math.random().toString(36).slice(2, 12))),
    onSnapshot: (next, err) => F.onSnapshot(F.collection(fs, c), { includeMetadataChanges: true },
      q => next({ docs: q.docs.map(d => ({ id: d.id, exists: true, data: () => d.data(), metadata: d.metadata })), size: q.size, empty: q.empty, metadata: q.metadata }),
      e => err && err(e.code === 'permission-denied' ? { code: 'revoked' } : mapErr(e)))
  })
};

/* ---------- saving images (wallpapers) ---------- */
const downloads = {
  async save({ filename, data }) {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const type = blob.type || (/\.png$/i.test(filename) ? 'image/png' : 'application/octet-stream');
    const file = new File([blob], filename, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return { status: 'saved' }; }
      catch (e) { if (e && e.name === 'AbortError') throw { code: 'declined' }; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
    return { status: 'saved' };
  }
};

/* ---------- access list (owner only) ---------- */
let access = { owner: '', emails: [] };
window.__openAccess = () => {
  const esc = h;
  window.openSheet(`<div class="shead"><h3>Who can open the app</h3><button class="ibtn" data-close>✕</button></div>
    <p class="muted" style="margin:-4px 0 12px">People sign in with Google, or with email and a password, using one of these addresses.</p>
    <div id="accList" class="card"></div>
    <form id="accAdd" class="f" style="margin-top:12px"><label class="fld"><span>Add someone</span><input name="em" type="email" placeholder="name@example.com" required></label><div class="factions"><button class="btn gold">Add</button></div></form>`, sh => {
    sh.querySelector('[data-close]').onclick = () => window.closeSheet();
    const draw = () => {
      sh.querySelector('#accList').innerHTML = access.emails.map(e => `<div class="row" style="padding:10px 14px;border-bottom:1px solid #EDE4D5"><span class="grow">${esc(e)}${e === access.owner ? ' <span class="pill" style="font-size:11px">Owner</span>' : ''}</span>${e === access.owner ? '' : `<button class="link small" style="color:#C8423A" data-rm="${esc(e)}">Remove</button>`}</div>`).join('') || '<div class="empty small">Nobody yet</div>';
    };
    const save = async () => { try { await F.setDoc(accessRef, access); window.toast('Saved'); } catch (e) { window.toast('Couldn’t save. Are you online?'); } };
    sh.querySelector('#accList').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; access.emails = access.emails.filter(x => x !== b.dataset.rm); draw(); save(); });
    sh.querySelector('#accAdd').onsubmit = e => { e.preventDefault(); const v = e.target.em.value.trim().toLowerCase(); if (v && !access.emails.includes(v)) { access.emails.push(v); draw(); save(); } e.target.reset(); };
    draw();
  });
};
window.__signOut = async () => { await A.signOut(auth); location.reload(); };

/* ---------- one-time import of an exported trip ---------- */
window.__importTrip = async file => {
  let data; try { data = JSON.parse(await file.text()); } catch { window.toast('That file isn’t a trip export'); return; }
  const cols = Object.keys(data).filter(k => Array.isArray(data[k]));
  const total = cols.reduce((s, k) => s + data[k].length, 0) + (data.trip ? 1 : 0);
  window.openSheet(`<div class="shead"><h3>Import trip data</h3><button class="ibtn" data-close>✕</button></div>
    <p class="muted">This adds ${total} items (${cols.map(k => data[k].length + ' ' + k).join(', ')}${data.trip ? ', trip settings' : ''}). Items with the same ID are replaced.</p>
    <div class="factions"><button class="btn ghost" data-close2>Cancel</button><button class="btn gold" id="impGo">Import</button></div>`, sh => {
    sh.querySelector('[data-close]').onclick = sh.querySelector('[data-close2]').onclick = () => window.closeSheet();
    sh.querySelector('#impGo').onclick = async () => {
      window.closeSheet(); window.toast('Importing…');
      const ops = [];
      if (data.trip) ops.push([F.doc(fs, 'trip', 'main'), data.trip]);
      for (const k of cols) for (const it of data[k]) { const { id, ...rest } = it; if (id) ops.push([F.doc(fs, k, String(id)), rest]); }
      try {
        for (let i = 0; i < ops.length; i += 400) { const b = F.writeBatch(fs); ops.slice(i, i + 400).forEach(([r, d]) => b.set(r, JSON.parse(JSON.stringify(d)))); await b.commit(); }
        window.toast(`Imported ${ops.length} items`);
      } catch (e) { window.toast('Import failed: ' + (e.code || e.message)); }
    };
  });
};

/* ---------- boot ---------- */
async function afterSignIn(user) {
  window.__user = { email: user.email };
  const em = String(user.email || '').toLowerCase();
  accessRef = F.doc(fs, 'config', 'access');
  let snap = null;
  try { snap = await F.getDoc(accessRef); }
  catch (e) {
    if (e.code === 'permission-denied') { showDenied(user); return; }
    try { snap = await F.getDocFromCache(accessRef); } catch { snap = null; }
  }
  if (snap && !snap.exists()) {
    // First sign-in by the owner creates the access list. The security rules only let the owner do this.
    access = { owner: em, emails: [em] };
    try { await F.setDoc(accessRef, access); } catch (e) { showDenied(user); return; }
  } else if (snap) access = { owner: '', emails: [], ...snap.data() };
  window.__isOwner = access.owner === em;
  hideGate();
  provide('db', db); provide('assets', null); provide('sample', null); provide('downloads', downloads); provide('user', null);
}

async function boot() {
  if (!firebaseConfig || /PASTE_ME/.test(firebaseConfig.apiKey || 'PASTE_ME')) { showSetup(); return; }
  let app;
  try {
    const [FA, AA, FF] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
    A = AA; F = FF;
    app = FA.initializeApp(firebaseConfig);
  } catch (e) { showOffline(); return; }
  try { fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
  catch { fs = F.getFirestore(app); }
  auth = A.getAuth(app);
  A.getRedirectResult(auth).catch(() => {});
  A.onAuthStateChanged(auth, user => {
    if (!user) { showSignIn(); return; }
    if (!user.emailVerified) { showVerify(user); return; }
    afterSignIn(user);
  });
}
boot();

/* ---------- offline install + update notice ---------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing; if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) {
          const b = document.createElement('div'); b.className = 'upd';
          b.innerHTML = 'A new version of the app is ready. <button class="btn sm gold">Refresh</button>';
          b.querySelector('button').onclick = () => location.reload();
          document.body.appendChild(b);
        }
      });
    });
  }).catch(() => {});
}
