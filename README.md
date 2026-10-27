# TableSync Pro: Production-Oriented QR Restaurant Ordering & Management System

TableSync Pro is a restaurant operating system built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Firebase (Cloud Firestore, Auth, Admin SDK)**.

It interconnects four real-time operational interfaces over one backend:
1. **Customer QR Menu & Ordering Portal** (`/menu/[tablePublicId]`)
2. **Kitchen Display System (KDS)** (`/kitchen`)
3. **Waiter POS & Table Management** (`/waiter`)
4. **Admin Executive Operations Hub** (`/admin`)

---

## 🌟 Architecture & Design System

### 1. Customer QR Flow (`/menu/[tablePublicId]`)
- **Opaque Public Identifiers**: Tables are accessed via non-sequential cryptographically generated tokens (e.g., `tbl_pub_05`) rather than guessable table numbers.
- **Server-Side Trust**: Client carts only submit item IDs and quantities. Prices, item availability, taxes, and order totals are strictly snapshot and computed on the trusted backend.
- **Dietary Badges & Special Notes**: Item-level instructions ("less spicy", "no onion") and Veg/Vegan/Non-Veg indicators.
- **Customer Bill Calling**: Direct one-tap table bill requests from the mobile interface.

### 2. Kitchen Display System (KDS) (`/kitchen`)
- **Large-Format Touch Monitor**: High-contrast dark theme with audio ticket chime notifications.
- **Item-Level Granular Statuses**: Cooks toggle individual dishes through `pending -> preparing -> ready -> served`.
- **Elapsed-Time Monitors & Delay Flags**: Live timers mark tickets exceeding 15 minutes as delayed with visible alert badges.

### 3. Waiter POS (`/waiter`)
- **Live Floor Status**: Real-time table status grid (`Available`, `Occupied`, `Awaiting Bill`).
- **Direct Manual Food Punching**: Servers punch orders directly into active or new table sessions.
- **Serving Workflow**: Waiters are notified when dishes are marked `Ready` in the kitchen and can mark them `Served`.
- **Bill Settlement & Session Closure**: Atomic check-out verifying all dishes are completed before freeing the table.

### 4. Admin Executive Hub (`/admin`)
- **Live Financial & Operational KPIs**: Total sales revenue, live occupancy rate, active kitchen tickets, and ready-to-serve counts.
- **Table Management & QR Code Generation**: Generate, preview, and download table QR PNG codes.
- **Orders Audit Ledger**: Complete trace of order sources (`qr` vs. `waiter`), item snapshots, and status updates.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 22)
- npm or pnpm

### 1. Installation
```bash
git clone <repo-url>
cd table
npm install
```

### 2. Environment Setup
Copy the environment template:
```bash
cp .env.example .env.local
```

Configure your Firebase credentials in `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-app"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Firebase Admin SDK (Server-Side)
FIREBASE_PROJECT_ID="your-app"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-app.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### 3. Build & Run
Development server:
```bash
npm run dev
```

Production build verification:
```bash
npx next build --webpack
npm run start
```

---

## 🔒 Security & Firestore Rules
Production-grade least-privilege rules are defined in `firestore.rules`:
- Public customers can only read active menu items and place orders via authenticated or verified public routes.
- Waiters can only modify table orders and sessions assigned to their floor permissions.
- Kitchen staff can only update item preparation states.
- Admin privileges are strictly verified server-side.
- Audit logs are append-only and immutable.
