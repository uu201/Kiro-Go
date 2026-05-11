const API = (() => {
    let password = localStorage.getItem('admin_password') || '';

    function setPassword(p) {
        password = p;
        if (p) {
            localStorage.setItem('admin_password', p);
            localStorage.setItem('admin_login_time', Date.now().toString());
        } else {
            localStorage.removeItem('admin_password');
            localStorage.removeItem('admin_login_time');
        }
    }

    function getPassword() { return password; }

    function isSessionExpired() {
        const loginTime = parseInt(localStorage.getItem('admin_login_time') || '0');
        return loginTime && Date.now() - loginTime > 72 * 3600 * 1000;
    }

    async function request(path, options = {}) {
        const headers = Object.assign(
            { 'X-Admin-Password': password },
            options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {},
            options.headers || {}
        );
        const body = options.body && typeof options.body === 'object' && !(options.body instanceof FormData)
            ? JSON.stringify(options.body)
            : options.body;
        const res = await fetch(path, { ...options, headers, body });
        return res;
    }

    async function json(path, options = {}) {
        const res = await request(path, options);
        if (!res.ok) {
            let err;
            try { err = await res.json(); } catch { err = { error: res.statusText }; }
            const e = new Error(err.error || 'Request failed');
            e.status = res.status;
            e.data = err;
            throw e;
        }
        return res.json();
    }

    const get = (path) => json(path);
    const post = (path, body) => json(path, { method: 'POST', body });
    const put = (path, body) => json(path, { method: 'PUT', body });
    const del = (path) => json(path, { method: 'DELETE' });

    return { setPassword, getPassword, isSessionExpired, request, json, get, post, put, delete: del };
})();
