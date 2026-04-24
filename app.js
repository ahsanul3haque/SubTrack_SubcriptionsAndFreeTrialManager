/* ================================================================
   SubTrack — app.js (Full Suite + User Registration)
   CSE311L — Group 10 | Section 06 | North South University
   ================================================================ */

const SVC_ICONS = {
  'Netflix':'🎬','Disney+':'🏰','Hulu':'📺','Spotify Premium':'🎵',
  'Apple Music':'🎶','Onshape':'📐','Adobe Creative Cloud':'🎨',
  'Notion':'📝','Google One':'☁️','Dropbox':'📦',
  'Xbox Game Pass':'🎮','Duolingo Super':'🦜',
  'default':'💳'
};

const CAT_ICONS = {
  'Entertainment':'🎭','Music & Audio':'🎵',
  'Productivity & Design':'💼','Cloud Storage':'☁️',
  'Gaming':'🎮','Education':'📚','default':'📂'
};

// ── DATABASE LAYER (MySQL via fetch) ─────────────────────────
const DB = {
  API_URL: 'http://localhost/subtrack/api.php',
  KEYS: { session: 'st_session', cats: 'st_categories' },
  subsCache: [], 

  cats: [],
  svcs: [
    { id:1, name:'Netflix', catId:1 }, { id:2, name:'Disney+', catId:1 },
    { id:3, name:'Hulu', catId:1 }, { id:4, name:'Spotify Premium', catId:2 },
    { id:5, name:'Apple Music', catId:2 }, { id:6, name:'Onshape', catId:3 },
    { id:7, name:'Adobe Creative Cloud', catId:3 }, { id:8, name:'Notion', catId:3 },
    { id:9, name:'Google One', catId:4 }, { id:10, name:'Dropbox', catId:4 },
    { id:11, name:'Xbox Game Pass', catId:5 }, { id:12, name:'Duolingo Super', catId:6 }
  ],

  init() {
    localStorage.removeItem(this.KEYS.cats);
    const initialCats = [
      { id:1, name:'Entertainment' }, { id:2, name:'Music & Audio' },
      { id:3, name:'Productivity & Design' }, { id:4, name:'Cloud Storage' },
      { id:5, name:'Gaming' }, { id:6, name:'Education' }
    ];
    this.cats = initialCats;
  },

  getCategories() { return this.cats; },
  getCategory(id) { return this.cats.find(c => c.id === id); },
  getServices()   { return this.svcs; },
  getService(id)  { return this.svcs.find(s => s.id === id); },
  getServicesByCat(catId) { return this.svcs.filter(s => s.catId === catId); },

  // ── AUTHENTICATION ──────────────────────────────────────────
  async login(email, password) {
    try {
      const res = await fetch(this.API_URL + '?action=login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        const user = { id: parseInt(data.user.UserID), name: data.user.Name, email: data.user.Email };
        localStorage.setItem(this.KEYS.session, JSON.stringify(user));
        return user;
      }
    } catch(e) { console.error("Login Error:", e); }
    return null;
  },

  // NEW: Registration Backend Call
  async register(name, email, password) {
    const res = await fetch(this.API_URL + '?action=register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (data.success) {
      const user = { id: parseInt(data.user.UserID), name: data.user.Name, email: data.user.Email };
      localStorage.setItem(this.KEYS.session, JSON.stringify(user));
      return user;
    } else {
      throw new Error(data.error_message);
    }
  },

  getCurrentUser() { 
    const u = JSON.parse(localStorage.getItem(this.KEYS.session) || 'null'); 
    if (u) u.id = parseInt(u.id); 
    return u;
  },
  
  logout() { localStorage.removeItem(this.KEYS.session); this.subsCache = []; },

  // ── SUBSCRIPTIONS (CRUD + ENGINE) ───────────────────────────
  calculateNextDate(currentDateStr, cycle) {
    let d = new Date(currentDateStr + "T12:00:00"); 
    if (cycle === 'Monthly') d.setMonth(d.getMonth() + 1);
    else if (cycle === 'Yearly') d.setFullYear(d.getFullYear() + 1);
    else if (cycle === '7 Days' || cycle === 'Weekly') d.setDate(d.getDate() + 7);
    else if (cycle === '14 Days') d.setDate(d.getDate() + 14);
    else if (cycle === '30 Days') d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  },

  async fetchSubsFromDB() {
    const user = this.getCurrentUser();
    if (!user) return;
    try {
      const url = this.API_URL + '?action=getSubs&userId=' + user.id + '&_t=' + Date.now();
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      
      const today = new Date();
      today.setHours(0,0,0,0);

      this.subsCache = data.map(s => {
        const svcIdNum = parseInt(s.ServiceID);
        const catIdNum = parseInt(s.CategoryID);
        const subIdNum = parseInt(s.SubscriptionID);
        const isAutoRenew = s.AutoRenew !== undefined ? parseInt(s.AutoRenew) === 1 : true;
        let currentStatus = s.Status;
        
        const billingDate = new Date(s.NextBillingDate + "T00:00:00");
        
        if (billingDate < today && currentStatus === 'Active') {
            if (isAutoRenew) {
                const newDateStr = this.calculateNextDate(s.NextBillingDate, s.BillingCycle);
                fetch(this.API_URL + '?action=renewSub', { 
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ id: subIdNum, newDate: newDateStr }) 
                });
                s.NextBillingDate = newDateStr; 
            } else {
                currentStatus = 'Expired';
                fetch(this.API_URL + '?action=updateSub', { 
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ id: subIdNum, status: 'Expired' }) 
                });
            }
        }
        
        if (catIdNum && !this.cats.find(c => c.id === catIdNum)) {
          this.cats.push({ id: catIdNum, name: s.CategoryName });
        }
        if (!this.svcs.find(x => x.id === svcIdNum)) {
          this.svcs.push({ id: svcIdNum, name: s.ServiceName, catId: catIdNum });
        }

        let cleanCycle = s.BillingCycle;
        if (cleanCycle === 'Weekly') cleanCycle = '7 Days';

        return {
          id: subIdNum, amount: parseFloat(s.BillingAmount), cycle: cleanCycle,
          nextDate: s.NextBillingDate, isTrial: parseInt(s.IsFreeTrial) === 1,
          autoRenew: isAutoRenew, status: currentStatus, 
          svcId: svcIdNum, userId: parseInt(s.UserID) 
        };
      });
    } catch(e) { console.error("Fetch Subs Error:", e); }
  },

  getSubs(userId) { return this.subsCache.filter(s => s.userId === userId); },
  getAllSubs() { return this.subsCache; },

  async createSub(data) {
    const res = await fetch(this.API_URL + '?action=createSub', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!json.success) throw new Error(json.error_message);
    await this.fetchSubsFromDB();
  },

  async editSub(data) {
    const res = await fetch(this.API_URL + '?action=editSub', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!json.success) throw new Error(json.error_message);
    await this.fetchSubsFromDB();
  },

  async updateSub(id, status) {
    const res = await fetch(this.API_URL + '?action=updateSub', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, status: status }) });
    const json = await res.json();
    if (!json.success) throw new Error(json.error_message);
    await this.fetchSubsFromDB();
  },

  async deleteSub(id) {
    const res = await fetch(this.API_URL + '?action=deleteSub', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) });
    const json = await res.json();
    if (!json.success) throw new Error(json.error_message);
    await this.fetchSubsFromDB();
  },

  async renewSub(id, newDateStr) {
    const res = await fetch(this.API_URL + '?action=renewSub', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, newDate: newDateStr }) });
    const json = await res.json();
    if (!json.success) throw new Error(json.error_message);
    await this.fetchSubsFromDB();
  },

  async toggleAutoRenew(id, newState) {
    const res = await fetch(this.API_URL + '?action=toggleAutoRenew', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id: id, autoRenew: newState ? 1 : 0 }) 
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error_message);
    await this.fetchSubsFromDB();
  },

  // ── HELPERS ─────────────────────────────────
  getMonthlyAmount(sub) {
    if (sub.status !== 'Active' || sub.isTrial) return 0;
    if (sub.cycle === 'Monthly') return sub.amount;
    if (sub.cycle === 'Yearly') return sub.amount / 12;
    if (sub.cycle === '7 Days' || sub.cycle === 'Weekly') return sub.amount * 4.33;
    if (sub.cycle === '14 Days') return sub.amount * 2.16;
    if (sub.cycle === '30 Days') return sub.amount;
    return sub.amount;
  },

  getMonthlyCost(userId) { return this.getSubs(userId).reduce((t, s) => t + this.getMonthlyAmount(s), 0); },
  getYearlyCost(userId) { return this.getMonthlyCost(userId) * 12; },
  getActiveTrials(userId) { return this.getSubs(userId).filter(s => s.isTrial && s.status === 'Active'); },
  daysUntil(dateStr) { return Math.ceil((new Date(dateStr + "T12:00:00") - new Date()) / (1000*60*60*24)); },
};

