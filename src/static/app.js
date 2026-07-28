// eREQUEST 360 Client State
const state = {
    token: localStorage.getItem('jwt_token') || '',
    user: null,
    requests: [],
    eligiblePrograms: [],
    selectedProgramId: null,
    currentFilter: 'ALL',
    currentTab: 'REQUESTS'
};

// DOM Cache
const dom = {
    authScreen: document.getElementById('auth-screen'),
    dashboardScreen: document.getElementById('dashboard-screen'),
    adminScreen: document.getElementById('admin-screen'),
    appHeader: document.getElementById('app-header'),
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    headerUserInfo: document.getElementById('header-user-info'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Navigation
    headerNav: document.getElementById('header-nav'),
    navRequestsBtn: document.getElementById('nav-requests-btn'),
    navAdminBtn: document.getElementById('nav-admin-btn'),
    
    // Submitter
    submitterCard: document.getElementById('submitter-actions-card'),
    lookupAccount: document.getElementById('lookup-account'),
    lookupBtn: document.getElementById('lookup-btn'),
    eligibilityResults: document.getElementById('eligibility-results'),
    programList: document.getElementById('program-list'),
    pickupBranch: document.getElementById('pickup-branch'),
    requestBrand: document.getElementById('request-brand'),
    submitRequestBtn: document.getElementById('submit-request-btn'),
    
    // Log & Table
    requestTableBody: document.getElementById('request-table-body'),
    
    // Simulator
    simulatorList: document.getElementById('simulator-list'),

    // Admin Settings
    policyForm: document.getElementById('policy-form'),
    policySelect: document.getElementById('policy-select'),
    policyApprovalCheckbox: document.getElementById('policy-approval-checkbox'),
    userTableBody: document.getElementById('user-table-body'),
    createUserForm: document.getElementById('create-user-form'),
    newUserId: document.getElementById('new-user-id'),
    newUsername: document.getElementById('new-username'),
    newEmail: document.getElementById('new-email'),
    newPassword: document.getElementById('new-password'),
    newRole: document.getElementById('new-role'),
    newBranch: document.getElementById('new-branch')
};

// Apply Login Presets
window.applyPreset = function(username, password) {
    dom.usernameInput.value = username;
    dom.passwordInput.value = password;
    dom.loginForm.dispatchEvent(new Event('submit'));
};

// API Fetch Helper
async function apiCall(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {})
    };
    
    const response = await fetch(endpoint, {
        ...options,
        headers: {
            ...headers,
            ...(options.headers || {})
        }
    });
    
    if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired. Please log in again.');
    }
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.detail || 'An error occurred.');
    }
    return data;
}

// Initial Loading
document.addEventListener('DOMContentLoaded', () => {
    // Bind Event Listeners
    dom.loginForm.addEventListener('submit', handleLogin);
    dom.logoutBtn.addEventListener('click', handleLogout);
    dom.lookupBtn.addEventListener('click', handleAccountCheck);
    dom.submitRequestBtn.addEventListener('click', handleSubmitRequest);
    
    // Navigation binds
    dom.navRequestsBtn.addEventListener('click', () => switchTab('REQUESTS'));
    dom.navAdminBtn.addEventListener('click', () => switchTab('ADMIN'));
    
    // Admin form binds
    dom.policyForm.addEventListener('submit', handlePolicySave);
    dom.createUserForm.addEventListener('submit', handleCreateUser);
    
    if (state.token) {
        loadSession();
    } else {
        showScreen('AUTH');
    }
});

// View Controller
function showScreen(screen) {
    if (screen === 'AUTH') {
        dom.authScreen.classList.remove('hidden');
        dom.dashboardScreen.classList.add('hidden');
        dom.adminScreen.classList.add('hidden');
        dom.appHeader.classList.add('hidden');
    } else {
        dom.authScreen.classList.add('hidden');
        dom.appHeader.classList.remove('hidden');
        switchTab(state.currentTab || 'REQUESTS');
    }
}

// Switch Navigation Tabs
function switchTab(tab) {
    state.currentTab = tab;
    if (tab === 'REQUESTS') {
        dom.dashboardScreen.classList.remove('hidden');
        dom.adminScreen.classList.add('hidden');
        dom.navRequestsBtn.classList.add('active-tab');
        dom.navAdminBtn.classList.remove('active-tab');
        refreshDashboardData();
        // Resume auto-refresh
        if (window.refreshInterval) clearInterval(window.refreshInterval);
        window.refreshInterval = setInterval(refreshDashboardData, 8000);
    } else if (tab === 'ADMIN') {
        dom.dashboardScreen.classList.add('hidden');
        dom.adminScreen.classList.remove('hidden');
        dom.navRequestsBtn.classList.remove('active-tab');
        dom.navAdminBtn.classList.add('active-tab');
        // Stop auto-refresh for performance
        if (window.refreshInterval) clearInterval(window.refreshInterval);
        loadAdminPanelData();
    }
}

// Load Session info
async function loadSession() {
    try {
        const user = await apiCall('/auth/me');
        state.user = user;
        
        // Populate Header Info
        dom.headerUserInfo.textContent = `${user.username} (${getRoleLabel(user.roles)})`;
        
        // Show/Hide submitter tools depending on role
        const isSubmitter = user.roles.includes('branch_submitter') || user.roles.includes('super_admin');
        if (isSubmitter) {
            dom.submitterCard.classList.remove('hidden');
            loadBranchOptions();
        } else {
            dom.submitterCard.classList.add('hidden');
        }
        
        // Show/Hide Admin Console tab depending on role
        const isAdmin = user.roles.includes('super_admin') || 
                        user.roles.includes('operations_admin_maker') || 
                        user.roles.includes('operations_admin_checker') ||
                        user.roles.includes('internal_control_maker') ||
                        user.roles.includes('internal_control_checker');
                        
        if (isAdmin) {
            dom.headerNav.classList.remove('hidden');
        } else {
            dom.headerNav.classList.add('hidden');
        }

        // Show/Hide Global View checkbox for branch users
        const isBranchUser = user.roles.includes('branch_submitter') || user.roles.includes('branch_authorizer');
        const gvContainer = document.getElementById('global-view-container');
        if (gvContainer) {
            if (isBranchUser) {
                gvContainer.classList.remove('hidden');
            } else {
                gvContainer.classList.add('hidden');
            }
        }
        
        state.currentTab = 'REQUESTS';
        showScreen('DASHBOARD');
        
    } catch (err) {
        console.error(err);
        handleLogout();
    }
}

// Role label helper
function getRoleLabel(roles) {
    if (roles.includes('super_admin')) return 'Super Admin';
    if (roles.includes('branch_authorizer')) return 'Branch Authorizer';
    if (roles.includes('branch_submitter')) return 'Branch Submitter';
    return roles.join(', ');
}

