import { createClient } from '@supabase/supabase-js';

const SB_URL = import.meta.env.VITE_SUPABASE_URL, SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sb = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY) : null;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => '৳' + Number(n || 0).toLocaleString('en-BD');
const STAFF = ['FUNDING_OFFICER', 'SUPER_ADMIN'];
const STATUS = { SUBMITTED: 'Submitted', IN_REVIEW: 'In review', DOCUMENTS_NEEDED: 'Documents needed', APPROVED: 'Approved', DECLINED: 'Declined', FUNDED: 'Funded' };
const TONE = { SUBMITTED: 'blue', IN_REVIEW: 'amber', DOCUMENTS_NEEDED: 'amber', APPROVED: 'green-tag', DECLINED: 'red', FUNDED: 'green-tag' };
let user = null, profile = null, mode = 'login', kind = 'user', pendingApply = false, filter = 'ALL', rows = [];
const isStaff = () => STAFF.includes(profile?.role);

document.head.insertAdjacentHTML('beforeend', `<style>
.qc-modal{position:fixed;inset:0;background:#000a;display:none;align-items:center;justify-content:center;z-index:99;padding:16px}
.qc-modal.show{display:flex}
.qc-card{background:#141a15;border:1px solid #2f3a30;border-radius:8px;padding:26px;width:100%;max-width:380px;display:grid;gap:12px;color:#fff}
.qc-card h3{margin:0 0 2px;font-size:20px}
.qc-card input,.qc-card select,.qc-status{background:#0c100c;border:1px solid #344035;border-radius:4px;padding:12px;color:#fff;font:inherit;font-size:13px}
.qc-card input:focus{outline:0;border-color:#c5f24a}
.qc-link{background:none;border:0;color:#9aa79a;cursor:pointer;font:inherit;font-size:12px}
#qc-msg{font-size:12px;line-height:1.5;margin:0;min-height:1em}
</style>`);
document.body.insertAdjacentHTML('beforeend', `<div class="qc-modal" id="qc-modal"><form class="qc-card" id="qc-auth">
<h3 id="qc-title">Log in</h3>
<input id="qc-name" placeholder="Full name" autocomplete="name">
<input id="qc-email" type="email" placeholder="Email" required autocomplete="email">
<input id="qc-pass" type="password" placeholder="Password (min 8 characters)" required minlength="8" autocomplete="current-password">
<p id="qc-msg" role="status"></p>
<button class="button primary" type="submit" id="qc-submit">Log in</button>
<button type="button" class="qc-link" id="qc-resend" hidden>Resend verification email</button>
<button type="button" class="qc-link" id="qc-switch">New here? Create account</button>
<button type="button" class="qc-link" id="qc-close">Close</button></form></div>`);
document.querySelector('.top-actions')?.insertAdjacentHTML('beforeend', '<div class="qc-menu" id="qc-menu" hidden><button type="button" data-qc-open="user">User login</button><button type="button" data-qc-open="admin">Admin login</button></div>');

const msg = (t, ok) => { const m = $('#qc-msg'); m.textContent = t || ''; m.style.color = ok ? '#c5f24a' : '#ff9b8a'; };
const closeModal = () => $('#qc-modal').classList.remove('show');
const goToForm = () => $('#questionnaire')?.scrollIntoView({ behavior: 'smooth' });
const menu = () => $('#qc-menu');
function setMode(m) {
  mode = m;
  $('#qc-title').textContent = kind === 'admin' ? 'Admin log in' : m === 'login' ? 'Log in' : 'Create account';
  $('#qc-submit').textContent = m === 'login' ? 'Log in' : 'Sign up';
  $('#qc-switch').textContent = m === 'login' ? 'New here? Create account' : 'Have an account? Log in';
  $('#qc-switch').style.display = kind === 'admin' ? 'none' : '';
  $('#qc-name').style.display = m === 'login' ? 'none' : '';
  $('#qc-pass').autocomplete = m === 'login' ? 'current-password' : 'new-password';
  $('#qc-resend').hidden = true;
}
function openModal(k = 'user', text = '') { kind = k; setMode('login'); msg(text, true); $('#qc-modal').classList.add('show'); }
setMode('login');
$('#qc-switch').onclick = () => { setMode(mode === 'login' ? 'signup' : 'login'); msg(''); };
$('#qc-close').onclick = closeModal;
$('#qc-resend').onclick = async () => {
  const { error } = await sb.auth.resend({ type: 'signup', email: $('#qc-email').value.trim(), options: { emailRedirectTo: location.origin } });
  msg(error ? error.message : 'Verification email sent again. Check your inbox and spam folder.', !error);
};