// ── UI HELPERS ──────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success:'✅', error:'❌', info:'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function openModal(titleText, bodyHTML, footerHTML) {
  document.getElementById('modalTitle').textContent = titleText;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalFooter').innerHTML = footerHTML;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }

function statusBadge(sub) {
  if (sub.isTrial && sub.status === 'Active') return `<span class="badge badge-trial">Free Trial</span>`;
  if (sub.status === 'Active')   return `<span class="badge badge-active">Active</span>`;
  if (sub.status === 'Canceled') return `<span class="badge badge-canceled">Canceled</span>`;
  if (sub.status === 'Expired')  return `<span class="badge badge-expired">Expired</span>`;
  return `<span class="badge">${sub.status}</span>`;
}

// ── ROUTER ─────────────────────────────────────────────────────
const Router = {
  current: 'dashboard',
  go(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const el = document.getElementById(`view-${view}`);
    if (el) el.classList.remove('hidden');
    const nav = document.querySelector(`[data-view="${view}"]`);
    if (nav) nav.classList.add('active');
    this.current = view;
    Views[view] && Views[view]();
  }
};

// ── VIEWS ──────────────────────────────────────────────────────
const Views = {

  dashboard() {
    const user = DB.getCurrentUser();
    const subs     = DB.getSubs(user.id);
    const active   = subs.filter(s => s.status === 'Active' && !s.isTrial);
    const trials   = DB.getActiveTrials(user.id);
    const monthly  = DB.getMonthlyCost(user.id);
    const yearly   = DB.getYearlyCost(user.id);
    const expiring = trials.filter(t => DB.daysUntil(t.nextDate) <= 7);

    document.getElementById('view-dashboard').innerHTML = `
      <div class="page-header">
        <div class="page-title">Welcome back, ${user.name.split(' ')[0]}! 👋</div>
        <div class="page-desc">Here's an overview of your subscriptions as of today.</div>
      </div>
      <div class="stats-grid">
        <div class="stat-card blue"><div class="stat-icon blue">📦</div><div class="stat-value">${active.length}</div><div class="stat-label">Active Subscriptions</div></div>
        <div class="stat-card green"><div class="stat-icon green">💰</div><div class="stat-value">$${monthly.toFixed(2)}</div><div class="stat-label">Monthly Cost</div></div>
        <div class="stat-card amber"><div class="stat-icon amber">⏰</div><div class="stat-value">${trials.length}</div><div class="stat-label">Free Trials Running</div><div class="stat-sub">${expiring.length > 0 ? `<span class="text-danger">${expiring.length} expiring within 7 days!</span>` : 'None expiring this week'}</div></div>
        <div class="stat-card purple"><div class="stat-icon purple">📅</div><div class="stat-value">$${yearly.toFixed(2)}</div><div class="stat-label">Yearly Total</div></div>
      </div>
      <div class="two-col">
        <div class="card"><div class="card-header"><span class="card-title">Recent Subscriptions</span></div><div class="recent-wrap">${this._recentTable(subs.slice(-5).reverse())}</div></div>
        <div class="card"><div class="card-header"><span class="card-title">Trials Expiring Soon</span></div><div class="card-body">${this._trialsPreview(trials)}</div></div>
      </div>
    `;
  },

  _recentTable(subs) {
    if (!subs.length) return `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">No subscriptions yet</div><div class="empty-desc">Add your first subscription to get started.</div></div>`;
    const rows = subs.map(s => {
      const svc = DB.getService(s.svcId);
      const icon = SVC_ICONS[svc?.name] || SVC_ICONS.default;
      return `<tr><td><div class="svc-row"><div class="svc-icon">${icon}</div><div><div class="svc-name">${svc?.name||'Unknown'}</div></div></div></td><td>${statusBadge(s)}</td><td><span class="amount">${s.amount > 0 ? '$'+s.amount.toFixed(2) : 'Free'}</span></td><td><span class="text-2">${s.cycle}</span></td></tr>`;
    }).join('');
    return `<table class="data-table"><thead><tr><th>Service</th><th>Status</th><th>Amount</th><th>Cycle</th></tr></thead><tbody>${rows}</tbody></table>`;
  },

  _trialsPreview(trials) {
    if (!trials.length) return `<div class="empty-state" style="padding:20px"><div class="empty-icon">🎉</div><div class="empty-title">No active trials</div></div>`;
    return trials.slice(0,3).map(t => {
      const svc = DB.getService(t.svcId);
      const days = DB.daysUntil(t.nextDate);
      const urgClass = days <= 2 ? 'text-danger' : days <= 5 ? 'text-warn' : 'text-success';
      const icon = SVC_ICONS[svc?.name] || SVC_ICONS.default;
      return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)"><div class="svc-icon" style="width:36px;height:36px">${icon}</div><div style="flex:1"><div style="font-weight:500;font-size:14px">${svc?.name||'Unknown'}</div><div style="font-size:12px;color:var(--text-2)">${new Date(t.nextDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div></div><div class="amount ${urgClass}" style="font-size:20px">${days}d</div></div>`;
    }).join('');
  },

  // ── SORTING ENGINE VARIABLES ──
  _subFilter: 'All',
  _subSearch: '',
  _sortCol: 'Next Billing',
  _sortAsc: true,

  _setSort(col) {
    if (this._sortCol === col) {
      this._sortAsc = !this._sortAsc;
    } else {
      this._sortCol = col;
      this._sortAsc = true;
    }
    this.subscriptions();
  },

  subscriptions() {
    const user = DB.getCurrentUser();
    const allSubs = DB.getSubs(user.id);
    const filters = ['All','Active','Free Trial','Canceled','Expired'];
    const tabsHTML = filters.map(f => `<button class="filter-tab${this._subFilter===f?' active':''}" onclick="Views._subFilter='${f}';Views.subscriptions()">${f}</button>`).join('');

    let subs = allSubs;
    if (this._subFilter === 'Active')     subs = subs.filter(s => s.status==='Active' && !s.isTrial);
    if (this._subFilter === 'Free Trial') subs = subs.filter(s => s.isTrial && s.status==='Active');
    if (this._subFilter === 'Canceled')   subs = subs.filter(s => s.status==='Canceled');
    if (this._subFilter === 'Expired')    subs = subs.filter(s => s.status==='Expired');
    if (this._subSearch) subs = subs.filter(s => {
      const svc = DB.getService(s.svcId);
      return svc?.name.toLowerCase().includes(this._subSearch.toLowerCase());
    });

    const getCycleRank = (c) => {
        const map = { 'Monthly': 1, 'Yearly': 2, '7 Days': 3, '14 Days': 4, '30 Days': 5 };
        return map[c] || 99;
    };

    subs.sort((a, b) => {
        let valA, valB;
        const svcA = DB.getService(a.svcId);
        const svcB = DB.getService(b.svcId);

        if (this._sortCol === 'Service') { valA = svcA?.name||''; valB = svcB?.name||''; }
        else if (this._sortCol === 'Status') { 
            valA = (a.isTrial && a.status === 'Active') ? 'Free Trial' : a.status; 
            valB = (b.isTrial && b.status === 'Active') ? 'Free Trial' : b.status; 
        }
        else if (this._sortCol === 'Amount') { valA = a.amount; valB = b.amount; }
        else if (this._sortCol === 'Cycle') { valA = getCycleRank(a.cycle); valB = getCycleRank(b.cycle); }
        else if (this._sortCol === 'Next Billing') { valA = new Date(a.nextDate).getTime(); valB = new Date(b.nextDate).getTime(); }

        if (valA < valB) return this._sortAsc ? -1 : 1;
        if (valA > valB) return this._sortAsc ? 1 : -1;
        return 0;
    });

    const rows = subs.map(s => {
      const svc = DB.getService(s.svcId);
      const cat = DB.getCategory(svc?.catId);
      const icon = SVC_ICONS[svc?.name] || SVC_ICONS.default;
      const days = DB.daysUntil(s.nextDate);
      
      let dateColor = 'text-2';
      if (s.status === 'Active' && !s.autoRenew && days <= 7) dateColor = 'text-danger';

      const renewBtnHTML = (s.status === 'Expired' || s.status === 'Canceled') 
        ? `<button class="btn btn-primary btn-sm" onclick="Views._promptRenewal(${s.id}, '${s.cycle}')">💳 Renew</button>` 
        : '';

      const autoRenewBtnHTML = (s.status === 'Active') 
        ? `<button class="btn btn-ghost btn-sm" onclick="Views._toggleAutoRenew(${s.id}, ${s.autoRenew})">${s.autoRenew ? '🛑 Turn Auto-Renew OFF' : '🔄 Turn Auto-Renew ON'}</button>` 
        : '';

      return `<tr>
        <td><div class="svc-row"><div class="svc-icon">${icon}</div><div><div class="svc-name">${svc?.name||'Unknown'}</div><div class="svc-cat">${cat?.name||''}</div></div></div></td>
        <td>${statusBadge(s)}</td>
        <td><span class="amount">${s.amount>0?'$'+s.amount.toFixed(2):'Free'}</span></td>
        <td><span class="text-2">${s.cycle}</span></td>
        <td><span class="${dateColor}" style="font-size:13px">${new Date(s.nextDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span></td>
        <td>
            <div class="flex gap-2">
                ${renewBtnHTML}
                ${autoRenewBtnHTML}
                <button class="btn btn-ghost btn-sm" onclick="Views._editSub(${s.id})">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" onclick="Views._deleteSub(${s.id})">🗑️</button>
            </div>
        </td>
      </tr>`;
    }).join('');

    const th = (label, col) => {
        const arrow = this._sortCol === col ? (this._sortAsc ? ' ↑' : ' ↓') : '';
        return `<th style="cursor:pointer; user-select:none;" onclick="Views._setSort('${col}')">${label}${arrow}</th>`;
    };

    const emptyState = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">No subscriptions found</div></div></td></tr>`;
    
    document.getElementById('view-subscriptions').innerHTML = `
        <div class="page-header"><div class="page-title">My Subscriptions</div></div>
        <div class="toolbar">
            <div class="filter-tabs">${tabsHTML}</div>
            <div class="search-wrap"><span class="search-icon">🔍</span><input class="search-input" placeholder="Search by service..." value="${this._subSearch}" oninput="Views._subSearch=this.value;Views.subscriptions()"></div>
            <button class="btn btn-primary ml-auto" onclick="Views._addSub()">＋ Add Subscription</button>
        </div>
        <div class="card"><div class="recent-wrap"><table class="data-table">
            <thead><tr>
                ${th('Service', 'Service')}
                ${th('Status', 'Status')}
                ${th('Amount', 'Amount')}
                ${th('Cycle', 'Cycle')}
                ${th('Next Billing', 'Next Billing')}
                <th>Actions</th>
            </tr></thead>
            <tbody>${rows || emptyState}</tbody>
        </table></div></div>
    `;
  },

  _promptRenewal(id, cycle) {
    const todayStr = new Date().toISOString().split('T')[0]; 
    const newDateStr = DB.calculateNextDate(todayStr, cycle);
    const promptMsg = `<p>Log a payment today and push the next billing date forward to <b>${newDateStr}</b>?</p>`;
    openModal('Renew Subscription', promptMsg, `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="Views._executeRenewal(${id}, '${newDateStr}')">Confirm Renewal</button>`);
  },

  async _executeRenewal(id, newDateStr) {
    try {
      await DB.renewSub(id, newDateStr);
      toast(`Payment logged! Next bill due: ${newDateStr}`, 'success');
      closeModal();
      Views[Router.current]();
    } catch(e) { toast("Error: " + e.message, 'error'); console.error(e); }
  },

  _deleteSub(id) {
    const promptMsg = `<p>Are you sure you want to permanently delete this subscription?</p>`;
    openModal('Delete Subscription', promptMsg, `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="Views._executeDelete(${id})">Delete</button>`);
  },

  async _executeDelete(id) {
    try {
      await DB.deleteSub(id);
      toast('Subscription deleted.', 'info');
      closeModal();
      this._updateTrialBadge();
      Views[Router.current]();
    } catch(e) { toast("Error: " + e.message, 'error'); console.error(e); }
  },

  async _toggleAutoRenew(id, currentState) {
    const newState = !currentState;
    try {
      await DB.toggleAutoRenew(id, newState);
      toast(`Auto-Renew turned ${newState ? 'ON' : 'OFF'}!`, 'info');
      Views[Router.current]();
    } catch(e) { toast("Error: " + e.message, 'error'); console.error(e); }
  },

  _updateFormDate() {
    const cycle = document.getElementById('f-cycle').value;
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('f-date').value = DB.calculateNextDate(todayStr, cycle);
    this._handleDateChange(); 
  },

  _handleDateChange() {
    const dateInput = document.getElementById('f-date');
    if (!dateInput) return;
    
    const dateVal = dateInput.value;
    const statusSelect = document.getElementById('f-status');
    const currentStatus = statusSelect.value;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const isPast = dateVal < todayStr;

    const statuses = isPast ? ['Canceled', 'Expired'] : ['Active', 'Canceled', 'Expired'];
    
    let targetStatus = currentStatus;
    if (isPast && currentStatus === 'Active') {
        targetStatus = 'Expired'; 
    }

    statusSelect.innerHTML = statuses.map(s => `<option value="${s}" ${s === targetStatus ? 'selected' : ''}>${s}</option>`).join('');
  },

  _subFormHTML(sub = null) {
    const svcs = DB.getServices();
    const cats = DB.getCategories();
    
    const svcOptions = svcs.map(s => {
      const cat = cats.find(c => c.id === s.catId);
      return `<option value="${s.id}" ${sub?.svcId===s.id?'selected':''}>${SVC_ICONS[s.name]||'💳'} ${s.name} (${cat?.name||''})</option>`;
    }).join('');
    const catOptions = cats.map(c => `<option value="${c.id}">${CAT_ICONS[c.name]||'📂'} ${c.name}</option>`).join('');
    
    const cycles = ['Monthly','Yearly','7 Days','14 Days','30 Days'];
    const cycleOptions = cycles.map(c => `<option ${sub?.cycle===c?'selected':''}>${c}</option>`).join('');
    
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultDate = sub?.nextDate || DB.calculateNextDate(todayStr, 'Monthly');
    const activeDate = sub?.nextDate || defaultDate;
    
    const isPast = activeDate < todayStr;
    const statuses = isPast ? ['Canceled', 'Expired'] : ['Active', 'Canceled', 'Expired'];
    let targetStatus = sub?.status || 'Active';
    if (isPast && targetStatus === 'Active') targetStatus = 'Expired';
    const statusOptions = statuses.map(s => `<option value="${s}" ${targetStatus===s?'selected':''}>${s}</option>`).join('');

    return `
      <div class="form-group">
        <label class="form-label">Service</label>
        <select id="f-svc" class="form-input" onchange="document.getElementById('f-custom-wrap').classList.toggle('hidden', this.value !== 'custom')">
          <option value="">Select a service...</option>
          ${svcOptions}
          <option value="custom" style="font-weight:600;color:var(--primary)">＋ Add Custom Service...</option>
        </select>
        <div id="f-custom-wrap" class="hidden" style="margin-top:12px; padding:14px; background:var(--card-2); border-radius:var(--radius-sm); border:1px dashed var(--border-2);">
          <div style="margin-bottom:12px;"><label class="form-label" style="font-size:12px;">Custom Service Name</label><input id="f-custom-name" type="text" class="form-input" placeholder="e.g., Gym Membership"></div>
          <div><label class="form-label" style="font-size:12px;">Category</label><select id="f-custom-cat" class="form-input" onchange="document.getElementById('f-custom-cat-new-wrap').classList.toggle('hidden', this.value !== 'new')">${catOptions}<option value="new" style="font-weight:600;color:var(--primary)">＋ Create New Category...</option></select></div>
          <div id="f-custom-cat-new-wrap" class="hidden" style="margin-top:12px;"><input id="f-custom-cat-name" type="text" class="form-input" placeholder="New category name"></div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Billing Amount ($)</label><input id="f-amount" type="number" step="0.01" min="0" class="form-input" placeholder="0.00" value="${sub?.amount??''}"></div>
        <div class="form-group">
            <label class="form-label">Billing Cycle</label>
            <select id="f-cycle" class="form-input" onchange="Views._updateFormDate()">${cycleOptions}</select>
        </div>
      </div>
      <div class="form-group">
          <label class="form-label">Next Billing / Expiry Date</label>
          <input id="f-date" type="date" class="form-input" onchange="Views._handleDateChange()" value="${activeDate}">
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Status</label><select id="f-status" class="form-input">${statusOptions}</select></div>
        <div class="form-group" style="padding-top:28px; display:flex; gap:16px;">
          <div class="toggle-wrap"><button id="f-trial" class="toggle${sub?.isTrial?' on':''}" onclick="this.classList.toggle('on')"></button><span style="font-size:13px;color:var(--text-2)">Free Trial</span></div>
          <div class="toggle-wrap"><button id="f-autorenew" class="toggle${sub?.autoRenew !== false ? ' on' : ''}" onclick="this.classList.toggle('on')"></button><span style="font-size:13px;color:var(--text-2)">Auto-Renew</span></div>
        </div>
      </div>
    `;
  },

  _addSub() {
    openModal('Add New Subscription', this._subFormHTML(), `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="Views._saveSub()">Save</button>`);
  },

  _editSub(id) {
    const sub = DB.getAllSubs().find(s => s.id === id);
    if (!sub) return;
    openModal('Edit Subscription', this._subFormHTML(sub), `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="Views._saveSub(${id})">Save Changes</button>`);
  },

  async _saveSub(editId = null) {
    let targetId = null;
    if (editId !== null && typeof editId !== 'object') {
        targetId = parseInt(editId);
    }

    let svcIdRaw = document.getElementById('f-svc').value;
    const amount = parseFloat(document.getElementById('f-amount').value);
    const cycle  = document.getElementById('f-cycle').value;
    const date   = document.getElementById('f-date').value;
    let status = document.getElementById('f-status').value;
    const trial  = document.getElementById('f-trial').classList.contains('on');
    const autoRenew = document.getElementById('f-autorenew').classList.contains('on');

    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr && status === 'Active') {
        status = 'Expired';
    }

    let svcId = null;
    let customName = null;
    let customCatId = null;
    let newCategoryName = null;

    if (!svcIdRaw) { toast('Please select a service.', 'error'); return; }

    if (svcIdRaw === 'custom') {
      customName = document.getElementById('f-custom-name').value.trim();
      if (!customName) { toast('Please enter a name for the custom service.', 'error'); return; }

      let catVal = document.getElementById('f-custom-cat').value;
      if (catVal === 'new') {
        newCategoryName = document.getElementById('f-custom-cat-name').value.trim();
        if (!newCategoryName) { toast('Please enter a name for the new category.', 'error'); return; }
      } else {
        customCatId = parseInt(catVal);
      }
    } else {
      svcId = parseInt(svcIdRaw);
    }

    if (isNaN(amount)) { toast('Please enter a valid amount.', 'error'); return; }
    if (!date) { toast('Please enter a date.', 'error'); return; }

    const data = {
      svcId: svcId, customName: customName, customCatId: customCatId,
      newCategoryName: newCategoryName, amount: amount, cycle: cycle, 
      nextDate: date, status: status, 
      isTrial: trial ? 1 : 0, autoRenew: autoRenew ? 1 : 0, 
      userId: DB.getCurrentUser().id
    };

    if (targetId) {
        data.id = targetId;
        try {
          await DB.editSub(data);    
          toast('Subscription updated!', 'success'); 
          closeModal();
          this._updateTrialBadge();
          Views[Router.current]();
        } catch(e) { toast("Failed to update: " + e.message, 'error'); console.error(e); } 
    } else {
        try {
          await DB.createSub(data);    
          toast('Subscription added!', 'success'); 
          closeModal();
          this._updateTrialBadge();
          Views[Router.current]();
        } catch(e) { toast("Failed to create: " + e.message, 'error'); console.error(e); } 
    }
  },

  _updateTrialBadge() {
    const user = DB.getCurrentUser();
    const count = DB.getActiveTrials(user.id).length;
    const badge = document.getElementById('trialBadge');
    if (badge) { badge.textContent = count; badge.classList.toggle('hide', count === 0); }
  },

  // ── FREE TRIALS ──────────────────────────────────────────
  trials() {
    const user   = DB.getCurrentUser();
    const trials = DB.getActiveTrials(user.id).sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));
    const expiring7 = trials.filter(t => DB.daysUntil(t.nextDate) <= 7);

    const cards = trials.length ? trials.map(t => {
      const svc  = DB.getService(t.svcId);
      const cat  = DB.getCategory(svc?.catId);
      const icon = SVC_ICONS[svc?.name] || SVC_ICONS.default;
      const days = DB.daysUntil(t.nextDate);
      const urgClass = days <= 2 ? 'urgent' : days <= 7 ? 'warn' : '';
      const pctLeft  = Math.min(100, Math.max(0, (days / 30) * 100));
      const barClass = days <= 2 ? 'progress-urgent' : days <= 7 ? 'progress-warn' : 'progress-good';
      const dayColor = days <= 2 ? 'var(--danger)' : days <= 7 ? 'var(--warning)' : 'var(--success)';
      return `<div class="trial-card ${urgClass}"><div class="trial-header"><div class="svc-row"><div class="svc-icon" style="width:42px;height:42px;font-size:20px">${icon}</div><div><div style="font-weight:600;font-size:15px">${svc?.name||'Unknown'}</div><span class="badge badge-cat">${cat?.name||''}</span></div></div><div style="text-align:right"><div class="trial-expiry">Expires</div><div style="font-size:13px;font-weight:500">${new Date(t.nextDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div></div></div><div style="text-align:center;padding:8px 0"><div class="trial-days-big" style="color:${dayColor}">${Math.max(0,days)}</div><div class="trial-days-label">days remaining</div></div><div class="trial-progress"><div class="trial-progress-bar ${barClass}" style="width:${pctLeft}%"></div></div><div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-ghost btn-sm" style="flex:1" onclick="Views._editSub(${t.id})">✏️ Edit</button><button class="btn btn-danger btn-sm" style="flex:1" onclick="Views._deleteSub(${t.id})">Cancel Trial</button></div></div>`;
    }).join('') : '';

    document.getElementById('view-trials').innerHTML = `<div class="page-header"><div class="page-title">Free Trial Tracker ⏰</div></div>${expiring7.length > 0 ? `<div style="background:var(--danger-g);border:1px solid rgba(239,68,68,0.25);border-radius:var(--radius);padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:12px"><span style="font-size:22px">🚨</span><div><div style="font-weight:600;color:var(--danger)">Urgent: ${expiring7.length} trial${expiring7.length>1?'s':''} expiring within 7 days!</div></div></div>` : ''}${trials.length ? `<div class="trials-grid">${cards}</div>` : `<div class="empty-state"><div class="empty-icon">🎉</div><div class="empty-title">No active free trials</div></div>`}`;
  },

  // ── ANALYTICS ────────────────────────────────────────────
  _chartInstances: {},
  analytics() {
    const user  = DB.getCurrentUser();
    const subs  = DB.getSubs(user.id).filter(s => s.status === 'Active');
    const monthly = DB.getMonthlyCost(user.id);
    const yearly  = DB.getYearlyCost(user.id);
    const weekly  = monthly / 4.33;

    const catCosts = {};
    subs.forEach(s => {
      const svc = DB.getService(s.svcId);
      const cat = DB.getCategory(svc?.catId);
      const key = cat?.name || 'Other';
      catCosts[key] = (catCosts[key] || 0) + DB.getMonthlyAmount(s);
    });

    const catColors = ['#4F8BF9','#22C55E','#F59E0B','#A855F7','#EF4444','#06B6D4','#FF8C42'];
    const catNames  = Object.keys(catCosts);
    const catVals   = Object.values(catCosts);

    const cycleCosts = {};
    subs.forEach(s => { if (!s.isTrial) cycleCosts[s.cycle] = (cycleCosts[s.cycle]||0) + DB.getMonthlyAmount(s); });

    document.getElementById('view-analytics').innerHTML = `<div class="page-header"><div class="page-title">Expense Analytics 📊</div></div><div class="stats-grid" style="margin-bottom:24px"><div class="stat-card blue"><div class="stat-icon blue">📅</div><div class="stat-value">$${weekly.toFixed(2)}</div><div class="stat-label">Weekly Spend</div></div><div class="stat-card green"><div class="stat-icon green">🗓️</div><div class="stat-value">$${monthly.toFixed(2)}</div><div class="stat-label">Monthly Spend</div></div><div class="stat-card purple"><div class="stat-icon purple">📆</div><div class="stat-value">$${yearly.toFixed(2)}</div><div class="stat-label">Yearly Projection</div></div><div class="stat-card amber"><div class="stat-icon amber">📦</div><div class="stat-value">${subs.filter(s=>!s.isTrial).length}</div><div class="stat-label">Paid Active Plans</div></div></div><div class="analytics-grid"><div class="card"><div class="card-header"><span class="card-title">Cost by Category</span></div><div class="card-body"><div class="chart-container"><canvas id="catChart"></canvas></div></div></div><div class="card"><div class="card-header"><span class="card-title">Cost Breakdown</span></div><div class="card-body">${catNames.length ? catNames.map((n,i) => `<div class="cost-row" style="padding:8px 0;border-bottom:1px solid var(--border)"><div class="cost-dot" style="background:${catColors[i%catColors.length]}"></div><div class="cost-cat">${n}</div><div class="cost-pct">${((catVals[i]/monthly)*100||0).toFixed(1)}%</div><div class="cost-val">$${catVals[i].toFixed(2)}/mo</div></div>`) .join('') : '<div class="text-muted" style="text-align:center;padding:20px">No active paid subscriptions.</div>'}</div></div><div class="card"><div class="card-header"><span class="card-title">Cost by Billing Cycle</span></div><div class="card-body"><div class="chart-container"><canvas id="cycleChart"></canvas></div></div></div></div>`;

    if (this._chartInstances.cat) this._chartInstances.cat.destroy();
    if (this._chartInstances.cycle) this._chartInstances.cycle.destroy();

    if (catNames.length) {
      this._chartInstances.cat = new Chart(document.getElementById('catChart'), { type: 'doughnut', data: { labels: catNames, datasets: [{ data: catVals, backgroundColor: catColors.slice(0,catNames.length), borderWidth:0, hoverOffset:6 }] }, options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ color:'#8892A4' } } }, cutout:'65%' } });
    }
    if (Object.keys(cycleCosts).length) {
      this._chartInstances.cycle = new Chart(document.getElementById('cycleChart'), { type: 'bar', data: { labels: Object.keys(cycleCosts), datasets: [{ label: 'Monthly equivalent ($)', data: Object.values(cycleCosts), backgroundColor: 'rgba(79,139,249,0.7)', borderRadius:6 }] }, options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:'#8892A4' } } }, scales:{ x:{ ticks:{ color:'#8892A4' } }, y:{ ticks:{ color:'#8892A4', callback:v=>'$'+v } } } } });
    }
  },

  // ── SERVICE CATALOG ──────────────────────────────────────
  _catFilter: 0,
  catalog() {
    const cats = DB.getCategories();
    const svcs = this._catFilter ? DB.getServicesByCat(this._catFilter) : DB.getServices();
    const user = DB.getCurrentUser();
    const mySvcIds = new Set(DB.getSubs(user.id).filter(s=>s.status==='Active').map(s=>s.svcId));

    const catTabs = `<button class="filter-tab${this._catFilter===0?' active':''}" onclick="Views._catFilter=0;Views.catalog()">All</button>` + cats.map(c => `<button class="filter-tab${this._catFilter===c.id?' active':''}" onclick="Views._catFilter=${c.id};Views.catalog()">${CAT_ICONS[c.name]||'📂'} ${c.name}</button>`).join('');

    const cards = svcs.map(s => {
      const cat  = DB.getCategory(s.catId);
      const icon = SVC_ICONS[s.name] || SVC_ICONS.default;
      const subscribed = mySvcIds.has(s.id);
      return `<div class="catalog-card"><div class="catalog-header"><div class="catalog-icon">${icon}</div><div><div class="catalog-name">${s.name}</div></div></div><div style="display:flex;align-items:center;gap:8px"><span class="badge badge-cat">${cat?.name||''}</span>${subscribed ? `<span class="badge badge-active" style="margin-left:auto">✓ Subscribed</span>` : ''}</div>${!subscribed ? `<button class="btn btn-primary btn-sm" onclick="Views._quickAddFromCatalog(${s.id})">＋ Add to My Subscriptions</button>` : `<button class="btn btn-ghost btn-sm" onclick="Router.go('subscriptions')">View My Plans</button>`}</div>`;
    }).join('');

    document.getElementById('view-catalog').innerHTML = `<div class="page-header"><div class="page-title">Service Catalog 🛍️</div></div><div class="toolbar"><div class="filter-tabs" style="flex-wrap:wrap">${catTabs}</div></div><div class="catalog-grid">${cards || '<div class="empty-state">No services found</div>'}</div>`;
  },

  _quickAddFromCatalog(svcId) {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+14);
    const dateStr  = tomorrow.toISOString().split('T')[0];
    const sub      = { svcId, amount: 0, cycle: 'Monthly', nextDate: dateStr, isTrial: false, status: 'Active' };
    openModal('Add Subscription', Views._subFormHTML({...sub, svcId}), `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="Views._saveSub()">Save</button>`);
  },
};

