let accountsData = [];
let selectedAccounts = new Set();
let filterKeyword = '';
let filterStatus = 'all';
let activeRequestsMap = {};

async function loadActiveRequests() {
    try {
        const d = await API.get('/admin/api/active');
        activeRequestsMap = d.active || {};
        updateActiveBadges();
    } catch (e) { /* silent on poll */ }
}

function updateActiveBadges() {
    document.querySelectorAll('[data-account-id]').forEach(card => {
        const id = card.getAttribute('data-account-id');
        const count = activeRequestsMap[id] || 0;
        const meta = card.querySelector('.account-meta');
        if (!meta) return;
        let badge = meta.querySelector('.badge-calling');
        if (count > 0) {
            const label = t('accounts.calling') + (count > 1 ? ' ×' + count : '');
            if (badge) {
                badge.textContent = label;
            } else {
                badge = document.createElement('span');
                badge.className = 'badge badge-calling';
                badge.textContent = label;
                meta.insertBefore(badge, meta.firstChild);
            }
        } else if (badge) {
            badge.remove();
        }
    });
}

async function loadStats() {
    try {
        const d = await API.get('/admin/api/status');
        document.getElementById('statAccounts').textContent = d.accounts || 0;
        document.getElementById('statRequests').textContent = d.totalRequests || 0;
        document.getElementById('statSuccess').textContent = d.successRequests || 0;
        document.getElementById('statFailed').textContent = d.failedRequests || 0;
        document.getElementById('statTokens').textContent = formatNum(d.totalTokens || 0);
        document.getElementById('statCredits').textContent = (d.totalCredits || 0).toFixed(1);
    } catch (e) { /* silent on poll */ }
}

async function loadAccounts() {
    const container = document.getElementById('accountsList');
    if (container && !accountsData.length) {
        container.innerHTML = UI.skeletonList(3);
    }
    try {
        accountsData = await API.get('/admin/api/accounts');
        renderAccounts();
    } catch (e) {
        if (container) container.innerHTML = UI.emptyState(t('common.failed'));
    }
}

function getFilteredAccounts() {
    return accountsData.filter(a => {
        if (filterStatus === 'enabled' && !a.enabled) return false;
        if (filterStatus === 'disabled' && (a.enabled || (a.banStatus && a.banStatus !== 'ACTIVE'))) return false;
        if (filterStatus === 'banned' && (!a.banStatus || a.banStatus === 'ACTIVE')) return false;
        if (filterKeyword) {
            const kw = filterKeyword.toLowerCase();
            const email = (a.email || '').toLowerCase();
            if (!email.includes(kw)) return false;
        }
        return true;
    });
}

function onFilterChange() {
    filterKeyword = document.getElementById('filterSearch').value;
    filterStatus = document.getElementById('filterStatusSelect').value;
    renderAccounts();
}

function toggleSelectAll(checked) {
    const filtered = getFilteredAccounts();
    if (checked) filtered.forEach(a => selectedAccounts.add(a.id));
    else selectedAccounts.clear();
    renderAccounts();
    updateBatchBar();
}

function toggleSelectAccount(id) {
    if (selectedAccounts.has(id)) selectedAccounts.delete(id);
    else selectedAccounts.add(id);
    updateBatchBar();
    const cb = document.getElementById('selectAllCheckbox');
    if (cb) {
        const filtered = getFilteredAccounts();
        cb.checked = filtered.length > 0 && filtered.every(a => selectedAccounts.has(a.id));
    }
    const card = document.querySelector('[data-account-id="' + id + '"]');
    if (card) card.classList.toggle('is-selected', selectedAccounts.has(id));
}

function updateBatchBar() {
    const bar = document.getElementById('batchBar');
    const count = selectedAccounts.size;
    if (count > 0) {
        bar.style.display = 'flex';
        document.getElementById('batchCount').textContent = t('batch.selected', count);
    } else {
        bar.style.display = 'none';
    }
}

