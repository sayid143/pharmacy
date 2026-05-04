import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, Trash2, Check, Printer, Activity, DollarSign, Package } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import InvoiceReceipt from '../components/InvoiceReceipt';

const PAYMENT_METHODS = [
    { id: 'cash', label: 'Cash' },
    { id: 'ebirr', label: 'Ebirr' },
    { id: 'ebirr_kaafi', label: 'Ebirr Kaafi' },
];

export default function Sales() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Edit State
    const [editId, setEditId] = useState(null);

    // Stats
    const [stats, setStats] = useState({ today_sales: 0, today_income: 0, monthly_sales: 0, low_stock: 0 });

    // Mode
    const [isMultiMode, setIsMultiMode] = useState(false);

    // Search
    const [search, setSearch] = useState('');
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(false);

    // Cart (Unified for both single and multi modes)
    const [cart, setCart] = useState([]);

    // Order config
    const [applyVat, setApplyVat] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');

    // State
    const [processing, setProcessing] = useState(false);
    const [receipt, setReceipt] = useState(null);

    // Calculations
    const subtotal = useMemo(() => cart.reduce((a, i) => a + i.selling_price * i.qty, 0), [cart]);
    const taxAmt = applyVat ? subtotal * 0.15 : 0;
    const total = Math.max(0, subtotal + taxAmt);
    const paidAmt = total; // Implied fully paid

    // Fetch stats
    useEffect(() => {
        api.get('/analytics/dashboard')
            .then(r => {
                const s = r.data.data?.summary || {};
                setStats({
                    today_sales: s.today_transactions || 0,
                    today_income: s.today_revenue || 0,
                    monthly_sales: s.monthly_transactions || 0,
                    low_stock: s.low_stock_count || 0,
                });
            })
            .catch(() => { });
    }, []);

    // Load from Edit
    useEffect(() => {
        if (location.state?.viewTransaction) {
            const tx = location.state.viewTransaction;
            setEditId(tx.id);
            setCart((tx.items || []).map(item => ({
                id: item.medicine_id,
                name: item.medicine?.name || 'Unknown',
                qty: item.quantity,
                selling_price: item.selling_price,
                purchase_price: item.purchase_price,
                unit: item.medicine?.unit,
                quantity: (item.medicine?.quantity || 0) + item.quantity
            })));
            setApplyVat(parseFloat(tx.tax_rate) > 0);
            setPaymentMethod(tx.payment_method);
            setIsMultiMode(true); // Default to multi-mode when viewing a transaction
        }
    }, [location.state]);

    // Fetch medicines
    const fetchMeds = useCallback(async (q) => {
        if (!q) { setMedicines([]); return; }
        setLoading(true);
        try {
            const { data } = await api.get('/medicines', { params: { search: q, limit: 10 } });
            setMedicines(data.data || []);
        } catch { toast.error('Error fetching medicines'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => fetchMeds(search), 300);
        return () => clearTimeout(t);
    }, [search, fetchMeds]);

    const selectMed = (med) => {
        if (med.quantity <= 0) { toast.error('Out of stock!'); return; }
        const price = parseFloat(med.selling_price);

        if (!isMultiMode) {
            // Single Mode: Replace the cart with this single item
            setCart([{ id: med.id, name: med.name, qty: 1, selling_price: price, purchase_price: med.purchase_price, unit: med.unit, quantity: med.quantity }]);
            setSearch('');
            setMedicines([]);
        } else {
            // Multi Mode: Append to cart or increase quantity
            const existing = cart.find(i => i.id === med.id);
            if (existing) {
                const newQty = existing.qty + 1;
                if (newQty > med.quantity) { toast.error('Not enough stock!'); return; }
                setCart(cart.map(i => i.id === med.id ? { ...i, qty: newQty } : i));
            } else {
                setCart([...cart, { id: med.id, name: med.name, qty: 1, selling_price: price, purchase_price: med.purchase_price, unit: med.unit, quantity: med.quantity }]);
            }
            setSearch('');
            setMedicines([]);
        }
    };

    const removeFromCart = (id) => setCart(cart.filter(i => i.id !== id));

    const updateQty = (id, delta) => {
        setCart(cart.map(i => {
            if (i.id === id) {
                const nq = i.qty + delta;
                if (nq > 0 && nq <= i.quantity) return { ...i, qty: nq };
            }
            return i;
        }));
    };

    const toggleMode = () => {
        setIsMultiMode(!isMultiMode);
        setCart([]); // Clear cart when switching modes to avoid logic clashes
        setSearch('');
        setMedicines([]);
    };

    const handleCheckout = async () => {
        if (!cart.length) { toast.error('Add items to cart first'); return; }

        setProcessing(true);
        try {
            const payload = {
                items: cart.map(i => ({ medicine_id: i.id, quantity: i.qty, selling_price: i.selling_price, purchase_price: i.purchase_price })),
                payment_method: paymentMethod,
                amount_paid: paidAmt,
                discount_type: 'fixed',
                discount_value: 0,
                tax_rate: applyVat ? 15 : 0,
                tax_amount: taxAmt,
                customer_name: 'Walk-in Customer',
                customer_phone: 'N/A',
                due_date: null,
                payment_status: 'paid',
                status: 'completed',
            };

            let data;
            if (editId) {
                const res = await api.put(`/sales/${editId}`, payload);
                data = res.data;
                toast.success('Sale updated successfully!');
            } else {
                const res = await api.post('/sales', payload);
                data = res.data;
                toast.success('Sale completed successfully!');
            }

            setReceipt({ ...data.data, cart: [...cart], subtotal, taxAmt, discountAmt: 0, total, paidAmt, change_amount: 0, rem: 0 });
            setCart([]);
            setApplyVat(false);
            setEditId(null);
            // Clear location state securely
            window.history.replaceState({}, document.title);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error processing sale');
        } finally { setProcessing(false); }
    };

    if (receipt) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-12 w-full max-w-2xl mx-auto border border-gray-100 print:hidden overflow-x-hidden overflow-y-auto max-h-[90vh] no-scrollbar">
                <style>{`
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>
                <div className="w-full">
                    {/* Invoice Header */}
                    <div className="text-center mb-6 pt-2">
                        <div className="flex justify-center mb-3">
                            <div className="w-14 h-14 bg-white flex flex-col items-center justify-center">
                                <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800"><path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-3v13"></path><path d="M9 14h2"></path></svg>
                            </div>
                        </div>
                        <h2 className="text-[28px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500 uppercase tracking-wider mb-1 mt-2">INVOICE</h2>
                        <p className="text-gray-500 text-[13px] font-medium tracking-wide">POS Billing System</p>

                        <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-100">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                <h1 className="text-xl font-black text-emerald-600 uppercase tracking-widest leading-none">Sale Complete!</h1>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Ready for next customer</p>
                        </div>
                    </div>

                    <div className="border-b-2 border-blue-600 mb-6 sm:mb-8"></div>

                    {/* Meta */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-10">
                        <div className="bg-gray-50/70 p-4 sm:p-5 rounded-lg border border-gray-100/50">
                            <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-y-3 text-[12px] sm:text-[13px]">
                                <span className="text-blue-600 font-bold">Invoice Number:</span>
                                <span className="text-gray-800 font-medium">{receipt.invoice_number || 'N/A'}</span>
                                <span className="text-blue-600 font-bold">Date:</span>
                                <span className="text-gray-800 font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                <span className="text-blue-600 font-bold">Time:</span>
                                <span className="text-gray-800 font-medium">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                        <div className="bg-gray-50/70 p-4 sm:p-5 rounded-lg border border-gray-100/50">
                            <h4 className="text-blue-600 font-bold text-[12px] sm:text-[13px] mb-3">Pharmacy POS SYSTEM</h4>
                            <div className="text-[12px] sm:text-[13px] text-gray-800 flex flex-col gap-1.5">
                                <span>Jigjiga</span>
                                <span>Ethiopia</span>
                                <span>Phone: +251915056970</span>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="mb-8 w-full overflow-hidden">
                        <table className="w-full text-[12px] sm:text-[13px] border border-blue-600 overflow-hidden rounded-t table-fixed">
                            <thead className="bg-gradient-to-r from-blue-600 to-emerald-500 text-white">
                                <tr>
                                    <th className="text-left px-3 sm:px-5 py-3 font-bold w-[45%]">Item</th>
                                    <th className="text-left px-2 sm:px-5 py-3 font-bold w-[20%]">Price</th>
                                    <th className="text-center px-1 sm:px-5 py-3 font-bold w-[15%] text-[10px] sm:text-[13px]">Qty</th>
                                    <th className="text-right px-3 sm:px-5 py-3 font-bold w-[20%]">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receipt.cart.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-200 last:border-0 hover:bg-slate-50 transition-colors">
                                        <td className="px-3 sm:px-5 py-3.5 text-gray-800 font-medium truncate" title={item.name}>{item.name}</td>
                                        <td className="px-2 sm:px-5 py-3.5 text-gray-800 whitespace-nowrap">{parseFloat(item.selling_price).toFixed(0)}</td>
                                        <td className="px-1 sm:px-5 py-3.5 text-center text-gray-800 font-bold">{item.qty}</td>
                                        <td className="px-3 sm:px-5 py-3.5 text-right text-gray-800 font-black whitespace-nowrap">{(item.selling_price * item.qty).toFixed(0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t border-gray-200 bg-gray-50/50"><tr><td colSpan="4" className="px-5 py-1"></td></tr></tfoot>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mb-10">
                        <div className="w-full sm:w-[300px] space-y-3.5">
                            <div className="flex justify-between items-center text-gray-700 text-[13px]">
                                <span className="font-semibold">Subtotal:</span>
                                <span>ETB {receipt.subtotal.toFixed(0)}</span>
                            </div>
                            {receipt.discountAmt > 0 && (
                                <div className="flex justify-between items-center text-gray-700 text-[13px]">
                                    <span className="font-semibold">Discount:</span>
                                    <span>-ETB {receipt.discountAmt.toFixed(0)}</span>
                                </div>
                            )}
                            {receipt.taxAmt > 0 && (
                                <div className="flex justify-between items-center text-gray-700 text-[13px]">
                                    <span className="font-semibold">VAT:</span>
                                    <span>ETB {receipt.taxAmt.toFixed(0)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-2">
                                <span className="font-bold text-blue-600 text-[15px]">Total Amount:</span>
                                <span className="font-black text-blue-700 text-lg">ETB {receipt.total.toFixed(0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="bg-blue-50/60 border-l-[3px] border-blue-600 px-4 py-2.5 w-fit rounded-r flex items-center gap-2 shadow-sm">
                        <span className="font-bold text-gray-800 text-[13px]">Payment Method:</span>
                        <span className="text-blue-700 capitalize font-medium text-[13px]">{(receipt.payment_method || receipt.paymentMethod || 'cash').replace('_', ' ')}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-12 print:hidden pt-4 border-t border-gray-100">
                        <button onClick={() => window.print()} className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white rounded font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2">
                            <Printer size={18} /> Print Receipt
                        </button>
                        <button onClick={() => setReceipt(null)} className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-500  hover:from-emerald-600 hover:to-teal-600 text-white rounded font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2">
                            <Check size={18} /> New Sale
                        </button>
                    </div>
                </div>
            </div>
            <InvoiceReceipt data={receipt} />
        </div>
    );

    return (
        <div className="max-w-[1300px] mx-auto space-y-6 animate-fade-in pb-10">

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4 flex items-center justify-between border-l-4 border-l-emerald-400">
                    <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">Today's Sales</p>
                        <h3 className="text-xl font-bold text-gray-900">{stats.today_sales}</h3>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500"><ShoppingCart size={24} /></div>
                </div>
                <div className="card p-4 flex items-center justify-between border-l-4 border-l-blue-400">
                    <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">Today's Income</p>
                        <h3 className="text-lg font-bold text-gray-900">ETB {Number(stats.today_income).toFixed(0)}</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500"><DollarSign size={24} /></div>
                </div>
                <div className="card p-4 flex items-center justify-between border-l-4 border-l-indigo-400">
                    <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">Monthly Sales</p>
                        <h3 className="text-xl font-bold text-gray-900">{stats.monthly_sales}</h3>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500"><Activity size={24} /></div>
                </div>
                <div className="card p-4 flex items-center justify-between border-l-4 border-l-orange-400">
                    <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">Low Stock Items</p>
                        <h3 className="text-xl font-bold text-gray-900">{stats.low_stock}</h3>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500"><Package size={24} /></div>
                </div>
            </div>

            {/* Unified Process Sale Container */}
            <div className="w-full">
                <div className="card shadow-sm flex flex-col min-h-[520px]">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-800">Process Sale</h2>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={applyVat} onChange={e => setApplyVat(e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-gray-300" />
                                <span className="text-xs font-bold text-gray-500">VAT (15%)</span>
                            </label>
                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{cart.length} items</span>
                            <button onClick={() => navigate('/transactions')} className="text-blue-500 hover:text-blue-700 text-xs font-bold transition-colors cursor-pointer">View Transactions</button>
                        </div>
                    </div>

                    <div className="p-5 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                        {/* LEFT SECTION */}
                        <div className="flex flex-col min-w-0">
                            {/* Search & Mode Toggle */}
                            <div className="mb-6 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        {isMultiMode ? 'Multi-Select Mode' : 'Single Item Selection'}
                                    </label>
                                    <button
                                        onClick={toggleMode}
                                        className="text-xs font-black tracking-tighter px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-all cursor-pointer"
                                    >
                                        {isMultiMode ? '← SINGLE SALE' : '+ MULTI SELECT'}
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="text-gray-400" size={16} /></div>
                                        <input
                                            type="text" value={search}
                                            onChange={e => { setSearch(e.target.value); }}
                                            placeholder={isMultiMode ? "Search and add multiple medicines..." : "Search for a single medicine..."}
                                            className="form-input pl-9 h-12 w-full bg-gray-50 border-gray-200 focus:bg-white text-base font-medium shadow-sm"
                                        />
                                        {loading && <div className="absolute right-4 top-4"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
                                        {medicines.length > 0 && (
                                            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] max-h-[300px] overflow-y-auto animate-slide-in-top p-1.5 space-y-1">
                                                {medicines.map(med => (
                                                    <button key={med.id} onClick={() => selectMed(med)} disabled={med.quantity <= 0}
                                                        className={`w-full group px-3 py-2.5 flex items-center justify-between rounded-lg border border-transparent hover:border-blue-100 hover:bg-blue-50/50 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-blue-50/50 cursor-pointer ${med.quantity <= 0 ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white'}`}>
                                                        <div className="flex flex-col text-left">
                                                            <p className="font-bold text-gray-900 text-sm tracking-tight group-hover:text-blue-700 transition-colors leading-tight">{med.name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${med.quantity > 10 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                                    Stock: {med.quantity} {med.unit || 'pcs'}
                                                                </span>
                                                                {med.category_name && <span className="text-[10px] font-semibold text-gray-400 border border-gray-100 bg-gray-50 px-1.5 py-0.5 rounded">{med.category_name}</span>}
                                                            </div>
                                                        </div>
                                                        <div className="pl-3 text-right shrink-0">
                                                            <span className="font-black text-gray-900 text-[14px] bg-gray-50 group-hover:bg-white group-hover:text-blue-700 px-2.5 py-1 rounded-lg border border-gray-100 group-hover:border-blue-100 transition-all">ETB {parseFloat(med.selling_price).toFixed(0)}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Active Cart Display */}
                            <div className="flex-1 flex flex-col">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 opacity-20 border-t border-gray-100 mt-auto mb-auto">
                                        <ShoppingCart size={52} className="text-gray-300 mb-3" />
                                        <p className="text-gray-500 font-medium text-sm">No items selected yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 mt-2 mb-6">
                                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {isMultiMode ? 'Active Multi-Cart' : 'Selected Medicine'}
                                            </label>
                                        </div>
                                        {cart.map(item => (
                                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 px-4 bg-gray-50/50 border border-gray-100 rounded-xl hover:border-blue-100 transition-colors group">
                                                <div className="flex-1 pr-4 w-full">
                                                    <p className="font-black text-gray-800 text-sm tracking-tight">{item.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">ETB {parseFloat(item.selling_price).toFixed(0)} / unit</p>
                                                </div>
                                                <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-5">
                                                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-8 bg-white shadow-sm shrink-0">
                                                        <button onClick={() => updateQty(item.id, -1)} className="w-8 h-full hover:bg-gray-50 text-gray-500 border-r text-base font-bold transition-colors cursor-pointer">−</button>
                                                        <span className="w-10 text-center text-xs font-black text-gray-800 flex items-center justify-center h-full">{item.qty}</span>
                                                        <button onClick={() => updateQty(item.id, 1)} className="w-8 h-full hover:bg-gray-50 text-gray-500 border-l text-base font-bold transition-colors cursor-pointer">+</button>
                                                    </div>
                                                    <span className="font-black text-blue-600 text-sm w-auto sm:w-24 text-right shrink-0">ETB {(item.selling_price * item.qty).toFixed(0)}</span>
                                                    <div className="w-[1px] h-6 bg-gray-200 mx-1 hidden sm:block shrink-0" />
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                                                        title="Remove Item"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Payment Method */}
                            <div className="mt-auto pt-6 border-t border-gray-100">
                                <div className="p-4 bg-gray-50/50 border border-gray-200 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-4 bg-blue-500 rounded-full" />
                                        <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Sale Registration</h3>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Payment Method</label>
                                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                            className="w-full h-11 bg-white border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm rounded-lg px-3 text-sm transition-all outline-none cursor-pointer">
                                            {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SECTION - Order Summary */}
                        <div className="w-full flex flex-col mt-6 lg:mt-0">
                            <div className="bg-gray-50/50 border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col h-full">
                                <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6 border-b border-gray-200 pb-4">Order Summary</h3>

                                <div className="space-y-4 flex-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-medium">Subtotal</span>
                                        <span className="font-bold text-gray-800">ETB {subtotal.toFixed(0)}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 font-medium">VAT (15%)</span>
                                            <input type="checkbox" checked={applyVat} onChange={e => setApplyVat(e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-gray-300 cursor-pointer" />
                                        </div>
                                        <span className="font-bold text-gray-800">ETB {taxAmt.toFixed(0)}</span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-200">
                                    <div className="flex justify-between items-end mb-6">
                                        <span className="text-sm font-black text-gray-900 uppercase tracking-tight">Total Amount</span>
                                        <span className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tighter leading-none">ETB {total.toFixed(0)}</span>
                                    </div>

                                    <button onClick={handleCheckout} disabled={processing || !cart.length}
                                        className="w-full h-14 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 disabled:opacity-50 text-white rounded-xl font-black text-lg transition-all shadow-[0_8px_20px_-8px_rgba(37,99,235,0.5)] active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer">
                                        {processing ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><ShoppingCart size={22} /> Complete Sale</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
