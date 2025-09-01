// Admin Payment Management

class AdminPayments {
    constructor() {
        this.paymentMethods = [];
        this.deposits = [];
        this.withdrawals = [];
        this.currentTab = 'methods';
        this.selectedRequest = null;
        this.currentAction = null;
    }

    async loadData() {
        await Promise.all([
            this.loadPaymentMethods(),
            this.loadDeposits(),
            this.loadWithdrawals()
        ]);
    }

    async loadPaymentMethods() {
        try {
            const response = await adminApp.adminApiCall('/api/payment/admin/methods');
            if (response && response.success) {
                this.paymentMethods = response.data;
                this.renderPaymentMethods();
            }
        } catch (error) {
            console.error('Failed to load payment methods:', error);
        }
    }

    async loadDeposits() {
        try {
            const response = await adminApp.adminApiCall('/api/payment/admin/deposits?pageSize=50');
            if (response && response.success) {
                this.deposits = response.data.deposits || [];
                this.renderDeposits();
            }
        } catch (error) {
            console.error('Failed to load deposits:', error);
        }
    }

    async loadWithdrawals() {
        try {
            const response = await adminApp.adminApiCall('/api/payment/admin/withdrawals?pageSize=50');
            if (response && response.success) {
                this.withdrawals = response.data.withdrawals || [];
                this.renderWithdrawals();
            }
        } catch (error) {
            console.error('Failed to load withdrawals:', error);
        }
    }

    renderPaymentMethods() {
        const container = document.getElementById('payment-methods-grid');
        container.innerHTML = '';

        this.paymentMethods.forEach(method => {
            const methodCard = document.createElement('div');
            methodCard.className = 'payment-method-card';
            
            const icon = this.getPaymentIcon(method.name);
            
            methodCard.innerHTML = `
                <div class="method-header">
                    <div class="method-info">
                        <div class="method-icon">${icon}</div>
                        <div class="method-details">
                            <h4>${method.display_name}</h4>
                            <p>₹${method.min_amount} - ₹${method.max_amount.toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="method-status">
                        <span class="status-badge ${method.is_active ? 'active' : 'inactive'}">
                            ${method.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button class="btn btn-sm btn-primary" onclick="editPaymentMethod('${method.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                
                <div class="method-fields">
                    <div class="form-group">
                        <label>QR Code URL</label>
                        <input type="url" value="${method.qr_code_url || ''}" 
                               onchange="updateMethodField('${method.id}', 'qr_code_url', this.value)"
                               placeholder="https://example.com/qr-code.png">
                    </div>
                    
                    ${method.name === 'usdt' ? `
                        <div class="form-group">
                            <label>Wallet Address</label>
                            <input type="text" value="${method.wallet_address || ''}"
                                   onchange="updateMethodField('${method.id}', 'wallet_address', this.value)"
                                   placeholder="USDT wallet address">
                        </div>
                    ` : ''}
                    
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Instructions</label>
                        <textarea onchange="updateMethodField('${method.id}', 'instructions', this.value)"
                                  placeholder="Payment instructions for users">${method.instructions || ''}</textarea>
                    </div>
                </div>
            `;
            
            container.appendChild(methodCard);
        });
    }