// ── AUTHENTICATION AND BOOTUP ──────────────────────────────────
function showAuth()  { document.getElementById('authScreen').classList.remove('hidden'); document.getElementById('appScreen').classList.add('hidden'); }
function showApp()   { document.getElementById('authScreen').classList.add('hidden'); document.getElementById('appScreen').classList.remove('hidden'); }

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  if (!email || !pass) { toast('Please fill in all fields.', 'error'); return; }
  
  const user = await DB.login(email, pass);
  if (user) {
    await DB.fetchSubsFromDB();
    toast(`Welcome back, ${user.name.split(' ')[0]}! 👋`, 'success');
    showApp(); renderSidebar(); Router.go('dashboard');
  } else { toast('Invalid email or password.', 'error'); }
}

// ── NEW: REGISTRATION FRONTEND HANDLER ──
// ── NEW: REGISTRATION FRONTEND HANDLER ──
async function handleRegister() {
  const name = document.getElementById('regName')?.value.trim();
  const email = document.getElementById('regEmail')?.value.trim();
  const pass  = document.getElementById('regPass')?.value;
  const pass2 = document.getElementById('regPass2')?.value; // Grab the second password
  
  if (!name || !email || !pass || !pass2) { 
      toast('Please fill in all fields.', 'error'); 
      return; 
  }
  
  if (pass !== pass2) {
      toast('Passwords do not match!', 'error');
      return;
  }
  
  try {
    const user = await DB.register(name, email, pass);
    if (user) {
      await DB.fetchSubsFromDB();
      toast(`Welcome, ${user.name.split(' ')[0]}! Account created.`, 'success');
      showApp(); renderSidebar(); Router.go('dashboard');
    }
  } catch(e) { toast(e.message, 'error'); }
}

