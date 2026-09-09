// ============ COMMON APP UTILITIES ============

function showToast(type, title, message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `
    <div class="toast-title">${escapeHtml(title || '')}</div>
    ${message ? `<div class="toast-msg">${escapeHtml(message)}</div>` : ''}
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(110%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function formatDate(d) {
  if (!d) return '-';
  try {
    const date = new Date(d);
    return date.toLocaleDateString(getLang() === 'hi' ? 'hi-IN' : 'en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch(e) { return d; }
}

function riskBadgeClass(level) {
  if (level === 'high') return 'badge-high';
  if (level === 'moderate') return 'badge-moderate';
  return 'badge-low';
}

function riskBadgeText(level) {
  if (level === 'high') return '🔴 ' + t('preg.high');
  if (level === 'moderate') return '🟡 ' + t('preg.moderate');
  return '🟢 ' + t('preg.low');
}

function statusBadgeClass(status) {
  const map = {
    pending: 'badge-pending',
    referred: 'badge-referred',
    received: 'badge-referred',
    under_review: 'badge-referred',
    followup_required: 'badge-pending',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
    due: 'badge-pending',
    missed: 'badge-high',
    rescheduled: 'badge-pending'
  };
  return map[status] || 'badge-pending';
}

function statusText(status) {
  const map = {
    pending: 'ref.pending', referred: 'ref.referred', received: 'ref.received',
    under_review: 'ref.underreview', followup_required: 'ref.followupreq',
    completed: 'ref.completed', cancelled: 'ref.cancelled',
    due: 'fu.due', missed: 'fu.missed', rescheduled: 'fu.rescheduled'
  };
  return map[status] ? t(map[status]) : status;
}

// ============ SIDEBAR / NAVIGATION ============
function renderSidebar(activeKey) {
  const user = Auth.getCurrentUser();
  if (!user) return '';
  const isAdmin = user.role === 'admin';
  const items = isAdmin ? [
    { key: 'dashboard', href: 'admin.html', icon: '📊', label: 'nav.dashboard' },
    { key: 'users', href: 'admin.html#users', icon: '👥', label: 'nav.users' },
    { key: 'facilities', href: 'admin.html#facilities', icon: '🏥', label: 'nav.facilities' },
    { key: 'riskrules', href: 'admin.html#rules', icon: '⚖️', label: 'nav.riskrules' },
    { key: 'logs', href: 'admin.html#logs', icon: '📜', label: 'nav.logs' },
    { key: 'settings', href: 'admin.html#settings', icon: '⚙️', label: 'nav.settings' }
  ] : [
    { key: 'dashboard', href: 'dashboard.html', icon: '🏠', label: 'nav.dashboard' },
    { key: 'cases', href: 'cases.html', icon: '📋', label: 'nav.cases' },
    { key: 'pregnancy', href: 'pregnancy.html', icon: '🤰', label: 'nav.pregnancy' },
    { key: 'referrals', href: 'referrals.html', icon: '🚑', label: 'nav.referrals' },
    { key: 'followups', href: 'referrals.html#followup', icon: '📅', label: 'nav.followups' },
    { key: 'childhealth', href: 'referrals.html#child', icon: '👶', label: 'nav.childhealth' }
  ];

  return `
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <h1>स्वास्थ्यसाथी</h1>
        <small>SwasthyaSaathi</small>
      </div>
      <nav>
        ${items.map(it => `
          <a href="${it.href}" class="nav-item ${it.key === activeKey ? 'active' : ''}">
            <span class="icon">${it.icon}</span>
            <span data-i18n="${it.label}">${t(it.label)}</span>
          </a>
        `).join('')}
      </nav>
      <div style="padding: 20px 22px; margin-top: 20px; border-top: 1px solid var(--border);">
        <div style="font-size: 13px; font-weight: 600;">${escapeHtml(user.name)}</div>
        <div style="font-size: 11px; color: var(--text-2); margin-bottom: 8px;">${roleLabel(user.role)}</div>
        <button class="btn btn-ghost btn-sm btn-block" onclick="Auth.logout()">
          <span data-i18n="nav.logout">${t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  `;
}

function renderBottomNav(activeKey) {
  const items = [
    { key: 'dashboard', href: 'dashboard.html', icon: '🏠', label: 'nav.home' },
    { key: 'cases', href: 'cases.html', icon: '📋', label: 'nav.cases' },
    { key: 'referrals', href: 'referrals.html', icon: '🚑', label: 'nav.referrals' },
    { key: 'followups', href: 'referrals.html#followup', icon: '📅', label: 'nav.followups' },
    { key: 'profile', href: '#', icon: '👤', label: 'nav.profile' }
  ];
  return `
    <nav class="bottom-nav">
      ${items.map(it => `
        <a href="${it.href}" class="${it.key === activeKey ? 'active' : ''}">
          <span class="icon">${it.icon}</span>
          <span data-i18n="${it.label}">${t(it.label)}</span>
        </a>
      `).join('')}
    </nav>
  `;
}

function roleLabel(role) {
  const map = {
    asha: 'admin.role.asha', anm: 'admin.role.anm',
    medical_officer: 'admin.role.mo', block_officer: 'admin.role.bo',
    district_officer: 'admin.role.do', admin: 'admin.role.admin'
  };
  return t(map[role] || role);
}

function renderTopbar(titleKey, activeNav) {
  const user = Auth.getCurrentUser();
  return `
    <div class="topbar">
      <div style="display: flex; align-items: center; gap: 12px;">
        <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
        <h1 class="page-title" data-i18n="${titleKey}">${t(titleKey)}</h1>
      </div>
      <div class="actions">
        <span class="sync-status ${navigator.onLine ? 'online' : 'offline'}">
          <span class="dot"></span>
          <span class="txt">${navigator.onLine ? t('sync.online') : t('sync.offline')}</span>
        </span>
        <span class="pending-badge pending-sync-badge" style="display:none;">0</span>
        <div class="lang-switch">
          <button class="${getLang() === 'hi' ? 'active' : ''}" data-lang="hi" onclick="setLang('hi')">हिंदी</button>
          <button class="${getLang() === 'en' ? 'active' : ''}" data-lang="en" onclick="setLang('en')">English</button>
        </div>
      </div>
    </div>
  `;
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.toggle('show');
}

function initAppShell(titleKey, activeNav) {
  const user = Auth.getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  const shell = document.getElementById('app-shell');
  if (shell) {
    shell.innerHTML = `
      ${renderSidebar(activeNav)}
      <main class="main-content">
        ${renderTopbar(titleKey, activeNav)}
        <div id="page-content"></div>
      </main>
      ${renderBottomNav(activeNav)}
    `;
  }
  applyTranslations();
  OfflineQueue.updateBadge();
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
});
