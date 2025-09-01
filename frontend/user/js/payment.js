// Payment System for Win5x

let paymentMethods = [];
let selectedPaymentMethod = null;
let depositAmount = 0;

async function loadPaymentMethods() {
    try {
        const response = await fetch('/api/payment/methods');
        const data = await response.json();
        
        if (data.success) {
            paymentMethods = data.data;
            renderPaymentMethods();
        }
    } catch (error) {
        console.error('Failed to load payment methods:', error);
        showNotification('Failed to load payment methods', 'error');
    }
}

function renderPaymentMethods() {
    const container = document.getElementById('payment-methods');
    container.innerHTML = '';
    
    paymentMethods.forEach(method => {
        const methodElement = document.createElement('div');
        methodElement.className = 'payment-method';
        methodElement.onclick = () => selectPaymentMethod(method);
        
        const icon = getPaymentIcon(method.name);
        
        methodElement.innerHTML = `
            <div class="payment-info">
                <div class="payment-icon">${icon}</div>
                <div class="payment-details">
                    <h4>${method.display_name}</h4>
                    <p>₹${method.min_amount} - ₹${method.max_amount.toLocaleString()}</p>
                </div>
            </div>
            <div class="payment-arrow">
                <i class="fas fa-arrow-right"></i>
            </div>
        `;
        
        container.appendChild(methodElement);
    });
}

function getPaymentIcon(methodName) {
    const icons = {
        'phonepe': '📱',
        'googlepay': '💳', 
        'paytm': '💰',
        'usdt': '₿'
    };
    return icons[methodName] || '💳';
}

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    
    // Update UI
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Show step 2
    setTimeout(() => {
        showDepositStep(2);
        
        // Show QR code if available
        if (method.qr_code_url) {
            document.getElementById('qr-code-image').src = method.qr_code_url;
            document.getElementById('qr-code-section').style.display = 'block';
        } else {
            document.getElementById('qr-code-section').style.display = 'none';
        }
        
        // Show instructions
        if (method.instructions) {
            document.getElementById('payment-instructions').textContent = method.instructions;
        }
        
        // Set amount limits
        const amountInput = document.getElementById('deposit-amount');
        amountInput.min = method.min_amount;
        amountInput.max = method.max_amount;
        amountInput.placeholder = `${method.min_amount} - ${method.max_amount}`;
        
    }, 300);
}

function showDepositModal() {
    document.getElementById('deposit-modal').classList.remove('hidden');
    loadPaymentMethods();
    showDepositStep(1);
}

function showDepositStep(step) {
    // Hide all steps
    document.querySelectorAll('.deposit-step').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Show selected step
    document.getElementById(`deposit-step-${step}`).classList.remove('hidden');
}

function proceedToUTR() {
    const amount = parseFloat(document.getElementById('deposit-amount').value);
    
    if (!amount || amount < selectedPaymentMethod.min_amount || amount > selectedPaymentMethod.max_amount) {
        showNotification(`Amount must be between ₹${selectedPaymentMethod.min_amount} and ₹${selectedPaymentMethod.max_amount}`, 'error');
        return;
    }
    
    depositAmount = amount;
    showDepositStep(3);
}

async function submitDeposit() {
    const utrCode = document.getElementById('utr-code').value.trim();
    
    if (!utrCode || utrCode.length < 5) {
        showNotification('Please enter a valid UTR code', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('win5x_token');
        const response = await fetch('/api/payment/deposit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                paymentMethodId: selectedPaymentMethod.id,
                amount: depositAmount,
                utrCode: utrCode.toUpperCase()
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Deposit request submitted! Awaiting admin approval.', 'success');
            closeModal('deposit-modal');
            
            // Reset form
            document.getElementById('deposit-amount').value = '';
            document.getElementById('utr-code').value = '';
            selectedPaymentMethod = null;
            depositAmount = 0;
        } else {
            showNotification(data.error || 'Failed to submit deposit', 'error');
        }
    } catch (error) {
        console.error('Deposit submission error:', error);
        showNotification('Failed to submit deposit request', 'error');
    }
}

function showWithdrawModal() {
    showNotification('Withdrawal feature will be available soon!', 'info');
    // TODO: Implement withdrawal modal
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function showProfile() {
    showNotification('Profile page coming soon!', 'info');
}

function showTransactions() {
    showNotification('Transaction history coming soon!', 'info');
}

function showLeaderboard() {
    showNotification('Leaderboard coming soon!', 'info');
}