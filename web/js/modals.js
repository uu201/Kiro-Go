let builderIdSession = '';
let builderIdPollTimer = null;
let iamSession = '';

function showModal(type) {
    const modal = document.getElementById('addModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    if (type === 'add') {
        title.textContent = t('modal.addAccount');
        body.innerHTML = renderAddPicker();
    } else if (type === 'builderid') {
        title.textContent = t('modal.builderIdTitle');
        body.innerHTML = renderBuilderIdForm();
    } else if (type === 'local') {
        title.textContent = t('modal.localTitle');
        body.innerHTML = renderLocalForm();
    } else if (type === 'credentials') {
        title.textContent = t('modal.credentialsTitle');
        body.innerHTML = renderCredentialsForm();
    } else if (type === 'sso') {
        title.textContent = t('modal.ssoTitle');
        body.innerHTML = renderSsoForm();
    } else if (type === 'iam') {
        title.textContent = t('modal.iamTitle');
        body.innerHTML = renderIamForm();
    }
    modal.classList.add('active');
}

function renderAddPicker() {
    return '<div style="display:flex;flex-direction:column;gap:12px">' +
        '<div class="card picker-card" onclick="showModal(\'builderid\')"><div class="picker-title">' + t('modal.builderIdTitle') + '</div><div class="picker-desc">' + t('modal.builderIdDesc') + '</div></div>' +
        '<div class="card picker-card" onclick="showModal(\'iam\')"><div class="picker-title">' + t('modal.iamTitle') + '</div><div class="picker-desc">' + t('modal.iamDesc') + '</div></div>' +
        '<div class="card picker-card" onclick="showModal(\'sso\')"><div class="picker-title">' + t('modal.ssoTitle') + '</div><div class="picker-desc">' + t('modal.ssoDesc') + '</div></div>' +
        '<div class="card picker-card" onclick="showModal(\'local\')"><div class="picker-title">' + t('modal.localTitle') + '</div><div class="picker-desc">' + t('modal.localDesc') + '</div></div>' +
        '<div class="card picker-card" onclick="showModal(\'credentials\')"><div class="picker-title">' + t('modal.credentialsTitle') + '</div><div class="picker-desc">' + t('modal.credentialsDesc') + '</div></div>' +
        '</div>' +
        '<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">' + t('common.cancel') + '</button></div>';
}

function renderBuilderIdForm() {
    return '<p style="font-size:13px;color:#64748b;margin-bottom:16px">' + t('modal.builderIdDesc') + '</p>' +
        '<div id="builderIdStep1"><div class="form-group"><label>Region</label><input type="text" id="builderIdRegion" value="us-east-1"></div>' +
        '<div class="modal-footer"><button class="btn btn-secondary" onclick="showModal(\'add\')">' + t('common.back') + '</button><button class="btn btn-primary" onclick="startBuilderIdLogin(this)">' + t('builderid.startLogin') + '</button></div></div>' +
        '<div id="builderIdStep2" class="hidden">' +
        '<div class="message" style="background:#ede9fe;color:#7c3aed;text-align:center"><p style="font-size:18px;font-weight:600;margin-bottom:8px;letter-spacing:2px" id="builderIdUserCode"></p><p style="font-size:12px">' + t('builderid.verifyCode') + '</p></div>' +
        '<div class="form-group" style="margin-top:16px"><label>' + t('builderid.verifyUrl') + '</label><div class="endpoint" style="margin-bottom:0"><span id="builderIdVerifyUrl" style="font-size:12px"></span></div>' +
        '<div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-sm btn-secondary" style="flex:1" onclick="window.open(document.getElementById(\'builderIdVerifyUrl\').textContent,\'_blank\')">' + t('builderid.open') + '</button><button class="btn btn-sm btn-secondary" style="flex:1" onclick="copyFromEl(\'builderIdVerifyUrl\')">' + t('common.copy') + '</button></div></div>' +
        '<p id="builderIdStatus" style="color:#64748b;margin:16px 0;font-size:13px;text-align:center;display:flex;align-items:center;justify-content:center;gap:8px"><span class="btn-spinner" style="width:12px;height:12px;border-width:2px;color:#7c3aed"></span><span>' + t('builderid.waiting') + '</span></p>' +
        '<div class="modal-footer"><button class="btn btn-secondary" onclick="cancelBuilderIdLogin()">' + t('common.cancel') + '</button></div>' +
        '</div>';
}

