async function loadSettings() {
    try {
        const d = await API.get('/admin/api/settings');
        document.getElementById('requireApiKey').checked = d.requireApiKey;
        document.getElementById('apiKeyInput').value = d.apiKey || '';
        loadThinkingConfig();
        loadEndpointConfig();
        loadProxyConfig();
    } catch (e) { /* silent */ }
}

async function loadProxyConfig() {
    try {
        const d = await API.get('/admin/api/proxy');
        const proxyURL = d.proxyURL || '';
        if (!proxyURL) {
            document.getElementById('proxyType').value = 'none';
            document.getElementById('proxyFields').style.display = 'none';
            return;
        }
        const u = new URL(proxyURL);
        const scheme = u.protocol.replace(':', '');
        document.getElementById('proxyType').value = scheme.startsWith('socks5') ? 'socks5' : 'http';
        document.getElementById('proxyHost').value = u.hostname;
        document.getElementById('proxyPort').value = u.port;
        document.getElementById('proxyUsername').value = decodeURIComponent(u.username);
        document.getElementById('proxyPassword').value = decodeURIComponent(u.password);
        document.getElementById('proxyFields').style.display = '';
    } catch (e) {
        document.getElementById('proxyType').value = 'none';
        document.getElementById('proxyFields').style.display = 'none';
    }
}

function onProxyTypeChange() {
    const type = document.getElementById('proxyType').value;
    document.getElementById('proxyFields').style.display = type === 'none' ? 'none' : '';
}

async function saveProxyConfig(btn) {
    const type = document.getElementById('proxyType').value;
    let proxyURL = '';
    if (type !== 'none') {
        const host = document.getElementById('proxyHost').value.trim();
        const port = document.getElementById('proxyPort').value.trim();
        if (!host || !port) { UI.toastWarning(t('settings.proxyHostRequired')); return; }
        const user = document.getElementById('proxyUsername').value.trim();
        const pass = document.getElementById('proxyPassword').value.trim();
        const auth = user ? (pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : `${encodeURIComponent(user)}@`) : '';
        proxyURL = `${type}://${auth}${host}:${port}`;
    }
    await UI.withLoading(btn, async () => {
        try {
            const d = await API.post('/admin/api/proxy', { proxyURL });
            if (d.success) UI.toastSuccess(t('settings.proxySaved'));
            else UI.toastError(t('common.saveFailed') + ': ' + (d.error || ''));
        } catch (e) {
            UI.toastError(t('common.saveFailed'));
        }
    });
}

async function loadThinkingConfig() {
    try {
        const d = await API.get('/admin/api/thinking');
        document.getElementById('thinkingSuffix').value = d.suffix || '-thinking';
        document.getElementById('openaiThinkingFormat').value = d.openaiFormat || 'reasoning_content';
        document.getElementById('claudeThinkingFormat').value = d.claudeFormat || 'thinking';
    } catch (e) { /* silent */ }
}

async function saveThinkingConfig(btn) {
    await UI.withLoading(btn, async () => {
        try {
            const d = await API.post('/admin/api/thinking', {
                suffix: document.getElementById('thinkingSuffix').value || '-thinking',
                openaiFormat: document.getElementById('openaiThinkingFormat').value,
                claudeFormat: document.getElementById('claudeThinkingFormat').value
            });
            if (d.success) UI.toastSuccess(t('settings.thinkingSaved'));
            else UI.toastError(t('common.saveFailed') + ': ' + (d.error || ''));
        } catch (e) {
            UI.toastError(t('common.saveFailed'));
        }
    });
}

async function loadEndpointConfig() {
    try {
        const d = await API.get('/admin/api/endpoint');
        document.getElementById('preferredEndpoint').value = d.preferredEndpoint || 'auto';
    } catch (e) { /* silent */ }
}

async function saveEndpointConfig(btn) {
    await UI.withLoading(btn, async () => {
        try {
            const d = await API.post('/admin/api/endpoint', {
                preferredEndpoint: document.getElementById('preferredEndpoint').value
            });
            if (d.success) UI.toastSuccess(t('settings.endpointSaved'));
            else UI.toastError(t('common.saveFailed') + ': ' + (d.error || ''));
        } catch (e) {
            UI.toastError(t('common.saveFailed'));
        }
    });
}

function generateApiKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'sk-';
    for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('apiKeyInput').value = key;
}

async function saveSettings(btn) {
    const requireApiKey = document.getElementById('requireApiKey').checked;
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (requireApiKey && !apiKeyInput.value.trim()) generateApiKey();
    await UI.withLoading(btn, async () => {
        try {
            await API.post('/admin/api/settings', { requireApiKey, apiKey: apiKeyInput.value });
            UI.toastSuccess(t('detail.saved'));
        } catch (e) {
            UI.toastError(t('common.saveFailed'));
        }
    });
}

async function changePassword(btn) {
    const newPwd = document.getElementById('newPassword').value;
    if (!newPwd) { UI.toastWarning(t('settings.passwordRequired')); return; }
    await UI.withLoading(btn, async () => {
        try {
            await API.post('/admin/api/settings', { password: newPwd });
            API.setPassword(newPwd);
            UI.toastSuccess(t('settings.passwordChanged'));
            document.getElementById('newPassword').value = '';
        } catch (e) {
            UI.toastError(t('common.saveFailed'));
        }
    });
}

async function resetStats(btn) {
    const ok = await UI.confirm({ message: t('settings.confirmReset'), danger: true });
    if (!ok) return;
    await UI.withLoading(btn, async () => {
        try {
            await API.post('/admin/api/stats/reset');
            loadStats();
            UI.toastSuccess(t('detail.saved'));
        } catch (e) {
            UI.toastError(t('common.failed'));
        }
    });
}