// Load Branch Options based on client ID
async function loadBranchOptions() {
    try {
        const branches = await apiCall('/config/branches');
        dom.pickupBranch.innerHTML = '';
        branches.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.branch_code;
            opt.textContent = `${b.branch_name} (${b.branch_code})`;
            dom.pickupBranch.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to load branches:', err);
    }
}

// Load Admin Panel configuration & data lists
async function loadAdminPanelData() {
    if (!state.token) return;
    try {
        // Load policy config
        const policy = await apiCall('/config/card-policy');
        dom.policySelect.value = policy.card_policy;
        dom.policyApprovalCheckbox.checked = policy.requires_approval_for_deviation;

        // Load users list
        loadUsersTable();

        // Load roles for user creation select list
        const roles = await apiCall('/roles/');
        dom.newRole.innerHTML = '';
        roles.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.role_code;
            opt.textContent = `${r.role_name} (${r.role_code})`;
            dom.newRole.appendChild(opt);
        });

        // Load branches for user creation select list
        const branches = await apiCall('/config/branches');
        dom.newBranch.innerHTML = '';
        branches.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.branch_code;
            opt.textContent = `${b.branch_name} (${b.branch_code})`;
            dom.newBranch.appendChild(opt);
        });

    } catch (err) {
        console.error('Failed to load admin panel data:', err);
    }
}

// Load Users table list
async function loadUsersTable() {
    try {
        dom.userTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 24px;">Loading user directory...</td></tr>';
        
        const users = await apiCall('/users/');
        dom.userTableBody.innerHTML = '';
        
        if (users.length === 0) {
            dom.userTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No users found in this tenant.</td></tr>';
            return;
        }
        
        users.forEach(u => {
            const tr = document.createElement('tr');
            const toggleButtonText = u.active ? 'Deactivate' : 'Activate';
            const toggleButtonClass = u.active ? 'user-toggle-btn btn-active' : 'user-toggle-btn btn-inactive';
            
            // Disable deactivating oneself
            const isDisabled = u.user_id === state.user.user_id ? 'disabled title="Cannot deactivate yourself" style="opacity: 0.5; cursor: not-allowed;"' : '';
            
            tr.innerHTML = `
                <td>#${u.user_id}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.email || '-'}</td>
                <td><span class="badge badge-authorized">${u.role_code}</span></td>
                <td>${u.branch_id || '-'}</td>
                <td><span class="badge ${u.active ? 'badge-success' : 'badge-failed'}">${u.active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <button class="${toggleButtonClass}" onclick="toggleUserActivation('${u.user_id}', ${u.active})" ${isDisabled}>
                        ${toggleButtonText}
                    </button>
                </td>
            `;
            dom.userTableBody.appendChild(tr);
        });
    } catch (err) {
        dom.userTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger); padding: 24px;">Error: ${err.message}</td></tr>`;
    }
}

window.toggleUserActivation = async function(userId, currentActive) {
    const newActive = !currentActive;
    const confirmMsg = `Are you sure you want to ${newActive ? 'activate' : 'deactivate'} user #${userId}?`;
    if (!confirm(confirmMsg)) return;

    try {
        await apiCall(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ active: newActive })
        });
        alert(`User #${userId} has been successfully ${newActive ? 'activated' : 'deactivated'}.`);
        loadUsersTable();
    } catch (err) {
        alert(`Failed to update user: ${err.message}`);
    }
};

// Handle Policy Form Submit
async function handlePolicySave(e) {
    e.preventDefault();
    const card_policy = dom.policySelect.value;
    const requires_approval_for_deviation = dom.policyApprovalCheckbox.checked;
    
    try {
        await apiCall('/config/card-policy', {
            method: 'PUT',
            body: JSON.stringify({
                card_policy,
                requires_approval_for_deviation
            })
        });
        alert('Card issuance policy updated successfully!');
    } catch (err) {
        alert(`Failed to save policy: ${err.message}`);
    }
}

// Handle Register User Form Submit
async function handleCreateUser(e) {
    e.preventDefault();
    const user_id = dom.newUserId.value.trim();
    const username = dom.newUsername.value.trim();
    const email = dom.newEmail.value.trim();
    const password = dom.newPassword.value;
    const role_code = dom.newRole.value;
    const branch_id = dom.newBranch.value;
    
    try {
        await apiCall('/users/', {
            method: 'POST',
            body: JSON.stringify({
                user_id,
                username,
                password,
                email: email || null,
                role_code,
                branch_id: branch_id || null,
                client_id: state.user.client_id
            })
        });
        
        alert(`User account for ${username} created successfully!`);
        
        // Reset form inputs
        dom.newUserId.value = '';
        dom.newUsername.value = '';
        dom.newEmail.value = '';
        dom.newPassword.value = '';
        
        // Reload table
        loadUsersTable();
    } catch (err) {
        alert(`Failed to create user: ${err.message}`);
    }
}

// Handle Login Form Submit
async function handleLogin(e) {
    e.preventDefault();
    dom.loginError.classList.add('hidden');
    
    const username = dom.usernameInput.value;
    const password = dom.passwordInput.value;
    
    try {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        state.token = data.access_token;
        localStorage.setItem('jwt_token', state.token);
        
        await loadSession();
    } catch (err) {
        dom.loginError.textContent = err.message;
        dom.loginError.classList.remove('hidden');
    }
}

// Handle Logout
function handleLogout() {
    state.token = '';
    state.user = null;
    localStorage.removeItem('jwt_token');
    if (window.refreshInterval) clearInterval(window.refreshInterval);
    dom.headerNav.classList.add('hidden');
    dom.adminScreen.classList.add('hidden');
    dom.dashboardScreen.classList.remove('hidden');
    showScreen('AUTH');
}

// Check account card eligibility
async function handleAccountCheck() {
    const accNo = dom.lookupAccount.value.trim();
    if (!accNo) return alert('Enter account number first.');
    if (!/^\d{10}$/.test(accNo)) {
        return alert('Account number in Nigeria must be exactly 10 digits.');
    }
    
    try {
        dom.eligibilityResults.classList.add('hidden');
        state.eligiblePrograms = [];
        state.selectedProgramId = null;
        
        const programs = await apiCall(`/eligibility/account/${accNo}`);
        state.eligiblePrograms = programs;
        
        dom.programList.innerHTML = '';
        if (programs.length === 0) {
            dom.programList.innerHTML = '<p class="text-sm" style="color: var(--text-muted);">No eligible programmes found for this segment.</p>';
        } else {
            programs.forEach(p => {
                const item = document.createElement('div');
                item.className = 'program-card';
                item.innerHTML = `
                    <div>
                        <div class="program-name">${p.card_programme_name}</div>
                        <div class="program-code">${p.card_programme_code}</div>
                    </div>
                    <span class="program-badge">${p.card_type}</span>
                `;
                item.onclick = () => selectProgram(p.id, item);
                dom.programList.appendChild(item);
            });
            // Auto select the first card
            selectProgram(programs[0].id, dom.programList.firstElementChild);
        }
        
        dom.eligibilityResults.classList.remove('hidden');
    } catch (err) {
        alert(err.message);
    }
}