async function batchAction(action) {
    const ids = Array.from(selectedAccounts);
    if (ids.length === 0) return;
    const confirmKey = 'batch.confirm' + action.charAt(0).toUpperCase() + action.slice(1);
    const ok = await UI.confirm({
        message: t(confirmKey, ids.length),
        danger: action === 'disable'
    });
    if (!ok) return;
    try {
        const d = await API.post('/admin/api/accounts/batch', { ids, action });
        if (action === 'refresh' && d.success) {
            UI.toastSuccess(t('batch.refreshResult', d.refreshed, d.failed));
        } else {
            UI.toastSuccess(t('batch.done'));
        }
        selectedAccounts.clear();
        updateBatchBar();
        loadAccounts();
        loadStats();
    } catch (e) {
        UI.toastError(t('common.failed'));
    }
}

function renderAccounts() {
    const container = document.getElementById('accountsList');
    if (!container) return;
    const filtered = getFilteredAccounts();
    if (filtered.length === 0) {
        container.innerHTML = UI.emptyState(t('accounts.empty'));
        return;
    }
    container.innerHTML = filtered.map(a => renderAccountCard(a)).join('');
}

function renderAccountCard(a) {
    const usagePercent = (a.usagePercent || 0) * 100;
    const usageClass = usagePercent > 90 ? 'critical' : usagePercent > 70 ? 'high' : '';
    const trialUsagePercent = (a.trialUsagePercent || 0) * 100;
    const trialUsageClass = trialUsagePercent > 90 ? 'critical' : trialUsagePercent > 70 ? 'high' : '';
    const overageCap = 10000;
    const overageUsed = a.overageCurrent || 0;
    const overagePercent = Math.min((overageUsed / overageCap) * 100, 100);
    const overageClass = overagePercent > 90 ? 'critical' : overagePercent > 70 ? 'high' : '';
    const isSelected = selectedAccounts.has(a.id);
    const weightVal = a.weight || 0;
    const weightBadge = weightVal >= 2 ? '<span class="badge" style="background:#f59e0b;color:#fff">W:' + weightVal + '</span>' : '';
    const overageBadge = a.allowOverage ? '<span class="badge" style="background:#10b981;color:#fff">' + t('accounts.overage') + '</span>' : '';
    const errorBtn = a.lastError ? '<button class="btn btn-sm btn-icon btn-error-outline" onclick="showLastError(\'' + a.id + '\')" title="' + t('accounts.lastError') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></button>' : '';

    return '<div class="account-card' + (isSelected ? ' is-selected' : '') + '" data-account-id="' + a.id + '">' +
        '<div class="account-header">' +
        '<div class="account-info" style="display:flex;align-items:center;gap:8px">' +
        '<input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="toggleSelectAccount(\'' + a.id + '\')" style="cursor:pointer;width:16px;height:16px;flex-shrink:0">' +
        '<div>' +
        '<div class="account-email">' + escapeHtml(getDisplayEmail(a.email, a.id)) + '</div>' +
        '<div class="account-meta">' +
        getSubBadge(a.subscriptionType) +
        getTrialBadge(a) +
        weightBadge +
        overageBadge +
        '<span class="badge badge-info">' + formatAuthMethod(a.provider || a.authMethod) + '</span>' +
        getStatusBadge(a) +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="account-actions">' +
        errorBtn +
        '<button class="btn btn-sm btn-icon btn-secondary" onclick="refreshAccount(\'' + a.id + '\', this)" title="' + t('accounts.refresh') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg></button>' +
        '<button class="btn btn-sm btn-icon btn-secondary" onclick="showDetail(\'' + a.id + '\')" title="' + t('accounts.detail') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></button>' +
        '<button class="btn btn-sm btn-icon btn-secondary" onclick="copyAccountJSON(\'' + a.id + '\', this)" title="' + t('accounts.copyJSON') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>' +
        (a.banStatus && a.banStatus !== 'ACTIVE' ? '' :
            '<button class="btn btn-sm ' + (a.enabled ? 'btn-secondary' : 'btn-primary') + '" onclick="toggleAccount(\'' + a.id + '\',' + !a.enabled + ')">' + (a.enabled ? t('accounts.disable') : t('accounts.enable')) + '</button>') +
        '<button class="btn btn-sm btn-danger" onclick="deleteAccount(\'' + a.id + '\')">' + t('accounts.delete') + '</button>' +
        '</div>' +
        '</div>' +
        (a.usageLimit > 0 ? '<div class="account-usage"><div class="usage-label">' + t('accounts.mainQuota') + '</div><div class="usage-bar"><div class="usage-fill ' + usageClass + '" style="width:' + usagePercent + '%"></div></div><div class="usage-text"><span>' + (a.usageCurrent?.toFixed(1) || 0) + ' / ' + (a.usageLimit?.toFixed(0) || 0) + '</span><span>' + usagePercent.toFixed(1) + '%</span></div></div>' : '') +
        '<div class="account-usage"><div class="usage-label">' + t('accounts.overageQuota') + '</div><div class="usage-bar"><div class="usage-fill ' + overageClass + '" style="width:' + overagePercent + '%"></div></div><div class="usage-text"><span>' + overageUsed.toFixed(1) + ' / ' + overageCap + '</span><span>' + overagePercent.toFixed(1) + '%</span></div></div>' +
        (a.trialUsageLimit > 0 ? '<div class="account-usage"><div class="usage-label">' + t('accounts.trialQuota') + ' ' + formatTrialExpiry(a.trialExpiresAt) + '</div><div class="usage-bar"><div class="usage-fill ' + trialUsageClass + '" style="width:' + trialUsagePercent + '%"></div></div><div class="usage-text"><span>' + (a.trialUsageCurrent?.toFixed(1) || 0) + ' / ' + (a.trialUsageLimit?.toFixed(0) || 0) + '</span><span>' + trialUsagePercent.toFixed(1) + '%</span></div></div>' : '') +
        '<div class="account-stats">' +
        '<div class="account-stat"><div class="account-stat-value">' + (a.requestCount || 0) + '</div><div class="account-stat-label">' + t('accounts.requests') + '</div></div>' +
        '<div class="account-stat"><div class="account-stat-value">' + formatNum(a.totalTokens || 0) + '</div><div class="account-stat-label">' + t('accounts.tokens') + '</div></div>' +
        '<div class="account-stat"><div class="account-stat-value">' + (a.totalCredits || 0).toFixed(1) + '</div><div class="account-stat-label">' + t('accounts.credits') + '</div></div>' +
        '<div class="account-stat"><div class="account-stat-value" title="' + (a.lastUsed ? new Date(a.lastUsed * 1000).toLocaleString() : '') + '">' + formatRelativeTime(a.lastUsed) + '</div><div class="account-stat-label">' + t('accounts.lastUsed') + '</div></div>' +
        '<div class="account-stat"><div class="account-stat-value">' + formatTokenExpiry(a.expiresAt) + '</div><div class="account-stat-label">' + t('accounts.expiry') + '</div></div>' +
        '<div class="account-stat"><div class="account-stat-value"><select onchange="quickSetWeight(\'' + a.id + '\',this.value)" style="width:52px;padding:1px 2px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px;text-align:center;cursor:pointer;background:#fff">' +
        [0,1,2,3,4,5].map(w => '<option value="' + w + '"' + (weightVal === w ? ' selected' : '') + '>' + w + '</option>').join('') +
        '</select></div><div class="account-stat-label">' + t('accounts.weight') + '</div></div>' +
        '</div>' +
        '</div>';
}

