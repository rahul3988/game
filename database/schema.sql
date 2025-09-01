-- Win5x Database Schema
-- PostgreSQL Database Setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    balance DECIMAL(12,2) DEFAULT 0.00,
    game_credit DECIMAL(12,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admins table
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    permissions TEXT[], -- Array of permissions
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game rounds table
CREATE TABLE game_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_number SERIAL UNIQUE,
    status VARCHAR(20) DEFAULT 'betting',
    betting_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    betting_end_time TIMESTAMP,
    spin_start_time TIMESTAMP,
    result_time TIMESTAMP,
    winning_number INTEGER,
    winning_color VARCHAR(10),
    is_winning_odd BOOLEAN,
    total_bet_amount DECIMAL(12,2) DEFAULT 0.00,
    total_payout DECIMAL(12,2) DEFAULT 0.00,
    house_profit_loss DECIMAL(12,2) DEFAULT 0.00,
    server_seed_hash VARCHAR(64),
    client_seed VARCHAR(32),
    nonce INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bets table
CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
    bet_type VARCHAR(20) NOT NULL, -- 'number', 'color', 'odd_even'
    bet_value VARCHAR(10) NOT NULL, -- number, 'red'/'black', 'odd'/'even'
    amount DECIMAL(12,2) NOT NULL,
    potential_payout DECIMAL(12,2) NOT NULL,
    is_winner BOOLEAN,
    actual_payout DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending',
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    description TEXT,
    reference VARCHAR(100),
    approved_by UUID REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods table
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    qr_code_url TEXT,
    qr_code_data TEXT,
    wallet_address TEXT,
    instructions TEXT,
    min_amount DECIMAL(10,2) DEFAULT 10.00,
    max_amount DECIMAL(10,2) DEFAULT 100000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deposit requests table
CREATE TABLE deposit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
    amount DECIMAL(10,2) NOT NULL,
    utr_code VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    approved_by UUID REFERENCES admins(id),
    approved_at TIMESTAMP,
    rejected_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Withdrawal requests table
CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    account_details JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    approved_by UUID REFERENCES admins(id),
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game configuration table
CREATE TABLE game_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    betting_duration INTEGER DEFAULT 30,
    spin_duration INTEGER DEFAULT 10,
    result_duration INTEGER DEFAULT 15,
    min_bet_amount DECIMAL(10,2) DEFAULT 10.00,
    max_bet_amount DECIMAL(10,2) DEFAULT 10000.00,
    payout_multiplier DECIMAL(4,2) DEFAULT 5.00,
    cashback_percentage DECIMAL(4,2) DEFAULT 10.00,
    max_exposure DECIMAL(12,2) DEFAULT 1000000.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admins(id),
    action VARCHAR(100) NOT NULL,
    target VARCHAR(50),
    target_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Security logs table
CREATE TABLE security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_game_rounds_status ON game_rounds(status);
CREATE INDEX idx_game_rounds_number ON game_rounds(round_number);

CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_round_id ON bets(round_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_placed_at ON bets(placed_at);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

CREATE INDEX idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX idx_deposit_requests_utr_code ON deposit_requests(utr_code);

CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- Insert default data
INSERT INTO payment_methods (name, display_name, instructions, min_amount, max_amount) VALUES
('phonepe', 'PhonePe', 'Scan QR code with PhonePe app. Enter UTR code after payment.', 10.00, 50000.00),
('googlepay', 'Google Pay', 'Scan QR code with Google Pay app. Enter UTR code after payment.', 10.00, 50000.00),
('paytm', 'Paytm', 'Scan QR code with Paytm app. Enter UTR code after payment.', 10.00, 50000.00),
('usdt', 'USDT (TRC-20)', 'Send USDT to wallet address. Enter transaction hash as UTR.', 50.00, 100000.00);

INSERT INTO game_config (betting_duration, spin_duration, result_duration, min_bet_amount, max_bet_amount, payout_multiplier, cashback_percentage, max_exposure, is_active)
VALUES (30, 10, 15, 10.00, 10000.00, 5.00, 10.00, 1000000.00, true);