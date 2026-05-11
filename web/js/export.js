let exportSelectedIds = new Set();

function showExportModal() {
    if (accountsData.length === 0) { UI.toastWarning(t('accounts.empty')); return; }
    exportSelectedIds = new Set(accountsData.map(a => a.id));
    renderExportModal();
    document.getElementById('exportModal').classList.add('active');
}

function closeExportModal() { document.getElementById('exportModal').classList.remove('active'); }

function renderExportModal() {
    const body = document.getElementById('exportBody');
    const allSelected = exportSelectedIds.size === accountsData.length;
    body.innerHTML =
        '<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">' +
        '<span style="font-size:13px;color:#64748b">' + t('export.selected', exportSelectedIds.size) + '</span>' +
        '<button class="btn btn-sm btn-secondary" onclick="toggleExportSelectAll()">' + (allSelected ? t('export.deselectAll') : t('export.selectAll')) + '</button>' +
        '</div>' +
        '<div style="max-height:300px;overflow-y:auto;margin-bottom:16px">' +
        accountsData.map(a => {
            const checked = exportSelectedIds.has(a.id) ? 'checked' : '';
            return '<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;cursor:pointer;margin-bottom:4px;background:' + (exportSelectedIds.has(a.id) ? '#f0f4ff' : '#f8fafc') + ';transition:background 0.15s ease">' +
                '<input type="checkbox" ' + checked + ' onchange="toggleExportAccount(\'' + a.id + '\')" style="width:16px;height:16px">' +
                '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(getDisplayEmail(a.email, a.id)) + '</div>' +
                '<div style="font-size:11px;color:#64748b">' + formatAuthMethod(a.provider || a.authMethod) + ' · ' + escapeHtml(a.subscriptionType || 'FREE') + '</div></div>' +
                '</label>';
        }).join('') +
        '</div>' +
        '<div id="exportJsonPreview" class="hidden" style="margin-bottom:12px"><textarea id="exportJsonText" readonly style="width:100%;min-height:150px;max-height:300px;font-family:monospace;font-size:11px;background:#f8fafc;resize:vertical"></textarea></div>' +
        '<div class="modal-footer" style="flex-wrap:wrap">' +
        '<button class="btn btn-secondary" onclick="closeExportModal()">' + t('common.cancel') + '</button>' +
        '<button class="btn btn-secondary" onclick="exportShowJson(this)">' + t('export.showJson') + '</button>' +
        '<button class="btn btn-secondary" onclick="exportCopyJson(this)">' + t('export.copyJson') + '</button>' +
        '<button class="btn btn-primary" onclick="exportDownloadJson(this)">' + t('export.downloadJson') + '</button>' +
        '</div>';
}

function toggleExportAccount(id) {
    if (exportSelectedIds.has(id)) exportSelectedIds.delete(id);
    else exportSelectedIds.add(id);
    renderExportModal();
}

function toggleExportSelectAll() {
    if (exportSelectedIds.size === accountsData.length) exportSelectedIds.clear();
    else exportSelectedIds = new Set(accountsData.map(a => a.id));
    renderExportModal();
}

async function getExportData() {
    if (exportSelectedIds.size === 0) { UI.toastWarning(t('export.noSelection')); return null; }
    try {
        return await API.post('/admin/api/export', { ids: Array.from(exportSelectedIds) });
    } catch (e) {
        UI.toastError(t('common.failed') + ': ' + (e.message || ''));
        return null;
    }
}

async function exportShowJson(btn) {
    await UI.withLoading(btn, async () => {
        const data = await getExportData();
        if (!data) return;
        const preview = document.getElementById('exportJsonPreview');
        const textarea = document.getElementById('exportJsonText');
        preview.classList.remove('hidden');
        textarea.value = JSON.stringify(data, null, 2);
    });
}

async function exportCopyJson(btn) {
    await UI.withLoading(btn, async () => {
        const data = await getExportData();
        if (!data) return;
        const filtered = data.accounts.map(a => {
            const { clientId, clientSecret, accessToken, refreshToken } = a.credentials || {};
            return { clientId, clientSecret, accessToken, refreshToken };
        });
        try {
            await copyToClipboard(JSON.stringify(filtered, null, 2));
            UI.toastSuccess(t('export.copied'));
        } catch (e) {
            UI.toastError(t('common.failed'));
        }
    });
}

async function exportDownloadJson(btn) {
    await UI.withLoading(btn, async () => {
        const data = await getExportData();
        if (!data) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kiro-accounts-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
    });
}
