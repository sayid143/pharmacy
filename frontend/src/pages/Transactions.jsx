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

    const closeModal = () => {
        setModalOpen(false);
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
        <div className="space-y-6 animate-fade-in pb-10 print-container">
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
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible; }
                    .print-container { position: absolute; left: 0; top: 0; width: 100%; padding: 10px; }
                    .print\\:hidden { display: none !important; }
                    .print\\:block { display: block !important; }
                    .sidebar { display: none !important; }
                    header { display: none !important; }
                    @page { margin: 10mm; size: A4 landscape; }
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
                            { key: 'daily', label: 'Daily' },
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

                    <div className="relative ml-auto">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by Invoice # or ID..."
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none w-64"
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
                        <table className="w-full text-left text-sm border-separate" style={{ borderSpacing: '0' }}>
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
                                                <span className="tracking-tight">{formatCurrency(tx.total_amount)}</span>
                                                {parseFloat(tx.discount_amount) > 0 && (
                                                    <p className="text-[10px] text-emerald-500 font-medium mt-0.5">-{formatCurrency(tx.discount_amount)} disc.</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-emerald-600 tracking-tight">ETB {(parseFloat(tx.amount_paid) || 0).toFixed(2)}</span>
                                                    {parseFloat(tx.total_amount) > (parseFloat(tx.amount_paid) || 0) && (
                                                        <span className="text-rose-600 font-bold text-[10px] tracking-tight mt-0.5 flex items-center justify-end gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                                            ETB {(parseFloat(tx.total_amount) - (parseFloat(tx.amount_paid) || 0)).toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right whitespace-nowrap print:hidden">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => openDetail(tx)}
                                                        className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-blue-50/80 text-blue-700 hover:bg-blue-100/80 text-[11px] font-bold transition-all cursor-pointer"
                                                        title="View details"
                                                    >
                                                        <Eye size={12} /> View
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

            {/* Detail Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Transaction Details</h3>
                                {selectedTx && (
                                    <p className="text-sm text-blue-600 font-mono mt-0.5">{selectedTx.invoice_number}</p>
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
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Date & Time</p>
                                        <p className="text-sm font-semibold text-gray-800">{formatDateTime(getTimestamp(selectedTx))}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Cashier</p>
                                        <p className="text-sm font-semibold text-gray-800">{selectedTx.user?.name || '—'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Payment</p>
                                        <p className="text-sm font-semibold text-gray-800 capitalize">{(selectedTx.payment_method || selectedTx.paymentMethod || '—').replace('_', ' ')}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Amount Paid</p>
                                        <p className="text-sm font-semibold text-gray-800">{formatCurrency(selectedTx.amount_paid)}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Change</p>
                                        <p className="text-sm font-semibold text-emerald-600">{formatCurrency(selectedTx.change_amount)}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Customer</p>
                                        <p className="text-sm font-semibold text-gray-800">{selectedTx.customer?.name || 'Walk-in'}</p>
                                    </div>
                                </div>

                                {/* Items table */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                        <Pill size={15} className="text-blue-600" /> Medicines Sold
                                    </h4>
                                    {selectedTx.items && selectedTx.items.length > 0 ? (
                                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-100">
                                                        <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Medicine</th>
                                                        <th className="text-center px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Qty</th>
                                                        <th className="text-right px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Buy Price</th>
                                                        <th className="text-right px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Sell Price</th>
                                                        <th className="text-right px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Subtotal</th>
                                                        <th className="text-right px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Profit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {selectedTx.items.map((item, idx) => {
                                                        const profit = (parseFloat(item.selling_price) - parseFloat(item.purchase_price)) * item.quantity;
                                                        return (
                                                            <tr key={idx} className="hover:bg-blue-50/20">
                                                                <td className="px-4 py-3">
                                                                    <p className="font-semibold text-gray-900">{item.medicine?.name || `Medicine #${item.medicine_id}`}</p>
                                                                    {item.medicine?.unit && (
                                                                        <p className="text-[11px] text-gray-400">{item.medicine.unit}</p>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-3 text-center font-bold text-gray-700">{item.quantity}</td>
                                                                <td className="px-3 py-3 text-right text-gray-500">{formatCurrency(item.purchase_price)}</td>
                                                                <td className="px-3 py-3 text-right text-gray-700 font-medium">{formatCurrency(item.selling_price)}</td>
                                                                <td className="px-3 py-3 text-right font-bold text-gray-900">{formatCurrency(item.subtotal)}</td>
                                                                <td className="px-3 py-3 text-right">
                                                                    <span className={`font-bold text-xs ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                        {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                                                                    </span>
                                                                </td>
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
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between text-gray-600">
                                            <span>Subtotal</span>
                                            <span className="font-medium">{formatCurrency(selectedTx.subtotal)}</span>
                                        </div>
                                        {parseFloat(selectedTx.tax_amount) > 0 && (
                                            <div className="flex justify-between text-gray-600">
                                                <span>VAT ({selectedTx.tax_rate}%)</span>
                                                <span className="font-medium">{formatCurrency(selectedTx.tax_amount)}</span>
                                            </div>
                                        )}
                                        {parseFloat(selectedTx.discount_amount) > 0 && (
                                            <div className="flex justify-between text-emerald-600">
                                                <span>Discount</span>
                                                <span className="font-medium">-{formatCurrency(selectedTx.discount_amount)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-blue-200">
                                            <span>Total</span>
                                            <span>{formatCurrency(selectedTx.total_amount)}</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-700 text-sm font-semibold pt-1">
                                            <span>Paid</span>
                                            <span>{formatCurrency(selectedTx.amount_paid)}</span>
                                        </div>
                                        {parseFloat(selectedTx.amount_paid) < parseFloat(selectedTx.total_amount) && (
                                            <div className="flex justify-between font-bold text-rose-600 text-sm py-1 border-t border-blue-100 mt-1">
                                                <span>Remaining Balance (Debt)</span>
                                                <span>{formatCurrency(parseFloat(selectedTx.total_amount) - parseFloat(selectedTx.amount_paid))}</span>
                                            </div>
                                        )}
                                        {selectedTx.items && selectedTx.items.length > 0 && (
                                            <div className="flex justify-between pt-1">
                                                <span className="text-gray-500">Total Profit</span>
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
        </div>
    );
}
