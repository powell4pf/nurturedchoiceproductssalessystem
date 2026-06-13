# NurturedChoiceProducts — Sales Management System

A complete, self-contained, browser-based sales management system for **NurturedChoiceProducts**, built to manage stock, invoices, credit notes, statements, and monthly sales reports for:

- 🍯 Quick Health Honey
- 🥜 SweetNut Peanut Butter
- 🌰 SweetNut Roasted Nuts

---

## 📁 File Structure

```
NurturedChoiceProducts/
├── index.html              ← Login page (start here)
├── dashboard.html           ← Main dashboard with stats & charts
├── invoices.html             ← Create / view / print invoices
├── credit-notes.html         ← Issue credit notes against invoices
├── statements.html           ← Generate customer statements
├── reports.html              ← Monthly sales reports
├── products.html             ← Manage products, stock & prices
├── customers.html             ← Manage customer directory
├── css/
│   └── style.css             ← All styling, animations, print styles
├── js/
│   ├── db.js                  ← Database, security, auth, formatting
│   └── ui.js                  ← Shared UI components (toasts, modals, sidebar)
└── README.md                  ← This file
```

---

## 🚀 How to Run

1. **Supabase Setup**: 
   - Create a project on supabase.com.
   - Go to Project Settings -> API and copy your URL and Anon Key into `js/db.js`.
   - Enable **Email Auth** in the Authentication -> Providers tab.
   - **Important**: Disable "Confirm email" in the Email provider settings to allow immediate login.
2. **Database Tables**: Create the following tables in the SQL Editor: `products`, `customers`, `invoices`, `credit_notes`, `statements`, and `audit_log`.
3. Open the folder in VS Code and use **Live Server**.
4. Log in with your Supabase user credentials.

---

---

## ✨ Features

### Authentication
- Secure login screen with animated background.
- Passwords are hashed (not stored in plain text).
- Account lockout after 5 failed attempts (15-minute lockout).
- Session expires automatically after 8 hours.
- All pages require login — direct URL access redirects to login if not authenticated.

### Dashboard
- Live stats: total revenue, monthly revenue, invoice counts, credit notes, stock levels, customers.
- Animated revenue bar chart (last 6 months).
- Product sales donut chart.
- Recent invoices table.
- Stock level overview with low-stock warnings.

### Invoices
- Create invoices with multiple line items.
- **Manual invoice number entry** — auto-generated (`INV-00001`, `INV-00002`, …) but fully editable if the auto number is wrong. Duplicate numbers are blocked.
- Select customer, set status (Pending / Paid / Overdue).
- Live subtotal/total calculation as you type.
- Print-ready invoice layout (click 🖨️ Print Invoice).
- Edit or delete invoices.
- Filter by status, month, or search by number/customer.
- Generate a credit note directly from any invoice.

### Credit Notes
- Reference any existing invoice (auto-pulls customer & line items) or create standalone.
- Manual credit note number entry, auto-generated as `CN-00001-<invoice#>`.
- Requires a reason for the credit.
- Print-ready layout, clearly marked in red/negative values.

### Statements
- Generate per-customer or all-customer statements for any date range.
- Pulls all invoices & credit notes in the period.
- Shows running balance (Invoiced − Credits = Net Balance).
- Preview before saving; saved statements are listed and reprintable anytime.

### Sales Reports
- Month-by-month report selector (last 12 months).
- Product performance table (units sold, revenue, % of total).
- Daily sales trend chart and product revenue chart.
- 12-month comparison table.
- Top customers for the selected month.
- Printable report layout.

### Products (Stock Management)
- Add / edit / **remove** products.
- **Update prices** anytime — dedicated "Update Price" button with confirmation, logged to audit trail.
- Track stock quantity, cost price, selling price, SKU, unit.
- Grid view (visual cards) and table view.
- Low-stock highlighting (<20 units).
- Active/Inactive toggle (soft-delete alternative — keeps historical invoice data intact).

### Customers
- Add/edit/remove customers (with email, phone, address).
- View total invoices and spend per customer.
- "Walk-in Customer" is a protected default record.

### Design
- Forest green & gold color palette, Playfair Display + Inter typography.
- Smooth animations: card rises, fade-ups, hover effects, animated login background orbs, toast notifications.
- Fully responsive tables and grid layouts.
- Print stylesheets strip away navigation/buttons for clean document printing.

---

## 🔒 Security Review & Hardening

This system was built with a **defense-in-depth approach appropriate for a client-side, browser-based application**. Below is a full breakdown of what's implemented and what you should be aware of.

### ✅ Implemented Protections

1. **Password Hashing**
   - Passwords are never stored in plain text. A salted hash (`Security.hashPassword`) is stored instead.
   - The default admin password (`Admin@123`) should be changed on first use (see below).

2. **Brute-Force Protection**
   - After 5 failed login attempts, the account is locked for 15 minutes.
   - Failed attempts are tracked per-user in the database.

3. **Session Management**
   - Sessions are stored in `sessionStorage` (cleared when the browser tab closes — more secure than `localStorage` for session tokens).
   - Sessions auto-expire after 8 hours.
   - Session data is encrypted before storage.

4. **Data Encryption at Rest**
   - All application data (`products`, `invoices`, `credit notes`, `statements`, `users`, etc.) is encrypted with an XOR/Base64 cipher before being written to `localStorage`.
   - This prevents casual inspection of raw data via browser dev tools, though see "Limitations" below.

