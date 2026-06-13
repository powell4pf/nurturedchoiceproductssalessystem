/**
 * NurturedChoiceProducts - UI Utilities
 */

"use strict";

/* ═══════════════════════════════
   TOAST NOTIFICATIONS
═══════════════════════════════ */
const Toast = {
  show(message, type = 'success', duration = 3500) {
    const container = document.getElementById('toast-container') ||
      (() => {
        const el = document.createElement('div');
        el.id = 'toast-container';
        document.body.appendChild(el);
        return el;
      })();

    const icons = {
      success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="#276749" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="#C53030" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="#B7791F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="#2A6496" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${Fmt.escape(message)}</span>
      <button class="toast-dismiss" onclick="this.parentElement.remove()">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success: (m, d) => Toast.show(m, 'success', d),
  error:   (m, d) => Toast.show(m, 'error', d),
  warning: (m, d) => Toast.show(m, 'warning', d),
  info:    (m, d) => Toast.show(m, 'info', d)
};

/* ═══════════════════════════════
   MODAL MANAGER
═══════════════════════════════ */
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    const closeBtn = el.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  },
  close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
    });
    document.body.style.overflow = '';
  }
};

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    Modal.closeAll();
  }
});
// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') Modal.closeAll();
});

/* ═══════════════════════════════
   SIDEBAR NAVIGATION
═══════════════════════════════ */
async function initSidebar() {
  const session = await Auth.require();
  if (!session) return;

  // Set user info
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (nameEl) nameEl.textContent = session.name;
  if (roleEl) roleEl.textContent = session.role === 'admin' ? 'Administrator' : 'Staff';
  if (avatarEl && session.name) {
    const parts = session.name.split(' ').filter(Boolean);
    const initials = parts.map(function(w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    avatarEl.textContent = initials || '??';
  }

  // Active nav
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === currentPage);
  });

  // RBAC: Hide restricted items for non-admins
  if (session.role !== 'admin') {
    const reportsLink = document.querySelector('[data-page="reports.html"]');
    if (reportsLink) reportsLink.style.display = 'none';
    const usersLink = document.querySelector('[data-page="users.html"]');
    if (usersLink) usersLink.style.display = 'none';
  }

  // Logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to log out?')) {
        await Auth.logout();
        window.location.href = 'index.html';
      }
    });
  }

  // Date
  const dateEl = document.getElementById('topbar-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
}

/* ═══════════════════════════════
   CONFIRM DIALOG
═══════════════════════════════ */
function confirmAction(message, onConfirm) {
  const existing = document.getElementById('confirm-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'confirm-modal';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px;">
      <div class="modal-header">
        <h3 class="modal-title">Confirm Action</h3>
        <button class="modal-close" onclick="Modal.close('confirm-modal')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <p style="color:var(--slate)">${Fmt.escape(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="Modal.close('confirm-modal')">Cancel</button>
        <button class="btn btn-danger" id="confirm-yes">Confirm</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  Modal.open('confirm-modal');
  document.getElementById('confirm-yes').addEventListener('click', () => {
    Modal.close('confirm-modal');
    onConfirm();
  });
}

/* ═══════════════════════════════
   PRINT UTILITY
═══════════════════════════════ */
function printElement(elementId, title) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open('', '_blank', 'width=800,height=600');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title || 'NurturedChoiceProducts'}</title>
      <link rel="stylesheet" href="css/style.css">
      <style>
        body { background: white; margin: 0; padding: 20mm 15mm; }
        .doc-preview { border: none !important; box-shadow: none !important; padding: 0 !important; }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @media print { @page { margin: 15mm; } }
      </style>
    </head>
    <body>${el.outerHTML}</body>
    </html>
  `);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); win.close(); };
}

/* ═══════════════════════════════
   EXPORT UTILITIES
═══════════════════════════════ */
const Utils = {
  downloadCSV(headers, rows, filename) {
    const content = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell != null ? cell : '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/* ═══════════════════════════════
   SHARING UTILITIES
═══════════════════════════════ */
const Share = {
  whatsapp(phone, message) {
    // Clean phone number (remove +, spaces, etc)
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  },
  
  generateInvoiceMessage(inv) {
    return `Hello ${inv.customerName},\n\n` +
           `This is a professional invoice from Nurtured Choice Products.\n` +
           `Invoice #: ${inv.number}\n` +
           `Total Due: ${Fmt.currency(inv.total)}\n\n` +
           `Thank you for your business!`;
  }
};

/* ═══════════════════════════════
   TABS
═══════════════════════════════ */
function initTabs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(btn.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });
}

/* ═══════════════════════════════
   SIDEBAR HTML TEMPLATE
═══════════════════════════════ */
function renderSidebar() {
  return `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="sidebar-logo-mark">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
            </svg>
          </div>
          <div class="sidebar-logo-text">
            <div class="brand">Nurtured Choice</div>
            <div class="tagline">Products</div>
          </div>
        </div>
      </div>

      <div class="sidebar-user">
        <div class="user-avatar" id="sidebar-avatar">AU</div>
        <div class="user-info">
          <div class="name" id="sidebar-user-name">Admin</div>
          <div class="role" id="sidebar-user-role">Administrator</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">Main</div>
        <a class="nav-item" data-page="dashboard.html" href="dashboard.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Dashboard
        </a>
        <a class="nav-item" data-page="invoices.html" href="invoices.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
          Invoices
        </a>
        <a class="nav-item" data-page="credit-notes.html" href="credit-notes.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          Credit Notes
        </a>
        <a class="nav-item" data-page="statements.html" href="statements.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="8" y2="18"/><line x1="12" y1="14" x2="8" y2="14"/><line x1="16" y1="18" x2="16" y2="18"/></svg>
          Statements
        </a>
        <a class="nav-item" data-page="reports.html" href="reports.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          Sales Reports
        </a>
        <a class="nav-item" data-page="users.html" href="users.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          User Management
        </a>

        <div class="nav-section-label" style="margin-top:12px">Management</div>
        <a class="nav-item" data-page="products.html" href="products.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          Products
        </a>
        <a class="nav-item" data-page="customers.html" href="customers.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          Customers
        </a>
      </nav>

      <div class="sidebar-footer">
        <button class="btn btn-outline btn-full" id="btn-logout" style="color:rgba(255,255,255,0.6);border-color:rgba(255,255,255,0.15)">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      </div>
    </aside>
  `;
}