function showLastError(id) {
    const a = accountsData.find(x => x.id === id);
    if (!a || !a.lastError) return;
    const timeStr = a.lastError.time ? new Date(a.lastError.time * 1000).toLocaleString() : '';
    const message = a.lastError.message || '';
    UI.alert(timeStr + '\n\n' + message, t('accounts.lastError'));
}

function getSubBadge(type) {
    const subType = (type || '').toUpperCase();
    if (subType.includes('POWER')) return '<span class="badge badge-power">POWER</span>';
    if (subType.includes('PRO_PLUS') || subType.includes('PROPLUS')) return '<span class="badge badge-proplus">PRO+</span>';
    if (subType.includes('PRO')) return '<span class="badge badge-pro">PRO</span>';
    return '<span class="badge badge-free">FREE</span>';
}

function getTrialBadge(account) {
    if (account.trialStatus === 'ACTIVE' && account.trialUsageLimit > 0) {
        return '<span class="badge badge-trial">' + t('accounts.trial') + '</span>';
    }
    return '';
}

function getStatusBadge(a) {
    const badges = [];
    const isBanned = a.banStatus && a.banStatus !== 'ACTIVE';
    if (isBanned) {
        if (a.banStatus === 'BANNED') badges.push('<span class="badge badge-banned">' + t('accounts.banned') + '</span>');
        else if (a.banStatus === 'SUSPENDED') badges.push('<span class="badge badge-suspended">' + t('accounts.suspended') + '</span>');
        badges.push('<span class="badge badge-warning">' + t('accounts.disabled') + '</span>');
    } else {
        if (!a.hasToken) {
            badges.push('<span class="badge badge-error">' + t('accounts.noToken') + '</span>');
        } else if (a.expiresAt && a.expiresAt < Date.now() / 1000) {
            badges.push('<span class="badge badge-warning">' + t('accounts.expired') + '</span>');
        } else {
            badges.push('<span class="badge badge-success">' + t('accounts.normal') + '</span>');
        }
        if (a.enabled) badges.push('<span class="badge badge-info">' + t('accounts.enabled') + '</span>');
        else badges.push('<span class="badge badge-warning">' + t('accounts.disabled') + '</span>');
    }
    return badges.join('');
}

