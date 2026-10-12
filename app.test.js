const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('syncRecordToCloud', () => {
    let window, document;

    beforeEach(() => {
        const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');
        const dom = new JSDOM(html, {
            url: 'http://localhost/',
            runScripts: 'dangerously',
            beforeParse(window) {
                // Mock matchMedia before scripts run
                window.matchMedia = jest.fn().mockImplementation(query => ({
                    matches: false,
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                }));
            }
        });
        window = dom.window;
        document = dom.window.document;

        // Mock global variables and functions that app.js expects
        global.window = window;
        global.document = document;

        // Load app.js script
        const scriptContent = fs.readFileSync(path.resolve(__dirname, './app.js'), 'utf8');
        const scriptElement = document.createElement('script');
        scriptElement.textContent = scriptContent;
        document.body.appendChild(scriptElement);
    });

    test('app object and syncRecordToCloud exist', () => {
        expect(window.app).toBeDefined();
        expect(typeof window.app.syncRecordToCloud).toBe('function');
    });

    test('syncRecordToCloud handles supabase insert error properly', async () => {
        const record = { type: 'test', title: 'test', desc: 'test' };

        // Setup state
        window.app.state = {
            user: { phone: '123' },
            records: [record]
        };

        // Mock showToast
        window.app.showToast = jest.fn();

        // Mock console.error
        const originalError = window.console.error;
        window.console.error = jest.fn();

        // Define global navigator
        Object.defineProperty(window, 'navigator', {
            value: { onLine: true },
            configurable: true
        });

        // Mock supabase insert to return an error
        const mockError = new Error("Test Supabase Error");
        window.app.supabase = {
            from: jest.fn().mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue({ data: null, error: mockError })
                })
            })
        };

        await window.app.syncRecordToCloud(record);

        // Verify insert was called correctly
        expect(window.app.supabase.from).toHaveBeenCalledWith('records');
        const expectedDbRecord = {
            user_phone: '123',
            type: 'test',
            title: 'test',
            km: null,
            next_km: null,
            cost: null,
            description: 'test'
        };
        expect(window.app.supabase.from().insert).toHaveBeenCalledWith([expectedDbRecord]);

        // Verify error handling
        expect(window.console.error).toHaveBeenCalledWith("Sync error:", mockError);
        expect(window.app.showToast).toHaveBeenCalledWith('خطا در همگام‌سازی با سرور. اطلاعات به صورت محلی ذخیره شد.', 'warning');

        // Ensure record was not marked as synced locally
        expect(record.synced).toBeUndefined(); // or whatever default it had

        // Restore console.error
        window.console.error = originalError;
    });

    test('syncRecordToCloud handles successful supabase insert properly', async () => {
        const record = { type: 'test', title: 'test', desc: 'test', km: '1000', nextKm: '2000', cost: '500' };

        // Setup state
        window.app.state = {
            user: { phone: '123' },
            records: [record]
        };

        // Mock showToast
        window.app.showToast = jest.fn();

        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(),
                setItem: jest.fn()
            },
            configurable: true
        });

        // Define global navigator
        Object.defineProperty(window, 'navigator', {
            value: { onLine: true },
            configurable: true
        });

        // Mock supabase insert to return success
        window.app.supabase = {
            from: jest.fn().mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null })
                })
            })
        };

        await window.app.syncRecordToCloud(record);

        // Verify insert was called correctly
        expect(window.app.supabase.from).toHaveBeenCalledWith('records');
        const expectedDbRecord = {
            user_phone: '123',
            type: 'test',
            title: 'test',
            km: 1000,
            next_km: 2000,
            cost: 500,
            description: 'test'
        };
        expect(window.app.supabase.from().insert).toHaveBeenCalledWith([expectedDbRecord]);

        // Verify success handling
        expect(record.synced).toBe(true);
        expect(window.localStorage.setItem).toHaveBeenCalledWith('autoyar_records', JSON.stringify(window.app.state.records));
        expect(window.app.showToast).toHaveBeenCalledWith('رکورد با موفقیت ذخیره و همگام‌سازی شد', 'success');
    });

    test('syncRecordToCloud handles offline or missing state', async () => {
        const record = { type: 'test' };

        // Define global navigator
        Object.defineProperty(window, 'navigator', {
            value: { onLine: true },
            configurable: true
        });

        // Test missing state.user
        window.app.showToast = jest.fn();
        window.app.state = { user: null };
        window.app.supabase = {};
        await window.app.syncRecordToCloud(record);
        expect(window.app.showToast).toHaveBeenCalledWith('اینترنت قطع است. اطلاعات ذخیره شد و بعداً همگام می‌شود.', 'info');

        // Test missing supabase
        window.app.showToast = jest.fn();
        window.app.state = { user: { phone: '123' } };
        window.app.supabase = null;
        await window.app.syncRecordToCloud(record);
        expect(window.app.showToast).toHaveBeenCalledWith('اینترنت قطع است. اطلاعات ذخیره شد و بعداً همگام می‌شود.', 'info');

        // Test offline
        window.app.showToast = jest.fn();
        window.app.state = { user: { phone: '123' } };
        window.app.supabase = {};
        Object.defineProperty(window, 'navigator', {
            value: { onLine: false },
            configurable: true
        });
        await window.app.syncRecordToCloud(record);
        expect(window.app.showToast).toHaveBeenCalledWith('اینترنت قطع است. اطلاعات ذخیره شد و بعداً همگام می‌شود.', 'info');
    });
});