function renderSidebar() {
  const user   = DB.getCurrentUser();
  const trials = DB.getActiveTrials(user.id).length;
  document.getElementById('sidebarUserName').textContent  = user.name;
  document.getElementById('sidebarUserEmail').textContent = user.email;
  const badge = document.getElementById('trialBadge');
  if (badge) { badge.textContent = trials; badge.classList.toggle('hide', trials === 0); }
}

function handleLogout() {
  DB.logout(); toast('Logged out successfully.', 'info');
  showAuth(); 
  if(document.getElementById('loginEmail')) document.getElementById('loginEmail').value = ''; 
  if(document.getElementById('loginPass')) document.getElementById('loginPass').value = '';
}

document.addEventListener('DOMContentLoaded', async () => {
  DB.init();
  const user = DB.getCurrentUser();
  if (user) { 
    await DB.fetchSubsFromDB();
    showApp(); renderSidebar(); Router.go('dashboard'); 
  } else { showAuth(); }

  // Enter key listeners
  document.getElementById('loginPass')?.addEventListener('keydown', e => { if (e.key==='Enter') handleLogin(); });
  document.getElementById('regPass')?.addEventListener('keydown', e => { if (e.key==='Enter') handleRegister(); });
  
  document.getElementById('modalOverlay')?.addEventListener('click', e => { if (e.target.id==='modalOverlay') closeModal(); });
});