function renderLocalForm() {
    return '<p style="font-size:13px;color:#64748b;margin-bottom:16px">' + t('modal.localDesc') + '</p>' +
        '<div style="font-size:13px;color:#64748b;margin-bottom:16px;line-height:1.6"><p style="margin-bottom:8px"><b>' + t('local.fileLocation') + '</b></p><p style="margin-bottom:4px">Windows: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px">%USERPROFILE%\\.aws\\sso\\cache\\</code></p><p>macOS/Linux: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px">~/.aws/sso/cache/</code></p></div>' +
        '<div class="form-group"><label>' + t('local.loginChannel') + '</label><select id="localProvider" onchange="updateLocalFields()"><option value="BuilderId">AWS Builder ID</option><option value="Enterprise">IAM Identity Center (Enterprise SSO)</option><option value="Google">Google</option><option value="Github">GitHub</option></select></div>' +
        '<div class="form-group"><label>' + t('local.tokenFile') + ' <span style="font-weight:normal;color:#64748b;font-size:12px">' + t('local.tokenRequired') + '</span></label><div style="display:flex;gap:8px;align-items:stretch"><textarea id="localTokenJson" placeholder="' + t('local.pasteOrUpload') + '" style="flex:1;min-height:80px;font-size:12px"></textarea><label class="btn btn-secondary" style="display:flex;align-items:center;cursor:pointer">' + t('local.upload') + '<input type="file" accept=".json" style="display:none" onchange="loadLocalFile(this,\'localTokenJson\')"></label></div></div>' +
        '<div id="localClientGroup" class="form-group"><label>' + t('local.clientFile') + ' <span style="font-weight:normal;color:#64748b;font-size:12px">' + t('local.clientRequired') + '</span></label><div style="display:flex;gap:8px;align-items:stretch"><textarea id="localClientJson" placeholder="' + t('local.pasteOrUpload') + '" style="flex:1;min-height:80px;font-size:12px"></textarea><label class="btn btn-secondary" style="display:flex;align-items:center;cursor:pointer">' + t('local.upload') + '<input type="file" accept=".json" style="display:none" onchange="loadLocalFile(this,\'localClientJson\')"></label></div></div>' +
        '<div class="modal-footer"><button class="btn btn-secondary" onclick="showModal(\'add\')">' + t('common.back') + '</button><button class="btn btn-primary" onclick="importLocalKiro(this)">' + t('common.add') + '</button></div>';
}

function renderCredentialsForm() {
    return '<p style="font-size:13px;color:#64748b;margin-bottom:16px">' + t('modal.credentialsDesc') + '</p>' +
        '<div style="font-size:12px;color:#64748b;margin-bottom:12px;line-height:1.5">' + t('credentials.batchHint') + '</div>' +
        '<div class="form-group"><label>' + t('credentials.label') + '</label><textarea id="credJson" placeholder=\'[{"refreshToken":"xxx","provider":"BuilderId"},{"refreshToken":"yyy","clientId":"...","clientSecret":"...","provider":"Enterprise"}]\' style="min-height:120px"></textarea></div>' +
        '<div class="modal-footer"><button class="btn btn-secondary" onclick="showModal(\'add\')">' + t('common.back') + '</button><button class="btn btn-primary" onclick="importCredentials(this)">' + t('common.add') + '</button></div>';
}

