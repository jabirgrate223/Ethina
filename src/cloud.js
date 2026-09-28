import { createClient } from '@supabase/supabase-js';

const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => '৳' + Number(n || 0).toLocaleString('en-BD');
const STATUSES = ['SUBMITTED', 'IN_REVIEW', 'DOCUMENTS_NEEDED', 'APPROVED', 'DECLINED', 'FUNDED'];
let user = null, profile = null, tab = 'owner', mode = 'login', kind = 'user', pendingApply = false;

document.head.insertAdjacentHTML('beforeend', `<style>
.qc-modal{position:fixed;inset:0;background:#000a;display:none;align-items:center;justify-content:center;z-index:99;padding:16px}
.qc-modal.show{display:flex}
.qc-card{background:#141414;border:1px solid #333;border-radius:20px;padding:24px;width:100%;max-width:380px;display:grid;gap:12px;color:#fff}
.qc-card input,.qc-card select,.qc-status{background:#0c0c0c;border:1px solid #333;border-radius:12px;padding:12px;color:#fff;font:inherit}
.qc-link{background:none;border:0;color:#aaa;cursor:pointer;font:inherit}
#qc-msg{color:#c6f24e;font-size:14px;margin:0;min-height:1em}
</style>`);
document.body.insertAdjacentHTML('beforeend', `<div class="qc-modal" id="qc-modal"><form class="qc-card" id="qc-auth">
<h3 id="qc-title">Log in</h3>
<input id="qc-name" placeholder="Full name" autocomplete="name">
<input id="qc-email" type="email" placeholder="Email" required autocomplete="email">
<input id="qc-pass" type="password" placeholder="Password (min 8 characters)" required minlength="8" autocomplete="current-password">
<p id="qc-msg" role="status"></p>
<button class="button primary" type="submit" id="qc-submit">Log in</button>
<button type="button" class="qc-link" id="qc-switch">New here? Create account</button>
<button type="button" class="qc-link" id="qc-close">Close</button></form></div>`);

document.querySelector('.top-actions')?.insertAdjacentHTML('beforeend', '<div class="qc-menu" id="qc-menu" hidden><button type="button" data-qc-open="user">User login</button><button type="button" data-qc-open="admin">Admin login</button></div>');
const msg = (t) => ($('#qc-msg').textContent = t || '');
const openModal = (k = 'user', text = '') => { kind = k; setMode('login'); msg(text); $('#qc-modal').classList.add('show'); };
const goToForm = () => $('#questionnaire')?.scrollIntoView({ behavior: 'smooth' });
const menu = () => $('#qc-menu');
const closeModal = () => $('#qc-modal').classList.remove('show');
function setMode(m) {
  mode = m;
  $('#qc-title').textContent = kind === 'admin' ? 'Admin log in' : m === 'login' ? 'Log in' : 'Create account';
  $('#qc-switch').style.display = kind === 'admin' ? 'none' : '';
  $('#qc-submit').textContent = m === 'login' ? 'Log in' : 'Sign up';
  $('#qc-switch').textContent = m === 'login' ? 'New here? Create account' : 'Have an account? Log in';
  $('#qc-name').style.display = m === 'login' ? 'none' : '';
  $('#qc-pass').autocomplete = m === 'login' ? 'current-password' : 'new-password';
}
setMode('login');
$('#qc-switch').onclick = () => setMode(mode === 'login' ? 'signup' : 'login');
$('#qc-close').onclick = closeModal;

$('#qc-auth').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#qc-email').value.trim(), password = $('#qc-pass').value;
  msg('Please wait…');
  const { data, error } = mode === 'login'
    ? await sb.auth.signInWithPassword({ email, password })
    : await sb.auth.signUp({ email, password, options: { data: { full_name: $('#qc-name').value.trim() } } });
  if (error) return msg(error.message);
  if (mode === 'signup' && !data.session) return msg('Check your email to confirm, then log in.');
  if (kind === 'admin') {
    const { data: p } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
    if (!['FUNDING_OFFICER', 'SUPER_ADMIN'].includes(p?.role)) { await sb.auth.signOut(); return msg('This account is not an admin account.'); }
  }
  closeModal();
});