async function refreshAccount(id, btn) {
    const card = btn?.closest('.account-card');
    if (card) card.classList.add('loading');
    UI.setLoading(btn, true);
    try {
        const d = await API.post('/admin/api/accounts/' + id + '/refresh');
        if (d.success) {
            UI.toastSuccess(t('accounts.refresh'));
            loadAccounts();
        } else {
            UI.toastError(t('accounts.refreshFailed') + ': ' + d.error);
        }
    } catch (e) {
        UI.toastError(t('accounts.refreshFailed'));
    }
    UI.setLoading(btn, false);
    if (card) card.classList.remove('loading');
}

async function toggleAccount(id, enabled) {
    try {
        await API.put('/admin/api/accounts/' + id, { enabled });
        loadAccounts();
    } catch (e) {
        UI.toastError(t('common.failed'));
    }
}

async function deleteAccount(id) {
    const ok = await UI.confirm({ message: t('accounts.confirmDelete'), danger: true });
    if (!ok) return;
    try {
        await API.delete('/admin/api/accounts/' + id);
        loadAccounts();
        loadStats();
        UI.toastSuccess(t('accounts.delete'));
    } catch (e) {
        UI.toastError(t('common.failed'));
    }
}

async function quickSetWeight(id, value) {
    const weight = parseInt(value) || 0;
    try {
        await API.put('/admin/api/accounts/' + id, { weight });
        const acc = accountsData.find(a => a.id === id);
        if (acc) acc.weight = weight;
    } catch (e) { /* silent */ }
}

async function copyAccountJSON(accountId, buttonElement) {
    UI.setLoading(buttonElement, true);
    try {
        const account = await API.get('/admin/api/accounts/' + accountId + '/full');
        const { clientId, clientSecret, accessToken, refreshToken } = account;
        const jsonString = JSON.stringify({ clientId, clientSecret, accessToken, refreshToken }, null, 2);
        await copyToClipboard(jsonString);
        showCopySuccess(buttonElement);
        UI.toastSuccess(t('accounts.copyJSONSuccess'));
    } catch (error) {
        UI.setLoading(buttonElement, false);
        UI.toastError(t('common.failed'));
    }
}

function showCopySuccess(buttonElement) {
    UI.setLoading(buttonElement, false);
    const originalHTML = buttonElement.innerHTML;
    const originalClass = buttonElement.className;
    buttonElement.disabled = true;
    buttonElement.className = 'btn btn-sm btn-icon btn-success';
    buttonElement.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    setTimeout(() => {
        buttonElement.disabled = false;
        buttonElement.className = originalClass;
        buttonElement.innerHTML = originalHTML;
    }, 800);
}