function renderSsoForm() {
    return '<div style="font-size:13px;color:#64748b;margin-bottom:16px;line-height:1.6"><p style="margin-bottom:8px"><b>' + t('sso.howToGet') + '</b></p><ol style="margin:0;padding-left:20px"><li>' + t('sso.step1') + ' <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">view.awsapps.com/start</code></li><li>' + t('sso.step2') + '</li><li>' + t('sso.step3') + ' <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">x-amz-sso_authn</code></li></ol></div>' +
        '<div class="form-group"><label>' + t('sso.tokenLabel') + ' <span style="font-weight:normal;color:#64748b;font-size:12px">' + t('sso.tokenHint') + '</span></label><textarea id="ssoToken" placeholder="' + t('sso.tokenPlaceholder') + '" style="min-height:120px"></textarea></div>' +
        '<div class="form-group"><label>Region</label><input type="text" id="ssoRegion" value="us-east-1"></div>' +
        '<div class="modal-footer"><button class="btn btn-secondary" onclick="showModal(\'add\')">' + t('common.back') + '</button><button class="btn btn-primary" onclick="importSsoToken(this)">' + t('common.add') + '</button></div>';
}

function renderIamForm() {
    return '<p style="font-size:13px;color:#64748b;margin-bottom:16px">' + t('modal.iamDesc') + '</p>' +
        '<div class="form-group"><label>' + t('iam.startUrl') + '</label><input type="text" id="iamStartUrl" placeholder="https://xxx.awsapps.com/start"></div>' +
        '<div class="form-group"><label>Region</label><input type="text" id="iamRegion" value="us-east-1"></div>' +
        '<div id="iamStep2" class="hidden"><div class="form-group"><label>' + t('iam.loginUrl') + '</label><div class="endpoint" style="margin-bottom:0"><span id="iamAuthUrl" style="font-size:11px"></span></div><div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-sm btn-secondary" style="flex:1" onclick="window.open(document.getElementById(\'iamAuthUrl\').textContent,\'_blank\')">' + t('builderid.open') + '</button><button class="btn btn-sm btn-secondary" style="flex:1" onclick="copyFromEl(\'iamAuthUrl\')">' + t('common.copy') + '</button></div></div><p style="color:#16a34a;margin:12px 0;font-size:14px">' + t('iam.completeLogin') + '</p><div class="form-group"><label>' + t('iam.callbackUrl') + '</label><input type="text" id="iamCallback" placeholder="http://127.0.0.1:xxx/?code=..."></div></div>' +
        '<div class="modal-footer"><button class="btn btn-secondary" onclick="showModal(\'add\')">' + t('common.back') + '</button><button class="btn btn-primary" id="iamBtn" onclick="startIamSso(this)">' + t('builderid.startLogin') + '</button></div>';
}

async function copyFromEl(id) {
    try {
        await copyToClipboard(document.getElementById(id).textContent);
        UI.toastSuccess(t('common.copied'));
    } catch (e) { UI.toastError(t('common.failed')); }
}

function closeModal() {
    document.getElementById('addModal').classList.remove('active');
    iamSession = '';
    if (builderIdPollTimer) { clearTimeout(builderIdPollTimer); builderIdPollTimer = null; }
    builderIdSession = '';
}

function loadLocalFile(input, targetId) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { document.getElementById(targetId).value = e.target.result; };
    reader.readAsText(file);
}

function updateLocalFields() {
    const provider = document.getElementById('localProvider').value;
    const clientGroup = document.getElementById('localClientGroup');
    clientGroup.style.display = (provider === 'Google' || provider === 'Github') ? 'none' : 'block';
}

