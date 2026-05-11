const UI = (() => {
    const ICONS = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>',
        error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    function getContainer() {
        let c = document.getElementById('toastContainer');
        if (!c) {
            c = document.createElement('div');
            c.id = 'toastContainer';
            c.className = 'toast-container';
            document.body.appendChild(c);
        }
        return c;
    }

    function toast(message, type = 'info', duration = 2600) {
        const el = document.createElement('div');
        el.className = 'toast toast-' + type;
        el.innerHTML =
            '<span class="toast-icon">' + (ICONS[type] || ICONS.info) + '</span>' +
            '<div class="toast-body"></div>' +
            '<button class="toast-close" aria-label="close">&times;</button>';
        el.querySelector('.toast-body').textContent = message;
        const close = () => {
            if (el.classList.contains('leaving')) return;
            el.classList.add('leaving');
            el.addEventListener('animationend', () => el.remove(), { once: true });
        };
        el.querySelector('.toast-close').onclick = close;
        getContainer().appendChild(el);
        if (duration > 0) setTimeout(close, duration);
        return close;
    }

    const toastSuccess = (m, d) => toast(m, 'success', d);
    const toastError   = (m, d) => toast(m, 'error', d ?? 3200);
    const toastWarning = (m, d) => toast(m, 'warning', d);
    const toastInfo    = (m, d) => toast(m, 'info', d);

    function confirm(options) {
        const opts = typeof options === 'string' ? { message: options } : (options || {});
        const title = opts.title || t('common.confirm');
        const message = opts.message || '';
        const okText = opts.okText || t('common.confirm');
        const cancelText = opts.cancelText || t('common.cancel');
        const danger = opts.danger === true;

        return new Promise(resolve => {
            const backdrop = document.createElement('div');
            backdrop.className = 'dialog-backdrop';
            backdrop.innerHTML =
                '<div class="dialog" role="dialog" aria-modal="true">' +
                '<div class="dialog-title"></div>' +
                '<div class="dialog-message"></div>' +
                '<div class="dialog-footer">' +
                '<button class="btn btn-secondary" data-act="cancel"></button>' +
                '<button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-act="ok"></button>' +
                '</div></div>';
            backdrop.querySelector('.dialog-title').textContent = title;
            backdrop.querySelector('.dialog-message').textContent = message;
            backdrop.querySelector('[data-act=cancel]').textContent = cancelText;
            backdrop.querySelector('[data-act=ok]').textContent = okText;

            const close = (result) => {
                backdrop.remove();
                document.removeEventListener('keydown', onKey);
                resolve(result);
            };
            const onKey = (e) => {
                if (e.key === 'Escape') close(false);
                else if (e.key === 'Enter') close(true);
            };

            backdrop.addEventListener('click', e => {
                if (e.target === backdrop) close(false);
            });
            backdrop.querySelector('[data-act=cancel]').onclick = () => close(false);
            backdrop.querySelector('[data-act=ok]').onclick = () => close(true);
            document.addEventListener('keydown', onKey);
            document.body.appendChild(backdrop);
            setTimeout(() => backdrop.querySelector('[data-act=ok]').focus(), 20);
        });
    }

    function alert(message, title) {
        return new Promise(resolve => {
            const backdrop = document.createElement('div');
            backdrop.className = 'dialog-backdrop';
            backdrop.innerHTML =
                '<div class="dialog">' +
                (title ? '<div class="dialog-title"></div>' : '') +
                '<div class="dialog-message"></div>' +
                '<div class="dialog-footer">' +
                '<button class="btn btn-primary" data-act="ok"></button>' +
                '</div></div>';
            if (title) backdrop.querySelector('.dialog-title').textContent = title;
            backdrop.querySelector('.dialog-message').textContent = message;
            backdrop.querySelector('[data-act=ok]').textContent = t('common.confirm');
            const close = () => {
                backdrop.remove();
                document.removeEventListener('keydown', onKey);
                resolve();
            };
            const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter') close(); };
            backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
            backdrop.querySelector('[data-act=ok]').onclick = close;
            document.addEventListener('keydown', onKey);
            document.body.appendChild(backdrop);
            setTimeout(() => backdrop.querySelector('[data-act=ok]').focus(), 20);
        });
    }

    function setLoading(button, loading) {
        if (!button) return;
        if (loading) {
            if (button.dataset.origHtml == null) button.dataset.origHtml = button.innerHTML;
            button.classList.add('is-loading');
            button.disabled = true;
            button.innerHTML = '<span class="btn-spinner"></span>' + button.dataset.origHtml;
        } else {
            if (button.dataset.origHtml != null) {
                button.innerHTML = button.dataset.origHtml;
                delete button.dataset.origHtml;
            }
            button.classList.remove('is-loading');
            button.disabled = false;
        }
    }

    async function withLoading(button, fn) {
        setLoading(button, true);
        try { return await fn(); }
        finally { setLoading(button, false); }
    }

    function skeletonList(count = 3) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html +=
                '<div class="skeleton-card">' +
                '<div class="skeleton-row">' +
                '<span class="skeleton" style="width:16px;height:16px;border-radius:4px"></span>' +
                '<span class="skeleton" style="flex:1;height:14px;max-width:200px"></span>' +
                '<span class="skeleton" style="width:60px;height:18px"></span>' +
                '</div>' +
                '<div class="skeleton-row"><span class="skeleton" style="width:100%;height:6px"></span></div>' +
                '<div class="skeleton-row" style="margin-top:12px">' +
                '<span class="skeleton" style="flex:1;height:28px"></span>' +
                '<span class="skeleton" style="flex:1;height:28px"></span>' +
                '<span class="skeleton" style="flex:1;height:28px"></span>' +
                '</div>' +
                '</div>';
        }
        return html;
    }

    function emptyState(text) {
        return '<div class="empty-state">' +
            '<svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' +
            '<div class="empty-state-text">' + text + '</div>' +
            '</div>';
    }

    return {
        toast, toastSuccess, toastError, toastWarning, toastInfo,
        confirm, alert, setLoading, withLoading, skeletonList, emptyState
    };
})();