function selectProgram(id, element) {
    state.selectedProgramId = id;
    document.querySelectorAll('.program-card').forEach(el => el.classList.remove('selected'));
    if (element) element.classList.add('selected');
}

// Submit card request
async function handleSubmitRequest() {
    const account_number = dom.lookupAccount.value.trim();
    const programme_id = state.selectedProgramId;
    const request_branch = state.user.branch_code || '001';
    const pickup_branch = dom.pickupBranch.value;
    const brand = dom.requestBrand.value.trim();
    
    if (!account_number || !programme_id) {
        return alert('Please lookup account and select a card programme.');
    }
    
    try {
        await apiCall('/requests/', {
            method: 'POST',
            body: JSON.stringify({
                client_id: state.user.client_id,
                account_number,
                programme_id,
                request_branch,
                pickup_branch,
                created_by: state.user.username,
                brand: brand || null
            })
        });
        
        alert('Card request submitted successfully!');
        
        // Reset lookups
        dom.lookupAccount.value = '';
        dom.requestBrand.value = '';
        dom.eligibilityResults.classList.add('hidden');
        
        refreshDashboardData();
    } catch (err) {
        alert(err.message);
    }
}

// Set request table filters
window.setFilter = function(filter) {
    state.currentFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
    event.target.classList.add('active');
    renderRequestTable();
};

// Reload requests and settlement simulator records
async function refreshDashboardData() {
    if (!state.token) return;
    try {
        const globalViewChecked = document.getElementById('global-view-checkbox')?.checked || false;
        const endpoint = globalViewChecked ? '/requests/?global_view=true' : '/requests/';
        const requests = await apiCall(endpoint);
        state.requests = requests.sort((a, b) => b.request_id - a.request_id);
        
        renderRequestTable();
        renderSimulator();
    } catch (err) {
        console.error('Failed to load dashboard data:', err);
    }
}

window.toggleGlobalView = function() {
    refreshDashboardData();
};

// Render request logs
function renderRequestTable() {
    dom.requestTableBody.innerHTML = '';
    
    const filtered = state.requests.filter(r => {
        if (state.currentFilter === 'ALL') return true;
        return r.request_status === state.currentFilter;
    });
    
    if (filtered.length === 0) {
        dom.requestTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
                    No card requests match this filter.
                </td>
            </tr>
        `;
        return;
    }
    
    filtered.forEach(r => {
        const tr = document.createElement('tr');
        tr.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') {
                showRequestDetails(r.request_id);
            }
        };
        
        // Resolve actions based on status and roles
        let actionsHtml = '-';
        const isAuthorizer = state.user.roles.includes('branch_authorizer') || state.user.roles.includes('super_admin');
        const isBranchMatch = state.user.roles.includes('super_admin') || r.request_branch === state.user.branch_code;
        const canApprove = isAuthorizer && isBranchMatch && (r.request_status === 'PENDING_APPROVAL' || r.request_status === 'PENDING_AUTHORIZATION');
        
        if (canApprove) {
            actionsHtml = `<button class="btn btn-primary btn-sm" onclick="approveRequest(${r.request_id})">Approve</button>`;
        }
        
        tr.innerHTML = `
            <td>#${r.request_id}</td>
            <td><strong>${r.account_number}</strong></td>
            <td>Prog ${r.programme_id}</td>
            <td>${r.request_branch}</td>
            <td><span class="badge ${getStatusBadgeClass(r.request_status)}">${r.request_status}</span></td>
            <td>${actionsHtml}</td>
        `;
        dom.requestTableBody.appendChild(tr);
    });
}

// Get Badge Class helper
function getStatusBadgeClass(status) {
    switch (status) {
        case 'PENDING':
            return 'badge-pending';
        case 'PENDING_APPROVAL':
            return 'badge-approval';
        case 'PENDING_AUTHORIZATION':
            return 'badge-authorized';
        case 'APPROVED':
        case 'COMPLETED':
            return 'badge-success';
        case 'SETTLEMENT_FAILED':
            return 'badge-failed';
        default:
            return 'badge-pending';
    }
}

// Render settlement simulator
function renderSimulator() {
    dom.simulatorList.innerHTML = '';
    
    // Filter requests in 'PENDING' state (means awaiting settlement triggers)
    const pendingSettlement = state.requests.filter(r => r.request_status === 'PENDING');
    
    if (pendingSettlement.length === 0) {
        dom.simulatorList.innerHTML = '<p class="text-sm" style="color: var(--text-inactive); font-style: italic; text-align: center; padding: 12px 0;">No requests pending settlement.</p>';
        return;
    }
    
    pendingSettlement.forEach(r => {
        const div = document.createElement('div');
        div.className = 'simulator-row';
        div.innerHTML = `
            <div>
                <span class="text-sm" style="display:block;">Req <strong>#${r.request_id}</strong> (${r.account_number})</span>
                <span class="text-sm" style="color:var(--text-muted); font-size:0.75rem;">Prog ID: ${r.programme_id}</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="simulateSettlement(${r.request_id})">Simulate Success</button>
        `;
        dom.simulatorList.appendChild(div);
    });
}

// Perform Approve Request action
window.approveRequest = async function(id) {
    try {
        const res = await apiCall(`/requests/${id}/approve`, {
            method: 'POST'
        });
        alert(`Request #${id} status changed to ${res.request_status}!`);
        refreshDashboardData();
    } catch (err) {
        alert(err.message);
    }
};

// Simulate Settlement Callback
window.simulateSettlement = async function(id) {
    try {
        await apiCall('/charges/settlement-callback', {
            method: 'POST',
            body: JSON.stringify({
                request_id: id,
                payment_reference: `PAY-SIM-${Math.floor(Math.random() * 89999 + 10000)}`,
                amount: 1500.0,
                status: 'SUCCESS'
            })
        });
        
        alert(`Settlement callback processed for Request #${id}. Status promoted to PENDING_AUTHORIZATION!`);
        refreshDashboardData();
    } catch (err) {
        alert(err.message);
    }
};


// -----------------------------------------
// Request Details Modal Controller
// -----------------------------------------
let activeRequestIdForModal = null;
let activeModalTab = 'TIMELINE';

