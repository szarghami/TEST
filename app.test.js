window.appInitialized = true;
const app = require('./app.js');

describe('updateKm', () => {
    beforeEach(() => {
        // Reset state and set up document body
        document.body.innerHTML = `
            <strong id="dashboard-km">0</strong>
            <div id="toast" class="toast"></div>
        `;
        app.state.currentKm = 0;
        app.els = {
            dashboardKm: document.getElementById('dashboard-km'),
            toast: document.getElementById('toast')
        };

        // Mock dependencies
        app.showToast = jest.fn();
        app.updatePartsHealth = jest.fn();
    });

    test('should update currentKm state', () => {
        app.updateKm(12345);
        expect(app.state.currentKm).toBe(12345);
    });

    test('should update DOM element with formatted number', () => {
        app.updateKm(12345);
        expect(app.els.dashboardKm.textContent).toBe('12,345');
    });

    test('should show success toast', () => {
        app.updateKm(12345);
        expect(app.showToast).toHaveBeenCalledWith('کیلومتر بروزرسانی شد', 'success');
    });

    test('should call updatePartsHealth', () => {
        app.updateKm(12345);
        expect(app.updatePartsHealth).toHaveBeenCalled();
    });
});

describe('escapeHTML', () => {
    test('should return empty string for falsy values', () => {
        expect(app.escapeHTML('')).toBe('');
        expect(app.escapeHTML(null)).toBe('');
        expect(app.escapeHTML(undefined)).toBe('');
        expect(app.escapeHTML(0)).toBe('');
        expect(app.escapeHTML(false)).toBe('');
    });

    test('should return same string if no special characters exist', () => {
        expect(app.escapeHTML('hello world')).toBe('hello world');
        expect(app.escapeHTML('123')).toBe('123');
    });

    test('should escape &', () => {
        expect(app.escapeHTML('a & b')).toBe('a &amp; b');
        expect(app.escapeHTML('a && b')).toBe('a &amp;&amp; b');
    });

    test('should escape < and >', () => {
        expect(app.escapeHTML('<div>')).toBe('&lt;div&gt;');
        expect(app.escapeHTML('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    test('should escape double quotes', () => {
        expect(app.escapeHTML('name="test"')).toBe('name=&quot;test&quot;');
    });

    test('should escape single quotes', () => {
        expect(app.escapeHTML("name='test'")).toBe("name=&#039;test&#039;");
    });

    test('should escape multiple special characters in a string', () => {
        const input = `<script>alert("XSS & 'injection'")</script>`;
        const expected = `&lt;script&gt;alert(&quot;XSS &amp; &#039;injection&#039;&quot;)&lt;/script&gt;`;
        expect(app.escapeHTML(input)).toBe(expected);
    });

    test('should handle truthy non-string types by calling toString()', () => {
        expect(app.escapeHTML(123)).toBe('123');
        expect(app.escapeHTML(true)).toBe('true');
    });
});