async function importLocalKiro(btn) {
    const provider = document.getElementById('localProvider').value;
    const tokenJson = document.getElementById('localTokenJson').value.trim();
    const clientJson = document.getElementById('localClientJson').value.trim();
    const isSocial = provider === 'Google' || provider === 'Github';
    if (!tokenJson) { UI.toastWarning(t('local.tokenMissing')); return; }
    let tokenData, clientData;
    try { tokenData = JSON.parse(tokenJson); } catch { UI.toastError(t('local.tokenInvalid')); return; }
    if (!tokenData.refreshToken) { UI.toastWarning(t('local.refreshTokenMissing')); return; }
    if (!isSocial) {
        if (!clientJson) { UI.toastWarning(t('local.clientMissing')); return; }
        try { clientData = JSON.parse(clientJson); } catch { UI.toastError(t('local.clientInvalid')); return; }
        if (!clientData.clientId || !clientData.clientSecret) { UI.toastWarning(t('local.clientSecretMissing')); return; }
    }
    const authMethod = clientData ? 'idc' : 'social';
    const payload = {
        refreshToken: tokenData.refreshToken,
        accessToken: tokenData.accessToken || '',
        clientId: clientData?.clientId || '',
        clientSecret: clientData?.clientSecret || '',
        authMethod, provider
    };
    await UI.withLoading(btn, async () => {
        try {
            const d = await API.post('/admin/api/auth/credentials', payload);
            if (d.success) {
                closeModal(); loadAccounts(); loadStats();
                UI.toastSuccess(t('local.importSuccess') + ': ' + (d.account?.email || d.account?.id));
                autoRefreshNewAccount(d.account?.id);
            } else {
                UI.toastError(t('common.failed') + ': ' + (d.error || ''));
            }
        } catch (e) {
            UI.toastError(t('common.failed') + ': ' + (e.message || ''));
        }
    });
}

async function importCredentials(btn) {
    let json;
    try {
        json = JSON.parse(document.getElementById('credJson').value.trim());
    } catch (e) { UI.toastError(t('credentials.jsonError')); return; }

    let items;
    if (json.accounts && Array.isArray(json.accounts)) {
        items = json.accounts.map(a => {
            const c = a.credentials || {};
            return {
                refreshToken: c.refreshToken || a.refreshToken,
                clientId: c.clientId || a.clientId,
                clientSecret: c.clientSecret || a.clientSecret,
                region: c.region || a.region,
                authMethod: c.authMethod || a.authMethod,
                provider: c.provider || a.provider || a.idp
            };
        });
    } else {
        items = Array.isArray(json) ? json : [json];
    }

    await UI.withLoading(btn, async () => {
        let success = 0, failed = 0, newIds = [];
        for (const item of items) {
            if (!item.refreshToken) { failed++; continue; }
            let authMethod = item.authMethod || '';
            if (item.clientId && item.clientSecret) authMethod = 'idc';
            else if (!authMethod || authMethod === 'social') authMethod = 'social';
            else authMethod = authMethod.toLowerCase() === 'idc' ? 'idc' : 'social';

            let provider = item.provider || '';
            if (!provider && authMethod === 'social') provider = 'Google';
            if (!provider && authMethod === 'idc') provider = 'BuilderId';

            const payload = {
                refreshToken: item.refreshToken,
                accessToken: item.accessToken || '',
                clientId: item.clientId || '',
                clientSecret: item.clientSecret || '',
                authMethod, provider,
                region: item.region || 'us-east-1'
            };
            try {
                const d = await API.post('/admin/api/auth/credentials', payload);
                if (d.success) { success++; if (d.account?.id) newIds.push(d.account.id); }
                else failed++;
            } catch { failed++; }
        }
        closeModal(); loadAccounts(); loadStats();
        let msg = t('sso.importSuccess', success);
        if (failed > 0) msg += t('sso.importPartial', failed);
        if (success > 0) UI.toastSuccess(msg);
        else UI.toastError(msg);
        newIds.forEach(id => autoRefreshNewAccount(id));
    });
}