window.showRequestDetails = async function(requestId) {
    activeRequestIdForModal = requestId;
    activeModalTab = 'TIMELINE';
    
    // Clear containers
    document.getElementById('timeline-container').innerHTML = '<p class="text-sm" style="color: var(--text-muted); font-style: italic;">Loading timeline...</p>';
    document.getElementById('audit-container').innerHTML = '<p class="text-sm" style="color: var(--text-muted); font-style: italic;">Loading audit logs...</p>';
    
    // Switch to timeline tab visually
    switchModalTab('TIMELINE');
    
    // Show Modal
    const modal = document.getElementById('details-modal');
    modal.classList.remove('hidden');
    
    try {
        // Fetch Request Meta
        const req = await apiCall(`/requests/${requestId}`);
        
        document.getElementById('modal-request-title').textContent = `Request Details #${req.request_id}`;
        document.getElementById('detail-account-number').textContent = req.account_number;
        document.getElementById('detail-programme-id').textContent = `Prog ${req.programme_id}`;
        document.getElementById('detail-brand').textContent = req.brand || 'Default';
        document.getElementById('detail-branch').textContent = req.request_branch;
        document.getElementById('detail-pickup-branch').textContent = req.pickup_branch || '-';
        
        const statusBadge = document.getElementById('detail-status');
        statusBadge.className = `badge ${getStatusBadgeClass(req.request_status)}`;
        statusBadge.textContent = req.request_status;
        
        // Setup Actions Container (for Hotlist & Link Account)
        const isBranchUserOrAdmin = state.user.roles.includes('branch_submitter') || 
                                    state.user.roles.includes('branch_authorizer') || 
                                    state.user.roles.includes('super_admin');
        const showActions = isBranchUserOrAdmin && 
                            req.request_status !== 'HOTLISTED' && 
                            req.request_status !== 'APPROVED' && 
                            req.request_status !== 'COMPLETED' && 
                            req.request_status !== 'SETTLEMENT_FAILED';
                            
        const actionsContainer = document.getElementById('modal-actions-container');
        const linkInput = document.getElementById('link-account-input');
        if (linkInput) linkInput.value = '';
        
        if (actionsContainer) {
            if (showActions) {
                actionsContainer.classList.remove('hidden');
            } else {
                actionsContainer.classList.add('hidden');
            }
        }
        
        // Fetch and Render Timeline & Audit Logs
        loadRequestTimeline(requestId);
        loadRequestAuditLogs(requestId);
        
    } catch (err) {
        alert(`Failed to load request details: ${err.message}`);
        closeDetailsModal();
    }
};

window.closeDetailsModal = function() {
    const modal = document.getElementById('details-modal');
    modal.classList.add('hidden');
    activeRequestIdForModal = null;
};

window.handleOverlayClick = function(event) {
    if (event.target === document.getElementById('details-modal')) {
        closeDetailsModal();
    }
};

window.switchModalTab = function(tab) {
    activeModalTab = tab;
    
    const timelineBtn = document.getElementById('tab-timeline-btn');
    const auditBtn = document.getElementById('tab-audit-btn');
    const timelineContent = document.getElementById('modal-tab-timeline');
    const auditContent = document.getElementById('modal-tab-audit');
    
    if (tab === 'TIMELINE') {
        timelineBtn.classList.add('active');
        auditBtn.classList.remove('active');
        timelineContent.classList.remove('hidden');
        auditContent.classList.add('hidden');
    } else {
        timelineBtn.classList.remove('active');
        auditBtn.classList.add('active');
        timelineContent.classList.add('hidden');
        auditContent.classList.remove('hidden');
    }
};

