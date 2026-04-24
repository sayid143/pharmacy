import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList, Search, Calendar, TrendingUp, DollarSign,
    ShoppingBag, X, ChevronLeft, ChevronRight, Eye, Pill,
    CheckCircle, Clock, RefreshCw, Filter, Pencil, Trash2, AlertTriangle,
    Printer, TrendingDown, Wallet, Smartphone
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import InvoiceReceipt from '../components/InvoiceReceipt';

const formatCurrency = (v) => `ETB ${parseFloat(v || 0).toFixed(2)}`;
const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const formatDateTime = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};
const getDateRange = (mode, selectedDate, selectedMonth, customStart, customEnd, isFullMonth = false) => {
    const now = new Date();

    const parseLocalDate = (ds) => {
        if (!ds) return now;
        const [y, m, d] = ds.split('-').map(Number);
        return new Date(y, m - 1, d || 1);
    };

    if (mode === 'daily') {
        const d = selectedDate ? parseLocalDate(selectedDate) : now;
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        return { start: start.toISOString(), end: end.toISOString() };
    }
    if (mode === 'weekly') {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start: start.toISOString(), end: end.toISOString() };
    }
    if (mode === 'monthly') {
        const d = selectedMonth ? parseLocalDate(selectedMonth) : now;
        if (isFullMonth) {
            const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
            return { start: start.toISOString(), end: end.toISOString() };
        } else {
            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
            const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
            return { start: start.toISOString(), end: end.toISOString() };
        }
    }
    if (mode === 'custom') {
        if (!customStart || !customEnd) return { start: null, end: null };
        const start = parseLocalDate(customStart);
        start.setHours(0, 0, 0, 0);
        const end = parseLocalDate(customEnd);
        end.setHours(23, 59, 59, 999);
        return { start: start.toISOString(), end: end.toISOString() };
    }
    return { start: null, end: null };
};

const PAYMENT_BADGE = {
    cash: { label: 'Cash', cls: 'bg-emerald-50 text-emerald-700' },
    card: { label: 'Card', cls: 'bg-blue-50 text-blue-700' },
    mobile: { label: 'Mobile', cls: 'bg-purple-50 text-purple-700' },
    credit: { label: 'Credit', cls: 'bg-rose-50 text-rose-700' },
    ebirr: { label: 'Ebirr', cls: 'bg-teal-50 text-teal-700' },
    ebirr_kaafi: { label: 'Ebirr Kaafi', cls: 'bg-violet-50 text-violet-700' },
    bank_transfer: { label: 'Bank Transfer', cls: 'bg-indigo-50 text-indigo-700' },
    other: { label: 'Other', cls: 'bg-gray-100 text-gray-600' },
};

// Resolve whichever timestamp field Sequelize returns
const getTimestamp = (tx) => tx.created_at || tx.createdAt || tx.date || null;