async function showDetail(id) {
    const a = accountsData.find(x => x.id === id);
    if (!a) return;
    document.getElementById('detailBody').innerHTML =
        '<div class="detail-section"><h4>' + t('detail.basicInfo') + '</h4><div class="detail-grid">' +
        '<div class="detail-item"><div class="detail-label">' + t('detail.email') + '</div><div class="detail-value">' + escapeHtml(getDisplayEmail(a.email, null)) + '</div></div>' +
        '<div class="detail-item"><div class="detail-label">' + t('detail.userId') + '</div><div class="detail-value">' + escapeHtml(a.userId || '-') + '</div></div>' +
        '<div class="detail-item"><div class="detail-label">' + t('detail.authMethod') + '</div><div class="detail-value">' + formatAuthMethod(a.provider || a.authMethod) + '</div></div>' +
        '<div class="detail-item"><div class="detail-label">' + t('detail.region') + '</div><div class="detail-value">' + escapeHtml(a.region || 'us-east-1') + '</div></div>' +
        '</div></div>' +
        '<div class="detail-section"><h4>' + t('detail.machineId') + '</h4><div class="machine-id-row">' +
        '<input type="text" id="machineIdInput" value="' + escapeHtml(a.machineId || '') + '" placeholder="UUID">' +
        '<button class="btn btn-sm btn-secondary" onclick="generateMachineId(this)">' + t('detail.generate') + '</button>' +
        '<button class="btn btn-sm btn-primary" onclick="saveMachineId(\'' + id + '\', this)">' + t('common.saved') + '</button>' +
        '</div></div>' +
        '<div class="detail-section"><h4>' + t('detail.weight') + '</h4><div class="machine-id-row">' +
        '<input type="number" id="weightInput" value="' + (a.weight || 0) + '" min="0" max="10" style="width:80px">' +
        '<span style="color:#64748b;font-size:12px;flex:1">' + t('detail.weightHint') + '</span>' +
        '<button class="btn btn-sm btn-primary" onclick="saveWeight(\'' + id + '\', this)">' + t('common.saved') + '</button>' +
        '</div></div>' +
        '<div class="detail-section"><h4>' + t('detail.allowOverage') + '</h4><div class="machine-id-row">' +
        '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="allowOverageInput" ' + (a.allowOverage ? 'checked' : '') + ' disabled> <span style="color:#64748b;font-size:12px">' + t('detail.allowOverageHint') + '</span></label>' +
        '</div></div>' +
        '<div class="detail-section"><h4>' + t('detail.subscription') + '</h4><div class="detail-grid">' +
        '<div class="detail-item"><div class="detail-label">' + t('detail.subscriptionType') + '</div><div class="detail-value">' + escapeHtml(a.subscriptionTitle || a.subscriptionType || '-') + '</div></div>' +
        '<div class="detail-item"><div class="detail-label">' + t('detail.tokenExpiry') + '</div><div class="detail-value">' + (a.expiresAt ? new Date(a.expiresAt * 1000).toLocaleString() : '-') + '</div></div>' +
        '<div class="detail-item"><div class="detail-label">' + t('detail.mainQuota') + '</div><div class="detail-value">' + (a.usageCurrent?.toFixed(1) || 0) + ' / ' + (a.usageLimit?.toFixed(0) || 0) + '</div></div>' +
        '<div class="detail-item"><div class="detail-label">' + t('detail.resetDate') + '</div><div class="detail-value">' + escapeHtml(a.nextResetDate || '-') + '</div></div>' +
        (a.trialUsageLimit > 0 ? '<div class="detail-item"><div class="detail-label">' + t('detail.trialQuota') + '</div><div class="detail-value">' + (a.trialUsageCurrent?.toFixed(1) || 0) + ' / ' + (a.trialUsageLimit?.toFixed(0) || 0) + '</div></div>' +
            '<div class="detail-item"><div class="detail-label">' + t('detail.trialStatus') + '</div><div class="detail-value">' + escapeHtml(a.trialStatus || '-') + '</div></div>' +
            '<div class="detail-item"><div class="detail-label">' + t('detail.trialExpiry') + '</div><div class="detail-value">' + (a.trialExpiresAt ? new Date(a.trialExpiresAt * 1000).toLocaleString() : '-') + '</div></div>' : '') +
        '</div></div>' +
        '<div class="detail-section"><h4>' + t('detail.statistics') + '</h4><div class="detail-grid">' +
        '<div class="detail-item"><div class="detail-label">' + t('detail.requestCount') + '</div><div class="detail-value">' + (a.requestCount || 0) + '</div></div>' +
        '<div class="detail-item"><div class="detail-label">' + t('detail.errorCount') + '</div><div class="detail-value">' + (a.errorCount || 0) + '</div></div>' +
        '<div class="detail-item"><div class="detail-label">' + t('detail.totalTokens') + '</div><div class="detail-value">' + formatNum(a.totalTokens || 0) + '</div></div>' +
        '<div class="detail-item"><div class="detail-label">' + t('detail.totalCredits') + '</div><div class="detail-value">' + (a.totalCredits || 0).toFixed(2) + '</div></div>' +
        '</div></div>' +
        '<div class="detail-section"><h4>' + t('detail.models') + ' <button class="btn btn-sm btn-secondary" onclick="loadModels(\'' + id + '\', this)" style="margin-left:8px">' + t('detail.loadModels') + '</button></h4><div id="modelsList" class="model-list"></div></div>';
    document.getElementById('detailModal').classList.add('active');
}

