/**
 * NurturedChoiceProducts - Database & Security Layer
 * Migrated to Supabase for Database & Authentication
 */

"use strict";

// Supabase Configuration
// Replace these with your actual Supabase project details
const SUPABASE_URL = 'https://mhmzhasantibedfllvcu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obXpoYXNhbnRpYmVkZmxsdmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTE4MzAsImV4cCI6MjA5Njg2NzgzMH0.1Oq0CquhuyWO3cdHi0YDkz7NTcQEN91sjc9KPQga__A';

let _supabase = null;
function getSupabase() {
  if (!SUPABASE_URL || SUPABASE_URL.includes('your-project-id')) {
    console.error('Supabase URL is not configured. Please check js/db.js');
    return null;
  }
  if (!_supabase) {
    if (window.supabase) {
      _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
      console.warn('Supabase library not yet loaded. Retrying...');
      return null;
    }
  }
  return _supabase;
}

const SALT      = 'NCP@2024$ecure!';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION   = 15 * 60 * 1000; // 15 minutes

/* ═══════════════════════════════
   SIMPLE ENCRYPTION (XOR + Base64)
   Protects data at rest in localStorage
═══════════════════════════════ */
const Security = {
  _key(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  },

  encrypt(data) {
    try {
      const str = typeof data === 'string' ? data : JSON.stringify(data);
      const key = SALT;
      let result = '';
      for (let i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return btoa(unescape(encodeURIComponent(result)));
    } catch(e) {
      return btoa(typeof data === 'string' ? data : JSON.stringify(data));
    }
  },

  decrypt(data) {
    try {
      const str = decodeURIComponent(escape(atob(data)));
      const key = SALT;
      let result = '';
      for (let i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return JSON.parse(result);
    } catch(e) {
      try { return JSON.parse(atob(data)); } catch { return null; }
    }
  },

  hashPassword(password) {
    // Simple hash for demo; in production use bcrypt via server
    let hash = 0x811c9dc5;
    const salt = SALT + password.length;
    const combined = salt + password + SALT;
    for (let i = 0; i < combined.length; i++) {
      hash ^= combined.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8,'0') + btoa(combined.split('').reverse().join('')).slice(0, 20);
  },

  sanitize(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  validateInput(value, type = 'text') {
    if (type === 'number') return !isNaN(parseFloat(value)) && isFinite(value) && value >= 0;
    if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (type === 'phone') return /^[\d\s\+\-\(\)]{7,15}$/.test(value);
    if (type === 'text') return String(value).length > 0 && String(value).length < 500;
    return true;
  }
};

/* ═══════════════════════════════
   DATABASE
═══════════════════════════════ */
const DB = {
  async get(table) {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase.from(table).select('*');
    if (error) { console.error(`Error fetching ${table}:`, error); return []; }
    return data;
  },

  async insert(table, record) {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.from(table).insert([record]).select();
    if (error) { console.error(`Error inserting into ${table}:`, error); return null; }
    return data[0];
  },

  async update(table, id, changes) {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.from(table).update(changes).eq('id', id).select();
    if (error) { console.error(`Error updating ${table}:`, error); return null; }
    return data[0];
  },

  async delete(table, id) {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) console.error(`Error deleting from ${table}:`, error);
  },

  async findById(table, id) {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) return null;
    return data;
  },

  // Audit logging
  async log(action, details, userId) {
    const supabase = getSupabase();
    if (!supabase) return;
    await this.insert('audit_log', {
      action,
      details,
      user_id: userId,
      timestamp: new Date().toISOString(),
      ip: 'local'
    });
  }
};

/* ═══════════════════════════════
   AUTH
═══════════════════════════════ */
const Auth = {
  async getSession() {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Fetch profile for role from our public table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('Critical: RLS Policy Error or Profile Fetch Failure:', error.message);
    }

    const userRole = profile?.role || 'staff';
    console.log('Active Session:', { email: session.user.email, role: userRole });

    return {
      userId: session.user.id,
      email: session.user.email,
      name: profile?.full_name || session.user.user_metadata.full_name || session.user.email,
      role: userRole
    };
  },

  async login(email, password) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, msg: 'Database connection not established.' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, msg: error.message };
    
    if (data.user) {
      await DB.log('LOGIN', `User ${email} logged in`, data.user.id);
    }
    return { ok: true, session: data.session };
  },

  async signInWithProvider(provider) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, msg: 'Database connection not established.' };
    const redirectTo = window.location.protocol.startsWith('http')
      ? `${window.location.origin}/dashboard.html`
      : window.location.href;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });
    if (error) return { ok: false, msg: error.message };
    return { ok: true, data };
  },

  async register(email, password, fullName) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, msg: 'Database connection not established.' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } } // Pass full_name to user_metadata
    });

    if (error) return { ok: false, msg: error.message };
    return { ok: true, user: data.user };
  },

  async logout() {
    const supabase = getSupabase();
    if (!supabase) return;
    const s = await this.getSession();
    if (s) await DB.log('LOGOUT', `User ${s.email} logged out`, s.userId);
    await supabase.auth.signOut();
  },

  async require() {
    const session = await this.getSession();
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }
    return session;
  }
};

/* ═══════════════════════════════
   INVOICE / DOC NUMBERING
═══════════════════════════════ */
const DocNumber = {
  async nextInvoice() {
    const invoices = await DB.get('invoices');
    if (!invoices.length) return 'INV-00001';
    const nums = invoices.map(i => {
      const n = parseInt((i.number || '').replace(/\D/g, ''));
      return isNaN(n) ? 0 : n;
    });
    return 'INV-' + String(Math.max(...nums) + 1).padStart(5, '0');
  },

  async nextCreditNote(invoiceNumber) {
    const cn = await DB.get('credit_notes');
    const base = cn.length + 1;
    return 'CN-' + String(base).padStart(5, '0') + (invoiceNumber ? `-${invoiceNumber.replace('INV-','')}` : '');
  },

  async nextStatement() {
    const st = await DB.get('statements');
    return 'STMT-' + String(st.length + 1).padStart(4, '0');
  }
};

/* ═══════════════════════════════
   FORMATTING HELPERS
═══════════════════════════════ */
const Fmt = {
  currency(n, symbol = 'KSh') {
    return `${symbol} ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },
  date(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  datetime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  month(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
  },
  escape(str) { return Security.sanitize(str); }
};

/* ═══════════════════════════════
   LETTERHEAD GENERATOR
═══════════════════════════════ */
const Letterhead = {
  header() {
    return `
      <div class="letterhead-header">
        <div class="letterhead-logo">NC</div>
        <div class="letterhead-company">
          <h1 class="letterhead-title">NURTURED CHOICE<br>PRODUCTS</h1>
          <div class="letterhead-subtitle">Sales Management System</div>
          <div class="letterhead-divider"></div>
          <div class="letterhead-info">
            <div class="letterhead-info-item">
              <span>📍</span>
              <span><strong>P.O BOX 8415 – 00200</strong> Nairobi, Kenya</span>
            </div>
            <div class="letterhead-info-item">
              <span>📞</span>
              <span><strong>Tel:</strong> +254 726 441 206</span>
            </div>
            <div class="letterhead-info-item">
              <span>📧</span>
              <span><strong>Email:</strong> nurturedchoice@yahoo.com</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  wrap(content) {
    return `<div class="letterhead-container">${this.header()}${content}</div>`;
  }
};
