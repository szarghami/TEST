/**
 * AutoYar - Smart Car Assistant
 * Main Application Logic
 */

// Global early capture of beforeinstallprompt event
let earlyDeferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    earlyDeferredInstallPrompt = e;
    if (window.app && typeof window.app.onInstallPromptAvailable === 'function') {
        window.app.onInstallPromptAvailable(e);
    }
});

window.addEventListener('appinstalled', () => {
    if (window.app && typeof window.app.onAppInstalled === 'function') {
        window.app.onAppInstalled();
    }
});

const app = {
    // --- Configuration (To be filled by user from CHECKLIST.md) ---
    config: {
        supabaseUrl: 'https://miotuyaypolahjzhkfpq.supabase.co', // FIXED: removed /rest/v1/
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
        vehicles: [],
        currentVehicleId: null,
        obdDevice: null,
        deferredPrompt: null,
        isStandalone: false
    },

    // --- DOM Elements ---
    els: {},

    // --- Initialization ---
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.initPwa();
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


            // Vehicles
            vehicleSelector: document.getElementById('vehicle-selector'),
            addVehicleBtn: document.getElementById('add-vehicle-btn'),
            addVehicleModal: document.getElementById('add-vehicle-modal'),
            vehicleForm: document.getElementById('vehicle-form'),
            vehicleName: document.getElementById('vehicle-name'),
            vehiclePlate: document.getElementById('vehicle-plate'),

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

            toast: document.getElementById('toast'),
            authInstallBtn: document.getElementById('auth-install-btn'),
            headerInstallBtn: document.getElementById('header-install-btn'),
            installGroup: document.getElementById('install-group'),
            installGuideModal: document.getElementById('install-guide-modal'),
            guideTriggerInstallBtn: document.getElementById('guide-trigger-install-btn'),
            guideIos: document.getElementById('guide-ios'),
            guideAndroid: document.getElementById('guide-android'),
            guideDesktop: document.getElementById('guide-desktop')
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
        if (this.els.sendOtpBtn) this.els.sendOtpBtn.addEventListener('click', () => this.sendOtp());
        if (this.els.verifyOtpBtn) this.els.verifyOtpBtn.addEventListener('click', () => this.verifyOtp());
        const backBtn = document.getElementById('back-to-phone-btn');
        if (backBtn) backBtn.addEventListener('click', () => {
            this.els.loginStep2.classList.remove('active');
            this.els.loginStep1.classList.add('active');
        });
        if (this.els.logoutBtn) this.els.logoutBtn.addEventListener('click', () => this.logout());

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

        // PWA Install Triggers
        const installTriggerElements = [
            this.els.bannerInstallBtn,
            this.els.authInstallBtn,
            this.els.headerInstallBtn,
            this.els.installBtn,
            this.els.guideTriggerInstallBtn
        ];

        installTriggerElements.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.triggerInstall();
                });
            }
        });


        // Connectivity changes
        window.addEventListener('online', () => {
            this.showToast('اینترنت متصل شد. در حال همگام‌سازی...', 'success');
            this.syncOfflineData();
        });
        window.addEventListener('offline', () => {
            this.showToast('ارتباط با اینترنت قطع شد. برنامه در حالت آفلاین کار می‌کند.', 'warning');
        });

        this.els.updateKmBtn.addEventListener('click', () => {
            const newKm = prompt('کیلومتر فعلی خودرو را وارد کنید:', this.state.currentKm);
            if (newKm && !isNaN(newKm)) {
                this.updateKm(parseInt(newKm));
            }
        });
    },

    // --- Core Methods ---

    initSupabase() {
        if(this.config.supabaseUrl === 'YOUR_SUPABASE_URL' || !this.config.supabaseUrl) {
            console.warn("Supabase not configured. Running in Local-Only mode.");
            this.supabase = null;
            return;
        }
        try {
            this.supabase = window.supabase.createClient(this.config.supabaseUrl, this.config.supabaseKey);
        } catch(e) {
            console.error("Supabase init error:", e);
            this.supabase = null;
        }
    },

    checkAuth() {
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
        try {
            const phone = this.els.phoneInput.value;
            if (!phone || phone.length < 10) {
                this.showToast('شماره موبایل نامعتبر است', 'error');
                return;
            }
            this.state.phone = phone;
            this.els.displayPhone.textContent = phone;

            let apiSuccess = false;
            if (this.supabase) {
                try {
                    const { error } = await this.supabase.auth.signInWithOtp({ phone });
                    if (error) throw error;
                    apiSuccess = true;
                } catch(e) {
                    console.error('Supabase OTP Error:', e);
                    // Fallback to local mode if Supabase fails (e.g. invalid config)
                    apiSuccess = false;
                }
            }

            if (apiSuccess) {
                this.showToast('کد تایید ارسال شد', 'success');
            } else {
                this.showToast('کد تایید ارسال شد (کد تستی: 123456)', 'success');
            }

            this.els.loginStep1.classList.remove('active');
            this.els.loginStep2.classList.add('active');
        } catch (err) {
            console.error('Error sending OTP:', err);
            this.showToast('خطا در سیستم', 'error');
        }
    },

    async verifyOtp() {
        try {
            const otp = this.els.otpInput.value;
            let apiSuccess = false;

            if (this.supabase) {
                try {
                    const { data, error } = await this.supabase.auth.verifyOtp({
                        phone: this.state.phone,
                        token: otp,
                        type: 'sms'
                    });

                    if (error) throw error;

                    this.state.user = {
                        phone: this.state.phone,
                        id: data.user.id,
                        isPremium: false
                    };
                    apiSuccess = true;
                } catch(e) {
                    console.error('Supabase Verify Error:', e);
                    apiSuccess = false;
                }
            }

            if (!apiSuccess) {
                // Fallback / local test mode
                if (otp === '123456') {
                    this.state.user = { phone: this.state.phone, id: 'user_123', isPremium: false };
                } else {
                    this.showToast('کد تایید اشتباه است', 'error');
                    return; // Stop here
                }
            }

            localStorage.setItem('autoyar_user', JSON.stringify(this.state.user));
            this.showMainApp();
            this.showToast('ورود موفقیت آمیز بود', 'success');

        } catch (err) {
            console.error('Error verifying OTP:', err);
            this.showToast('خطا در تایید کد', 'error');
        }
    },

    async logout() {
        localStorage.removeItem('autoyar_user');
        if(this.supabase) {
            await this.supabase.auth.signOut();
        }
        window.location.reload();
    },

    showMainApp() {
        const publicLanding = document.getElementById('public-landing');
        if (publicLanding) publicLanding.style.display = 'none';
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
            view.style.display = ''; // Let CSS handle it
        });
        const targetView = document.getElementById(viewId);
        if(targetView) {
            targetView.classList.add('active');
            targetView.style.display = ''; // Let CSS handle it
        }

        if(viewId === 'dashboard-view' && !this.chartInit) {
            try {
                this.initChart();
                this.chartInit = true;
            } catch (e) {
                console.warn("Chart.js failed to load. Running without chart.");
            }
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
        this.showToast('کیلومتر بروزرسانی شد', 'success');
        this.updatePartsHealth();
    },

    async loadDashboardData() {
        let latestKm = 0;

        const recordsWithKm = this.state.records.filter(r => r.km != null);
        if (recordsWithKm.length > 0) {
            latestKm = Math.max(...recordsWithKm.map(r => parseInt(r.km)));
        } else {
            const localRecords = JSON.parse(localStorage.getItem('autoyar_records') || '[]');
            const localWithKm = localRecords.filter(r => r.km != null);
            if (localWithKm.length > 0) {
                latestKm = Math.max(...localWithKm.map(r => parseInt(r.km)));
            }
        }

        if (navigator.onLine && this.supabase && this.state.user) {
            try {
                const { data, error } = await this.supabase
                    .from('records')
                    .select('km')
                    .eq('user_phone', this.state.user.phone)
                    .eq('vehicle_id', this.state.currentVehicleId)
                    .not('km', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (!error && data && data.length > 0 && data[0].km) {
                    latestKm = parseInt(data[0].km);
                }
            } catch (err) {
                console.error("Failed to load dashboard data from Supabase:", err);
            }
        }

        this.updateKm(latestKm);
    },

    initChart() {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById('healthChart');
        if(!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['سالم', 'نیاز به بررسی', 'خراب'],
                datasets: [{
                    data: [70, 20, 10],
                    backgroundColor: [
                        '#10b981', 
                        '#f59e0b', 
                        '#ef4444'  
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
    async saveRecord(e) {
        e.preventDefault();
        const type = this.els.recordType.value;
        const record = {
            id: Date.now(), 
            type: type,
            title: document.getElementById('record-title').value,
            date: new Date().toLocaleDateString('fa-IR'),
            desc: document.getElementById('record-desc').value,
            synced: false 
        };

        if (type === 'service') {
            record.km = document.getElementById('record-km').value;
            record.nextKm = document.getElementById('record-next-km').value;
            record.cost = document.getElementById('record-cost').value;
        }

        this.state.records.unshift(record); 
        localStorage.setItem('autoyar_records', JSON.stringify(this.state.records));

        this.renderRecords();
        this.closeModal(this.els.addRecordModal);
        this.els.recordForm.reset();

        await this.syncRecordToCloud(record);
    },

    async syncRecordToCloud(record) {
        if (!navigator.onLine || !this.supabase || !this.state.user) {
            this.showToast('اینترنت قطع است. اطلاعات ذخیره شد و بعداً همگام می‌شود.', 'info');
            return;
        }

        try {
            const dbRecord = {
                user_phone: this.state.user.phone,
                vehicle_id: this.state.currentVehicleId,
                type: record.type,
                title: record.title,
                km: record.km ? parseInt(record.km) : null,
                next_km: record.nextKm ? parseInt(record.nextKm) : null,
                cost: record.cost ? parseInt(record.cost) : null,
                description: record.desc
            };

            const { data, error } = await this.supabase.from('records').insert([dbRecord]).select();
            if (error) throw error;

            record.synced = true;
            localStorage.setItem('autoyar_records', JSON.stringify(this.state.records));
            this.showToast('رکورد با موفقیت ذخیره و همگام‌سازی شد', 'success');
        } catch (err) {
            console.error("Sync error:", err);
            this.showToast('خطا در همگام‌سازی با سرور. اطلاعات به صورت محلی ذخیره شد.', 'warning');
        }
    },

    async syncOfflineData() {
        if (!this.supabase || !this.state.user) return;
        const unsynced = this.state.records.filter(r => r.synced === false);
        if (unsynced.length === 0) return;

        for (const record of unsynced) {
            await this.syncRecordToCloud(record);
        }
    },


    async loadVehicles() {
        if (!navigator.onLine || !this.supabase || !this.state.user) return;
        try {
            const { data, error } = await this.supabase
                .from('vehicles')
                .select('*')
                .eq('user_id', this.state.user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            this.state.vehicles = data || [];
            this.renderVehicleSelector();

            if (this.state.vehicles.length > 0) {
                if (!this.state.currentVehicleId || !this.state.vehicles.find(v => v.id === this.state.currentVehicleId)) {
                    this.state.currentVehicleId = this.state.vehicles[0].id;
                }
            } else {
                this.state.currentVehicleId = null;
            }
            if (this.els.vehicleSelector) {
                this.els.vehicleSelector.value = this.state.currentVehicleId || '';
            }
            this.loadHistory();
        } catch (err) {
            console.error("Failed to load vehicles:", err);
        }
    },

    renderVehicleSelector() {
        if (!this.els.vehicleSelector) return;
        this.els.vehicleSelector.innerHTML = '';
        if (this.state.vehicles.length === 0) {
            this.els.vehicleSelector.innerHTML = '<option value="">خودرویی ثبت نشده</option>';
            return;
        }
        this.state.vehicles.forEach(v => {
            const option = document.createElement('option');
            option.value = v.id;
            option.textContent = v.car_name + (v.plate_number ? ` (${v.plate_number})` : '');
            this.els.vehicleSelector.appendChild(option);
        });
        this.els.vehicleSelector.value = this.state.currentVehicleId || '';
    },

    async handleAddVehicle(e) {
        e.preventDefault();
        if (!this.state.user) return;
        const name = this.els.vehicleName.value.trim();
        const plate = this.els.vehiclePlate.value.trim();

        if (!name) return;

        try {
            const dbVehicle = {
                user_id: this.state.user.id,
                car_name: name,
                plate_number: plate || null
            };
            const { data, error } = await this.supabase.from('vehicles').insert([dbVehicle]).select();
            if (error) throw error;

            this.showToast('خودرو با موفقیت اضافه شد', 'success');
            this.els.addVehicleModal.style.display = 'none';
            this.els.vehicleForm.reset();

            await this.loadVehicles(); // Reload vehicles
        } catch (err) {
            console.error("Failed to add vehicle:", err);
            this.showToast('خطا در افزودن خودرو', 'danger');
        }
    },

    async loadHistory() {
        const localRecords = localStorage.getItem('autoyar_records');
        if (localRecords) {
            this.state.records = JSON.parse(localRecords);
            this.renderRecords();
        } else {
            this.state.records = []; 
        }

        if (navigator.onLine && this.supabase && this.state.user) {
            try {
                const { data, error } = await this.supabase
                    .from('records')
                    .select('*')
                    .eq('user_phone', this.state.user.phone)
                    .eq('vehicle_id', this.state.currentVehicleId)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data && data.length > 0) {
                    this.state.records = data.map(r => ({
                        id: r.id,
                        type: r.type,
                        title: r.title,
                        date: new Date(r.created_at).toLocaleDateString('fa-IR'),
                        km: r.km,
                        nextKm: r.next_km,
                        cost: r.cost,
                        desc: r.description
                    }));
                    localStorage.setItem('autoyar_records', JSON.stringify(this.state.records));
                    this.renderRecords();
                }
            } catch (err) {
                console.error("Failed to load from Supabase:", err);
            }
        }
    },

    renderRecords() {
        const repairsList = document.getElementById('repairs-list');
        const symptomsList = document.getElementById('symptoms-list');

        repairsList.innerHTML = '';
        symptomsList.innerHTML = '';

        const repairsFragment = document.createDocumentFragment();
        const symptomsFragment = document.createDocumentFragment();

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
                repairsFragment.appendChild(div);
            } else {
                symptomsFragment.appendChild(div);
            }
        });

        repairsList.appendChild(repairsFragment);
        symptomsList.appendChild(symptomsFragment);
    },

    // --- Web Bluetooth API (OBD2) ---
    async connectOBD() {
        if (!navigator.bluetooth) {
            this.showToast('مرورگر شما از Web Bluetooth پشتیبانی نمی‌کند', 'error');
            return;
        }

        try {
            this.els.obdStatus.textContent = 'در حال جستجو...';
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['0000fff0-0000-1000-8000-00805f9b34fb'] }],
                optionalServices: ['generic_access']
            });

            this.state.obdDevice = device;
            const server = await device.gatt.connect();
            this.els.obdStatus.textContent = `متصل به ${device.name || 'دستگاه دیاگ'}`;
            this.els.obdStatus.style.color = 'var(--success)';
            this.showToast('اتصال با موفقیت انجام شد', 'success');

        } catch (error) {
            console.error(error);
            this.els.obdStatus.textContent = 'خطا در اتصال / لغو شد';
        }
    },

    // --- AI Chatbot ---
    async fetchAiResponse(text) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const response = `بر اساس علامتی که گفتید ("${text}")، احتمالاً مشکل از لنت ترمز یا دیسک چرخ است. پیشنهاد می‌کنم در اسرع وقت ضخامت لنت‌ها بررسی شود.`;
                resolve(response);
            }, 1500);
        });
    },

    async sendAiMessage() {
        const text = this.els.aiInput.value.trim();
        if(!text) return;

        this.appendChatMessage(text, 'user');
        this.els.aiInput.value = '';

        const thinkingId = this.appendChatMessage('در حال تحلیل...', 'ai');

        try {
            const response = await this.fetchAiResponse(text);
            this.appendChatMessage(response, 'ai');
        } catch (error) {
            console.error("AI Error:", error);
            this.appendChatMessage('متاسفانه در ارتباط با سرور هوش مصنوعی خطایی رخ داد.', 'ai error');
        } finally {
            const thinkingEl = document.getElementById(thinkingId);
            if (thinkingEl) {
                thinkingEl.remove();
            }
        }
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

    // --- Payment Gateways ---
    async processPayment(gateway) {
        const gateways = {
            'zarinpal': 'زرین‌پال',
            'snapppay': 'اسنپ‌پی'
        };
        const gatewayName = gateways[gateway] || gateway;

        this.showToast(`در حال انتقال به درگاه ${gatewayName}...`, 'info');

        await new Promise(resolve => setTimeout(resolve, 2000));

        this.closeModal(this.els.paymentModal);
        this.state.user.isPremium = true;
        this.showToast('پرداخت تستی موفقیت آمیز بود. شما پرمیوم شدید!', 'success');

        if (this.els.premiumBtn) {
            this.els.premiumBtn.style.display = 'none';
        }
    },

    // --- PWA Installation & Service Worker ---
    initPwa() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                             window.navigator.standalone === true ||
                             document.referrer.includes('android-app://');
        this.state.isStandalone = isStandalone;

        if (isStandalone) {
            this.dismissInstallBanners();
            if (this.els.installGroup) {
                this.els.installGroup.innerHTML = `
                    <h3>اپلیکیشن اتویار نصب شده است</h3>
                    <p style="font-size: 0.9rem; color: var(--success);"><i class="fa-solid fa-circle-check"></i> شما در حال استفاده از نسخه نصب‌شده اتویار هستید.</p>
                `;
            }
            return;
        }

        if (earlyDeferredInstallPrompt) {
            this.state.deferredPrompt = earlyDeferredInstallPrompt;
        }

        const dismissedTime = localStorage.getItem('autoyar_install_banner_dismissed');
        if (dismissedTime && (Date.now() - parseInt(dismissedTime, 10)) < 24 * 3600 * 1000) {
            return;
        }
    },

    onInstallPromptAvailable(e) {
        this.state.deferredPrompt = e;
        if (!this.state.isStandalone) {
            if (this.els.installGroup) this.els.installGroup.style.display = 'block';
            if (this.els.headerInstallBtn) this.els.headerInstallBtn.style.display = 'inline-flex';
            if (this.els.authInstallBtn) this.els.authInstallBtn.style.display = 'inline-flex';
        }
    },

    onAppInstalled() {
        this.state.isStandalone = true;
        this.state.deferredPrompt = null;
        earlyDeferredInstallPrompt = null;
        this.dismissInstallBanners();
        this.showToast('اتویار با موفقیت نصب شد!', 'success');
        if (this.els.installGuideModal) {
            this.closeModal(this.els.installGuideModal);
        }
    },

    async triggerInstall() {
        if (this.state.isStandalone) {
            this.showToast('اتویار هم‌اکنون به عنوان اپلیکیشن نصب است.', 'info');
            return;
        }

        const promptEvent = this.state.deferredPrompt || earlyDeferredInstallPrompt;
        if (promptEvent) {
            try {
                promptEvent.prompt();
                const choiceResult = await promptEvent.userChoice;
                if (choiceResult && choiceResult.outcome === 'accepted') {
                    this.showToast('در حال نصب اتویار...', 'success');
                    this.dismissInstallBanners();
                }
                this.state.deferredPrompt = null;
                earlyDeferredInstallPrompt = null;
            } catch (err) {
                console.error('Install prompt error:', err);
                this.showInstallGuide();
            }
        } else {
            this.showInstallGuide();
        }
    },

    showInstallGuide() {
        if (!this.els.installGuideModal) return;

        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(navigator.userAgent);

        if (this.els.guideIos) this.els.guideIos.style.display = isIos ? 'block' : 'none';
        if (this.els.guideAndroid) this.els.guideAndroid.style.display = (isAndroid && !isIos) ? 'block' : 'none';
        if (this.els.guideDesktop) this.els.guideDesktop.style.display = (!isIos && !isAndroid) ? 'block' : 'none';

        this.openModal(this.els.installGuideModal);
    },

    dismissBanner() {
        if (this.els.pwaInstallBanner) {

        }
        localStorage.setItem('autoyar_install_banner_dismissed', Date.now().toString());
    },

    dismissInstallBanners() {
        if (this.els.pwaInstallBanner)
        if (this.els.headerInstallBtn) this.els.headerInstallBtn.style.display = 'none';
        if (this.els.authInstallBtn) this.els.authInstallBtn.style.display = 'none';
    },

    // --- PWA Service Worker ---
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            const register = () => {
                navigator.serviceWorker.register('./sw.js', { scope: './' }).then(registration => {
                    console.log('SW registered successfully with scope: ', registration.scope);
                }).catch(err => {
                    console.error('SW registration failed: ', err);
                });
            };

            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                register();
            } else {
                window.addEventListener('load', register);
            }
        }
    }
};

// Expose app instance globally for event callbacks
window.app = app;

// FIXED: Secure startup logic to prevent crash in Windows/fast-load environments
const startApp = () => {
    if (!window.appInitialized) {
        app.init();
        window.appInitialized = true;
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    // If the DOM is already ready (like in Windows fast load), just execute immediately
    startApp();
}

if (typeof module !== 'undefined' && module.exports) { module.exports = app; }
