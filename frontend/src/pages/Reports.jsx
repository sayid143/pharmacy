// src/pages/Reports.jsx
import { useState, useEffect } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import {
    BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    TrendingUp, DollarSign, ShoppingCart, Download, Calendar,
    ArrowUpRight, ArrowDownRight, Loader2, Printer
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// ────────────────────────────────────────────────
// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-md px-5 py-4 rounded-xl border border-gray-200 shadow-xl text-sm min-w-[220px]">
                <p className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">{label}</p>
                {payload.map((entry, index) => (
                    <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4 py-1">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-gray-700">{entry.name}</span>
                        </div>
                        <span className="font-medium text-gray-900">
                            ETB {Number(entry.value).toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

// ────────────────────────────────────────────────
// Main Reports Component
const VERSION = "1.0.4-STABLE";

export default function Reports() {
    const [data, setData] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('today'); // today | week | month | custom
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });
    const [selectedMonthDate, setSelectedMonthDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isReportsFullMonth, setIsReportsFullMonth] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const transactionsPerPage = 20;

    useEffect(() => {
        setCurrentPage(1);
    }, [data]);

    const fetchReports = async () => {
        if (data) setRefreshing(true);
        else setInitialLoading(true);

        try {
            let endpoint = '/reports/custom';
            const params = {};
            const now = new Date();

            const parseDateLocal = (ds) => {
                if (!ds) return now;
                const [y, m, d] = ds.split('-').map(Number);
                return new Date(y, m - 1, d || 1);
            };

            if (filter === 'today') {
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                params.start = start.toISOString();
                params.end = end.toISOString();
            } else if (filter === 'week') {
                const start = new Date(now);
                start.setDate(now.getDate() - now.getDay());
                start.setHours(0, 0, 0, 0);
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                params.start = start.toISOString();
                params.end = end.toISOString();
            } else if (filter === 'month') {
                const d = selectedMonthDate ? parseDateLocal(selectedMonthDate) : now;
                if (isReportsFullMonth) {
                    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
                    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
                    params.start = start.toISOString();
                    params.end = end.toISOString();
                } else {
                    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
                    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
                    params.start = start.toISOString();
                    params.end = end.toISOString();
                }
            } else if (filter === 'custom' && dateRange.start && dateRange.end) {
                const dStart = parseDateLocal(dateRange.start);
                dStart.setHours(0, 0, 0, 0);
                const dEnd = parseDateLocal(dateRange.end);
                dEnd.setHours(23, 59, 59, 999);
                params.start = dStart.toISOString();
                params.end = dEnd.toISOString();
            }

            console.log(`[Reports] Fetching from ${endpoint}`, params);
            const res = await api.get(endpoint, { params });
            setData(res.data.data);
        } catch (err) {
            toast.error('Failed to load reports');
            console.error('[Reports] Error:', err);
        } finally {
            setInitialLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [filter, dateRange, selectedMonthDate, isReportsFullMonth]);

    const summary = data?.summary || {};
    const salesTrend = data?.sales_trend || [];
    const topMedicines = data?.top_medicines || [];
    const paymentBreakdown = data?.payment_breakdown || [];

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        if (!data?.recent_transactions || data.recent_transactions.length === 0) {
            toast.error('No transaction data to export');
            return;
        }

        const headers = ['Date', 'Invoice', 'Customer', 'Medicines', 'Quantities', 'Amount', 'Payment Method'];
        const rows = data.recent_transactions.map(t => {
            const dateStr = t.date ? format(new Date(t.date), 'yyyy-MM-dd') : 'N/A';
            const customer = `${t.customer_name || 'Walk-in'}`.replace(/,/g, '');
            const medicineNames = (t.items || []).map(i => i.name).join(' | ') || t.medicines || '';
            const quantities = (t.items || []).map(i => i.quantity).join(' | ');
            return [dateStr, t.invoice_number, customer, `"${medicineNames}"`, `"${quantities}"`, t.total_amount, t.payment_method].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `transactions_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Data exported successfully');
    };

    const trendData = (salesTrend || []).map(item => {
        const dateObj = typeof item.date === 'string' ? parseISO(item.date) : new Date(item.date);
        return {
            date: format(dateObj, 'MMM dd'),
            revenue: Number(item.revenue) || 0,
            profit: Number(item.profit) || 0,
        };
    });

    const allTransactions = data?.recent_transactions || [];
    const transactionsTotal = Number(summary.actual_collected || 0);
    const grossRevenueTotal = allTransactions.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

    const indexOfLast = currentPage * transactionsPerPage;
    const indexOfFirst = indexOfLast - transactionsPerPage;
    const totalPages = Math.ceil(allTransactions.length / transactionsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    if (initialLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                    <p className="mt-4 text-gray-600">Loading business insights...</p>
                    <p className="text-xs text-gray-400 mt-2">v{VERSION}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12 print:bg-white print:pb-0 print:block">
            <style type="text/css" media="print">
                {`
                    @media print {
                        @page { 
                            size: A4 landscape; 
                            margin: 15mm;
                            margin-bottom: 5mm;
                        }
                        body { 
                            -webkit-print-color-adjust: exact !important; 
                            print-color-adjust: exact !important; 
                            background-color: white !important;
                            width: 100% !important;
                            height: auto !important;
                            overflow: visible !important;
                        }
                        .print-no-break { break-inside: avoid !important; }
                        /* Key Fix: Ensure no parent container clips multi-page printing */
                        .print-only-container {
                            display: none !important;
                        }
                        @media print {
                            .print-only-container {
                                display: block !important;
                                width: 100% !important;
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            * { overflow: visible !important; }
                        }
                        ::-webkit-scrollbar { display: none !important; }
                    }
                `}
            </style>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:m-0 print:max-w-none print:overflow-visible">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 print:mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                        <p className="text-gray-600 mt-2 print:hidden">Real-time business performance and financial insights</p>
                        <p className="hidden print:block text-gray-600 mt-1">Report Generated on: {format(new Date(), 'MMM dd, yyyy')}</p>
                        <p className="hidden print:block text-gray-600 font-medium tracking-tight">Period: {filter === 'today' ? 'Today' : filter === 'week' ? 'This Week' : filter === 'month' ? (isReportsFullMonth ? 'This Month' : selectedMonthDate) : `${dateRange.start} to ${dateRange.end}`}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 print:hidden">
                        {['today', 'week', 'month', 'custom'].map((type) => (
                            <button
                                key={type}
                                onClick={() => {
                                    setFilter(type);
                                    if (type === 'month') setIsReportsFullMonth(true);
                                }}
                                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${filter === type
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {type === 'today' ? 'Today' : type === 'week' ? 'This Week' : type === 'month' ? 'This Month' : 'Custom Range'}
                            </button>
                        ))}

                        {filter === 'month' && (
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm animate-fade-in transition-all">
                                <span className="text-xs font-bold text-gray-400 uppercase">Pick Month:</span>
                                <div className="relative flex items-center gap-2">
                                    <Calendar size={14} className="text-gray-400" />
                                    <input
                                        type="date"
                                        value={selectedMonthDate}
                                        onChange={e => {
                                            setSelectedMonthDate(e.target.value);
                                            setIsReportsFullMonth(false);
                                        }}
                                        className="border-none text-sm outline-none font-medium bg-transparent"
                                    />
                                    {!isReportsFullMonth && (
                                        <button
                                            onClick={() => setIsReportsFullMonth(true)}
                                            className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold hover:bg-blue-100 transition-colors border border-blue-100 whitespace-nowrap"
                                        >
                                            Full Month
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {filter === 'custom' && (
                            <div className="flex gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                                <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="text-sm outline-none" />
                                <span className="text-gray-400">to</span>
                                <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="text-sm outline-none" />
                            </div>
                        )}

                        <button onClick={handleExport} className="p-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors" title="Export CSV">
                            <Download size={18} />
                        </button>
                        <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 border border-transparent rounded-lg text-white hover:bg-blue-700 shadow-sm transition-all font-bold text-sm" title="Print Report">
                            <Printer size={18} />
                            <span>Print Report</span>
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 print:grid-cols-5 print:gap-3 print:mb-8">
                    <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-blue-600 p-4 print:p-4 print:border-l-2">
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Revenue (Gross)</p>
                        <p className="text-xl font-black text-gray-900 mt-1 print:text-[14pt]">ETB {Number(summary.total_revenue || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-emerald-600 p-4 print:p-4 print:border-l-2">
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Net Profit</p>
                        <p className="text-xl font-black text-gray-900 mt-1 print:text-[14pt]">ETB {Number(summary.net_profit || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-amber-600 p-4 print:p-4 print:border-l-2">
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Total Sales</p>
                        <p className="text-xl font-black text-gray-900 mt-1 print:text-[14pt]">{summary.total_transactions || 0}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-red-600 p-4 print:p-4 print:border-l-2">
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Expenses</p>
                        <p className="text-xl font-black text-gray-900 mt-1 print:text-[14pt]">ETB {Number(summary.total_expenses || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-rose-600 p-4 print:p-4 print:border-l-2">
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Loss</p>
                        <p className="text-xl font-black text-gray-900 mt-1 print:text-[14pt]">ETB {Number(summary.total_loss || 0).toLocaleString()}</p>
                    </div>
                </div>

                {/* Debt & Reconciliation Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 print:grid-cols-4 print:gap-3 print:mb-8">
                    <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-emerald-600 p-4 print:p-4 print:border-l-2">
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Actual Collected (Received)</p>
                        <p className="text-xl font-black text-green-600 mt-1 print:text-[14pt]">ETB {Number(summary.actual_collected || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-red-600 p-4 print:p-4 print:border-l-2">
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Full Debt (0 Paid)</p>
                        <p className="text-xl font-black text-red-600 mt-1 print:text-[14pt]">ETB {Number(summary.full_debt || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-orange-500 p-4 print:p-4 print:border-l-2">
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Partial Debt</p>
                        <p className="text-xl font-black text-orange-500 mt-1 print:text-[14pt]">ETB {Number(summary.partial_debt || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-red-600 p-4 print:p-4 print:border-l-2">
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Total Uncollected</p>
                        <p className="text-xl font-black text-gray-900 mt-1 print:text-[14pt]">ETB {Number(summary.total_uncollected_debt || 0).toLocaleString()}</p>
                    </div>
                </div>

                {/* Charts Area (Only first chart on print) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 print:block print:mb-12">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 print:border-gray-200">
                        <h3 className="text-lg font-semibold mb-6">Sales Trend</h3>
                        <div className="h-64 sm:h-80">
                            <ResponsiveContainer>
                                <AreaChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 print:border-gray-200 break-inside-avoid">
                        <h3 className="text-lg font-semibold mb-6">Payment Methods (Collected)</h3>
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="h-48 sm:h-64 flex-1 print:hidden">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="total">
                                            {paymentBreakdown.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 overflow-x-auto w-full">
                                <table className="w-full text-sm text-left border-collapse border border-gray-100">
                                    <thead className="bg-[#e6f4fe] text-sky-700 capitalize tracking-wide text-[12px] font-semibold">
                                        <tr>
                                            <th className="px-4 py-2 border-b">Method</th>
                                            <th className="px-4 py-2 text-right border-b">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {paymentBreakdown.length > 0 ? (
                                            paymentBreakdown.map((p, idx) => (
                                                <tr key={idx} className="border-b border-gray-100">
                                                    <td className="px-4 py-3 font-medium uppercase text-gray-700">
                                                        {p.name === 'credit' ? <span className="text-orange-600 font-bold">Credit</span> : p.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                        ETB {Number(p.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="2" className="px-4 py-4 text-center text-gray-400">No payment data</td></tr>
                                        )}
                                        {paymentBreakdown.length > 0 && (
                                            <tr className="bg-gray-50 border-t-2 border-gray-200">
                                                <td className="px-4 py-3 font-bold uppercase text-gray-900">Total</td>
                                                <td className="px-4 py-3 text-right font-black text-blue-700">
                                                    ETB {Number(summary.actual_collected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN TRANSACTIONS TABLE SECTION */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 relative print:border-none print:shadow-none">
                    {/* Screen View */}
                    <div className="print:hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">Transactions Summary</h3>
                            <span className="text-xs text-gray-400">Total: {allTransactions.length}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                                <thead className="bg-[#e6f4fe] text-sky-700 capitalize tracking-wide text-[13px] font-semibold sticky top-0 z-20 shadow-[0_4px_8px_-2px_rgba(0,0,0,0.05)]">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Invoice</th>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Medicines</th>
                                        <th className="px-4 py-3 text-center">Qty</th>
                                        <th className="px-4 py-3 text-right">Paid Amount</th>
                                        <th className="px-4 py-3 text-center">Payment</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {allTransactions.slice(indexOfFirst, indexOfLast).map((t) => (
                                        <tr key={t.id || t.invoice_number} className="hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                                            <td className="px-6 py-4 text-gray-700">{t.date ? format(new Date(t.date), 'MMM dd, yyyy') : 'N/A'}</td>
                                            <td className="px-6 py-4 font-bold text-gray-900">{t.invoice_number}</td>
                                            <td className="px-6 py-4 text-gray-800">{t.customer_name || 'Walk-in'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    {(t.items && t.items.length > 0) ? (
                                                        t.items.map((item, i) => (
                                                            <span key={i} className="font-bold text-gray-900 leading-tight">{item.name}</span>
                                                        ))
                                                    ) : (
                                                        <span className="font-bold text-blue-600 italic">{t.medicines}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold">
                                                {t.items?.reduce((s, i) => s + i.quantity, 0)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900 whitespace-nowrap">
                                                ETB {Number(t.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                {t.total_amount > t.amount_paid && (
                                                    <p className="text-[10px] text-orange-600 font-bold">Total: ETB {Number(t.total_amount).toLocaleString()}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center uppercase text-xs font-bold text-gray-700">
                                                {t.payment_method || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Table Footer - Screen Total */}
                                    {allTransactions.length > 0 && (
                                        <>
                                            <tr className="bg-gray-50/50 border-t border-gray-100 italic">
                                                <td colSpan="5" className="px-6 py-3 text-right font-medium text-[12px] text-gray-500">Gross Revenue (Total Sales):</td>
                                                <td className="px-6 py-3 text-right font-bold text-gray-500 text-sm whitespace-nowrap">
                                                    ETB {grossRevenueTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-6"></td>
                                            </tr>
                                            <tr className="bg-[#e6f4fe] border-t-2 border-blue-100">
                                                <td colSpan="5" className="px-6 py-6 text-right font-black uppercase tracking-widest text-[13px] text-gray-900">Total for Period:</td>
                                                <td className="px-6 py-6 text-right font-black text-blue-900 text-xl whitespace-nowrap">
                                                    ETB {transactionsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-6"></td>
                                            </tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination UI */}
                        {allTransactions.length > transactionsPerPage && (
                            <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                <div>Showing {indexOfFirst + 1} to {Math.min(indexOfLast, allTransactions.length)} of {allTransactions.length}</div>
                                <div className="flex gap-2">
                                    <button onClick={handlePrevPage} disabled={currentPage === 1} className="px-4 py-1.5 border border-gray-200 rounded-md disabled:opacity-50">Prev</button>
                                    <button onClick={handleNextPage} disabled={currentPage === totalPages} className="px-4 py-1.5 border border-gray-200 rounded-md disabled:opacity-50">Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ISOLATED PRINT-ONLY AREA: Placed outside of ALL layout containers to prevent clipping */}
            <div className="print-only-container hidden print:block !mt-10">
                <table className="w-full text-[10pt] text-left border-collapse table-fixed">
                    <thead>
                        <tr className="bg-[#e6f4fe] text-sky-700 border-b-2 border-sky-100">
                            <th className="px-2 py-3 w-[12%] text-[10pt] font-bold">Date</th>
                            <th className="px-2 py-3 w-[13%] text-[10pt] font-bold">Invoice</th>
                            <th className="px-2 py-3 w-[15%] text-[10pt] font-bold">Customer</th>
                            <th className="px-2 py-3 w-[22%] text-[10pt] font-bold">Medicines</th>
                            <th className="px-2 py-3 w-[6%] text-center text-[10pt] font-bold">Qty</th>
                            <th className="px-2 py-3 w-[15%] text-right text-[10pt] font-bold">Paid</th>
                            <th className="px-2 py-3 w-[17%] text-center text-[10pt] font-bold">Payment</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {allTransactions.map((t, idx) => (
                            <tr key={`pr-${idx}`} className="print-no-break border-b border-gray-100">
                                <td className="px-3 py-2 text-gray-700">{t.date ? format(new Date(t.date), 'MMM dd, yyyy') : 'N/A'}</td>
                                <td className="px-3 py-2 font-bold text-gray-900">{t.invoice_number}</td>
                                <td className="px-3 py-2 text-gray-800">{t.customer_name || 'Walk-in'}</td>
                                <td className="px-3 py-2">
                                    <div className="flex flex-col">
                                        {(t.items && t.items.length > 0) ? (
                                            t.items.map((item, i) => (
                                                <span key={i} className="font-bold text-gray-900 leading-tight">{item.name}</span>
                                            ))
                                        ) : (
                                            <span className="font-bold text-blue-600 italic">{t.medicines}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-center font-bold">{t.items?.reduce((s, i) => s + i.quantity, 0)}</td>
                                <td className="px-3 py-2 text-right font-bold text-black whitespace-nowrap">
                                    ETB {Number(t.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-center text-[9.5pt] uppercase font-bold text-gray-800">
                                    {t.payment_method || '—'}
                                </td>
                            </tr>
                        ))}

                        {/* THE CRITICAL SUMMARY FOOTER - Anchored to the end of the data */}
                        {allTransactions.length > 0 && (
                            <>
                                <tr className="border-t-2 border-gray-200 italic">
                                    <td colSpan="5" className="px-3 py-3 text-right font-semibold text-[10pt] text-gray-600">Gross Revenue:</td>
                                    <td className="px-3 py-3 text-right font-bold text-gray-700 text-[11pt] whitespace-nowrap">
                                        ETB {grossRevenueTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-3 py-3"></td>
                                </tr>
                                <tr className="bg-[#e6f4fe] border-t-4 border-black border-double print-no-break">
                                    <td colSpan="5" className="px-3 py-6 text-right font-black uppercase tracking-widest text-[13pt] text-gray-900">Total for Period:</td>
                                    <td className="px-3 py-6 text-right font-black text-blue-900 text-[18pt] whitespace-nowrap">
                                        ETB {transactionsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-3 py-6"></td>
                                </tr>
                                <tr className="border-none">
                                    <td colSpan="7" className="py-4 text-[9pt] text-gray-400 italic text-center">--- End of Report ---</td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}