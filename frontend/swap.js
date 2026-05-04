const fs = require('fs');
const path = require('path');
const p = (name) => path.join('c:\\Users\\G\\Music\\pharmacy\\frontend\\src\\pages', name);

const customersCode = fs.readFileSync(p('Customers.jsx'), 'utf8'); // contains Medicines
const medicinesCode = fs.readFileSync(p('Medicines.jsx'), 'utf8'); // contains Transactions
const expensesCode = fs.readFileSync(p('Expenses.jsx'), 'utf8'); // contains Suppliers
const suppliersCode = fs.readFileSync(p('Suppliers.jsx'), 'utf8'); // contains Customers

fs.writeFileSync(p('Medicines.jsx'), customersCode);
fs.writeFileSync(p('Transactions.jsx'), medicinesCode);
fs.writeFileSync(p('Suppliers.jsx'), expensesCode);
fs.writeFileSync(p('Customers.jsx'), suppliersCode);

console.log('Swapping complete!');