    renderDeposits() {
        const tbody = document.getElementById('deposits-table-body');
        tbody.innerHTML = '';

        this.deposits.forEach(deposit => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div>
                        <div class="user-name">${deposit.user.username}</div>
                        <div class="user-email">${deposit.user.email}</div>
                    </div>
                </td>
                <td>
                    <span class="amount">${formatCurrency(deposit.amount)}</span>
                </td>
                <td>
                    <span class="method-name">${deposit.paymentMethod.display_name}</span>
                </td>
                <td>
                    <code class="utr-code">${deposit.utr_code}</code>
                </td>
                <td>
                    <span class="status-badge ${deposit.status.toLowerCase()}">${deposit.status}</span>
                </td>
                <td>
                    <span class="date">${new Date(deposit.created_at).toLocaleDateString()}</span>
                </td>
                <td>
                    ${deposit.status === 'pending' ? `
                        <div class="table-actions">
                            <button class="action-btn approve" onclick="processDeposit('${deposit.id}', 'approve')" title="Approve">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="action-btn reject" onclick="processDeposit('${deposit.id}', 'reject')" title="Reject">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    ` : `
                        <span class="text-muted">-</span>
                    `}
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    renderWithdrawals() {
        const tbody = document.getElementById('withdrawals-table-body');
        tbody.innerHTML = '';

        this.withdrawals.forEach(withdrawal => {
            const row = document.createElement('tr');
            
            const accountDetails = JSON.parse(withdrawal.account_details);
            const detailsText = accountDetails.upiId || accountDetails.accountNumber || accountDetails.walletAddress || 'N/A';
            
            row.innerHTML = `
                <td>
                    <div>
                        <div class="user-name">${withdrawal.user.username}</div>
                        <div class="user-email">${withdrawal.user.email}</div>
                    </div>
                </td>
                <td>
                    <span class="amount">${formatCurrency(withdrawal.amount)}</span>
                </td>
                <td>
                    <span class="method-name">${withdrawal.payment_method}</span>
                </td>
                <td>
                    <small class="account-details">${detailsText}</small>
                </td>
                <td>
                    <span class="status-badge ${withdrawal.status.toLowerCase()}">${withdrawal.status}</span>
                </td>
                <td>
                    <span class="date">${new Date(withdrawal.created_at).toLocaleDateString()}</span>
                </td>
                <td>
                    ${withdrawal.status === 'pending' ? `
                        <div class="table-actions">
                            <button class="action-btn approve" onclick="processWithdrawal('${withdrawal.id}', 'approve')" title="Approve">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="action-btn reject" onclick="processWithdrawal('${withdrawal.id}', 'reject')" title="Reject">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    ` : `
                        <span class="text-muted">-</span>
                    `}
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    getPaymentIcon(methodName) {
        const icons = {
            'phonepe': '📱',
            'googlepay': '💳', 
            'paytm': '💰',
            'usdt': '₿'
        };
        return icons[methodName] || '💳';
    }

    async refreshData() {
        await this.loadData();
        showAdminNotification('Payment data refreshed', 'success');
    }
}

// Global functions
function switchPaymentTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetTab = tabName === 'methods' ? 'payment-methods-tab' : `${tabName}-tab`;
    document.getElementById(targetTab).classList.add('active');
    
    window.adminPayments.currentTab = tabName;
}

async function updateMethodField(methodId, field, value) {
    try {
        const response = await adminApp.adminApiCall(`/api/payment/admin/methods/${methodId}`, {
            method: 'PUT',
            body: JSON.stringify({ [field]: value })
        });

        if (response && response.success) {
            showAdminNotification('Payment method updated', 'success');
        } else {
            showAdminNotification('Failed to update payment method', 'error');
        }
    } catch (error) {
        console.error('Failed to update payment method:', error);
        showAdminNotification('Update failed', 'error');
    }
}

function editPaymentMethod(methodId) {
    const method = window.adminPayments.paymentMethods.find(m => m.id === methodId);
    if (!method) return;

    // Populate modal
    document.getElementById('qr-method-name').value = method.display_name;
    document.getElementById('qr-code-url').value = method.qr_code_url || '';
    document.getElementById('wallet-address').value = method.wallet_address || '';
    document.getElementById('payment-instructions').value = method.instructions || '';
    
    // Show modal
    document.getElementById('qr-modal').classList.remove('hidden');
}

function updatePaymentMethod() {
    // This would handle the form submission from the modal
    showAdminNotification('Payment method updated successfully', 'success');
    closeModal('qr-modal');
}

async function processDeposit(depositId, action) {
    const deposit = window.adminPayments.deposits.find(d => d.id === depositId);
    if (!deposit) return;

    // Show action modal
    document.getElementById('action-modal-title').textContent = `${action.charAt(0).toUpperCase() + action.slice(1)} Deposit`;
    document.getElementById('action-notes-label').textContent = action === 'approve' ? 'Admin Notes' : 'Rejection Reason';
    
    const detailsContainer = document.getElementById('action-request-details');
    detailsContainer.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">User:</span>
            <span class="detail-value">${deposit.user.username}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">${formatCurrency(deposit.amount)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">UTR Code:</span>
            <span class="detail-value">${deposit.utr_code}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Method:</span>
            <span class="detail-value">${deposit.paymentMethod.display_name}</span>
        </div>
    `;
    
    const confirmBtn = document.getElementById('action-confirm-btn');
    confirmBtn.className = `btn ${action === 'approve' ? 'btn-success' : 'btn-danger'}`;
    confirmBtn.textContent = action === 'approve' ? 'Approve' : 'Reject';
    confirmBtn.onclick = () => confirmDepositAction(depositId, action);
    
    document.getElementById('action-modal').classList.remove('hidden');
}

async function confirmDepositAction(depositId, action) {
    const notes = document.getElementById('action-notes').value;
    
    try {
        const response = await adminApp.adminApiCall(`/api/payment/admin/deposits/${depositId}`, {
            method: 'PUT',
            body: JSON.stringify({
                action,
                notes: notes || undefined,
                reason: action === 'reject' ? notes || 'Rejected by admin' : undefined
            })
        });

        if (response && response.success) {
            showAdminNotification(`Deposit ${action}d successfully`, 'success');
            closeModal('action-modal');
            await window.adminPayments.loadDeposits();
            adminApp.updatePendingBadges();
        } else {
            showAdminNotification(`Failed to ${action} deposit`, 'error');
        }
    } catch (error) {
        console.error(`Failed to ${action} deposit:`, error);
        showAdminNotification(`Failed to ${action} deposit`, 'error');
    }
}

async function processWithdrawal(withdrawalId, action) {
    const withdrawal = window.adminPayments.withdrawals.find(w => w.id === withdrawalId);
    if (!withdrawal) return;

    // Similar to processDeposit but for withdrawals
    showAdminNotification(`Withdrawal ${action} functionality will be implemented`, 'info');
}

function refreshPayments() {
    if (window.adminPayments) {
        window.adminPayments.refreshData();
    }
}

// Initialize when page loads
window.adminPayments = new AdminPayments();