$('#qc-auth').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!sb) return msg('Login is not available yet. Please contact support.');
  const email = $('#qc-email').value.trim(), password = $('#qc-pass').value;
  $('#qc-resend').hidden = true; msg('Please wait…', true);
  if (mode === 'signup') {
    const name = $('#qc-name').value.trim();
    if (!name) return msg('Enter your full name.');
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: location.origin } });
    if (error) return msg(error.message);
    if (data.user && data.user.identities?.length === 0) return msg('This email is already registered. Please log in.');
    if (!data.session) { $('#qc-resend').hidden = false; return msg('We sent a verification link to ' + email + '. Open it, then log in.', true); }
    return closeModal();
  }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) { $('#qc-resend').hidden = false; return msg('Please verify your email first. Check your inbox and spam folder.'); }
    return msg(error.message);
  }
  if (kind === 'admin') {
    const { data: p } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
    if (!STAFF.includes(p?.role)) { await sb.auth.signOut(); return msg('This account is not an admin account.'); }
  }
  closeModal();
});

async function refresh() {
  if (sb) {
    const { data } = await sb.auth.getSession();
    user = data.session?.user ?? null;
    profile = user ? (await sb.from('profiles').select('full_name,email,role').eq('id', user.id).single()).data : null;
  }
  const name = profile?.full_name || user?.email || 'Log in';
  const pill = $('.profile-pill');
  if (pill) { pill.children[0].textContent = user ? name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : ''; pill.children[1].textContent = name; }
  const pt = $('.portal-tab');
  if (pt) pt.firstChild.textContent = (isStaff() ? 'Admin review' : 'Business owner') + ' ';
  if (user && pendingApply) { pendingApply = false; goToForm(); }
  await renderPanel();
}
sb?.auth.onAuthStateChange(() => setTimeout(refresh, 0));

document.addEventListener('click', async (e) => {
  if (e.target.closest('.profile-pill')) {
    if (!user) menu().hidden = !menu().hidden; else if (confirm('Log out?')) await sb.auth.signOut();
  } else if (!e.target.closest('#qc-menu')) menu().hidden = true;
  const o = e.target.closest('[data-qc-open]');
  if (o) { menu().hidden = true; openModal(o.dataset.qcOpen); }
  if (e.target.closest('[data-qc-login]')) openModal();
  const ap = e.target.closest('[data-apply]');
  if (ap) {
    e.stopPropagation();
    const sel = $('#questionnaire-form [name="loanType"]');
    if (sel) sel.value = ap.dataset.apply;
    if (!user) { pendingApply = true; openModal('user', 'Log in with your email to apply.'); } else goToForm();
  }
  if (e.target.closest('.portal-tab')) e.stopPropagation();
  const save = e.target.closest('.qc-save');
  if (save) {
    const card = save.closest('.rev-card'), out = card.querySelector('.qc-saved');
    save.disabled = true; out.textContent = 'Saving…';
    const { error } = await sb.from('applications').update({ status: card.querySelector('.qc-status').value, decision_notes: card.querySelector('.qc-notes').value.trim() || null, updated_at: new Date().toISOString() }).eq('id', save.dataset.id);
    save.disabled = false;
    if (error) { out.style.color = '#ff9b8a'; out.textContent = error.message; } else { out.style.color = ''; out.textContent = 'Saved ✓'; await loadRows(); }
  }
}, true);

document.addEventListener('change', (e) => { if (e.target.id === 'qc-filter') { filter = e.target.value; renderPanel(false); } });

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'questionnaire-form') return;
  e.preventDefault(); e.stopPropagation();
  if (!sb) return alert('Applications are not available yet. Please contact support.');
  if (!user) return openModal('user', 'Log in with your email, then press submit again.');
  const f = new FormData(e.target), btn = e.target.querySelector('button[type=submit]'), label = btn.innerHTML;
  btn.disabled = true; btn.textContent = 'Submitting…';
  const { error } = await sb.from('applications').insert({
    loan_type: f.get('loanType'), business_name: f.get('businessName').trim(), phone: f.get('phone').trim(),
    foundation_year: +f.get('foundationYear'), loan_amount: +f.get('loanAmount'), monthly_gross: +f.get('monthlyGross'),
    credit_score: f.get('creditScore'), past_defaults: f.get('defaults'), outstanding_loans: f.get('loans'),
  });
  btn.disabled = false; btn.innerHTML = label;
  if (error) return alert('Could not submit: ' + error.message);
  const ok = $('#questionnaire-success');
  ok.innerHTML = '<strong>Application submitted.</strong><span>Our team will review it. Track the status in your portal below.</span>';
  ok.classList.add('show'); e.target.reset();
  await renderPanel(); $('#applications')?.scrollIntoView({ behavior: 'smooth' });
}, true);

