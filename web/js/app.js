const baseUrl = location.origin;

document.addEventListener('DOMContentLoaded', () => {
    updateLangButtons();
    applyTranslations();
    initPrivacyMode();
    if (API.getPassword()) tryAutoLogin();
    document.getElementById('pwdField').addEventListener('keypress', e => {
        if (e.key === 'Enter') login();
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.onclick = () => switchTab(tab.dataset.tab);
    });
});

async function tryAutoLogin() {
    if (API.isSessionExpired()) {
        API.setPassword('');
        return;
    }
    try {
        const res = await API.request('/admin/api/status');
        if (res.ok) { showMain(); loadData(); }
    } catch (e) { }
}

async function login() {
    const pwd = document.getElementById('pwdField').value;
    const btn = document.querySelector('#loginPage .btn-primary');
    UI.setLoading(btn, true);
    try {
        API.setPassword(pwd);
        const res = await API.request('/admin/api/status');
        if (res.ok) {
            showMain();
            loadData();
        } else {
            API.setPassword('');
            const err = document.getElementById('loginError');
            err.textContent = t('login.error');
            err.classList.remove('hidden');
        }
    } catch (e) {
        API.setPassword('');
        const err = document.getElementById('loginError');
        err.textContent = t('login.connectError');
        err.classList.remove('hidden');
    }
    UI.setLoading(btn, false);
}

function logout() {
    API.setPassword('');
    location.reload();
}

function showMain() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainPage').classList.remove('hidden');
}

async function loadData() {
    await Promise.all([loadStats(), loadAccounts(), loadSettings(), loadVersion()]);
    document.getElementById('claudeEndpoint').textContent = baseUrl + '/v1/messages';
    document.getElementById('openaiEndpoint').textContent = baseUrl + '/v1/chat/completions';
    document.getElementById('modelsEndpoint').textContent = baseUrl + '/v1/models';
    document.getElementById('statsEndpoint').textContent = baseUrl + '/v1/stats';
    setTimeout(() => checkUpdate(false), 2000);
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(tabEl =>
        tabEl.classList.toggle('active', tabEl.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    const target = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (target) target.classList.remove('hidden');
}

async function copy(id) {
    try {
        await copyToClipboard(document.getElementById(id).textContent);
        UI.toastSuccess(t('common.copied'));
    } catch (e) {
        UI.toastError(t('common.failed'));
    }
}

setInterval(() => {
    if (!document.getElementById('mainPage').classList.contains('hidden')) loadStats();
}, 10000);

setInterval(() => {
    if (!document.getElementById('mainPage').classList.contains('hidden')) loadActiveRequests();
}, 2000);