async function importSsoToken(btn) {
    await UI.withLoading(btn, async () => {
        try {
            const d = await API.post('/admin/api/auth/sso-token', {
                bearerToken: document.getElementById('ssoToken').value,
                region: document.getElementById('ssoRegion').value
            });
            if (d.success) {
                closeModal(); loadAccounts(); loadStats();
                const count = d.accounts?.length || 0;
                const errCount = d.errors?.length || 0;
                let msg = t('sso.importSuccess', count);
                if (errCount > 0) msg += t('sso.importPartial', errCount);
                UI.toastSuccess(msg);
                if (d.accounts) d.accounts.forEach(a => autoRefreshNewAccount(a.id));
            } else {
                UI.toastError(t('common.failed') + ': ' + (d.error || ''));
            }
        } catch (e) {
            UI.toastError(t('common.failed') + ': ' + (e.message || ''));
        }
    });
}

async function startBuilderIdLogin(btn) {
    const region = document.getElementById('builderIdRegion').value || 'us-east-1';
    await UI.withLoading(btn, async () => {
        try {
            const d = await API.post('/admin/api/auth/builderid/start', { region });
            if (d.sessionId) {
                builderIdSession = d.sessionId;
                document.getElementById('builderIdUserCode').textContent = d.userCode;
                document.getElementById('builderIdVerifyUrl').textContent = d.verificationUri;
                document.getElementById('builderIdStep1').classList.add('hidden');
                document.getElementById('builderIdStep2').classList.remove('hidden');
                pollBuilderIdAuth(d.interval || 5);
            } else {
                UI.toastError(t('common.failed') + ': ' + (d.error || ''));
            }
        } catch (e) {
            UI.toastError(t('common.failed') + ': ' + (e.message || ''));
        }
    });
}

function pollBuilderIdAuth(interval) {
    builderIdPollTimer = setTimeout(async () => {
        try {
            const d = await API.post('/admin/api/auth/builderid/poll', { sessionId: builderIdSession });
            if (d.completed) {
                closeModal(); loadAccounts(); loadStats();
                UI.toastSuccess(t('builderid.success') + ': ' + (d.account?.email || d.account?.id));
                autoRefreshNewAccount(d.account?.id);
            } else if (d.success && !d.completed) {
                pollBuilderIdAuth(d.interval || interval);
            } else {
                UI.toastError(t('common.failed') + ': ' + (d.error || ''));
                cancelBuilderIdLogin();
            }
        } catch (e) {
            UI.toastError(t('common.failed'));
            cancelBuilderIdLogin();
        }
    }, interval * 1000);
}

function cancelBuilderIdLogin() {
    if (builderIdPollTimer) { clearTimeout(builderIdPollTimer); builderIdPollTimer = null; }
    builderIdSession = '';
    showModal('add');
}

async function startIamSso(btn) {
    await UI.withLoading(btn, async () => {
        try {
            if (iamSession) {
                const d = await API.post('/admin/api/auth/iam-sso/complete', {
                    sessionId: iamSession,
                    callbackUrl: document.getElementById('iamCallback').value
                });
                if (d.success) {
                    closeModal(); loadAccounts(); loadStats();
                    UI.toastSuccess(t('builderid.success') + ': ' + (d.account?.email || d.account?.id));
                    autoRefreshNewAccount(d.account?.id);
                } else {
                    UI.toastError(t('common.failed') + ': ' + (d.error || ''));
                }
            } else {
                const d = await API.post('/admin/api/auth/iam-sso/start', {
                    startUrl: document.getElementById('iamStartUrl').value,
                    region: document.getElementById('iamRegion').value
                });
                if (d.authorizeUrl) {
                    iamSession = d.sessionId;
                    document.getElementById('iamAuthUrl').textContent = d.authorizeUrl;
                    document.getElementById('iamStep2').classList.remove('hidden');
                    document.getElementById('iamBtn').textContent = t('iam.complete');
                } else {
                    UI.toastError(t('common.failed') + ': ' + (d.error || ''));
                }
            }
        } catch (e) {
            UI.toastError(t('common.failed') + ': ' + (e.message || ''));
        }
    });
}