async function loadRequestTimeline(requestId) {
    try {
        const history = await apiCall(`/requests/${requestId}/history`);
        const container = document.getElementById('timeline-container');
        container.innerHTML = '';
        
        if (history.length === 0) {
            container.innerHTML = '<p class="text-sm" style="color: var(--text-muted); font-style: italic;">No status transition history found.</p>';
            return;
        }
        
        history.forEach((h, index) => {
            const item = document.createElement('div');
            let itemClass = 'timeline-item';
            if (h.to_status === 'APPROVED' || h.to_status === 'COMPLETED') {
                itemClass += ' success';
            } else if (h.to_status === 'SETTLEMENT_FAILED') {
                itemClass += ' failed';
            } else if (index === history.length - 1) {
                itemClass += ' active';
            }
            
            const dateStr = new Date(h.performed_date + 'Z').toLocaleString();
            
            item.className = itemClass;
            item.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-header">
                    <span class="timeline-title">${h.from_status ? `${h.from_status} → ` : ''}<strong>${h.to_status}</strong></span>
                    <span class="timeline-time">${dateStr}</span>
                </div>
                <div class="timeline-desc">${h.remarks || 'No description provided'}</div>
                <div class="timeline-user">Action: ${h.action || 'system'} | User: ${h.performed_by || 'system'}</div>
            `;
            container.appendChild(item);
        });
    } catch (err) {
        document.getElementById('timeline-container').innerHTML = `<p class="text-sm" style="color: var(--danger);">Failed to load timeline: ${err.message}</p>`;
    }
}

async function loadRequestAuditLogs(requestId) {
    try {
        const auditEvents = await apiCall(`/requests/${requestId}/audit`);
        const container = document.getElementById('audit-container');
        container.innerHTML = '';
        
        if (auditEvents.length === 0) {
            container.innerHTML = '<p class="text-sm" style="color: var(--text-muted); font-style: italic;">No audit events logged.</p>';
            return;
        }
        
        auditEvents.forEach((event, index) => {
            const dateStr = new Date(event.event_time + 'Z').toLocaleString();
            const card = document.createElement('div');
            card.className = 'audit-card';
            
            // Build changes diff table if present
            let diffHtml = '';
            if (event.details && event.details.length > 0) {
                diffHtml += `
                    <div style="margin-top: 10px;">
                        <span class="detail-label" style="font-size: 0.7rem; display: block; margin-bottom: 4px;">Property Changes</span>
                        <table class="audit-diff-table">
                            <thead>
                                <tr>
                                    <th>Field</th>
                                    <th>Old Value</th>
                                    <th>New Value</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                event.details.forEach(d => {
                    diffHtml += `
                        <tr>
                            <td><strong>${d.column_name}</strong></td>
                            <td style="color: var(--danger); font-style: italic;">${d.old_value !== null ? d.old_value : '[NULL]'}</td>
                            <td style="color: var(--success); font-weight: 600;">${d.new_value !== null ? d.new_value : '[NULL]'}</td>
                        </tr>
                    `;
                });
                diffHtml += `
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            let snapshotHtml = '';
            if (event.snapshot) {
                snapshotHtml += `
                    <div style="margin-top: 10px;">
                        <span class="detail-label" style="font-size: 0.7rem; display: block; margin-bottom: 4px;">State Snapshot</span>
                        <pre class="audit-snapshot">${JSON.stringify(event.snapshot, null, 2)}</pre>
                    </div>
                `;
            }
            
            const expandId = `audit-expand-${index}`;
            card.innerHTML = `
                <div class="audit-header">
                    <span class="audit-code">${event.remarks || 'AUDIT EVENT'}</span>
                    <span class="audit-time">${dateStr}</span>
                </div>
                <div class="audit-remarks">Performed by <strong>${event.performed_by || 'system'}</strong> (Branch: ${event.branch_code || 'N/A'})</div>
                <div class="audit-meta">
                    <span>Source: ${event.event_source || 'API'}</span>
                    <span>Correlation ID: ${event.correlation_id || 'N/A'}</span>
                </div>
                
                ${(diffHtml || snapshotHtml) ? `
                    <button class="audit-details-toggle" onclick="toggleAuditExpand('${expandId}')">
                        <span>▶</span> View Event Details & Snapshot
                    </button>
                    <div id="${expandId}" class="audit-expandable hidden">
                        ${diffHtml}
                        ${snapshotHtml}
                    </div>
                ` : ''}
            `;
            container.appendChild(card);
        });
    } catch (err) {
        document.getElementById('audit-container').innerHTML = `<p class="text-sm" style="color: var(--danger);">Failed to load audit events: ${err.message}</p>`;
    }
}

window.toggleAuditExpand = function(elementId) {
    const el = document.getElementById(elementId);
    const btn = el.previousElementSibling; // toggle button
    const arrow = btn.querySelector('span');
    
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        arrow.textContent = '▼';
    } else {
        el.classList.add('hidden');
        arrow.textContent = '▶';
    }
};


window.modalHotlist = async function() {
    if (!activeRequestIdForModal) return;
    if (!confirm('Are you sure you want to hotlist this card globally?')) return;
    
    try {
        const res = await apiCall(`/requests/${activeRequestIdForModal}/hotlist`, {
            method: 'POST'
        });
        alert('Card hotlisted successfully!');
        // Refresh details
        showRequestDetails(activeRequestIdForModal);
        refreshDashboardData();
    } catch (err) {
        alert(err.message);
    }
};

window.modalLinkAccount = async function() {
    if (!activeRequestIdForModal) return;
    const linkInput = document.getElementById('link-account-input');
    const newAccount = linkInput?.value.trim();
    
    if (!newAccount) return alert('Please enter account number.');
    if (!/^\d{10}$/.test(newAccount)) {
        return alert('Account number in Nigeria must be exactly 10 digits.');
    }
    
    if (!confirm(`Are you sure you want to link account '${newAccount}' to this card globally?`)) return;
    
    try {
        const res = await apiCall(`/requests/${activeRequestIdForModal}/link-account`, {
            method: 'POST',
            body: JSON.stringify({ account_number: newAccount })
        });
        alert(`Account linked successfully! Request status is now: ${res.request_status}`);
        // Refresh details
        showRequestDetails(activeRequestIdForModal);
        refreshDashboardData();
    } catch (err) {
        alert(err.message);
    }
};


window.switchAdminTab = function(tabName) {
    const btnUsers = document.getElementById('admin-tab-users-btn');
    const btnConfig = document.getElementById('admin-tab-config-btn');
    const secUsers = document.getElementById('admin-tab-users-content');
    const secConfig = document.getElementById('admin-tab-config-content');
    
    if (tabName === 'USERS') {
        btnUsers.classList.add('active');
        btnConfig.classList.remove('active');
        secUsers.classList.remove('hidden');
        secConfig.classList.add('hidden');
    } else {
        btnConfig.classList.add('active');
        btnUsers.classList.remove('active');
        secConfig.classList.remove('hidden');
        secUsers.classList.add('hidden');
        loadSystemConfigurations();
    }
};

window.selectConfigDomain = function(domainId) {
    // Toggling tabs active state
    document.querySelectorAll('.settings-drawer-btn').forEach(btn => btn.classList.remove('active'));
    
    // Hide all panel sections
    document.querySelectorAll('.config-section-panel').forEach(panel => panel.classList.add('hidden'));

    let btnId = '';
    let panelId = '';

    switch(domainId) {
        case 'DOM_CARDS':
            btnId = 'btn-dom-cards';
            panelId = 'config-sec-cards';
            break;
        case 'DOM_SEGMENTS':
            btnId = 'btn-dom-segments';
            panelId = 'config-sec-segments';
            break;
        case 'DOM_CHARGES':
            btnId = 'btn-dom-charges';
            panelId = 'config-sec-charges';
            break;
        case 'DOM_WORKFLOW':
            btnId = 'btn-dom-workflow';
            panelId = 'config-sec-workflow';
            break;
        case 'DOM_LOGISTICS':
            btnId = 'btn-dom-logistics';
            panelId = 'config-sec-logistics';
            break;
        case 'DOM_INSTANT':
            btnId = 'btn-dom-instant';
            panelId = 'config-sec-instant';
            break;
        case 'DOM_TENANT':
            btnId = 'btn-dom-tenant';
            panelId = 'config-sec-tenant';
            break;
    }

    const activeBtn = document.getElementById(btnId);
    if (activeBtn) activeBtn.classList.add('active');

    const activePanel = document.getElementById(panelId);
    if (activePanel) activePanel.classList.remove('hidden');
};

async function loadSystemConfigurations() {
    try {
        // Domain 1: Card Profiles
        const cardTypes = await apiCall('/config/card-types');
        const programmes = await apiCall('/config/card-programmes');
        
        // Populate cache for edit forms
        window.configDataCache = window.configDataCache || {};
        window.configDataCache['card_types'] = cardTypes;
        window.configDataCache['card_programmes'] = programmes;

        const cardTypesBody = document.getElementById('config-card-types-body');
        if (cardTypesBody) {
            cardTypesBody.innerHTML = cardTypes.map(c => `
                <tr>
                    <td><strong>${c.card_type}</strong></td>
                    <td>${c.description || '-'}</td>
                    <td><span class="badge ${c.active ? 'badge-success' : 'badge-failed'}">${c.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-xs" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 4px;" onclick="openConfigFormModal('card_types', '${c.card_type}', ['card_type', 'description'])">Edit</button>
                        <button class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 0.75rem;" onclick="toggleConfigActive('card_types', '${c.card_type}', ${c.active})">${c.active ? 'Disable' : 'Enable'}</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No card types.</td></tr>';
        }

        const progBody = document.getElementById('config-programmes-body');
        if (progBody) {
            progBody.innerHTML = programmes.map(p => `
                <tr>
                    <td>#${p.id}</td>
                    <td><strong>${p.card_programme_code}</strong></td>
                    <td>${p.card_programme_name}</td>
                    <td><span class="badge badge-authorized" style="font-size: 0.75rem;">${p.card_type}</span></td>
                    <td><span class="badge ${p.active ? 'badge-success' : 'badge-failed'}">${p.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-xs" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 4px;" onclick="openConfigFormModal('card_programmes', ${p.id}, ['card_programme_code', 'card_programme_name', 'card_type'])">Edit</button>
                        <button class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 0.75rem;" onclick="toggleConfigActive('card_programmes', ${p.id}, ${p.active})">${p.active ? 'Disable' : 'Enable'}</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No programmes.</td></tr>';
        }

        // Domain 2: Segmentation & Eligibility
        const segments = await apiCall('/config/card-segments');
        const segProgs = await apiCall('/config/card-segment-programme-charges');
        const segmentMembers = await apiCall('/config/card-segment-members');
        const eligibleProducts = await apiCall('/config/eligible-account-products');
        
        window.configDataCache['card_segments'] = segments;
        window.configDataCache['card_segment_programme_charges'] = segProgs;
        window.configDataCache['card_segment_members'] = segmentMembers;
        window.configDataCache['eligible_account_products'] = eligibleProducts;

        window.allSegmentMembers = segmentMembers;
        window.allSegmentProgrammes = segProgs;

        const segmentsBody = document.getElementById('config-card-segments-body');
        if (segmentsBody) {
            segmentsBody.innerHTML = segments.map(s => `
                <tr data-seg-grp="${s.card_seg_grp}" onclick="selectMasterSegmentGroup('${s.card_seg_grp}')" style="cursor: pointer; transition: background 0.15s;">
                    <td><strong>${s.card_seg_grp}</strong></td>
                    <td>${s.card_seg_name}</td>
                    <td><span class="badge ${s.active ? 'badge-success' : 'badge-failed'}">${s.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-xs" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 4px;" onclick="event.stopPropagation(); openConfigFormModal('card_segments', '${s.card_seg_grp}', ['card_seg_grp', 'card_seg_name'])">Edit</button>
                        <button class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 0.75rem;" onclick="event.stopPropagation(); toggleConfigActive('card_segments', '${s.card_seg_grp}', ${s.active})">${s.active ? 'Disable' : 'Enable'}</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No segments.</td></tr>';
        }

        // Auto-select active segment group or select first segment group
        if (segments.length > 0) {
            const defaultSeg = window.activeSegmentGroup || segments[0].card_seg_grp;
            selectMasterSegmentGroup(defaultSeg);
        }

        const eligibleProductsBody = document.getElementById('config-eligible-products-body');
        if (eligibleProductsBody) {
            eligibleProductsBody.innerHTML = eligibleProducts.map(ep => `
                <tr>
                    <td>#${ep.id}</td>
                    <td><strong>${ep.product_code}</strong></td>
                    <td>Programme #${ep.card_programme_id}</td>
                    <td><span class="badge ${ep.active ? 'badge-success' : 'badge-failed'}">${ep.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-xs" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 4px;" onclick="openConfigFormModal('eligible_account_products', ${ep.id}, ['product_code', 'card_programme_id'])">Edit</button>
                        <button class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 0.75rem;" onclick="toggleConfigActive('eligible_account_products', ${ep.id}, ${ep.active})">${ep.active ? 'Disable' : 'Enable'}</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No mappings.</td></tr>';
        }

        // Domain 3: Pricing & Fee Templates
        const charges = await apiCall('/config/card-charges');
        window.configDataCache['card_charges_headers'] = charges;

        const chgBody = document.getElementById('config-charges-body');
        if (chgBody) {
            chgBody.innerHTML = charges.map(c => {
                const breakdown = c.entries.map(e => `• ${e.charge_type}: <strong>${e.amount} ${e.currency}</strong>`).join('<br>');
                return `
                    <tr>
                        <td>#${c.id}</td>
                        <td><strong>${c.charge_name}</strong></td>
                        <td><div style="font-size: 0.8rem; line-height: 1.4; color: var(--text-muted);">${breakdown || 'No lines'}</div></td>
                        <td><span class="badge ${c.active ? 'badge-success' : 'badge-failed'}">${c.active ? 'Active' : 'Inactive'}</span></td>
                        <td><span class="text-sm" style="color: var(--text-inactive);">${c.created_by}</span></td>
                        <td>
                            <button class="btn btn-primary btn-xs" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 4px;" onclick="openConfigFormModal('card_charges_headers', ${c.id}, ['charge_name', 'created_by'])">Edit</button>
                            <button class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 0.75rem;" onclick="toggleConfigActive('card_charges_headers', ${c.id}, ${c.active})">${c.active ? 'Disable' : 'Enable'}</button>
                        </td>
                    </tr>
                `;
            }).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No templates.</td></tr>';
        }

        const segmentChargesBody = document.getElementById('config-segment-charges-body');
        if (segmentChargesBody) {
            segmentChargesBody.innerHTML = segProgs.map(sp => `
                <tr>
                    <td>#${sp.id}</td>
                    <td><strong>Segment ${sp.card_seg_grp}</strong></td>
                    <td>Programme #${sp.card_programme_id}</td>
                    <td>Template #${sp.charge_header_id}</td>
                    <td><span class="badge ${sp.active ? 'badge-success' : 'badge-failed'}">${sp.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-xs" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 4px;" onclick="openConfigFormModal('card_segment_programme_charges', ${sp.id}, ['card_seg_grp', 'card_programme_id', 'charge_header_id'])">Edit</button>
                        <button class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 0.75rem;" onclick="toggleConfigActive('card_segment_programme_charges', ${sp.id}, ${sp.active})">${sp.active ? 'Disable' : 'Enable'}</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No mappings.</td></tr>';
        }

        // Domain 4: Workflow & Lifecycle
        const reqStatuses = await apiCall('/config/request-statuses');
        const reqChannels = await apiCall('/config/request-channels');
        const transitions = await apiCall('/config/request-status-transitions');
        window.configDataCache['request_status_transitions'] = transitions;

        const reqStatusesBody = document.getElementById('config-req-statuses-body');
        if (reqStatusesBody) {
            reqStatusesBody.innerHTML = reqStatuses.map(s => `
                <tr>
                    <td><strong>${s.status_code}</strong></td>
                    <td>${s.status_name}</td>
                </tr>
            `).join('');
        }

        const reqChannelsBody = document.getElementById('config-req-channels-body');
        if (reqChannelsBody) {
            reqChannelsBody.innerHTML = reqChannels.map(c => `
                <tr>
                    <td><strong>${c.channel_code}</strong></td>
                    <td>${c.channel_name}</td>
                </tr>
            `).join('');
        }

        const transitionsBody = document.getElementById('config-req-transitions-body');
        if (transitionsBody) {
            transitionsBody.innerHTML = transitions.map(t => `
                <tr>
                    <td>#${t.id}</td>
                    <td><span class="badge badge-pending">${t.from_status}</span></td>
                    <td><span class="badge badge-success">${t.to_status}</span></td>
                    <td><strong>${t.allowed_role}</strong></td>
                    <td><span class="badge ${t.active ? 'badge-success' : 'badge-failed'}">${t.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-xs" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 4px;" onclick="openConfigFormModal('request_status_transitions', ${t.id}, ['from_status', 'to_status', 'allowed_role'])">Edit</button>
                        <button class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 0.75rem;" onclick="toggleConfigActive('request_status_transitions', ${t.id}, ${t.active})">${t.active ? 'Disable' : 'Enable'}</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No transitions.</td></tr>';
        }

        // Domain 5: Logistics & Shipping
        const couriers = await apiCall('/config/couriers');
        const dispTypes = await apiCall('/config/dispatch-types');
        const dispStatuses = await apiCall('/config/dispatch-statuses');
        window.configDataCache['couriers'] = couriers;

        const couriersBody = document.getElementById('config-couriers-body');
        if (couriersBody) {
            couriersBody.innerHTML = couriers.map(c => `
                <tr>
                    <td>#${c.id}</td>
                    <td><strong>${c.courier_name}</strong></td>
                    <td>${c.contact_email}</td>
                    <td><span class="badge ${c.active ? 'badge-success' : 'badge-failed'}">${c.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-xs" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 4px;" onclick="openConfigFormModal('couriers', ${c.id}, ['courier_name', 'contact_email'])">Edit</button>
                        <button class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 0.75rem;" onclick="toggleConfigActive('couriers', ${c.id}, ${c.active})">${c.active ? 'Disable' : 'Enable'}</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No couriers.</td></tr>';
        }

        const dispTypesBody = document.getElementById('config-disp-types-body');
        if (dispTypesBody) {
            dispTypesBody.innerHTML = dispTypes.map(t => `
                <tr>
                    <td><strong>${t.type_code}</strong></td>
                    <td>${t.description}</td>
                </tr>
            `).join('');
        }

        const dispStatusesBody = document.getElementById('config-disp-statuses-body');
        if (dispStatusesBody) {
            dispStatusesBody.innerHTML = dispStatuses.map(s => `
                <tr>
                    <td><strong>${s.status_code}</strong></td>
                    <td>${s.description}</td>
                </tr>
            `).join('');
        }

        // Domain 6: Instant Card Inventory
        const instantTypes = await apiCall('/config/instant-card-types');
        const instantStatuses = await apiCall('/config/instant-card-statuses');
        const stockMovements = await apiCall('/config/instant-inventory-movement-types');
        window.configDataCache['instant_card_types'] = instantTypes;

        const instantTypesBody = document.getElementById('config-instant-types-body');
        if (instantTypesBody) {
            instantTypesBody.innerHTML = instantTypes.map(t => `
                <tr>
                    <td><strong>${t.type_code}</strong></td>
                    <td>${t.description}</td>
                    <td><span class="badge ${t.active ? 'badge-success' : 'badge-failed'}">${t.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-xs" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 4px;" onclick="openConfigFormModal('instant_card_types', '${t.type_code}', ['type_code', 'description'])">Edit</button>
                        <button class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 0.75rem;" onclick="toggleConfigActive('instant_card_types', '${t.type_code}', ${t.active})">${t.active ? 'Disable' : 'Enable'}</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No instant batch profiles.</td></tr>';
        }

        const instantStatusesBody = document.getElementById('config-instant-statuses-body');
        if (instantStatusesBody) {
            instantStatusesBody.innerHTML = instantStatuses.map(s => `
                <tr>
                    <td><strong>${s.status_code}</strong></td>
                    <td>${s.description}</td>
                </tr>
            `).join('');
        }

        const instantMovementsBody = document.getElementById('config-instant-movements-body');
        if (instantMovementsBody) {
            instantMovementsBody.innerHTML = stockMovements.map(m => `
                <tr>
                    <td><strong>${m.movement_code}</strong></td>
                    <td>${m.description}</td>
                </tr>
            `).join('');
        }

        // Domain 7: Tenant & Identity
        const localAccounts = await apiCall('/config/local-accounts');
        const emailRecipients = await apiCall('/config/local-email-recipients');
        window.configDataCache['local_accounts'] = localAccounts;
        window.configDataCache['local_email_recipients'] = emailRecipients;

        const localAccountsBody = document.getElementById('config-local-accounts-body');
        if (localAccountsBody) {
            localAccountsBody.innerHTML = localAccounts.map(la => `
                <tr>
                    <td><strong>${la.account_name}</strong></td>
                    <td><code>${la.account_number}</code></td>
                    <td>Branch ${la.branch_code}</td>
                    <td><span class="badge ${la.active ? 'badge-success' : 'badge-failed'}">${la.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-xs" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 4px;" onclick="openConfigFormModal('local_accounts', ${la.id}, ['account_name', 'account_number', 'branch_code'])">Edit</button>
                        <button class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 0.75rem;" onclick="toggleConfigActive('local_accounts', ${la.id}, ${la.active})">${la.active ? 'Disable' : 'Enable'}</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No GL accounts.</td></tr>';
        }

        const emailRecipientsBody = document.getElementById('config-email-recipients-body');
        if (emailRecipientsBody) {
            emailRecipientsBody.innerHTML = emailRecipients.map(er => `
                <tr>
                    <td><strong>${er.recipient_role}</strong></td>
                    <td>${er.email_address}</td>
                    <td><span class="badge ${er.active ? 'badge-success' : 'badge-failed'}">${er.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-xs" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 4px;" onclick="openConfigFormModal('local_email_recipients', ${er.id}, ['recipient_role', 'email_address'])">Edit</button>
                        <button class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 0.75rem;" onclick="toggleConfigActive('local_email_recipients', ${er.id}, ${er.active})">${er.active ? 'Disable' : 'Enable'}</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No email recipients.</td></tr>';
        }

    } catch (err) {
        console.error('Failed to load settings console data:', err);
    }
}

window.toggleConfigActive = async function(tableName, pkValue, currentActive) {
    const newActive = !currentActive;
    try {
        await apiCall(`/config/table/${tableName}/${pkValue}`, {
            method: 'PUT',
            body: JSON.stringify({ active: newActive })
        });
        loadSystemConfigurations();
    } catch (err) {
        alert(err.message);
    }
};

window.openConfigFormModal = function(tableName, pkValue, fields) {
    window.activeConfigTable = tableName;
    window.activeConfigPkValue = pkValue;
    window.activeConfigFields = fields;

    const titleEl = document.getElementById('config-modal-title');
    titleEl.textContent = pkValue ? `Edit Record - ${tableName.replace(/_/g, ' ')}` : `Add New Record - ${tableName.replace(/_/g, ' ')}`;

    let record = null;
    if (pkValue && window.configDataCache[tableName]) {
        record = window.configDataCache[tableName].find(item => {
            return (item.id === pkValue || 
                    item.id == pkValue ||
                    item.card_type === pkValue || 
                    item.status_code === pkValue || 
                    item.type_code === pkValue || 
                    item.movement_code === pkValue ||
                    item.recipient_role === pkValue ||
                    item.product_code === pkValue);
        });
    }

    const container = document.getElementById('config-form-fields-container');
    container.innerHTML = '';

    fields.forEach(fieldName => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        formGroup.style.display = 'flex';
        formGroup.style.flexDirection = 'column';
        formGroup.style.gap = '4px';

        const label = document.createElement('label');
        label.textContent = fieldName.replace(/_/g, ' ').toUpperCase();
        label.style.fontSize = '0.75rem';
        label.style.fontWeight = '600';
        label.style.color = 'var(--text-muted)';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = `config-field-${fieldName}`;
        input.className = 'form-control';
        input.style.height = '38px';
        input.style.padding = '8px 12px';
        input.style.fontSize = '0.85rem';
        input.style.background = 'rgba(0,0,0,0.2)';
        input.style.border = '1px solid var(--border-color)';
        input.style.borderRadius = '6px';
        input.style.color = 'var(--text-main)';

        const isKeyField = (fieldName === 'card_type' || fieldName === 'status_code' || fieldName === 'type_code' || fieldName === 'movement_code' || fieldName === 'recipient_role' || fieldName === 'product_code');
        if (pkValue && isKeyField) {
            input.readOnly = true;
            input.style.opacity = '0.5';
        }

        if (record && record[fieldName] !== undefined) {
            input.value = record[fieldName];
        }

        formGroup.appendChild(label);
        formGroup.appendChild(input);
        container.appendChild(formGroup);
    });

    document.getElementById('config-form-modal').classList.remove('hidden');
};

window.closeConfigModal = function() {
    document.getElementById('config-form-modal').classList.add('hidden');
};

window.saveConfigRecord = async function(e) {
    e.preventDefault();
    const tableName = window.activeConfigTable;
    const pkValue = window.activeConfigPkValue;
    const fields = window.activeConfigFields;

    const payload = {};
    fields.forEach(f => {
        const el = document.getElementById(`config-field-${f}`);
        if (el) {
            if (f.endsWith('_id') || f === 'id') {
                payload[f] = parseInt(el.value, 10);
            } else {
                payload[f] = el.value;
            }
        }
    });

    try {
        let url = `/config/table/${tableName}`;
        let method = 'POST';

        if (pkValue) {
            url = `/config/table/${tableName}/${pkValue}`;
            method = 'PUT';
        } else {
            payload["active"] = true;
        }

        await apiCall(url, {
            method: method,
            body: JSON.stringify(payload)
        });

        closeConfigModal();
        loadSystemConfigurations();
    } catch (err) {
        alert(err.message);
    }
};

window.selectMasterSegmentGroup = function(segGrp) {
    window.activeSegmentGroup = segGrp;
    
    // Update active label display
    const labelEl = document.getElementById('active-segment-display');
    if (labelEl) {
        labelEl.textContent = segGrp;
    }
    
    // Enable detail Action Buttons
    const btnMember = document.getElementById('add-segment-member-btn');
    const btnProg = document.getElementById('add-segment-programme-btn');
    if (btnMember) btnMember.disabled = false;
    if (btnProg) btnProg.disabled = false;

    // Highlight the selected row in the master table
    const tbody = document.getElementById('config-card-segments-body');
    if (tbody) {
        Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
            if (tr.dataset.segGrp === segGrp) {
                tr.style.background = 'rgba(59, 130, 246, 0.15)';
                tr.style.borderLeft = '4px solid var(--primary)';
            } else {
                tr.style.background = '';
                tr.style.borderLeft = '';
            }
        });
    }

    // Filter Detail 1: Account Segments (card_segment_members)
    const membersBody = document.getElementById('config-card-segment-members-body');
    if (membersBody) {
        const filteredMembers = (window.allSegmentMembers || []).filter(m => m.card_seg_grp === segGrp);
        membersBody.innerHTML = filteredMembers.map(m => `
            <tr>
                <td><strong>${m.acct_seg}</strong></td>
                <td><span class="badge ${m.active ? 'badge-success' : 'badge-failed'}">${m.active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <button class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 0.75rem;" onclick="toggleConfigActive('card_segment_members', '${m.card_seg_grp}/${m.acct_seg}', ${m.active})">${m.active ? 'Disable' : 'Enable'}</button>
                </td>
            </tr>
        `).join('') || `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">No host account segment mappings for group ${segGrp}.</td></tr>`;
    }

    // Filter Detail 2: Mapped Card Programmes (card_segment_programmes)
    const progsBody = document.getElementById('config-card-segment-programmes-body');
    if (progsBody) {
        const filteredProgs = (window.allSegmentProgrammes || []).filter(sp => sp.card_seg_grp === segGrp);
        progsBody.innerHTML = filteredProgs.map(sp => `
            <tr>
                <td><strong>Programme #${sp.card_programme_id}</strong></td>
                <td>Template #${sp.charge_header_id}</td>
                <td><span class="badge ${sp.active ? 'badge-success' : 'badge-failed'}">${sp.active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <button class="btn btn-primary btn-xs" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 4px;" onclick="openConfigFormModal('card_segment_programme_charges', ${sp.id}, ['card_seg_grp', 'card_programme_id', 'charge_header_id'])">Edit</button>
                    <button class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 0.75rem;" onclick="toggleConfigActive('card_segment_programme_charges', ${sp.id}, ${sp.active})">${sp.active ? 'Disable' : 'Enable'}</button>
                </td>
            </tr>
        `).join('') || `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">No allowed card programmes for group ${segGrp}.</td></tr>`;
    }
};

window.addSegmentMemberForActiveGroup = function() {
    if (!window.activeSegmentGroup) return;
    openConfigFormModal('card_segment_members', null, ['card_seg_grp', 'acct_seg']);
    
    // Auto-fill activeSegmentGroup and make read-only
    setTimeout(() => {
        const segGrpInput = document.getElementById('config-field-card_seg_grp');
        if (segGrpInput) {
            segGrpInput.value = window.activeSegmentGroup;
            segGrpInput.readOnly = true;
            segGrpInput.style.opacity = '0.5';
        }
    }, 50);
};

window.addSegmentProgrammeForActiveGroup = function() {
    if (!window.activeSegmentGroup) return;
    openConfigFormModal('card_segment_programme_charges', null, ['card_seg_grp', 'card_programme_id', 'charge_header_id']);
    
    // Auto-fill activeSegmentGroup and make read-only
    setTimeout(() => {
        const segGrpInput = document.getElementById('config-field-card_seg_grp');
        if (segGrpInput) {
            segGrpInput.value = window.activeSegmentGroup;
            segGrpInput.readOnly = true;
            segGrpInput.style.opacity = '0.5';
        }
    }, 50);
};

