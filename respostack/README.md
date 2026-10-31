# Respostack — Privacy-First Personal Responsibilities Manager

> **Track what matters today. Keep your personal data strictly on your device.**

Respostack (formerly Life Admin) is a lightweight, privacy-first Progressive Web App (PWA) designed to help ordinary people manage life responsibilities—bills, preventive health checkups, document renewals, continuing education, and household tasks—without recurring fees, account lock-in, tracking, or cloud surveillance.

---

## Recurring Responsibilities & Schedule Automation (Task 006)

In **Task 006: Implement Recurring Responsibilities**, Respostack introduces schedule automation, allowing users to create responsibilities that repeat periodically, complete individual occurrences, and automatically maintain their next occurrence:

### 1. The Recurrence Data Model
- **Supported Frequencies:** `daily`, `weekly`, `monthly`, `yearly`.
- **Interval Support:** Positive integer $\ge 1$ (e.g. repeat every 1 day, every 2 weeks, every 3 months).
- **Weekday Scheduling for Weekly Tasks:** Configurable weekday selection (Sunday to Saturday) allowing multi-day patterns (e.g. Mon, Wed, Fri).
- **Optional End Date:** Responsibilities can configure an optional termination date (`endDate`). No occurrences will be generated beyond this boundary.
- **Series & Occurrence Separation:** Each recurring series shares a stable `seriesId`. Each occurrence is an independent `Responsibility` record with its own due date, completion status, and completion timestamp.

### 2. Deterministic Scheduling & Date Policies
- **Timezone-Isolated Calendar Arithmetic:** Calculations operate directly on local calendar dates (`YYYY-MM-DD`) without fixed millisecond approximations, avoiding Daylight Saving Time (DST) or timezone shifts.
- **Monthly Clamping Policy:** Monthly responsibilities scheduled on the 29th, 30th, or 31st automatically clamp to the last day of shorter months:
  - January 31 $\rightarrow$ February 28 (or February 29 in leap years).
  - February 28 $\rightarrow$ March 31 (the original target day `monthDay: 31` is preserved across short months).
  - March 31 $\rightarrow$ April 30.
- **Yearly Leap Day Policy:** Annual responsibilities scheduled on February 29 clamp to February 28 on non-leap years and restore to February 29 on leap years.

### 3. Recurrence Lifecycle & Occurrence Management
- **One Active Occurrence at a Time:** To avoid overwhelming the user's dashboard or IndexedDB, a recurring series maintains at most **one active (uncompleted) occurrence**.
- **Completing an Occurrence:**
  - Marks the current occurrence as completed with `completedAt: nowIso`.
  - Atomically checks if an active occurrence for this `seriesId` already exists.
  - If none exists, calculates the next due date and provisions the next active occurrence inside an atomic Dexie transaction.
  - If a reminder was set on the completed occurrence, the time-of-day carries forward to the new due date.
- **Reopening an Occurrence:**
  - Reopening a completed occurrence resets its status to active (`isCompleted: false`, `completedAt: undefined`).
  - Does not delete already provisioned future occurrences and does not alter historical records.
  - Idempotent: repeated completions or reopens reuse existing future occurrences without creating duplicates.
- **Editing Scopes:**
  - **Edit this occurrence only:** Updates only this instance without altering the series rule or other occurrences.
  - **Edit series:** Updates the recurring template, applying changes to this occurrence and all active future occurrences of the series while strictly protecting historical completed records.

### 4. Offline Catch-Up Policy
- When reopening Respostack after an extended offline period (e.g. 2 weeks):
  - Because only one active occurrence is maintained, the dashboard is **never** flooded with dozens of duplicate overdue tasks.
  - The single active occurrence appears in **Needs Immediate Attention (Overdue)**.
  - Completing it advances the series toward current deadlines, preserving meaningful history without overwhelming the interface.

### 5. Database Migration (Version 3) & Backup Compatibility
- **Dexie Schema Migration:** Upgrades the database to Version 3 by indexing `seriesId` on `responsibilities`. Existing one-time responsibilities from Versions 1 and 2 are preserved with `seriesId: undefined` and `recurrence: undefined`.
- **Backup Schema (Version 3):**
  - Exports serialize `version: 3` and preserve `recurrence` and `seriesId`.
  - **Backward Compatibility:** Legacy backups from Version 1 (Task 004) and Version 2 (Task 005) remain 100% restorable.
  - Future unsupported versions ($>3$) are safely rejected with an upgrade prompt.

---

## Technical Stack

