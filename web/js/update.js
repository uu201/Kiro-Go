let currentVersion = '';

async function loadVersion() {
    try {
        const d = await API.get('/admin/api/version');
        currentVersion = d.version || '';
        document.getElementById('versionBadge').textContent = 'v' + currentVersion;
    } catch (e) { }
}

async function checkUpdate(manual) {
    try {
        const res = await fetch('https://raw.githubusercontent.com/Quorinex/Kiro-Go/main/version.json?t=' + Date.now());
        if (!res.ok) throw new Error('Fetch failed');
        const d = await res.json();
        const latestVersion = (d.version || '').replace(/^v/, '');
        if (latestVersion && latestVersion !== currentVersion && compareVersions(latestVersion, currentVersion) > 0) {
            showUpdateModal(latestVersion, d.download || 'https://github.com/Quorinex/Kiro-Go', d.changelog || '');
        } else if (manual) {
            UI.toastInfo(t('update.upToDate') + ' (v' + currentVersion + ')');
        }
    } catch (e) {
        if (manual) UI.toastError(t('update.checkFailed'));
    }
}

function showUpdateModal(version, url, changelog) {
    const body = document.getElementById('updateBody');
    body.innerHTML =
        '<div style="text-align:center;margin-bottom:20px">' +
        '<div style="font-size:48px;margin-bottom:12px">🎉</div>' +
        '<p style="font-size:16px;font-weight:600;color:#7c3aed">' + t('update.newVersion') + '</p>' +
        '</div>' +
        '<div class="detail-grid" style="margin-bottom:16px">' +
        '<div class="detail-item"><div class="detail-label">' + t('update.current') + '</div><div class="detail-value">v' + escapeHtml(currentVersion) + '</div></div>' +
        '<div class="detail-item"><div class="detail-label">' + t('update.latest') + '</div><div class="detail-value" style="color:#16a34a">v' + escapeHtml(version) + '</div></div>' +
        '</div>' +
        (changelog ? '<div style="margin-bottom:16px"><div style="font-size:13px;font-weight:600;margin-bottom:8px">' + t('update.changelog') + '</div><div style="background:#f8fafc;padding:12px;border-radius:8px;font-size:12px;max-height:200px;overflow-y:auto;white-space:pre-wrap;line-height:1.6">' + escapeHtml(changelog) + '</div></div>' : '') +
        '<div style="text-align:center"><a href="' + encodeURI(url) + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="text-decoration:none;display:inline-block">' + t('update.goDownload') + '</a></div>';
    document.getElementById('updateModal').classList.add('active');
}

function closeUpdateModal() { document.getElementById('updateModal').classList.remove('active'); }
