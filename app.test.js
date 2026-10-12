const fs = require('fs');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { JSDOM } = require('jsdom');

// Read the index.html file to use it as the DOM template
const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');
const appJsContent = fs.readFileSync(path.resolve(__dirname, './app.js'), 'utf8');

describe('App', () => {
    let dom;
    let window;
    let document;
    let app;

    beforeEach(() => {
        // Create a new JSDOM environment for each test
        dom = new JSDOM(html, { runScripts: "dangerously" });
        window = dom.window;
        document = window.document;

        // Mock matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: jest.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            })),
        });

        // Mock localStorage
        const localStorageMock = (function() {
            let store = {};
            return {
                getItem: function(key) {
                    return store[key] || null;
                },
                setItem: function(key, value) {
                    store[key] = value.toString();
                },
                removeItem: function(key) {
                    delete store[key];
                },
                clear: function() {
                    store = {};
                }
            };
        })();

        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock
        });

        // Mock Supabase
        window.supabase = {
            createClient: jest.fn().mockReturnValue({
                auth: {
                    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
                    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
                }
            })
        };

        // Mock global alert
        window.alert = jest.fn();

        // Evaluate the script inside the JSDOM window context to attach 'app' to window
        const scriptEl = document.createElement("script");
        scriptEl.textContent = appJsContent;
        document.body.appendChild(scriptEl);

        app = window.app;

        // Initialize the app
        app.init();

        // Mock showMainApp and showToast to verify they are called
        app.showMainApp = jest.fn();
        app.showToast = jest.fn();
    });

    describe('verifyOtp', () => {
        it('should login successfully with correct OTP', async () => {
            app.state.phone = '09123456789';
            app.els.otpInput.value = '123456';

            await app.verifyOtp();

            expect(app.state.user).toEqual({ phone: '09123456789', id: 'user_123', isPremium: false });
            expect(window.localStorage.getItem('autoyar_user')).toBe(JSON.stringify({ phone: '09123456789', id: 'user_123', isPremium: false }));
            expect(app.showMainApp).toHaveBeenCalled();
            expect(app.showToast).toHaveBeenCalledWith('ورود موفقیت آمیز بود', 'success');
        });

        it('should show error with incorrect OTP', async () => {
            app.state.phone = '09123456789';
            app.els.otpInput.value = '654321';

            await app.verifyOtp();

            // Check for initial state or explicitly null depending on implementation
            expect(app.state.user).toBeFalsy();
            expect(window.localStorage.getItem('autoyar_user')).toBeNull();
            expect(app.showMainApp).not.toHaveBeenCalled();
            expect(app.showToast).toHaveBeenCalledWith('کد تایید اشتباه است', 'error');
        });
    });
});
