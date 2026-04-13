import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, Trash2, Check, Printer, Activity, DollarSign, Package } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

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

    // Single mode
    const [selectedMed, setSelectedMed] = useState(null);
    const [singleQty, setSingleQty] = useState(1);
    const [singlePrice, setSinglePrice] = useState('');

    // Search
    const [search, setSearch] = useState('');
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(false);

    // Cart
    const [cart, setCart] = useState([]);
    const [multiCart, setMultiCart] = useState([]);

    // Order config
    const [applyVat, setApplyVat] = useState(false);
    const [isUnpaid, setIsUnpaid] = useState(false);
    const [discount, setDiscount] = useState('');
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [dueDate, setDueDate] = useState('');

    // State
    const [processing, setProcessing] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [formSubmitted, setFormSubmitted] = useState(false);

    // Calculations
    const subtotal = useMemo(() => cart.reduce((a, i) => a + i.selling_price * i.qty, 0), [cart]);
    const totalCost = useMemo(() => cart.reduce((a, i) => a + i.purchase_price * i.qty, 0), [cart]);
    const discountAmt = parseFloat(discount) || 0;
    const taxAmt = applyVat ? (subtotal - discountAmt) * 0.15 : 0;
    const total = Math.max(0, subtotal - discountAmt + taxAmt);
    const paidAmt = isUnpaid ? 0 : (String(amountPaid).trim() === '' ? total : (parseFloat(amountPaid) || 0));
    const change = Math.max(0, paidAmt - total);
    const rem = Math.max(0, total - paidAmt);
    const isPartial = rem > 0.01 && !isUnpaid;

    const singleTotalSale = (parseFloat(singlePrice) || 0) * (parseInt(singleQty) || 1);
    const singleTotalCost = selectedMed ? parseFloat(selectedMed.purchase_price) * (parseInt(singleQty) || 1) : 0;
    const singleProfit = singleTotalSale - singleTotalCost;

    const multiSubtotal = useMemo(() => multiCart.reduce((a, i) => a + parseFloat(i.selling_price || 0) * i.qty, 0), [multiCart]);
    const multiTotalCost = useMemo(() => multiCart.reduce((a, i) => a + parseFloat(i.purchase_price || 0) * i.qty, 0), [multiCart]);

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
            setDiscount(parseFloat(tx.discount_value) || '');
            setAmountPaid(tx.amount_paid);
            setPaymentMethod(tx.payment_method);
            setCustomerName(tx.customer?.name || '');
            setCustomerPhone(tx.customer?.phone || '');
            setIsUnpaid(tx.payment_status === 'unpaid');
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
        setSelectedMed(med);
        setSinglePrice(med.selling_price);
        setSingleQty(1);
        setSearch('');
        setMedicines([]);
    };

    const addSingleToCart = () => {
        if (!selectedMed) return;
        const qty = Math.max(1, parseInt(singleQty) || 1);
        if (qty > selectedMed.quantity) { toast.error('Not enough stock!'); return; }
        const price = parseFloat(singlePrice) || parseFloat(selectedMed.selling_price);
        const existing = cart.find(i => i.id === selectedMed.id);
        if (existing) {
            const newQty = existing.qty + qty;
            if (newQty > selectedMed.quantity) { toast.error('Not enough stock!'); return; }
            setCart(cart.map(i => i.id === selectedMed.id ? { ...i, qty: newQty, selling_price: price } : i));
        } else {
            setCart([...cart, { id: selectedMed.id, name: selectedMed.name, qty, selling_price: price, purchase_price: selectedMed.purchase_price, unit: selectedMed.unit, quantity: selectedMed.quantity }]);
        }
        setSelectedMed(null);
        toast.success('Added to cart');
    };

    const addMultiToCart = (med) => {
        if (med.quantity <= 0) { toast.error('Out of stock!'); return; }
        const existingCartQty = cart.find(i => i.id === med.id)?.qty || 0;
        const existingMulti = multiCart.find(i => i.id === med.id);

        if (existingCartQty + (existingMulti?.qty || 0) + 1 > med.quantity) {
            toast.error('Not enough stock!'); return;
        }

        if (existingMulti) {
            setMultiCart(multiCart.map(i => i.id === med.id ? { ...i, qty: i.qty + 1 } : i));
        } else {
            setMultiCart([...multiCart, { id: med.id, name: med.name, qty: 1, selling_price: med.selling_price, purchase_price: med.purchase_price, unit: med.unit, quantity: med.quantity }]);
        }
        setSearch(''); setMedicines([]);
    };

    const processMultiSale = () => {
        if (!multiCart.length) return;
        const newCart = [...cart];
        multiCart.forEach(mItem => {
            const existing = newCart.find(i => i.id === mItem.id);
            if (existing) {
                existing.qty += mItem.qty;
                existing.selling_price = mItem.selling_price;
            } else {
                newCart.push({ ...mItem });
            }
        });
        setCart(newCart);
        setMultiCart([]);
        setIsMultiMode(false);
        toast.success('Added to current order');
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

    const removeMultiCartItem = (id) => setMultiCart(multiCart.filter(i => i.id !== id));

    const updateMultiQty = (id, delta) => {
        setMultiCart(multiCart.map(i => {
            if (i.id === id) {
                const existingCartQty = cart.find(c => c.id === id)?.qty || 0;
                const nq = i.qty + delta;
                if (nq > 0 && (nq + existingCartQty) <= i.quantity) return { ...i, qty: nq };
            }
            return i;
        }));
    };

    const handleCheckout = async () => {
        if (!cart.length) { toast.error('Add items to cart first'); return; }
        if ((isUnpaid || isPartial) && (!customerName || !customerPhone)) {
            setFormSubmitted(true);
            toast.error('Customer details required for credit sales');
            return;
        }
        setProcessing(true);
        try {
            const payload = {
                items: cart.map(i => ({ medicine_id: i.id, quantity: i.qty, selling_price: i.selling_price, purchase_price: i.purchase_price })),
                payment_method: paymentMethod,
                amount_paid: paidAmt,
                discount_type: 'fixed',
                discount_value: discountAmt,
                tax_rate: applyVat ? 15 : 0,
                tax_amount: taxAmt,
                customer_name: customerName || 'Walk-in Customer',
                customer_phone: customerPhone || 'N/A',
                due_date: (isUnpaid || isPartial) ? dueDate : null,
                payment_status: isUnpaid ? 'unpaid' : (isPartial ? 'partial' : 'paid'),
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

            setReceipt({ ...data.data, cart: [...cart], subtotal, taxAmt, discountAmt, total, paidAmt, change_amount: change, rem });
            setCart([]); setDiscount(''); setAmountPaid('');
            setCustomerName(''); setCustomerPhone(''); setDueDate('');
            setIsUnpaid(false); setApplyVat(false); setFormSubmitted(false);
            setEditId(null);
            // Clear location state securely
            window.history.replaceState({}, document.title);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error processing sale');
        } finally { setProcessing(false); }
    };

    if (receipt) return (
        <div className="max-w-md mx-auto py-10">
            <div className="card p-8 text-center shadow-lg border-t-4 border-t-emerald-500">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="text-emerald-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Sale Complete!</h2>
                <p className="text-gray-500 mb-6">Invoice #<span className="font-mono font-medium text-gray-800">{receipt.invoice_number}</span></p>
                <div className="bg-gray-50 rounded-xl p-5 text-left mb-6 font-mono text-sm space-y-3">
                    {receipt.cart.map((i, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                            <div className="flex-1">
                                <span className="text-gray-800 block">{i.name}</span>
                                <span className="text-gray-500 text-xs">{i.qty} x ETB {parseFloat(i.selling_price).toFixed(2)}</span>
                            </div>
                            <span className="font-semibold">ETB {(i.selling_price * i.qty).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="border-t border-dashed border-gray-300 pt-3 mt-3 space-y-2">
                        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>ETB {receipt.subtotal.toFixed(2)}</span></div>
                        {receipt.taxAmt > 0 && <div className="flex justify-between text-gray-600"><span>VAT (15%)</span><span>ETB {receipt.taxAmt.toFixed(2)}</span></div>}
                        {receipt.discountAmt > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-ETB {receipt.discountAmt.toFixed(2)}</span></div>}
                        <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-gray-200">
                            <span>Total</span><span>ETB {receipt.total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 pt-2">
                            <span>Paid ({PAYMENT_METHODS.find(m => m.id === receipt.payment_method)?.label || receipt.payment_method})</span>
                            <span>ETB {receipt.paidAmt.toFixed(2)}</span>
                        </div>
                        {receipt.change_amount > 0 && <div className="flex justify-between text-emerald-600 font-medium"><span>Change</span><span>ETB {receipt.change_amount.toFixed(2)}</span></div>}
                        {receipt.rem > 0 && <div className="flex justify-between text-rose-600 font-medium"><span>Remaining Balance (Debt)</span><span>ETB {receipt.rem.toFixed(2)}</span></div>}
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => window.print()} className="btn-secondary flex-1 py-3"><Printer size={18} /> Print Receipt</button>
                    <button onClick={() => setReceipt(null)} className="btn-success flex-1 py-3 text-white font-bold">Next Sale</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-10">

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <h3 className="text-lg font-bold text-gray-900">ETB {Number(stats.today_income).toFixed(2)}</h3>
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT — Process Sale */}
                <div className="lg:col-span-5">
                    <div className="card p-5 shadow-sm min-h-[520px] flex flex-col">
                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800 ">Process Sale</h2>
                            <button
                                onClick={() => { setIsMultiMode(m => !m); setSelectedMed(null); setSearch(''); setMedicines([]); setMultiCart([]); }}
                                className="text-xs font-black tracking-tighter px-3 py-1.5  rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-all cursor-pointer"
                            >
                                {isMultiMode ? '← SINGLE SALE' : '+ MULTI SELECT'}
                            </button>
                        </div>

                        {!isMultiMode ? (
                            /* ---- SINGLE MODE ---- */
                            <div className="flex-1 flex flex-col space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Search Medicine</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="text-gray-400" size={16} /></div>
                                        <input
                                            type="text" value={search}
                                            onChange={e => { setSearch(e.target.value); setSelectedMed(null); }}
                                            placeholder="Type medicine name or first letters..."
                                            className="form-input pl-9 h-10 bg-gray-50 border-gray-200 focus:bg-white text-sm"
                                        />
                                        {loading && <div className="absolute right-3 top-3"><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
                                        {medicines.length > 0 && !selectedMed && (
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
                                                            <span className="font-black text-gray-900 text-[14px] bg-gray-50 group-hover:bg-white group-hover:text-blue-700 px-2.5 py-1 rounded-lg border border-gray-100 group-hover:border-blue-100 transition-all">ETB {parseFloat(med.selling_price).toFixed(2)}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!selectedMed ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 py-10">
                                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-3xl">💊</div>
                                        <p className="text-sm text-gray-500 font-medium">Search and select a medicine to begin</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col space-y-4 animate-fade-in">
                                        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                                            <div>
                                                <p className="text-xs font-black text-blue-700 uppercase tracking-tighter">{selectedMed.name}</p>
                                                <p className="text-[10px] text-blue-400 font-bold">Stock: {selectedMed.quantity} units</p>
                                            </div>
                                            <button onClick={() => setSelectedMed(null)} className="text-gray-400 hover:text-red-500 text-xl leading-none transition-colors">×</button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Buying Price:</p>
                                                <p className="font-bold text-gray-700 text-sm">ETB {parseFloat(selectedMed.purchase_price).toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Suggested Price:</p>
                                                <p className="font-bold text-gray-700 text-sm">ETB {parseFloat(selectedMed.selling_price).toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Available Stock:</p>
                                                <p className="font-bold text-gray-700 text-sm">{selectedMed.quantity} units</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Batch:</p>
                                                <p className="font-bold text-gray-700 text-sm">{selectedMed.batch_number || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Quantity</label>
                                            <input type="number" value={singleQty} min={1} max={selectedMed.quantity}
                                                onChange={e => setSingleQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="form-input h-10 w-full text-sm font-bold" />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Selling Price (Per Unit)</label>
                                            <input type="number" value={singlePrice}
                                                onChange={e => setSinglePrice(e.target.value)}
                                                className="form-input h-10 w-full text-sm font-bold" />
                                        </div>

                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3">Sale Summary</p>
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Total Sale</p>
                                                    <p className="font-bold text-gray-800 text-sm">ETB {singleTotalSale.toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Total Cost</p>
                                                    <p className="font-bold text-gray-500 text-sm">ETB {singleTotalCost.toFixed(2)}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Profit/Loss</p>
                                                <p className={`font-black text-lg ${singleProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                    {singleProfit >= 0 ? '+' : ''}ETB {singleProfit.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>

                                        <button onClick={addSingleToCart}
                                            className="w-full h-12 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-teal-600 hover:to-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] text-sm cursor-pointer">
                                            <ShoppingCart size={18} /> Process Sale
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ---- MULTI MODE ---- */
                            <div className="flex-1 flex flex-col space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Search & Add Medicines</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="text-gray-400" size={16} /></div>
                                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                            placeholder="Type medicine name to add to cart..."
                                            className="form-input pl-9 h-10 bg-gray-50 border-gray-200 focus:bg-white text-sm" />
                                        {loading && <div className="absolute right-3 top-3"><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
                                        {medicines.length > 0 && (
                                            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] max-h-[300px] overflow-y-auto animate-slide-in-top p-1.5 space-y-1">
                                                {medicines.map(med => (
                                                    <button key={med.id} onClick={() => addMultiToCart(med)} disabled={med.quantity <= 0}
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
                                                            <span className="font-black text-gray-900 text-[14px] bg-gray-50 group-hover:bg-white group-hover:text-blue-700 px-2.5 py-1 rounded-lg border border-gray-100 group-hover:border-blue-100 transition-all">ETB {parseFloat(med.selling_price).toFixed(2)}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selected Medicines</label>
                                    <div className="flex-1 bg-gray-50 rounded-xl border border-gray-100 p-3 min-h-[180px] flex flex-col gap-2 overflow-y-auto">
                                        {multiCart.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center opacity-20 text-center">
                                                <div className="text-4xl mb-2">📋</div>
                                                <p className="text-xs font-bold text-gray-500">No items in multi-sale list</p>
                                            </div>
                                        ) : (
                                            multiCart.map(item => (
                                                <div key={item.id} className="bg-white rounded-lg p-3 flex flex-col gap-2 border border-blue-100 hover:border-blue-200 transition-colors shadow-sm relative group animate-fade-in">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1 pr-6">
                                                            <p className="text-xs font-black text-gray-800 uppercase tracking-tighter truncate max-w-[200px]">{item.name}</p>
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Stock: {item.quantity}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => removeMultiCartItem(item.id)}
                                                            className="absolute top-2 right-2 w-6 h-6 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100 mt-1">
                                                        <div className="flex-1">
                                                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 ml-1">Quantity</label>
                                                            <div className="flex items-center border border-gray-200 rounded-md overflow-hidden h-7 bg-white">
                                                                <button onClick={() => updateMultiQty(item.id, -1)} className="w-7 h-full hover:bg-gray-50 text-gray-400 border-r text-sm font-bold transition-colors cursor-pointer">−</button>
                                                                <span className="flex-1 text-center text-xs font-black text-gray-800">{item.qty}</span>
                                                                <button onClick={() => updateMultiQty(item.id, 1)} className="w-7 h-full hover:bg-gray-50 text-gray-400 border-l text-sm font-bold transition-colors cursor-pointer">+</button>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 ml-1">Price (ETB)</label>
                                                            <input
                                                                type="number"
                                                                value={item.selling_price}
                                                                onChange={e => setMultiCart(multiCart.map(i => i.id === item.id ? { ...i, selling_price: e.target.value } : i))}
                                                                className="w-full h-7 border border-gray-200 rounded-md text-xs font-black text-gray-800 px-2 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center px-1 mt-0.5">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Subtotal</span>
                                                        <p className="text-xs font-black text-emerald-600">ETB {(item.selling_price * item.qty).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-3">Multi-Sale Summary</p>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                        <div className="flex justify-between"><span className="text-[10px] font-bold text-gray-400">Total Items:</span><span className="text-[10px] font-black text-gray-700">{multiCart.reduce((a, b) => a + b.qty, 0)}</span></div>
                                        <div className="flex justify-between"><span className="text-[10px] font-bold text-gray-400">Total Sale:</span><span className="text-[10px] font-black text-gray-700">ETB {multiSubtotal.toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span className="text-[10px] font-bold text-gray-400">Total Cost:</span><span className="text-[10px] font-bold text-gray-400">ETB {multiTotalCost.toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span className="text-[10px] font-bold text-emerald-600">Total Profit/Loss:</span><span className="text-[10px] font-black text-emerald-600">{multiSubtotal - multiTotalCost >= 0 ? '+' : ''}ETB {(multiSubtotal - multiTotalCost).toFixed(2)}</span></div>
                                    </div>
                                </div>

                                <button onClick={processMultiSale} disabled={!multiCart.length}
                                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer">
                                    <ShoppingCart size={18} /> Process Multi-Sale
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT — Current Order */}
                <div className="lg:col-span-7">
                    <div className="card shadow-sm flex flex-col min-h-[520px]">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800">Current Order</h2>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" checked={applyVat} onChange={e => setApplyVat(e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-gray-300" />
                                    <span className="text-xs font-bold text-gray-500">VAT (15%)</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" checked={isUnpaid}
                                        onChange={e => { setIsUnpaid(e.target.checked); if (e.target.checked) setAmountPaid('0'); else setAmountPaid(''); }}
                                        className="w-4 h-4 rounded text-blue-600 border-gray-300" />
                                    <span className={`text-xs font-black uppercase tracking-tighter px-2 py-0.5 rounded ${isUnpaid ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>UNPAID</span>
                                </label>
                                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{cart.length} items</span>
                                <button onClick={() => navigate('/transactions')} className="text-blue-500 hover:text-blue-700 text-xs font-bold transition-colors cursor-pointer">View Transactions</button>
                            </div>
                        </div>

                        {/* Cart Items (Current Order) */}
                        <div className="p-5 flex-1 flex flex-col">
                            {/* Cart */}
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 opacity-20">
                                    <ShoppingCart size={52} className="text-gray-300 mb-3" />
                                    <p className="text-gray-500 font-medium text-sm">No items added yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3 mb-6">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex items-center justify-between py-3 px-4 bg-gray-50/50 border border-gray-100 rounded-xl hover:border-blue-100 transition-colors group">
                                            <div className="flex-1 pr-4">
                                                <p className="font-black text-gray-800 text-sm tracking-tight">{item.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">ETB {parseFloat(item.selling_price).toFixed(2)} / unit</p>
                                            </div>
                                            <div className="flex items-center gap-5">
                                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-8 bg-white shadow-sm">
                                                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-full hover:bg-gray-50 text-gray-500 border-r text-base font-bold transition-colors cursor-pointer">−</button>
                                                    <span className="w-10 text-center text-xs font-black text-gray-800">{item.qty}</span>
                                                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-full hover:bg-gray-50 text-gray-500 border-l text-base font-bold transition-colors cursor-pointer">+</button>
                                                </div>
                                                <span className="font-black text-blue-600 text-sm w-24 text-right">ETB {(item.selling_price * item.qty).toFixed(2)}</span>
                                                <div className="w-[1px] h-6 bg-gray-200 mx-1" />
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                                    title="Remove Item"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Order Summary */}
                            <div className="border-t border-gray-100 pt-5 space-y-3">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Order Summary</p>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-bold text-gray-800">ETB {subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Discount</span><span className="font-bold text-gray-800">- ETB {discountAmt.toFixed(2)}</span></div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">VAT (15%)</span>
                                        <input type="checkbox" checked={applyVat} onChange={e => setApplyVat(e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-gray-300 cursor-pointer" />
                                    </div>
                                    <span className="font-bold text-gray-800">ETB {taxAmt.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-black text-rose-500 text-xs">Unpaid Sale?</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">SET PAID TO 0</span>
                                        <input type="checkbox" checked={isUnpaid}
                                            onChange={e => { setIsUnpaid(e.target.checked); if (e.target.checked) setAmountPaid('0'); else setAmountPaid(''); }}
                                            className="w-4 h-4 rounded text-blue-600 border-gray-300 cursor-pointer" />
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
                                    <span className="text-sm font-black text-gray-900 uppercase tracking-tight">Total Amount</span>
                                    <span className="text-2xl font-black text-blue-600 tracking-tighter">ETB {total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Unified Sale Details Section (No Internal Dividers) */}
                            <div className="mt-5 p-4 bg-gray-50/50 border border-gray-200 rounded-2xl shadow-sm">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-2 h-4 bg-blue-500 rounded-full" />
                                    <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Sale Registration Details</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Amount Paid (ETB)</label>
                                        <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="0.00"
                                            className="w-full h-10 bg-white border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm rounded-lg px-3 text-sm font-bold transition-all outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Payment Method</label>
                                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                            className="w-full h-10 bg-white border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm rounded-lg px-3 text-sm transition-all outline-none cursor-pointer">
                                            {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Discount (ETB)</label>
                                        <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0.00"
                                            className="w-full h-10 bg-white border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm rounded-lg px-3 text-sm transition-all outline-none" />
                                    </div>

                                    {/* These flow seamlessly into the exact same grid when needed */}
                                    {(isUnpaid || isPartial) && (
                                        <>
                                            <div className="animate-fade-in relative">
                                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1.5">Customer Name Request</label>
                                                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                                                    placeholder="Enter full name"
                                                    className={`w-full h-10 bg-blue-50/30 border border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm rounded-lg px-3 text-sm transition-all outline-none ${formSubmitted && !customerName ? 'border-rose-400 ring-4 ring-rose-50' : ''}`} />
                                            </div>
                                            <div className="animate-fade-in relative">
                                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1.5">Phone Number</label>
                                                <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                                                    placeholder="Enter phone number"
                                                    className={`w-full h-10 bg-blue-50/30 border border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm rounded-lg px-3 text-sm transition-all outline-none ${formSubmitted && !customerPhone ? 'border-rose-400 ring-4 ring-rose-50' : ''}`} />
                                            </div>
                                            <div className="animate-fade-in relative">
                                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1.5">Debt Due Date</label>
                                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                                    className="w-full h-10 bg-blue-50/30 border border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm rounded-lg px-3 text-sm transition-all outline-none" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Change Due + Complete */}
                            {(isUnpaid || (amountPaid !== '' && amountPaid != null)) && (
                                <div className="mt-5 flex items-center justify-between px-5 py-3 bg-emerald-50 rounded-xl border border-emerald-100 animate-fade-in">
                                    <div>
                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Change Due</p>
                                        <p className="text-xl font-black text-emerald-700 font-mono">ETB {change.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Status</p>
                                        <p className="text-xs font-bold text-emerald-600 uppercase">{isUnpaid ? 'Full Credit' : (isPartial ? 'Partial' : 'Fully Paid')}</p>
                                    </div>
                                </div>
                            )}

                            <button onClick={handleCheckout} disabled={processing || !cart.length}
                                className="mt-3 w-full h-14 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 disabled:opacity-50 text-white rounded-xl font-black text-lg transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer">
                                {processing ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><ShoppingCart size={22} /> Complete Sale</>}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