async function loadModels(id, btn) {
    const container = document.getElementById('modelsList');
    container.innerHTML = '<p style="color:#64748b">' + t('detail.loading') + '</p>';
    UI.setLoading(btn, true);
    try {
        const d = await API.get('/admin/api/accounts/' + id + '/models');
        if (d.success && d.models) {
            const sortedModels = d.models.sort((x, y) => {
                if (x.modelId === 'auto') return -1;
                if (y.modelId === 'auto') return 1;
                return (x.rateMultiplier || 1) - (y.rateMultiplier || 1);
            });
            container.innerHTML = sortedModels.map(m => {
                const creditRatio = m.rateMultiplier || 1;
                return '<div class="model-item">' +
                    '<div class="model-name">' + escapeHtml(m.modelId) + '</div>' +
                    '<div class="model-credit"><span class="credit-ratio">' + creditRatio + 'x credit</span></div>' +
                    '<div class="model-info">' + escapeHtml(m.description || '') + '</div>' +
                    '</div>';
            }).join('') || '<p style="color:#64748b">' + t('detail.noModels') + '</p>';
        } else {
            container.innerHTML = '<p style="color:#ef4444">' + t('detail.loadFailed') + ': ' + escapeHtml(d.error || '') + '</p>';
        }
    } catch (e) {
        container.innerHTML = '<p style="color:#ef4444">' + t('detail.loadFailed') + '</p>';
    }
    UI.setLoading(btn, false);
}

function closeDetailModal() { document.getElementById('detailModal').classList.remove('active'); }

async function generateMachineId(btn) {
    UI.setLoading(btn, true);
    try {
        const d = await API.get('/admin/api/generate-machine-id');
        if (d.machineId) document.getElementById('machineIdInput').value = d.machineId;
    } catch (e) {
        UI.toastError(t('detail.generateFailed'));
    }
    UI.setLoading(btn, false);
}

async function saveMachineId(id, btn) {
    const machineId = document.getElementById('machineIdInput').value.trim();
    if (machineId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(machineId) && !/^[0-9a-f]{32}$/i.test(machineId)) {
        UI.toastError(t('detail.machineIdError'));
        return;
    }
    UI.setLoading(btn, true);
    try {
        const d = await API.put('/admin/api/accounts/' + id, { machineId });
        if (d.success) { UI.toastSuccess(t('detail.saved')); loadAccounts(); }
        else UI.toastError(t('detail.saveFailed') + ': ' + (d.error || ''));
    } catch (e) {
        UI.toastError(t('detail.saveFailed'));
    }
    UI.setLoading(btn, false);
}

async function saveWeight(id, btn) {
    const weight = parseInt(document.getElementById('weightInput').value) || 0;
    UI.setLoading(btn, true);
    try {
        const d = await API.put('/admin/api/accounts/' + id, { weight });
        if (d.success) { UI.toastSuccess(t('detail.saved')); loadAccounts(); }
        else UI.toastError(t('detail.saveFailed') + ': ' + (d.error || ''));
    } catch (e) {
        UI.toastError(t('detail.saveFailed'));
    }
    UI.setLoading(btn, false);
}

async function autoRefreshNewAccount(accountId) {
    if (!accountId) return;
    try {
        await API.post('/admin/api/accounts/' + accountId + '/refresh');
    } catch (e) { }
    loadAccounts();
}