export default function Transactions() {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null); // tx to confirm delete
    const [deleting, setDeleting] = useState(false);

    // Filters
    const [filterMode, setFilterMode] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'custom'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [isMonthlyFullMonth, setIsMonthlyFullMonth] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const LIMIT = 15;

    // Summary stats
    const [summaryStats, setSummaryStats] = useState({
        totalTransactions: 0,
        totalSales: 0,
        totalProfit: 0,
        totalLoss: 0,
        cash: 0,
        ebirr: 0,
        ebirrKaafi: 0
    });

    const fetchTransactions = useCallback(async (pg = 1) => {
        setLoading(true);
        try {
            const params = { page: pg, limit: LIMIT };
            const { start, end } = getDateRange(filterMode, selectedDate, selectedMonth, startDate, endDate, isMonthlyFullMonth);
            if (start) params.start_date = start;
            if (end) params.end_date = end;

            const { data } = await api.get('/sales', { params });
            setTransactions(data.data || []);
            setTotalPages(data.pagination?.pages || 1);
            setTotalCount(data.pagination?.total || 0);
        } catch (e) {
            // error handled by interceptor
        } finally {
            setLoading(false);
        }
    }, [filterMode, startDate, endDate, selectedDate, selectedMonth, isMonthlyFullMonth]);

    const fetchSummaryStats = useCallback(async () => {
        try {
            const { start, end } = getDateRange(filterMode, selectedDate, selectedMonth, startDate, endDate, isMonthlyFullMonth);
            const params = { limit: 10000 };
            if (start) params.start_date = start;
            if (end) params.end_date = end;

            const { data } = await api.get('/sales', { params });
            const rows = data.data || [];

            let totalSales = 0;
            let totalProfit = 0;
            let totalLoss = 0;
            let cash = 0;
            let ebirr = 0;
            let ebirrKaafi = 0;

            rows.forEach(s => {
                const total = parseFloat(s.total_amount || 0);
                totalSales += total;

                const subtotal = parseFloat(s.subtotal || 0);
                const discount = parseFloat(s.discount_amount || 0);
                const netSales = subtotal - discount;

                let cost = 0;
                if (s.items && s.items.length) {
                    s.items.forEach(i => {
                        cost += parseFloat(i.purchase_price || 0) * parseInt(i.quantity || 0);
                    });
                } else if (s.subtotal) {
                    cost = parseFloat(s.subtotal); // fallback if no items
                }

                const profit = netSales - cost;
                if (profit >= 0) totalProfit += profit;
                else totalLoss += Math.abs(profit);

                const pm = (s.payment_method || '').toLowerCase();
                if (pm === 'cash') cash += total;
                else if (pm === 'ebirr') ebirr += total;
                else if (pm === 'ebirr_kaafi') ebirrKaafi += total;
            });

            setSummaryStats({
                totalTransactions: rows.length,
                totalSales,
                totalProfit,
                totalLoss,
                cash,
                ebirr,
                ebirrKaafi
            });
        } catch (e) { }
    }, [filterMode, startDate, endDate, selectedDate, selectedMonth, isMonthlyFullMonth]);

    // Search filter on client-side for invoice number
    const filteredTransactions = searchQuery
        ? transactions.filter(t =>
            t.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(t.id).includes(searchQuery)
        )
        : transactions;

    useEffect(() => {
        fetchSummaryStats();
    }, [fetchSummaryStats]);

    useEffect(() => {
        setPage(1);
        fetchTransactions(1);
    }, [filterMode, startDate, endDate, selectedDate, selectedMonth, fetchTransactions]);

    const openDetail = async (tx) => {
        setModalOpen(true);
        setSelectedTx({ ...tx, items: null });
        setDetailLoading(true);
        try {
            const { data } = await api.get(`/sales/${tx.id}`);
            setSelectedTx({ ...data.data });
        } catch (e) { }
        finally { setDetailLoading(false); }
    };

    const openInvoice = async (tx) => {
        setInvoiceModalOpen(true);
        setSelectedTx({ ...tx, items: null });
        setDetailLoading(true);
        try {
            const { data } = await api.get(`/sales/${tx.id}`);
            setSelectedTx({ ...data.data });
        } catch (e) { }
        finally { setDetailLoading(false); }
    };

    const closeModal = () => {
        setModalOpen(false);
        setInvoiceModalOpen(false);
        setSelectedTx(null);
    };

    const handleEdit = async (tx) => {
        try {
            const { data } = await api.get(`/sales/${tx.id}`);
            navigate('/sales', { state: { viewTransaction: data.data } });
        } catch (e) {
            toast.error('Failed to load transaction data for editing');
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        try {
            await api.delete(`/sales/${deleteConfirm.id}`);
            toast.success('Transaction deleted successfully');
            setDeleteConfirm(null);
            fetchTransactions(page);
            fetchSummaryStats();
        } catch (e) {
            toast.error('Failed to delete transaction');
        } finally {
            setDeleting(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        setPage(newPage);
        fetchTransactions(newPage);
    };

    return (
        <>
            <div className={`space-y-6 animate-fade-in pb-10 print-container ${invoiceModalOpen ? 'print:hidden' : ''}`}>
                {/* Print Only Header */}
                <div className="hidden print:block mb-8 text-center">
                    <h1 className="text-2xl font-black text-gray-900">Daily Sales Report</h1>
                    <p className="text-gray-500 mt-1">Generated on {formatDateTime(new Date().toISOString())}</p>
                    <div className="flex flex-wrap justify-center gap-4 mt-6">
                        <div className="px-4 py-2 border rounded text-center">
                            <p className="text-[10px] text-gray-500 uppercase">Total Sales</p>
                            <p className="font-bold">{formatCurrency(summaryStats.totalSales)}</p>
                        </div>
                        <div className="px-4 py-2 border rounded text-center">
                            <p className="text-[10px] text-gray-500 uppercase">Total Profit</p>
                            <p className="font-bold text-emerald-600">+{formatCurrency(summaryStats.totalProfit)}</p>
                        </div>
                        <div className="px-4 py-2 border rounded text-center">
                            <p className="text-[10px] text-gray-500 uppercase">Total Loss</p>
                            <p className="font-bold text-rose-600">-{formatCurrency(summaryStats.totalLoss)}</p>
                        </div>
                        <div className="px-4 py-2 border rounded text-center">
                            <p className="text-[10px] text-gray-500 uppercase">Cash</p>
                            <p className="font-bold">{formatCurrency(summaryStats.cash)}</p>
                        </div>
                        <div className="px-4 py-2 border rounded text-center">
                            <p className="text-[10px] text-gray-500 uppercase">Ebirr</p>
                            <p className="font-bold">{formatCurrency(summaryStats.ebirr)}</p>
                        </div>
                        <div className="px-4 py-2 border rounded text-center">
                            <p className="text-[10px] text-gray-500 uppercase">Ebirr Kaafi</p>
                            <p className="font-bold">{formatCurrency(summaryStats.ebirrKaafi)}</p>
                        </div>
                    </div>
                </div>

                <style>{`
                @media print {
                    ${!(modalOpen || invoiceModalOpen) ? `
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible; }
                    .print-container { position: absolute; left: 0; top: 0; width: 100%; padding: 10px; }
                    @page { margin: 10mm; size: A4 landscape; }
                    ` : ''}
                    .print\\:hidden { display: none !important; }
                    .print\\:block { display: block !important; }
                    .sidebar { display: none !important; }
                    header { display: none !important; }
                }
            `}</style>

                {/* Page Header */}
                <div className="flex items-center justify-between print:hidden">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardList size={26} className="text-blue-600" />
                            Transaction History
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">View and filter all completed sales</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-all text-sm font-bold shadow-sm"
                        >
                            <Printer size={15} /> Print Report
                        </button>
                        <button
                            onClick={() => { fetchTransactions(page); fetchSummaryStats(); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-blue-700 hover:border-blue-200 transition-all text-sm font-bold shadow-sm"
                        >
                            <RefreshCw size={15} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6 print:hidden">
                    <div className="card p-4 flex flex-col justify-between border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Txns</p>
                            <ClipboardList size={16} className="text-blue-500" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">{summaryStats.totalTransactions}</h3>
                    </div>
                    <div className="card p-4 flex flex-col justify-between border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Sales</p>
                            <DollarSign size={16} className="text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">{formatCurrency(summaryStats.totalSales)}</h3>
                    </div>
                    <div className="card p-4 flex flex-col justify-between border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Profit</p>
                            <TrendingUp size={16} className="text-indigo-500" />
                        </div>
                        <h3 className="text-lg font-black text-indigo-600">+{formatCurrency(summaryStats.totalProfit)}</h3>
                    </div>
                    <div className="card p-4 flex flex-col justify-between border-l-4 border-l-rose-500 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Loss</p>
                            <TrendingDown size={16} className="text-rose-500" />
                        </div>
                        <h3 className="text-lg font-black text-rose-600">-{formatCurrency(summaryStats.totalLoss)}</h3>
                    </div>
                    <div className="card p-4 flex flex-col justify-between border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Cash</p>
                            <Wallet size={16} className="text-green-500" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">{formatCurrency(summaryStats.cash)}</h3>
                    </div>
                    <div className="card p-4 flex flex-col justify-between border-l-4 border-l-teal-500 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Ebirr</p>
                            <Smartphone size={16} className="text-teal-500" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">{formatCurrency(summaryStats.ebirr)}</h3>
                    </div>
                    <div className="card p-4 flex flex-col justify-between border-l-4 border-l-violet-500 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Ebirr Kaafi</p>
                            <Smartphone size={16} className="text-violet-500" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">{formatCurrency(summaryStats.ebirrKaafi)}</h3>
                    </div>
                </div>

                {/* Filters */}
                <div className="card p-4 print:hidden">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                            {[
                                { key: 'daily', label: "daily" },
                                { key: 'weekly', label: 'Weekly' },
                                { key: 'monthly', label: 'Monthly' },
                                { key: 'custom', label: 'Date Range' },
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => {
                                        setFilterMode(f.key);
                                        if (f.key === 'monthly') setIsMonthlyFullMonth(true);
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterMode === f.key
                                        ? 'bg-white text-blue-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {filterMode === 'daily' && (
                            <div className="flex items-center gap-2 animate-fade-in transition-all">
                                <span className="text-xs font-bold text-gray-400 uppercase ml-2">Pick Date:</span>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={e => setSelectedDate(e.target.value)}
                                        className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none hover:border-gray-300 transition-colors bg-white shadow-sm font-medium"
                                    />
                                </div>
                            </div>
                        )}

                        {filterMode === 'monthly' && (
                            <div className="flex items-center gap-2 animate-fade-in transition-all">
                                <span className="text-xs font-bold text-gray-400 uppercase ml-2">Pick Month:</span>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="date"
                                        value={selectedMonth}
                                        onChange={e => {
                                            setSelectedMonth(e.target.value);
                                            setIsMonthlyFullMonth(false);
                                        }}
                                        className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none hover:border-gray-300 transition-colors bg-white shadow-sm font-medium"
                                    />
                                    {!isMonthlyFullMonth && (
                                        <button
                                            onClick={() => setIsMonthlyFullMonth(true)}
                                            className="ml-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                                        >
                                            Show Full Month
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {filterMode === 'custom' && (
                            <div className="flex items-center gap-2 animate-fade-in">
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none"
                                    />
                                </div>
                                <span className="text-gray-400 text-sm">→</span>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="relative ml-auto w-full sm:w-auto">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by Invoice # or ID..."
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none w-full sm:w-64"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="card overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <Filter size={16} className="text-blue-600" />
                            {filterMode === 'today' ? "Today's Transactions" : filterMode === 'range' ? 'Filtered Transactions' : 'All Transactions'}
                        </h2>
                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                            {totalCount} total
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <ClipboardList size={48} className="mb-4 opacity-20" />
                            <p className="font-medium">No transactions found</p>
                            <p className="text-sm mt-1">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left text-sm border-separate min-w-[1000px]" style={{ borderSpacing: '0' }}>
                                <thead className="bg-[#e6f4fe] text-sky-700 capitalize tracking-wide text-[13px] font-semibold sticky top-0 z-20 shadow-[0_4px_8px_-2px_rgba(0,0,0,0.05)]">
                                    <tr>
                                        <th className="px-4 py-3 whitespace-nowrap">Invoice #</th>
                                        <th className="px-4 py-3 whitespace-nowrap">User</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Medicine Name</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap">Qty</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Date & Time</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Payment Method</th>
                                        <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                                        <th className="px-4 py-3 text-right whitespace-nowrap">Paid</th>
                                        <th className="px-4 py-3 text-right whitespace-nowrap print:hidden">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white text-[13px]">
                                    {filteredTransactions.map((tx, index) => {
                                        const rawMethod = (tx.payment_method || tx.paymentMethod || '').toLowerCase();
                                        const badge = PAYMENT_BADGE[rawMethod] || { label: rawMethod || '—', cls: 'bg-gray-100 text-gray-600' };
                                        const isPaid = tx.payment_status === 'paid';
                                        const isRefunded = tx.status === 'refunded';

                                        // Calculate accurate expected total (from current Medicine prices)
                                        let expectedTotal = 0;
                                        if (tx.items && tx.items.length > 0) {
                                            tx.items.forEach(item => {
                                                expectedTotal += (parseFloat(item.medicine?.selling_price) || parseFloat(item.selling_price) || 0) * (parseInt(item.quantity) || 0);
                                            });
                                        } else if (tx.total_amount) {
                                            expectedTotal = parseFloat(tx.total_amount);
                                        }

                                        const actualSoldTotal = parseFloat(tx.total_amount || 0);
                                        const profitOrLoss = actualSoldTotal - expectedTotal;
                                        const isLoss = profitOrLoss < -0.01; // Actual is less than Expected
                                        const lossAmount = Math.abs(profitOrLoss);

                                        return (
                                            <tr key={tx.id} className="bg-white even:bg-slate-50 hover:bg-gray-50/80 transition-colors shadow-[0_-1px_2px_rgba(0,0,0,0.05)] relative z-0 hover:z-10">
                                                <td className="px-4 py-2.5 whitespace-nowrap">
                                                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100/50">
                                                        {tx.invoice_number}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 whitespace-nowrap text-gray-800 font-semibold">
                                                    {tx.user?.name || '—'}
                                                </td>
                                                <td className="px-4 py-2.5 min-w-[140px]">
                                                    <div className="flex flex-col gap-1 whitespace-normal">
                                                        {tx.items && tx.items.length > 0 ? (
                                                            tx.items.map((item, i) => (
                                                                <span key={i} className="font-bold text-gray-800 leading-tight" title={item.medicine?.name}>
                                                                    {item.medicine?.name}
                                                                </span>
                                                            ))
                                                        ) : <span className="text-gray-400">—</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                                    <div className="flex flex-col gap-1 items-center">
                                                        {tx.items && tx.items.length > 0 ? (
                                                            tx.items.map((item, i) => (
                                                                <span key={i} className="text-[12px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded shadow-sm min-w-[24px] inline-block">
                                                                    {item.quantity}
                                                                </span>
                                                            ))
                                                        ) : <span className="text-gray-400">—</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-500 font-medium whitespace-nowrap">
                                                    {formatDateTime(getTimestamp(tx))}
                                                </td>
                                                <td className="px-4 py-2.5 whitespace-nowrap">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 font-bold text-gray-900 text-right whitespace-nowrap">
                                                    <span className="tracking-tight" title="Original Medicine Price">{formatCurrency(expectedTotal)}</span>
                                                    {isLoss && (
                                                        <p className="text-[10px] text-gray-500 font-medium mt-0.5">Sold at: {formatCurrency(actualSoldTotal)}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 whitespace-nowrap text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-bold text-emerald-600 tracking-tight">ETB {(parseFloat(tx.amount_paid) || 0).toFixed(2)}</span>
                                                        {actualSoldTotal > (parseFloat(tx.amount_paid) || 0) && (
                                                            <span className="text-amber-600 font-bold text-[10px] tracking-tight mt-0.5 flex items-center justify-end gap-1" title="Unpaid Debt">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                                Debt: ETB {(actualSoldTotal - (parseFloat(tx.amount_paid) || 0)).toFixed(2)}
                                                            </span>
                                                        )}
                                                        {isLoss && (
                                                            <span className="text-rose-600 font-black text-[10px] tracking-tight mt-1 flex items-center justify-end gap-1" title="Net Loss from Sale">
                                                                <AlertTriangle size={11} className="text-rose-600" />
                                                                Loss: ETB {Math.abs(profitOrLoss).toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-right whitespace-nowrap print:hidden">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => openDetail(tx)}
                                                            className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-blue-50/80 text-blue-700 hover:bg-blue-100/80 text-[11px] font-bold transition-all cursor-pointer"
                                                            title="View Details"
                                                        >
                                                            <Eye size={12} /> View
                                                        </button>
                                                        <button
                                                            onClick={() => openInvoice(tx)}
                                                            className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 text-[11px] font-bold transition-all cursor-pointer"
                                                            title="View Invoice Receipt"
                                                        >
                                                            <Printer size={12} /> Invoice
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(tx)}
                                                            className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-amber-50/80 text-amber-700 hover:bg-amber-100/80 text-[11px] font-bold transition-all cursor-pointer"
                                                            title="Edit / re-open in Sales"
                                                        >
                                                            <Pencil size={12} /> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(tx)}
                                                            className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-rose-50/80 text-rose-700 hover:bg-rose-100/80 text-[11px] font-bold transition-all cursor-pointer"
                                                            title="Delete transaction"
                                                        >
                                                            <Trash2 size={12} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && !searchQuery && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                            <p className="text-sm text-gray-500">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    const pageNum = Math.min(Math.max(1, page - 2), totalPages - 4) + i;
                                    if (pageNum < 1 || pageNum > totalPages) return null;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${page === pageNum ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-700 hover:bg-white'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b-2 border-blue-600/20 bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500 uppercase tracking-widest">Transaction Details</h3>
                                {selectedTx && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter">Receipt #{selectedTx.invoice_number}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                        <span className="text-xs text-gray-500 font-medium">{new Date(getTimestamp(selectedTx)).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {detailLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : selectedTx ? (
                            <div className="overflow-y-auto p-5 space-y-5">
                                {/* Meta info */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                                        <p className="text-[10px] text-blue-600 uppercase font-black tracking-widest mb-1">Date & Time</p>
                                        <p className="text-sm font-bold text-gray-800">{formatDateTime(getTimestamp(selectedTx))}</p>
                                    </div>
                                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                                        <p className="text-[10px] text-blue-600 uppercase font-black tracking-widest mb-1">Cashier</p>
                                        <p className="text-sm font-bold text-gray-800">{selectedTx.user?.name || '—'}</p>
                                    </div>
                                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                                        <p className="text-[10px] text-blue-600 uppercase font-black tracking-widest mb-1">Payment Method</p>
                                        <div className="flex items-center gap-1.5 pt-0.5">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                            <p className="text-sm font-bold text-gray-800 capitalize">{(selectedTx.payment_method || selectedTx.paymentMethod || '—').replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Items table */}
                                <div>
                                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <div className="w-8 h-[2px] bg-gradient-to-r from-blue-600 to-transparent"></div>
                                        Medicines List
                                    </h4>
                                    {selectedTx.items && selectedTx.items.length > 0 ? (
                                        <div className="border-2 border-blue-600/10 rounded-xl overflow-hidden shadow-sm">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gradient-to-r from-blue-600 to-emerald-500 text-white">
                                                        <th className="text-left px-5 py-3.5 text-xs font-black uppercase tracking-widest">Medicine</th>
                                                        <th className="text-center px-4 py-3.5 text-xs font-black uppercase tracking-widest">Qty</th>
                                                        <th className="text-right px-4 py-3.5 text-xs font-black uppercase tracking-widest">Unit Price</th>
                                                        <th className="text-right px-5 py-3.5 text-xs font-black uppercase tracking-widest">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {selectedTx.items.map((item, idx) => {
                                                        return (
                                                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                                <td className="px-5 py-4">
                                                                    <p className="font-bold text-gray-900">{item.medicine?.name || `Medicine #${item.medicine_id}`}</p>
                                                                    {item.medicine?.unit && (
                                                                        <p className="text-[10px] font-bold text-blue-400 mt-0.5">{item.medicine.unit}</p>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-4 text-center">
                                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 font-black text-gray-800 text-xs">
                                                                        {item.quantity}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-4 text-right text-gray-600 font-medium">{formatCurrency(item.selling_price)}</td>
                                                                <td className="px-5 py-4 text-right font-black text-gray-900">{formatCurrency(item.subtotal)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-sm text-center py-6">No item details available</p>
                                    )}
                                </div>

                                {/* Total Summary */}
                                <div className="bg-gradient-to-br from-blue-600/5 to-emerald-500/5 rounded-2xl p-6 border-2 border-blue-600/10 shadow-inner">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                            <span>Subtotal</span>
                                            <span className="text-gray-800 text-sm">{formatCurrency(selectedTx.subtotal)}</span>
                                        </div>
                                        {parseFloat(selectedTx.tax_amount) > 0 && (
                                            <div className="flex justify-between items-center text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                                <span>VAT ({selectedTx.tax_rate || 0}%)</span>
                                                <span className="text-gray-800 text-sm">{formatCurrency(selectedTx.tax_amount)}</span>
                                            </div>
                                        )}
                                        {parseFloat(selectedTx.discount_amount) > 0 && (
                                            <div className="flex justify-between items-center text-rose-500 font-bold uppercase tracking-widest text-[10px]">
                                                <span>Discount Applied</span>
                                                <span className="text-sm">-{formatCurrency(selectedTx.discount_amount)}</span>
                                            </div>
                                        )}
                                        <div className="pt-4 mt-2 border-t-2 border-dashed border-blue-600/20">
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500 uppercase tracking-[0.2em] text-[13px]">Total Payable</span>
                                                <span className="text-2xl font-black text-gray-900">{formatCurrency(selectedTx.total_amount)}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2 text-emerald-600">
                                            <span className="font-bold text-[11px] uppercase tracking-wider">Amount Received</span>
                                            <span className="font-black text-lg">{formatCurrency(selectedTx.amount_paid)}</span>
                                        </div>

                                        {parseFloat(selectedTx.change_amount) > 0 && (
                                            <div className="flex justify-between items-center pt-1 text-blue-600">
                                                <span className="font-bold text-[11px] uppercase tracking-wider">Change Returned</span>
                                                <span className="font-black">{formatCurrency(selectedTx.change_amount)}</span>
                                            </div>
                                        )}

                                        {parseFloat(selectedTx.amount_paid) < parseFloat(selectedTx.total_amount) && (
                                            <div className="flex justify-between font-bold text-rose-600 text-sm py-1 border-t border-blue-100 mt-1">
                                                <span>Remaining Balance (Debt)</span>
                                                <span>{formatCurrency(parseFloat(selectedTx.total_amount) - parseFloat(selectedTx.amount_paid))}</span>
                                            </div>
                                        )}
                                        {selectedTx.items && selectedTx.items.length > 0 && (
                                            <div className="flex justify-between pt-1">
                                                <span className="text-gray-500">Total Profit/Loss</span>
                                                <span className={`font-bold ${selectedTx.items.reduce((acc, i) => acc + (parseFloat(i.selling_price) - parseFloat(i.purchase_price)) * i.quantity, 0) >= 0
                                                    ? 'text-emerald-600' : 'text-rose-600'
                                                    }`}>
                                                    {(() => {
                                                        const p = selectedTx.items.reduce((acc, i) => acc + (parseFloat(i.selling_price) - parseFloat(i.purchase_price)) * i.quantity, 0);
                                                        return `${p >= 0 ? '+' : ''}${formatCurrency(p)}`;
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Invoice Receipt Modal */}
            {invoiceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm print:hidden" onClick={closeModal} />
                    <div className="relative bg-white rounded shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in border border-gray-100 print:shadow-none print:border-none print:bg-transparent">

                        {detailLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : selectedTx ? (
                            <div className="overflow-y-auto overflow-x-hidden p-4 sm:p-12 rounded bg-white no-scrollbar">
                                <style>{`
                                    .no-scrollbar::-webkit-scrollbar { display: none; }
                                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                                `}</style>
                                <div className="print:hidden">
                                    {/* Invoice Header */}
                                    <div className="text-center mb-6 pt-2">
                                        {/* Logo Placeholder */}
                                        <div className="flex justify-center mb-3">
                                            <div className="w-14 h-14 bg-white flex flex-col items-center justify-center">
                                                <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800"><path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-3v13"></path><path d="M9 14h2"></path></svg>
                                            </div>
                                        </div>
                                        <h2 className="text-[28px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500 uppercase tracking-wider mb-1 mt-2">INVOICE</h2>
                                        <p className="text-gray-500 text-[13px] font-medium tracking-wide">POS Billing System</p>
                                    </div>

                                    <div className="border-b-2 border-blue-600 mb-6 sm:mb-8"></div>

                                    {/* Invoice Details Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-10">
                                        <div className="bg-gray-50/70 p-4 sm:p-5 rounded-lg border border-gray-100/50">
                                            <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-y-3 text-[12px] sm:text-[13px]">
                                                <span className="text-blue-600 font-bold">Invoice Number:</span>
                                                <span className="text-gray-800 font-medium">{selectedTx.invoice_number}</span>
                                                <span className="text-blue-600 font-bold">Date:</span>
                                                <span className="text-gray-800 font-medium">{new Date(getTimestamp(selectedTx)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                                <span className="text-blue-600 font-bold">Time:</span>
                                                <span className="text-gray-800 font-medium">{new Date(getTimestamp(selectedTx)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
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

                                    {/* Items Table */}
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
                                                {selectedTx.items && selectedTx.items.length > 0 ? (
                                                    selectedTx.items.map((item, idx) => (
                                                        <tr key={idx} className="border-b border-gray-200 last:border-0 hover:bg-slate-50 transition-colors">
                                                            <td className="px-3 sm:px-5 py-3.5 text-gray-800 font-medium truncate" title={item.medicine?.name || `Product #${item.medicine_id}`}>{item.medicine?.name || `Product #${item.medicine_id}`}</td>
                                                            <td className="px-2 sm:px-5 py-3.5 text-gray-800 font-bold whitespace-nowrap">{parseFloat(item.selling_price).toFixed(0)}</td>
                                                            <td className="px-1 sm:px-5 py-3.5 text-center text-gray-800 font-bold">{item.quantity}</td>
                                                            <td className="px-3 sm:px-5 py-3.5 text-right text-gray-800 font-black whitespace-nowrap">{parseFloat(item.subtotal).toFixed(0)}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="4" className="px-5 py-8 text-center text-gray-500 italic">No items on this invoice</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            <tfoot className="border-t border-gray-200 bg-gray-50/50">
                                                <tr>
                                                    <td colSpan="4" className="px-5 py-1"></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* Summary Section */}
                                    <div className="flex justify-end mb-10">
                                        <div className="w-full sm:w-[300px] space-y-3.5">
                                            <div className="flex justify-between items-center text-gray-700 text-[13px]">
                                                <span className="font-semibold">Subtotal:</span>
                                                <span>{formatCurrency(selectedTx.subtotal)}</span>
                                            </div>
                                            {parseFloat(selectedTx.discount_amount) > 0 && (
                                                <div className="flex justify-between items-center text-gray-700 text-[13px]">
                                                    <span className="font-semibold">
                                                        Discount{selectedTx.discount_type === 'percentage' ? ` (${selectedTx.discount_value}%)` : ''}:
                                                    </span>
                                                    <span>-{formatCurrency(selectedTx.discount_amount)}</span>
                                                </div>
                                            )}
                                            {parseFloat(selectedTx.tax_amount) > 0 && (
                                                <div className="flex justify-between items-center text-gray-700 text-[13px]">
                                                    <span className="font-semibold">VAT:</span>
                                                    <span>{formatCurrency(selectedTx.tax_amount)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-2">
                                                <span className="font-bold text-blue-600 text-[15px]">Total Amount:</span>
                                                <span className="font-black text-blue-700 text-lg">{formatCurrency(selectedTx.total_amount)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Method Box */}
                                    <div className="bg-blue-50/60 border-l-[3px] border-blue-600 px-4 py-2.5 mb-10 w-fit rounded-r flex items-center gap-2 shadow-sm">
                                        <span className="font-bold text-gray-800 text-[13px]">Payment Method:</span>
                                        <span className="text-blue-700 capitalize font-medium text-[13px]">{(selectedTx.payment_method || selectedTx.paymentMethod || '—').replace('_', ' ')}</span>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-8 print:hidden pt-4">
                                        <button
                                            onClick={() => window.print()}
                                            className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white text-[13px] font-bold rounded shadow-sm transition-colors cursor-pointer tracking-wide"
                                        >
                                            Print Invoice
                                        </button>
                                        <button
                                            onClick={closeModal}
                                            className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white text-[13px] font-bold rounded shadow-sm transition-colors cursor-pointer tracking-wide"
                                        >
                                            Back to Invoices
                                        </button>
                                    </div>
                                </div>
                                <InvoiceReceipt data={selectedTx} />
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setDeleteConfirm(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center">
                                <AlertTriangle size={28} className="text-rose-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Delete Transaction?</h3>
                            <p className="text-sm text-gray-500">
                                Are you sure you want to delete transaction{' '}
                                <span className="font-mono font-bold text-gray-800">{deleteConfirm.invoice_number}</span>?
                                <br />

                            </p>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={deleting}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {deleting
                                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        : <><Trash2 size={15} /> Delete</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
