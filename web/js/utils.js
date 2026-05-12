let privacyModeEnabled = true;

function initPrivacyMode() {
    try {
        const saved = localStorage.getItem('privacyMode');
        privacyModeEnabled = saved === null ? true : saved === 'true';
        const toggle = document.getElementById('privacyModeToggle');
        if (toggle) toggle.checked = privacyModeEnabled;
    } catch (e) {
        console.warn('localStorage not available:', e);
    }
}

function togglePrivacyMode() {
    const toggle = document.getElementById('privacyModeToggle');
    privacyModeEnabled = toggle.checked;
    try { localStorage.setItem('privacyMode', privacyModeEnabled); } catch (e) {}
    if (typeof renderAccounts === 'function') renderAccounts();
}

function maskEmail(email) {
    if (!privacyModeEnabled || !email || email.indexOf('@') === -1) return email;
    const [localPart, domain] = email.split('@');
    const maskedLocal = localPart.length <= 2 ? localPart : localPart.substring(0, 2) + '***';
    const domainParts = domain.split('.');
    if (domainParts.length >= 2) {
        const tld = domainParts[domainParts.length - 1];
        const sld = domainParts[domainParts.length - 2];
        const maskedSld = sld.length <= 2 ? sld : sld.substring(0, 2) + '***';
        const subdomains = domainParts.slice(0, -2).map(sub =>
            sub.length <= 2 ? sub : sub.substring(0, 2) + '***'
        );
        return maskedLocal + '@' + [...subdomains, maskedSld, tld].join('.');
    }
    return maskedLocal + '@' + domain;
}

function getDisplayEmail(email, accountId) {
    const raw = email || (accountId ? accountId.substring(0, 12) + '...' : '-');
    return maskEmail(raw);
}

function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}

function formatTokenExpiry(ts) {
    if (!ts) return '-';
    const diff = ts - Date.now() / 1000;
    if (diff <= 0) return t('time.expired');
    if (diff < 3600) return Math.floor(diff / 60) + t('time.minutes');
    if (diff < 86400) return Math.floor(diff / 3600) + t('time.hours');
    return Math.floor(diff / 86400) + t('time.days');
}

function formatRelativeTime(ts) {
    if (!ts) return '-';
    const diff = Date.now() / 1000 - ts;
    if (diff < 0) return '-';
    if (diff < 60) return t('time.justNow');
    if (diff < 3600) return Math.floor(diff / 60) + t('time.minutesAgo');
    if (diff < 86400) return Math.floor(diff / 3600) + t('time.hoursAgo');
    return Math.floor(diff / 86400) + t('time.daysAgo');
}

function formatTrialExpiry(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return '(' + t('accounts.trialExpired') + ')';
    if (diffDays === 0) return '(' + t('accounts.trialToday') + ')';
    if (diffDays <= 7) return '(' + diffDays + t('accounts.trialDays') + ')';
    return '';
}

function formatAuthMethod(method) {
    if (!method) return '-';
    if (method === 'idc') return 'Enterprise';
    if (method === 'social') return 'Social';
    return method;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0, nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}

async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!success) throw new Error('execCommand failed');
}
