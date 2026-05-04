-- ================================================================
-- PharmaCare - Pharmacy Management System
-- Database Schema (MySQL 8.0+)
-- ================================================================

CREATE DATABASE IF NOT EXISTS pharmacare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pharmacare;

-- ================================================================
-- ROLES TABLE
-- ================================================================
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- BRANCHES TABLE
-- ================================================================
CREATE TABLE branches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_branches_active (is_active)
);

-- ================================================================
-- USERS TABLE
-- ================================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    branch_id INT,
    phone VARCHAR(20),
    avatar VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role_id),
    INDEX idx_users_branch (branch_id)
);

-- ================================================================
-- CATEGORIES TABLE
-- ================================================================
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_categories_name (name)
);

-- ================================================================
-- SUPPLIERS TABLE
-- ================================================================
CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    tax_number VARCHAR(50),
    payment_terms INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_suppliers_name (name),
    INDEX idx_suppliers_active (is_active)
);

-- ================================================================
-- MEDICINES TABLE
-- ================================================================
CREATE TABLE medicines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200),
    category_id INT,
    supplier_id INT,
    branch_id INT,
    batch_number VARCHAR(50),
    expiry_date DATE NOT NULL,
    purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 0,
    min_stock_level INT DEFAULT 10,
    barcode VARCHAR(100),
    dosage_form VARCHAR(50),
    strength VARCHAR(50),
    unit VARCHAR(20) DEFAULT 'pcs',
    image VARCHAR(255),
    description TEXT,
    requires_prescription BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    INDEX idx_medicines_name (name),
    INDEX idx_medicines_barcode (barcode),
    INDEX idx_medicines_expiry (expiry_date),
    INDEX idx_medicines_category (category_id),
    INDEX idx_medicines_quantity (quantity),
    INDEX idx_medicines_active (is_active),
    FULLTEXT INDEX ft_medicines_search (name, generic_name)
);

-- ================================================================
-- CUSTOMERS TABLE
-- ================================================================
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    insurance_number VARCHAR(100),
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    outstanding_balance DECIMAL(10,2) DEFAULT 0.00,
    loyalty_points INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customers_name (name),
    INDEX idx_customers_phone (phone),
    INDEX idx_customers_email (email)
);

-- ================================================================
-- SALES TABLE
-- ================================================================
CREATE TABLE sales (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT,
    user_id INT NOT NULL,
    branch_id INT,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_type ENUM('percentage', 'fixed') DEFAULT 'fixed',
    discount_value DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    change_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_method ENUM('cash', 'card', 'mobile', 'credit') DEFAULT 'cash',
    payment_status ENUM('paid', 'partial', 'credit') DEFAULT 'paid',
    status ENUM('completed', 'refunded', 'partial_refund') DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    INDEX idx_sales_invoice (invoice_number),
    INDEX idx_sales_customer (customer_id),
    INDEX idx_sales_user (user_id),
    INDEX idx_sales_date (created_at),
    INDEX idx_sales_status (status)
);

-- ================================================================
-- SALE ITEMS TABLE
-- ================================================================
CREATE TABLE sale_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sale_id INT NOT NULL,
    medicine_id INT NOT NULL,
    quantity INT NOT NULL,
    purchase_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.00,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id),
    INDEX idx_sale_items_sale (sale_id),
    INDEX idx_sale_items_medicine (medicine_id)
);

-- ================================================================
-- EXPENSES TABLE
-- ================================================================
CREATE TABLE expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    category ENUM('utilities', 'rent', 'salaries', 'equipment', 'supplies', 'maintenance', 'marketing', 'other') DEFAULT 'other',
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    receipt_image VARCHAR(255),
    branch_id INT,
    user_id INT NOT NULL,
    expense_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_expenses_date (expense_date),
    INDEX idx_expenses_category (category),
    INDEX idx_expenses_branch (branch_id)
);

-- ================================================================
-- DEBTS TABLE
-- ================================================================
CREATE TABLE debts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    sale_id INT,
    amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    balance DECIMAL(10,2) NOT NULL,
    due_date DATE,
    status ENUM('pending', 'partial', 'paid', 'overdue') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
    INDEX idx_debts_customer (customer_id),
    INDEX idx_debts_due_date (due_date),
    INDEX idx_debts_status (status)
);

-- ================================================================
-- PAYMENTS TABLE
-- ================================================================
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    debt_id INT NOT NULL,
    customer_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'card', 'mobile', 'bank_transfer') DEFAULT 'cash',
    reference_number VARCHAR(100),
    notes TEXT,
    user_id INT NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_payments_debt (debt_id),
    INDEX idx_payments_customer (customer_id),
    INDEX idx_payments_date (payment_date)
);

-- ================================================================
-- PURCHASE ORDERS TABLE
-- ================================================================
CREATE TABLE purchase_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    po_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id INT NOT NULL,
    branch_id INT,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('draft', 'sent', 'received', 'cancelled') DEFAULT 'draft',
    expected_delivery DATE,
    received_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_po_number (po_number),
    INDEX idx_po_supplier (supplier_id),
    INDEX idx_po_status (status)
);

-- ================================================================
-- PURCHASE ORDER ITEMS TABLE
-- ================================================================
CREATE TABLE purchase_order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    po_id INT NOT NULL,
    medicine_id INT NOT NULL,
    quantity_ordered INT NOT NULL,
    quantity_received INT DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id)
);

-- ================================================================
-- INVENTORY TRANSFERS TABLE
-- ================================================================
CREATE TABLE inventory_transfers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    medicine_id INT NOT NULL,
    from_branch_id INT NOT NULL,
    to_branch_id INT NOT NULL,
    quantity INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id),
    FOREIGN KEY (from_branch_id) REFERENCES branches(id),
    FOREIGN KEY (to_branch_id) REFERENCES branches(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ================================================================
-- ACTIVITY LOGS TABLE
-- ================================================================
CREATE TABLE activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_logs_user (user_id),
    INDEX idx_logs_action (action),
    INDEX idx_logs_entity (entity_type, entity_id),
    INDEX idx_logs_date (created_at)
);

-- ================================================================
-- VIEWS
-- ================================================================

CREATE OR REPLACE VIEW v_medicines_with_details AS
SELECT 
    m.*,
    c.name AS category_name,
    s.name AS supplier_name,
    b.name AS branch_name,
    CASE 
        WHEN m.quantity <= m.min_stock_level THEN 'low'
        WHEN m.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'expiring'
        ELSE 'ok'
    END AS stock_status,
    DATEDIFF(m.expiry_date, CURDATE()) AS days_to_expiry
FROM medicines m
LEFT JOIN categories c ON m.category_id = c.id
LEFT JOIN suppliers s ON m.supplier_id = s.id
LEFT JOIN branches b ON m.branch_id = b.id
WHERE m.is_active = TRUE;

CREATE OR REPLACE VIEW v_sales_summary AS
SELECT 
    DATE(s.created_at) AS sale_date,
    COUNT(s.id) AS total_transactions,
    SUM(s.total_amount) AS total_revenue,
    SUM(s.discount_amount) AS total_discounts,
    SUM(s.tax_amount) AS total_tax,
    SUM(si_profit.profit) AS total_profit
FROM sales s
LEFT JOIN (
    SELECT sale_id, SUM((selling_price - purchase_price) * quantity) AS profit
    FROM sale_items
    GROUP BY sale_id
) si_profit ON s.id = si_profit.sale_id
WHERE s.status = 'completed'
GROUP BY DATE(s.created_at);