5. **Input Sanitization (XSS Protection)**
   - All user-entered text (`Security.sanitize`) is HTML-escaped before being rendered, preventing stored/reflected Cross-Site Scripting (XSS) attacks via product names, customer names, notes, reasons, etc.
   - All output uses `Fmt.escape()` consistently across every page.

6. **Input Validation**
   - Numeric fields (prices, stock, quantities) are validated to reject negative numbers and non-numeric input.
   - Email and phone formats are validated with regex before saving.
   - Maximum length limits (`maxlength`) on all text inputs prevent oversized payloads.
   - Duplicate SKU and duplicate invoice number checks prevent data integrity issues.

7. **Security Headers (Meta Tags)**
   - `Content-Security-Policy` restricts script/style sources.
   - `X-Frame-Options: DENY` prevents clickjacking via iframes.
   - `Referrer-Policy: no-referrer` prevents leaking URLs to external sites.

8. **Audit Logging**
   - Every sensitive action (login, logout, create/update/delete invoice, price changes, product/customer changes) is logged with timestamp and user ID to an internal audit trail (`auditLog` table), capped at 500 entries.

9. **Access Control**
   - Every protected page calls `Auth.require()` on load — if no valid session exists, the user is redirected to the login page immediately.

10. **Form Security**
    - `novalidate` + custom validation prevents browser autofill quirks from bypassing checks.
    - Password field has a show/hide toggle but defaults to hidden.
    - No sensitive data is logged to the browser console in production code paths.

### ⚠️ Important Limitations (Please Read)

This is a **client-side only system** — all data lives in the browser's `localStorage`/`sessionStorage` on the device used. This is suitable for a **single-computer / single-user retail setup** (e.g., a shop till PC), but you should understand the following before relying on it for sensitive, multi-user, or networked use:

1. **Not a substitute for a real backend + database.**
   - `localStorage` is per-browser, per-device. Data does **not** sync across computers or browsers automatically.
   - If the browser cache/storage is cleared, **all data is lost**. **Back up regularly** (see below).

2. **Encryption is obfuscation, not military-grade.**
   - The XOR/Base64 "encryption" deters casual snooping in dev tools but is **not equivalent to AES** and should not be relied upon if the device itself could be compromised by a technically skilled attacker. For genuinely sensitive client data (e.g. national ID numbers, payment card data), a server-side database with proper encryption (AES-256, bcrypt/Argon2 for passwords) is strongly recommended.

3. **Single shared login.**
   - There is currently one admin account. If multiple staff use the system, they will share this login — meaning the audit log won't distinguish between individual staff members unless you create additional user accounts (the `users` table supports this, but there's no UI yet to add users — this can be added on request).

4. **No network transmission = no interception risk, but also no real-time backup.**
   - Because everything runs locally, there's no server to hack remotely — but it also means there's no automatic cloud backup.

### 📋 Recommended Next Steps for Production Use

1. **Change the default password immediately.** Open the browser console (F12) on the login page and run:
   ```js
   DB.update('users', 'u1', { password: Security.hashPassword('YourNewStrongPassword123!') });
   ```
   Then log in with the new password. (A proper "Change Password" UI page can be added on request.)

2. **Back up your data regularly.** Run this in the console to export all data as JSON:
   ```js
   console.log(Security.encrypt === undefined ? '' : JSON.stringify(DB._cache, null, 2));
   ```
   Copy the output and save it to a `.json` file. (An "Export/Import Backup" button can be added on request for one-click backups.)

3. **Restrict physical access** to the device running this system — since data is local, anyone with access to the browser profile can potentially access it.

4. **For multi-device or multi-staff use**, consider migrating to a proper backend (e.g., Node.js + a real database like PostgreSQL/MySQL with bcrypt password hashing) — the current architecture (`DB`, `Auth`, `DocNumber` modules in `js/db.js`) is structured so this migration is straightforward later.

5. **Use HTTPS** if you ever host this on a web server (not just opening the file locally), to protect against network-level interception.

---

## 🧾 Default Login

| Username | Password    |
|----------|-------------|
| `Powell`  | `Admin@123` |

**⚠️ Change this immediately — see Security Notes above.**

---

## 🛠️ Customization

- **Company details** (name, address, phone, email) appear on every printed document. To change them, search for `"NurturedChoice Products"`, `"Nairobi, Kenya"`, `"+254 700 000 000"`, and `"info@nurturedchoice.com"` across the HTML files and replace with your real details.
- **Colors/fonts**: edit the `:root` CSS variables at the top of `css/style.css`.
- **Products**: edit directly via the Products page in the app — no code changes needed.

---

## 🧪 Testing Checklist

- [ ] Log in / log out / wrong password lockout
- [ ] Add, edit, deactivate, and remove a product
- [ ] Update a product's price and verify it reflects in new invoices
- [ ] Create an invoice with manual invoice number
- [ ] Print an invoice
- [ ] Generate a credit note from an existing invoice
- [ ] Generate a statement for a date range and verify balance math
- [ ] View the monthly sales report and verify product totals
- [ ] Refresh the browser — confirm data persists (localStorage)
- [ ] Try accessing `dashboard.html` directly without logging in (should redirect to login)