const gate = (text, btn = true) => `<div class="portal-top"><div><h3>${esc(text)}</h3></div>${btn ? '<button class="button primary" type="button" data-qc-login>Log in / Sign up <span>↗</span></button>' : ''}</div>`;
async function loadRows() {
  const { data, error } = await sb.from('applications').select('*, profiles(full_name,email)').order('created_at', { ascending: false });
  rows = data || [];
  return error;
}
const dt = (d) => new Date(d).toLocaleDateString('en-GB');

async function renderPanel(reload = true) {
  const p = $('#portal-panel');
  if (!p) return;
  if (!sb) return (p.innerHTML = gate('The applications portal is opening soon.', false));
  if (!user) return (p.innerHTML = gate('Log in to apply and track your applications.'));
  if (reload) { const err = await loadRows(); if (err) return (p.innerHTML = gate(err.message, false)); }
  if (!isStaff()) {
    const list = rows.map((r) => `<div class="table-row"><strong>${dt(r.created_at)}</strong><span>${esc(r.loan_type)}</span><span>${fmt(r.loan_amount)}</span><em class="tag ${TONE[r.status]}">${STATUS[r.status]}</em></div>${r.decision_notes ? `<p class="rev-note">Note from our team: ${esc(r.decision_notes)}</p>` : ''}`).join('');
    return (p.innerHTML = `<div class="portal-top"><div><h3>Your applications</h3><p>Choose a loan above and press Apply now to start a new application.</p></div></div><div class="table-card"><div class="table-head"><span>SUBMITTED</span><span>LOAN</span><span>AMOUNT</span><span>STATUS</span></div>${list || '<p>No applications yet.</p>'}</div>`);
  }
  const shown = filter === 'ALL' ? rows : rows.filter((r) => r.status === filter);
  const waiting = rows.filter((r) => ['SUBMITTED', 'IN_REVIEW'].includes(r.status)).length;
  const total = rows.reduce((a, r) => a + Number(r.loan_amount), 0);
  const opts = (cur) => Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${v}</option>`).join('');
  const card = (r) => `<article class="rev-card"><header><div><strong>${esc(r.business_name)}</strong><small>${esc(r.loan_type)} · ${fmt(r.loan_amount)}</small></div><em class="tag ${TONE[r.status]}">${STATUS[r.status]}</em></header>
<dl>${[['APPLICANT', r.profiles?.full_name], ['EMAIL', r.profiles?.email], ['PHONE', r.phone], ['FOUNDED', r.foundation_year], ['MONTHLY REVENUE', fmt(r.monthly_gross)], ['CREDIT SCORE', r.credit_score], ['DEFAULTS (24 MO)', r.past_defaults], ['OUTSTANDING LOANS', r.outstanding_loans], ['SUBMITTED', dt(r.created_at)]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v || '—')}</dd></div>`).join('')}</dl>
<div class="rev-controls"><select class="qc-status">${opts(r.status)}</select><textarea class="qc-notes" placeholder="Decision notes (the applicant can see these)">${esc(r.decision_notes || '')}</textarea><button class="button primary qc-save" type="button" data-id="${r.id}">Save review</button><span class="qc-saved" role="status"></span></div></article>`;
  p.innerHTML = `<div class="portal-top"><div><h3>Application review</h3><p>Check each application, update its status and leave notes for the applicant.</p></div></div>
<div class="admin-grid"><div><span>APPLICATIONS</span><strong>${rows.length}</strong></div><div><span>AWAITING REVIEW</span><strong>${waiting}</strong></div><div><span>TOTAL REQUESTED</span><strong>${fmt(total)}</strong></div></div>
<div class="rev-toolbar"><span>${shown.length} shown</span><select id="qc-filter"><option value="ALL">All statuses</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${k === filter ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
<div class="rev-list">${shown.map(card).join('') || '<p>No applications match this filter.</p>'}</div>`;
}

refresh();