async function refresh() {
  const { data } = await sb.auth.getSession();
  user = data.session?.user ?? null;
  profile = user ? (await sb.from('profiles').select('full_name,role').eq('id', user.id).single()).data : null;
  const name = profile?.full_name || user?.email || 'Log in';
  const initials = user ? name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '';
  const pill = $('.profile-pill');
  if (pill) { pill.children[0].textContent = initials; pill.children[1].textContent = name; }
  const staff = ['FUNDING_OFFICER', 'SUPER_ADMIN'].includes(profile?.role);
  const pt = $('.portal-tab');
  if (pt) pt.firstChild.textContent = (staff ? 'Admin' : 'Business owner') + ' ';
  if (user && pendingApply) { pendingApply = false; goToForm(); }
  renderPanel();
}
sb.auth.onAuthStateChange(() => refresh());

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
  const t = e.target.closest('.portal-tab');
  if (t) {
    e.stopPropagation();
    document.querySelectorAll('.portal-tab').forEach((x) => x.classList.remove('active'));
    t.classList.add('active'); tab = t.dataset.portal; renderPanel();
  }
}, true);

document.addEventListener('change', async (e) => {
  const s = e.target.closest('.qc-status');
  if (!s) return;
  const { error } = await sb.from('applications').update({ status: s.value }).eq('id', s.dataset.id);
  if (error) alert(error.message);
});

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'questionnaire-form') return;
  e.preventDefault(); e.stopPropagation();
  if (!user) return openModal('user', 'Log in with your email, then press submit again.');
  const f = new FormData(e.target);
  const { error } = await sb.from('applications').insert({
    loan_type: f.get('loanType'), foundation_year: +f.get('foundationYear'), loan_amount: +f.get('loanAmount'),
    monthly_gross: +f.get('monthlyGross'), credit_score: f.get('creditScore'),
    past_defaults: f.get('defaults'), outstanding_loans: f.get('loans'),
  });
  if (error) return alert(error.message);
  $('#questionnaire-success').classList.add('show');
  e.target.querySelector('button').textContent = 'Application submitted ✓';
  renderPanel();
}, true);

const gate = (text, btn = true) => `<div class="portal-top"><div><h3>${esc(text)}</h3></div>${btn ? '<button class="button primary" data-qc-login>Log in / Sign up <span>↗</span></button>' : ''}</div>`;

async function renderPanel() {
  const p = $('#portal-panel');
  if (!p) return;
  if (!user) return (p.innerHTML = gate('Log in to see your applications.'));
  const own = !['FUNDING_OFFICER', 'SUPER_ADMIN'].includes(profile?.role);
  let q = sb.from('applications').select('*, profiles(full_name)').order('created_at', { ascending: false });
  if (own) q = q.eq('user_id', user.id);
  const { data, error } = await q;
  if (error) return (p.innerHTML = gate(error.message, false));
  const rows = data || [];
  const total = rows.reduce((a, r) => a + Number(r.loan_amount), 0);
  const head = profile?.role === 'SUPER_ADMIN' ? `<div class="admin-grid"><div><span>APPLICATIONS</span><strong>${rows.length}</strong></div><div><span>TOTAL REQUESTED</span><strong>${fmt(total)}</strong></div></div>` : '';
  const list = rows.map((r) => `<div class="table-row"><strong>${esc(own ? new Date(r.created_at).toLocaleDateString() : r.profiles?.full_name || 'Applicant')}</strong><span>${fmt(r.loan_amount)}</span>${own ? `<em class="tag blue">${esc(r.status.replace('_', ' '))}</em>` : `<select class="qc-status" data-id="${r.id}">${STATUSES.map((s) => `<option${s === r.status ? ' selected' : ''}>${s}</option>`).join('')}</select>`}</div>`).join('');
  p.innerHTML = `<div class="portal-top"><div><h3>${own ? 'Your applications' : 'All applications'}</h3></div></div>${head}<div class="table-card">${list || '<p>No applications yet. Fill in the eligibility form above.</p>'}</div>`;
}

refresh();
