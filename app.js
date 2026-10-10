/**
 * AutoYar - Smart Car Assistant
 * Main Application Logic
 */

const app = {
    // --- Configuration (To be filled by user from CHECKLIST.md) ---
    config: {
        supabaseUrl: 'https://miotuyaypolahjzhkfpq.supabase.co',
        supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pb3R1eWF5cG9sYWhqemhrZnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MTYyOTgsImV4cCI6MjEwNzE5MjI5OH0.YUnMHxiM0dbYuqeOSbsM66HqQrmXVW2PvFScGDZZ7mw',
        zarinpalMerchant: 'YOUR_ZARINPAL_MERCHANT_ID',
        openAiKey: 'YOUR_OPENAI_API_KEY' // Or specific AI backend endpoint
    },

    // --- State ---
    state: {
        user: null,
        phone: '',
        currentKm: 0,
        records: [],
        obdDevice: null
    },

    // --- DOM Elements ---
    els: {},

    // --- Initialization ---
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.initSupabase();
        this.checkAuth();
        this.registerServiceWorker();
    },

    cacheDOM() {
        this.els = {
            authView: document.getElementById('auth-view'),
            mainLayout: document.getElementById('main-layout'),
            views: document.querySelectorAll('.view:not(#auth-view)'),
            navItems: document.querySelectorAll('.nav-item'),

            // Auth
            phoneInput: document.getElementById('phone-input'),
            sendOtpBtn: document.getElementById('send-otp-btn'),
            otpInput: document.getElementById('otp-input'),
            verifyOtpBtn: document.getElementById('verify-otp-btn'),
            loginStep1: document.getElementById('login-step-1'),
            loginStep2: document.getElementById('login-step-2'),
            displayPhone: document.getElementById('display-phone'),
            userPhoneDisplay: document.getElementById('user-phone-display'),
            logoutBtn: document.getElementById('logout-btn'),

            // Dashboard
            dashboardKm: document.getElementById('dashboard-km'),
            updateKmBtn: document.getElementById('update-km-btn'),

            // History & Modals
            newRecordBtn: document.getElementById('new-record-btn'),
            addRecordModal: document.getElementById('add-record-modal'),
            closeModals: document.querySelectorAll('.close-modal'),
            recordForm: document.getElementById('record-form'),
            recordType: document.getElementById('record-type'),
            serviceFields: document.querySelectorAll('.service-fields'),

            // Tabs
            tabs: document.querySelectorAll('.tab'),
            tabContents: document.querySelectorAll('.tab-content'),

            // Premium
            premiumBtn: document.getElementById('premium-btn'),
            paymentModal: document.getElementById('payment-modal'),

            // OBD & AI
            connectObdBtn: document.getElementById('connect-obd-btn'),
            obdStatus: document.getElementById('obd-connection-status'),
            aiInput: document.getElementById('ai-input'),
            aiSendBtn: document.getElementById('ai-send-btn'),
            aiMessages: document.getElementById('ai-messages'),

            toast: document.getElementById('toast')
        };
    },

    bindEvents() {
        // Navigation
        this.els.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const viewId = e.currentTarget.dataset.view;
                this.switchView(viewId);

                this.els.navItems.forEach(nav => nav.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Auth
        this.els.sendOtpBtn.addEventListener('click', () => this.sendOtp());
        this.els.verifyOtpBtn.addEventListener('click', () => this.verifyOtp());
        document.getElementById('back-to-phone-btn').addEventListener('click', () => {
            this.els.loginStep2.classList.remove('active');
            this.els.loginStep1.classList.add('active');
        });
        this.els.logoutBtn.addEventListener('click', () => this.logout());

        // Modals
        this.els.newRecordBtn.addEventListener('click', () => this.openModal(this.els.addRecordModal));
        this.els.premiumBtn.addEventListener('click', () => this.openModal(this.els.paymentModal));
        this.els.closeModals.forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // Form Logic
        this.els.recordType.addEventListener('change', (e) => {
            const isService = e.target.value === 'service';
            this.els.serviceFields.forEach(field => {
                field.style.display = isService ? 'block' : 'none';
                field.querySelector('input').required = isService;
            });
        });
        this.els.recordForm.addEventListener('submit', (e) => this.saveRecord(e));

        // Tabs
        this.els.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetId = e.target.dataset.target;
                this.els.tabs.forEach(t => t.classList.remove('active'));
                this.els.tabContents.forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(targetId).classList.add('active');
            });
        });

        // OBD & AI
        this.els.connectObdBtn.addEventListener('click', () => this.connectOBD());
        this.els.aiSendBtn.addEventListener('click', () => this.sendAiMessage());
        this.els.aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendAiMessage();
        });

        // Dashboard KM update (Mock)
        this.els.updateKmBtn.addEventListener('click', () => {
            const newKm = prompt('کیلومتر فعلی خودرو را وارد کنید:', this.state.currentKm);
            if (newKm && !isNaN(newKm)) {
                this.updateKm(parseInt(newKm));
            }
        });
    },

    // --- Core Methods ---

    initSupabase() {
        if(this.config.supabaseUrl === 'YOUR_SUPABASE_URL') {
            console.warn("Supabase not configured yet. Running in local/mock mode.");
            return;
        }
        try {
            this.supabase = window.supabase.createClient(this.config.supabaseUrl, this.config.supabaseKey);
        } catch(e) {
            console.error("Supabase init error:", e);
        }
    },

    checkAuth() {
        // In a real app, check Supabase session here
        // const { data: { session } } = await this.supabase.auth.getSession();
        const savedUser = localStorage.getItem('autoyar_user');
        if (savedUser) {
            this.state.user = JSON.parse(savedUser);
            this.showMainApp();
        } else {
            this.els.authView.style.display = 'block';
            this.els.mainLayout.style.display = 'none';
        }
    },

    async sendOtp() {
        const phone = this.els.phoneInput.value;
        if (!phone || phone.length < 10) {
            this.showToast('شماره موبایل نامعتبر است', 'error');
            return;
        }
        this.state.phone = phone;
        this.els.displayPhone.textContent = phone;

        // Mock API Call
        this.showToast('کد تایید ارسال شد (کد تستی: 123456)', 'success');
        this.els.loginStep1.classList.remove('active');
        this.els.loginStep2.classList.add('active');
    },

    async verifyOtp() {
        const otp = this.els.otpInput.value;
        if (otp === '123456') { // Mock validation
            // In real app: await this.supabase.auth.signInWithOtp({ phone, otp })
            this.state.user = { phone: this.state.phone, id: 'user_123', isPremium: false };
            localStorage.setItem('autoyar_user', JSON.stringify(this.state.user));
            this.showMainApp();
            this.showToast('ورود موفقیت آمیز بود', 'success');
        } else {
            this.showToast('کد تایید اشتباه است', 'error');
        }
    },

    logout() {
        localStorage.removeItem('autoyar_user');
        // if(this.supabase) await this.supabase.auth.signOut();
        window.location.reload();
    },

    showMainApp() {
        this.els.authView.style.display = 'none';
        this.els.authView.classList.remove('active');
        this.els.mainLayout.style.display = 'block';
        this.els.userPhoneDisplay.textContent = this.state.user.phone;

        this.switchView('dashboard-view');
        this.loadDashboardData();
        this.loadHistory();
    },

    switchView(viewId) {
        this.els.views.forEach(view => {
            view.classList.remove('active');
            view.style.display = 'none'; // Ensure hidden
        });
        const targetView = document.getElementById(viewId);
        if(targetView) {
            targetView.style.display = 'block';
            // small delay for animation
            setTimeout(() => targetView.classList.add('active'), 10);
        }

        if(viewId === 'dashboard-view' && !this.chartInit) {
            this.initChart();
            this.chartInit = true;
        }
    },

    // --- Modals & UI ---
    openModal(modal) {
        modal.classList.add('active');
    },

    closeModal(modal) {
        modal.classList.remove('active');
    },

    showToast(message, type = 'info') {
        this.els.toast.textContent = message;
        this.els.toast.className = `toast show ${type}`;
        setTimeout(() => {
            this.els.toast.classList.remove('show');
        }, 3000);
    },

    // --- Dashboard & Chart ---
    updateKm(km) {
        this.state.currentKm = km;
        this.els.dashboardKm.textContent = km.toLocaleString();
        // In real app: save to DB
        this.showToast('کیلومتر بروزرسانی شد', 'success');
        this.updatePartsHealth();
    },

    loadDashboardData() {
        this.updateKm(65000); // Mock data
    },

    initChart() {
        const ctx = document.getElementById('healthChart');
        if(!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['سالم', 'نیاز به بررسی', 'خراب'],
                datasets: [{
                    data: [70, 20, 10],
                    backgroundColor: [
                        '#10b981', // success
                        '#f59e0b', // warning
                        '#ef4444'  // danger
                    ],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },

    updatePartsHealth() {
        // Logic to calculate remaining % based on currentKm and record-next-km
    },

    // --- History & Records ---
    saveRecord(e) {
        e.preventDefault();
        const type = this.els.recordType.value;
        const record = {
            id: Date.now(),
            type: type,
            title: document.getElementById('record-title').value,
            date: new Date().toLocaleDateString('fa-IR'),
            desc: document.getElementById('record-desc').value
        };

        if (type === 'service') {
            record.km = document.getElementById('record-km').value;
            record.nextKm = document.getElementById('record-next-km').value;
            record.cost = document.getElementById('record-cost').value;
        }

        this.state.records.push(record);
        // In real app: await this.supabase.from('records').insert([record])

        this.renderRecords();
        this.closeModal(this.els.addRecordModal);
        this.els.recordForm.reset();
        this.showToast('رکورد با موفقیت ثبت شد', 'success');
    },

    loadHistory() {
        // Mock data
        this.state.records = [
            { id: 1, type: 'service', title: 'تعویض روغن موتور', date: '۱۴۰۲/۰۸/۱۵', km: '60000', cost: '1200000' },
            { id: 2, type: 'symptom', title: 'صدای جیر جیر هنگام ترمز', date: '۱۴۰۲/۰۹/۰۱', desc: 'از چرخ جلو سمت راست' }
        ];
        this.renderRecords();
    },

    renderRecords() {
        const repairsList = document.getElementById('repairs-list');
        const symptomsList = document.getElementById('symptoms-list');

        repairsList.innerHTML = '';
        symptomsList.innerHTML = '';

        this.state.records.forEach(r => {
            const div = document.createElement('div');
            div.className = 'history-item';

            let headerHtml = `<div class="history-item-header"><span>${this.escapeHTML(r.title)}</span>`;
            if (r.cost) {
                 headerHtml += `<span class="text-primary">${parseInt(r.cost).toLocaleString()} تومان</span>`;
            }
            headerHtml += `</div>`;

            let metaHtml = `<div class="history-item-meta"><span><i class="fa-regular fa-calendar"></i> ${this.escapeHTML(r.date)}</span>`;
            if (r.km) {
                metaHtml += `<span><i class="fa-solid fa-gauge"></i> ${parseInt(r.km).toLocaleString()} km</span>`;
            }
            metaHtml += `</div>`;

            let descHtml = '';
            if (r.desc) {
                descHtml = `<p style="margin-top:0.5rem; font-size:0.9rem; color:var(--text-muted)">${this.escapeHTML(r.desc)}</p>`;
            }

            div.innerHTML = headerHtml + metaHtml + descHtml;

            if (r.type === 'service') {
                repairsList.appendChild(div);
            } else {
                symptomsList.appendChild(div);
            }
        });
    },

    // --- Web Bluetooth API (OBD2) ---
    async connectOBD() {
        if (!navigator.bluetooth) {
            this.showToast('مرورگر شما از Web Bluetooth پشتیبانی نمی‌کند', 'error');
            return;
        }

        try {
            this.els.obdStatus.textContent = 'در حال جستجو...';
            // OBD2 generic UUIDs
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['0000fff0-0000-1000-8000-00805f9b34fb'] }], // Example ELM327 UUID
                optionalServices: ['generic_access']
            });

            this.state.obdDevice = device;
            const server = await device.gatt.connect();
            this.els.obdStatus.textContent = `متصل به ${device.name || 'دستگاه دیاگ'}`;
            this.els.obdStatus.style.color = 'var(--success)';

            // Further logic to read/write characteristics for OBD AT commands goes here
            this.showToast('اتصال با موفقیت انجام شد', 'success');

        } catch (error) {
            console.error(error);
            this.els.obdStatus.textContent = 'خطا در اتصال / لغو شد';
        }
    },

    // --- AI Chatbot ---
    async sendAiMessage() {
        const text = this.els.aiInput.value.trim();
        if(!text) return;

        // Add user message
        this.appendChatMessage(text, 'user');
        this.els.aiInput.value = '';

        // Mock AI thinking
        const thinkingId = this.appendChatMessage('در حال تحلیل...', 'ai');

        setTimeout(() => {
            document.getElementById(thinkingId).remove();

            // Mock Response (In real app, call OpenAI or backend API here)
            const response = `بر اساس علامتی که گفتید ("${text}")، احتمالاً مشکل از لنت ترمز یا دیسک چرخ است. پیشنهاد می‌کنم در اسرع وقت ضخامت لنت‌ها بررسی شود.`;
            this.appendChatMessage(response, 'ai');
        }, 1500);
    },

    appendChatMessage(text, sender) {
        const id = 'msg-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = `message ${sender}`;
        div.textContent = text;
        this.els.aiMessages.appendChild(div);
        this.els.aiMessages.scrollTop = this.els.aiMessages.scrollHeight;
        return id;
    },

    // --- Utility Methods ---
    escapeHTML(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    // --- Payment Gateways (Mock Architecture) ---
    processPayment(gateway) {
        this.showToast(`در حال انتقال به درگاه ${gateway === 'zarinpal' ? 'زرین‌پال' : 'اسنپ‌پی'}...`, 'info');

        // Architecture:
        // 1. Call backend (Supabase Edge Function) to create payment intent
        // 2. Receive payment URL
        // 3. window.location.href = paymentUrl;

        setTimeout(() => {
            this.closeModal(this.els.paymentModal);
            this.state.user.isPremium = true;
            this.showToast('پرداخت تستی موفقیت آمیز بود. شما پرمیوم شدید!', 'success');
            this.els.premiumBtn.style.display = 'none';
        }, 2000);
    },

    // --- PWA Service Worker ---
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').then(registration => {
                    console.log('SW registered: ', registration.scope);
                }).catch(err => {
                    console.log('SW registration failed: ', err);
                });
            });
        }
    }
};

// Start app
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
