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
