-- ================================================================
-- PharmaCare - Sample Seed Data
-- ================================================================

USE pharmacare;

-- Roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'System Administrator', '{"all": true}'),
('pharmacist', 'Licensed Pharmacist', '{"medicines": true, "sales": true, "reports": true, "customers": true}'),
('cashier', 'Sales Cashier', '{"sales": true, "customers": true}');

-- Branches
INSERT INTO branches (name, address, phone, email) VALUES
('Main Branch', '123 Medical Street, Downtown', '+1-555-0100', 'main@pharmacare.com'),
('North Branch', '456 Health Avenue, Northside', '+1-555-0101', 'north@pharmacare.com');

-- Users (passwords: Admin@123 hashed with bcrypt)
INSERT INTO users (name, email, password, role_id, branch_id, phone) VALUES
('Dr. Sarah Miller', 'admin@pharmacare.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4pnILtHXaO', 1, 1, '+1-555-0001'),
('James Wilson', 'pharmacist@pharmacare.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4pnILtHXaO', 2, 1, '+1-555-0002'),
('Emily Davis', 'cashier@pharmacare.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4pnILtHXaO', 3, 1, '+1-555-0003'),
('Michael Chen', 'cashier2@pharmacare.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4pnILtHXaO', 3, 2, '+1-555-0004');

-- Categories
INSERT INTO categories (name, description, color) VALUES
('Antibiotics', 'Medicines to treat bacterial infections', '#EF4444'),
('Analgesics', 'Pain relief medicines', '#F59E0B'),
('Vitamins & Supplements', 'Nutritional supplements', '#10B981'),
('Cardiovascular', 'Heart and blood pressure medicines', '#3B82F6'),
('Diabetes', 'Medicines for diabetes management', '#8B5CF6'),
('Respiratory', 'Medicines for respiratory conditions', '#06B6D4'),
('Dermatology', 'Skin care medicines', '#F97316'),
('Gastroenterology', 'Digestive system medicines', '#84CC16');

-- Suppliers
INSERT INTO suppliers (name, contact_person, email, phone, address, payment_terms) VALUES
('MediPharm Wholesale', 'Robert Johnson', 'rjohnson@medipharm.com', '+1-555-1001', '100 Pharma Blvd, MedCity', 30),
('HealthLine Distributors', 'Lisa Park', 'lpark@healthline.com', '+1-555-1002', '200 Supply Road, Commerce', 45),
('Global Meds Inc.', 'David Brown', 'dbrown@globalmeds.com', '+1-555-1003', '300 International Ave, Trade', 60),
('CityPharm Supplies', 'Rachel Green', 'rgreen@citypharm.com', '+1-555-1004', '400 Local St, Downtown', 15);

-- Medicines
INSERT INTO medicines (name, generic_name, category_id, supplier_id, branch_id, batch_number, expiry_date, purchase_price, selling_price, quantity, min_stock_level, barcode, dosage_form, strength, unit, requires_prescription) VALUES
('Amoxicillin 500mg', 'Amoxicillin', 1, 1, 1, 'AMX-2024-001', '2026-12-31', 2.50, 5.00, 250, 20, '6001234567890', 'Capsule', '500mg', 'pcs', TRUE),
('Paracetamol 500mg', 'Acetaminophen', 2, 2, 1, 'PCM-2024-002', '2026-06-30', 0.50, 1.20, 500, 50, '6001234567891', 'Tablet', '500mg', 'pcs', FALSE),
('Ibuprofen 400mg', 'Ibuprofen', 2, 2, 1, 'IBU-2024-003', '2026-09-30', 0.80, 2.00, 350, 30, '6001234567892', 'Tablet', '400mg', 'pcs', FALSE),
('Vitamin C + Zinc', 'Ascorbic Acid + Zinc', 3, 3, 1, 'VCZ-2024-004', '2025-12-31', 1.50, 3.50, 200, 25, '6001234567893', 'Tablet', '500mg/10mg', 'pcs', FALSE),
('Lisinopril 10mg', 'Lisinopril', 4, 1, 1, 'LSP-2024-005', '2026-03-31', 3.00, 7.00, 15, 20, '6001234567894', 'Tablet', '10mg', 'pcs', TRUE),
('Metformin 500mg', 'Metformin HCl', 5, 1, 1, 'MFM-2024-006', '2026-08-31', 1.20, 3.00, 180, 30, '6001234567895', 'Tablet', '500mg', 'pcs', TRUE),
('Salbutamol Inhaler', 'Salbutamol', 6, 4, 1, 'SLB-2024-007', '2025-06-30', 8.00, 18.00, 45, 10, '6001234567896', 'Inhaler', '100mcg', 'pcs', TRUE),
('Cetirizine 10mg', 'Cetirizine HCl', 6, 2, 1, 'CTZ-2024-008', '2026-11-30', 0.60, 1.80, 300, 40, '6001234567897', 'Tablet', '10mg', 'pcs', FALSE),
('Omeprazole 20mg', 'Omeprazole', 8, 3, 1, 'OMP-2024-009', '2026-07-31', 1.00, 2.50, 220, 35, '6001234567898', 'Capsule', '20mg', 'pcs', FALSE),
('Atorvastatin 20mg', 'Atorvastatin', 4, 1, 1, 'ATV-2024-010', '2026-10-31', 4.00, 9.00, 5, 15, '6001234567899', 'Tablet', '20mg', 'pcs', TRUE),
('Azithromycin 500mg', 'Azithromycin', 1, 1, 1, 'AZI-2024-011', '2025-03-31', 3.50, 8.00, 80, 15, '6001234567900', 'Tablet', '500mg', 'pcs', TRUE),
('Multivitamin Forte', 'Multivitamin', 3, 3, 1, 'MVF-2024-012', '2026-12-31', 2.00, 5.50, 150, 25, '6001234567901', 'Tablet', 'Complex', 'pcs', FALSE),
('Amlodipine 5mg', 'Amlodipine', 4, 2, 1, 'AML-2024-013', '2026-05-31', 2.00, 5.00, 120, 20, '6001234567902', 'Tablet', '5mg', 'pcs', TRUE),
('Glibenclamide 5mg', 'Glibenclamide', 5, 1, 1, 'GLB-2024-014', '2026-09-30', 1.50, 4.00, 90, 20, '6001234567903', 'Tablet', '5mg', 'pcs', TRUE),
('Hydrocortisone Cream', 'Hydrocortisone', 7, 4, 1, 'HCC-2024-015', '2025-04-30', 3.00, 7.50, 60, 10, '6001234567904', 'Cream', '1%', 'tube', FALSE);

