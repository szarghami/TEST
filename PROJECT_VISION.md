# Autoyar (اتویار) - Project Vision & Master Roadmap

## 1. Project Identity & Purpose
**Autoyar** is a smart, offline-first Progressive Web App (PWA) designed to revolutionize vehicle ownership and maintenance. It is not merely a logging tool; it acts as a **"Virtual AI Mechanic"** and a **"DIY Enabler."** By tracking mileage, predicting part wear, offering AI-driven diagnostics, and providing exact DIY repair specifications, Autoyar empowers users to manage their vehicles proactively and independently.

## 2. Core Architecture & Tech Stack
To maintain a highly performant and lightweight application, the project strictly adheres to the following stack:
*   **Frontend:** Pure Vanilla HTML, CSS (Modern UI/Glassmorphism), and JavaScript (No heavy frameworks like React or Vue).
*   **Backend & Database:** Supabase (PostgreSQL, Authentication, Data syncing).
*   **Offline-First Approach:** Heavy reliance on `LocalStorage` and Service Workers for uninterrupted usage in dead zones, syncing with Supabase once the connection is restored.
*   **Deployment:** Edge deployment via Netlify / Cloudflare Pages. (All static assets MUST remain isolated in the `public` directory to prevent build size errors).

## 3. Development Roadmap (Phases)

### Phase 1: Foundation & Data Core (Current)
- [x] PWA setup and Service Worker registration.
- [x] Basic Supabase integration.
- [ ] **Multi-Vehicle Management:** Relational database structure to allow users to add and switch between multiple vehicles (e.g., using `vehicle_id`).
- [ ] **OTP Authentication:** Fast, passwordless login using phone numbers.

### Phase 2: Analytics & Smart Alerts
- [ ] **Visual Wear & Tear Dashboard:** Dynamic UI showing the percentage of life remaining for individual parts (e.g., brake pads, spark plugs) based on real-time mileage inputs.
- [ ] **Quick Mileage Updater:** Floating Action Button (FAB) for instant current mileage updates that automatically recalculate all part statuses.
- [ ] **Push Notifications:** Background sync and local notifications to alert users when a part approaches its expiration or service interval.

### Phase 3: AI & Advanced Diagnostics (The Differentiators)
- [ ] **AI Mechanic Chatbot (Gemini API):** An integrated modal where users can describe car symptoms (e.g., "steering wheel shakes at 80km/h"). The AI (instructed to act as an expert mechanic) provides short, accurate troubleshooting steps in Persian.
- [ ] **Web Bluetooth OBD-II Integration:** Direct browser-to-OBD2 dongle connection to read live engine data, RPM, coolant temp, and Diagnostic Trouble Codes (DTC) without native apps.

### Phase 4: DIY Academy & Marketplace
- [ ] **Tools & Torque Database:** For every logged part replacement, the app will specify the required tools (e.g., "10mm wrench") and exact torque specs (e.g., for M15 engine spark plugs).
- [ ] **Video Tutorials:** Linking specific maintenance tasks to step-by-step DIY video guides.
- [ ] **Parts Marketplace:** Affiliate links or a dedicated store for purchasing authentic vehicle parts.

### Phase 5: Polish, SEO & Monetization
- [ ] **UI/UX Overhaul:** Mobile-first, dark cinematic theme with glassmorphism, soft shadows, and fully rounded borders. Must feel like a premium Native App.
- [ ] **AEO & SEO:** Semantic HTML and meta tags optimized for automotive queries.
- [ ] **Premium Subscription Tiers:** Locking advanced features (like AI diagnostics or OBD integration) behind a paywall (e.g., Zarinpal integration).

## 4. Directives for AI Agents & Developers (Jules)
1.  **Expert Autonomy:** You are acting as a Senior Developer. Troubleshoot build, CI/CD, or logic errors aggressively and independently.
2.  **Modular Code:** Build features so they plug into the existing architecture without breaking the core `app.js` loop.
3.  **Persian Documentation:** Write concise Persian comments (`//`) above complex functions to explain the logic to the project owner.
4.  **UI Standards:** Never output raw, unstyled HTML. Always apply the agreed-upon modern CSS methodologies (Glassmorphism, hover states, smooth transitions).