- **Framework:** [React 18](https://react.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (strict type checking enabled)
- **Build Tool:** [Vite 5](https://vitejs.dev/) with [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- **Styling:** [Tailwind CSS 3](https://tailwindcss.com/)
- **Persistence:** [Dexie.js 4](https://dexie.org/) with native browser [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- **Testing:** [Vitest 2](https://vitest.dev/), [React Testing Library](https://testing-library.com/), [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB), and native Node 18 `node:test`

---

## Project Structure

```text
respostack/
├── .gitignore
├── index.html                          # Root HTML with PWA manifest, theme colors & touch icons
├── package.json                        # Stable dependencies including vite-plugin-pwa
├── postcss.config.js
├── README.md                           # Documentation, PWA guide, and recurrence specification
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts                      # Vite configuration with VitePWA & Workbox precaching
├── vitest.config.ts
├── public/
│   ├── apple-touch-icon.png            # 180x180 iOS home screen icon
│   ├── favicon.ico                     # Multi-size browser favicon
│   ├── manifest.webmanifest            # W3C Web App Manifest
│   ├── pwa-192x192.png                 # Standard 192px Android icon
│   ├── pwa-512x512.png                 # Standard 512px splash icon
│   ├── pwa-maskable-512x512.png        # Adaptive 512px maskable icon
│   └── pwa-icon.svg                    # Vector SVG brand icon
├── scripts/
│   ├── generate-icons.py               # Generates crisp PWA PNG & SVG icon assets
│   ├── patch-canvas-app.py             # Canvas interactive app patch helper
│   ├── patch-canvas-reminders.py       # Canvas reminder system patch helper
│   ├── test-backup.mjs                 # Automated tests for backup export, schema (v1, v2, v3), and restore
│   ├── test-pwa.mjs                    # Automated tests for PWA manifest & lifecycle
│   ├── test-recurrence.mjs             # Automated tests for recurrence calculations, lifecycle & idempotence
│   ├── test-reminders.mjs              # Automated tests for reminder eligibility & deduplication
│   ├── test-repo-mock.mjs              # Automated tests for repository rules
│   └── verify-logic.mjs                # Automated tests for domain logic & dates
└── src/
    ├── App.tsx                         # Main app coordinator with reminder scheduling lifecycle
    ├── index.css                       # Tailwind directives & base styles
    ├── main.tsx                        # React entry point with service worker registration
    ├── components/
    │   ├── common/                     # Badge, Button, Card, Modal, ConfirmDialog, EmptyState
    │   ├── layout/                     # Header, Navigation, Layout
    │   ├── pwa/
    │   │   ├── OfflineIndicator.tsx    # Unobtrusive offline status indicator
    │   │   ├── PwaInstallBanner.tsx    # Non-intrusive install banner & iOS instructions
    │   │   └── PwaUpdateBanner.tsx     # Safe user-prompted service worker update banner
    │   ├── responsibilities/           # ResponsibilityCard, StatCounterCard, ResponsibilityFormModal
    │   └── views/                      # TodayView, AllResponsibilitiesView, CompletedView, SettingsView
    ├── data/demoData.ts                # Clearly labelled [Sample] records (opt-in only)
    ├── db/
    │   ├── db.ts                       # Dexie IndexedDB schema with Version 3 migrations
    │   └── responsibilitiesRepo.ts     # Typed repository layer with atomic recurrence provisioning
    ├── features/
    │   ├── backup/
    │   │   ├── backup.types.ts         # Backup schema interface (Versions 1, 2, 3)
    │   │   ├── backup.validation.ts    # Strict JSON validation with recurrence support
    │   │   ├── backup.service.ts       # Serialization, file download, and restore services
    │   │   ├── backup.test.ts          # Vitest test suite for backup workflows
    │   │   └── BackupSettings.tsx      # Accessible Settings UI for backup and restore
    │   ├── recurrence/
    │   │   ├── recurrence.types.ts     # Recurrence rules, frequencies, and weekday definitions
    │   │   ├── recurrence.service.ts   # Deterministic date arithmetic & clamping calculations
    │   │   ├── recurrence.validation.ts # Validation rules for recurrence configurations
    │   │   ├── recurrence.lifecycle.ts  # Occurrence completion, reopening, and series editing
    │   │   ├── recurrence.test.ts      # Vitest test suite for recurrence rules
    │   │   └── RecurrenceSelector.tsx  # Accessible recurrence UI form control
    │   └── reminders/
    │       ├── reminder.types.ts       # Reminder statuses, logs, and permission interfaces
    │       ├── reminder.service.ts     # In-app attention logic & relative formatting
    │       ├── reminder.scheduler.ts   # Persistent deduplication & notification dispatch
    │       ├── reminder.settings.ts    # Notification preference persistence in IndexedDB
    │       ├── reminder.test.ts        # Vitest test suite for reminder eligibility
    │       └── ReminderSettings.tsx    # Accessible Settings UI for reminders and notifications
    ├── hooks/
    │   ├── usePwaInstall.ts            # PWA standalone & install prompt management
    │   └── usePwaUpdate.ts             # PWA service worker update lifecycle hook
    ├── pwa/
    │   └── register.ts                 # Service worker registration helper
    ├── tests/
    │   ├── dateUtils.test.ts           # Date boundary & classification tests
    │   ├── filterSortUtils.test.ts     # Search, filter, and stable sorting tests
    │   ├── pwaInstall.test.ts          # Standalone mode & platform detection tests
    │   ├── pwaManifest.test.ts         # Manifest schema & physical icon asset verification
    │   ├── responsibilitiesRepo.test.ts # Dexie DB integration tests
    │   ├── ResponsibilityForm.test.tsx # Form component interaction tests
    │   ├── setup.ts                    # Jest-dom & fake-indexeddb setup
    │   └── validation.test.ts          # Validation engine unit tests
    ├── types/responsibility.ts         # TypeScript models with seriesId and recurrence
    └── utils/
        ├── dateUtils.ts                # Calendar date math & classification
        ├── filterSortUtils.ts          # Pure filtering, stable sorting, & metrics
        └── validation.ts               # Leap-year calendar validation
```

---

## Getting Started

### Prerequisites

- **Node.js:** `v18.0.0` or later
- **npm:** `v9.0.0` or later (or `pnpm` / `yarn`)
- A modern browser with IndexedDB and Service Worker support (Chrome, Firefox, Safari, Edge)

### Setup & Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Run TypeScript check:**
   ```bash
   npm run typecheck
   ```

4. **Run Vitest test suite:**
   ```bash
   npm test
   ```

5. **Run zero-dependency standalone Node tests:**
   ```bash
   node scripts/verify-logic.mjs
   node scripts/test-repo-mock.mjs
   node scripts/test-pwa.mjs
   node scripts/test-backup.mjs
   node scripts/test-reminders.mjs
   node scripts/test-recurrence.mjs
   ```

6. **Create production build:**
   ```bash
   npm run build
   ```

7. **Preview production build locally:**
   ```bash
   npm run preview
   ```


---

## Free Static Hosting & Deployment Guide

Respostack is a 100% client-side, local-first application. It requires **no server runtime, no database server, and no paid hosting**. You can deploy it completely free on any static web host:

### 1. GitHub Pages (Automated via GitHub Actions)
1. In your GitHub repository, navigate to **Settings > Pages**.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [main]

   permissions:
     contents: read
     pages: write
     id-token: write

   concurrency:
     group: 'pages'
     cancel-in-progress: true

   jobs:
     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4
         - name: Setup Node
           uses: actions/setup-node@v4
           with:
             node-version: 18
             cache: 'npm'
         - name: Install dependencies
           run: npm ci
         - name: Build with base path
           run: npm run build
           env:
             BASE_URL: /${{ github.event.repository.name }}/
         - name: Setup Pages
           uses: actions/configure-pages@v4
         - name: Upload artifact
           uses: actions/upload-pages-artifact@v3
           with:
             path: './dist'
         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v4
   ```
4. Push to `main`. Your site will be published at `https://<username>.github.io/<repository-name>/`.

### 2. Vercel (Free Hobby Tier)
1. Push your repository to GitHub.
2. Sign in to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Select your repository. Vercel automatically detects **Vite**.
4. Leave settings at default (Build Command: `npm run build`, Output Directory: `dist`).
5. Click **Deploy**. Your app is immediately available with automatic SSL and global CDN.

### 3. Netlify (Free Starter Tier)
1. **Option A (Git Integration):** Link your GitHub repo in Netlify, set Build Command to `npm run build` and Publish Directory to `dist`.
2. **Option B (Drag and Drop):** Run `npm run build` locally, then drag the generated `dist/` directory directly into Netlify Drop.

### 4. Cloudflare Pages (Free Tier)
1. In the Cloudflare dashboard, go to **Workers & Pages > Create application > Pages > Connect to Git**.
2. Select repository, choose the **Vite** build preset.
3. Build command: `npm run build`, Build output directory: `dist`.
4. Deploy. Cloudflare provides fast worldwide edge distribution with no bandwidth limits.

---

## Known Limitations & Intentional Non-Features

- **Browser Storage Boundary:** Records are stored strictly in the current browser profile's IndexedDB. Clearing browser site data will delete saved records. Use **Download Backup** regularly to keep offline JSON copies.
- **Client-Side Automation:** Recurrence calculation and occurrence provisioning happen within the client application when it runs, not via a cloud cron worker.
- **Deliberately Excluded (Not Supported):**
  - No cloud synchronization or multi-user shared responsibilities.
  - No arbitrary complex iCalendar RRULE syntax expressions.
  - No automatic background cloud exports.
  - No email or SMS notifications.

---

## License

This project is currently **Unlicensed / All Rights Reserved** until the repository owner selects an open-source license (such as MIT, Apache-2.0, or AGPL-3.0).