-- Customers
INSERT INTO customers (name, email, phone, address, credit_limit) VALUES
('John Smith', 'john.smith@email.com', '+1-555-2001', '10 Oak Street, Downtown', 500.00),
('Mary Johnson', 'mary.j@email.com', '+1-555-2002', '25 Maple Ave, Northside', 300.00),
('Robert Williams', 'rwilliams@email.com', '+1-555-2003', '50 Pine Road, Eastside', 200.00),
('Linda Brown', 'lbrown@email.com', '+1-555-2004', '75 Elm Street, Westside', 1000.00),
('David Garcia', 'dgarcia@email.com', '+1-555-2005', '100 Cedar Way, Southside', 500.00),
('Susan Martinez', 'smartinez@email.com', '+1-555-2006', '150 Birch Blvd, Uptown', 750.00);

-- Sample Sales
INSERT INTO sales (invoice_number, customer_id, user_id, branch_id, subtotal, tax_rate, tax_amount, total_amount, amount_paid, payment_method, payment_status, status) VALUES
('INV-2024-0001', 1, 2, 1, 24.00, 5.00, 1.20, 25.20, 30.00, 'cash', 'paid', 'completed'),
('INV-2024-0002', 2, 3, 1, 15.60, 5.00, 0.78, 16.38, 20.00, 'card', 'paid', 'completed'),
('INV-2024-0003', NULL, 3, 1, 10.00, 5.00, 0.50, 10.50, 10.50, 'cash', 'paid', 'completed'),
('INV-2024-0004', 3, 2, 1, 50.00, 5.00, 2.50, 52.50, 52.50, 'mobile', 'paid', 'completed'),
('INV-2024-0005', 4, 2, 1, 87.00, 5.00, 4.35, 91.35, 0.00, 'cash', 'credit', 'completed');

-- Sale Items
INSERT INTO sale_items (sale_id, medicine_id, quantity, purchase_price, selling_price, subtotal) VALUES
(1, 1, 3, 2.50, 5.00, 15.00),
(1, 2, 5, 0.50, 1.20, 6.00),
(1, 4, 1, 1.50, 3.50, 3.50),
(2, 3, 6, 0.80, 2.00, 12.00),
(2, 8, 2, 0.60, 1.80, 3.60),
(3, 2, 8, 0.50, 1.20, 9.60),
(4, 6, 10, 1.20, 3.00, 30.00),
(4, 13, 4, 2.00, 5.00, 20.00),
(5, 5, 7, 3.00, 7.00, 49.00),
(5, 10, 4, 4.00, 9.00, 36.00);

-- Expenses
INSERT INTO expenses (title, category, amount, description, branch_id, user_id, expense_date) VALUES
('Monthly Rent', 'rent', 2500.00, 'Monthly rent for main branch', 1, 1, '2024-01-01'),
('Electricity Bill', 'utilities', 380.00, 'January electricity', 1, 1, '2024-01-05'),
('Staff Salaries', 'salaries', 8500.00, 'January payroll', 1, 1, '2024-01-31'),
('Refrigerator Repair', 'maintenance', 250.00, 'Medicine storage fridge repair', 1, 1, '2024-01-15'),
('Marketing Flyers', 'marketing', 120.00, 'Promotional flyers printing', 1, 1, '2024-01-20'),
('Monthly Rent', 'rent', 2500.00, 'Monthly rent for main branch', 1, 1, '2024-02-01'),
('Electricity Bill', 'utilities', 350.00, 'February electricity', 1, 1, '2024-02-05'),
('Staff Salaries', 'salaries', 8500.00, 'February payroll', 1, 1, '2024-02-28');

-- Debts
INSERT INTO debts (customer_id, sale_id, amount, paid_amount, balance, due_date, status) VALUES
(4, 5, 91.35, 0.00, 91.35, '2024-02-14', 'pending');

-- Update customer outstanding balance
UPDATE customers SET outstanding_balance = 91.35 WHERE id = 4;



COMMIT;
