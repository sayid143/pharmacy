// src/pages/Reports.jsx
import { useState, useEffect } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import {
    BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    TrendingUp, DollarSign, ShoppingCart, Download, Calendar,
    ArrowUpRight, ArrowDownRight, Loader2, Printer, AlertTriangle,
    Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight, RefreshCw, Filter, Check,
    LayoutGrid, List
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import InvoiceReceipt from '../components/InvoiceReceipt';
import jsPDF from 'jspdf';
import domtoimage from 'dom-to-image-more';

const formatCurrency = (v) => `ETB ${Math.round(parseFloat(v || 0)).toLocaleString()}`;
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
const getTimestamp = (tx) => tx?.created_at || tx?.createdAt || tx?.date || null;

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

export default function Reports() {
    const { canEdit, canDelete } = useAuth();
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

    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const transactionsPerPage = 20;

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [mobileViewMode, setMobileViewMode] = useState('card'); // 'table' | 'card'

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [showColumnFilter, setShowColumnFilter] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState({
        invoice_number: true,
        user: true,
        medicine: true,
        qty: true,
        date: true,
        payment: true,
        total: true,
        paid: true,
        actions: true
    });

    const toggleColumn = (column) => {
        setVisibleColumns(prev => ({
            ...prev,
            [column]: !prev[column]
        }));
    };

    const COLUMNS = [
        { id: 'invoice_number', label: 'Invoice' },
        { id: 'user', label: 'User' },
        { id: 'medicine', label: 'Medicine' },
        { id: 'qty', label: 'Qty' },
        { id: 'date', label: 'Date & Time' },
        { id: 'payment', label: 'Payment' },
        { id: 'total', label: 'Cost Price' },
        { id: 'paid', label: 'Selling Price' },
        { id: 'actions', label: 'Actions' },
    ];

    const [todayStr, setTodayStr] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        setCurrentPage(1);
    }, [data]);

    useEffect(() => {
        const interval = setInterval(() => {
            const current = format(new Date(), 'yyyy-MM-dd');
            if (current !== todayStr) {
                setTodayStr(current);
            }
        }, 30000); // Check every 30 seconds for day transition
        return () => clearInterval(interval);
    }, [todayStr]);

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
                const dateStr = format(now, 'yyyy-MM-dd');
                params.start = dateStr;
                params.end = dateStr;
            } else if (filter === 'week') {
                const start = new Date(now);
                start.setDate(now.getDate() - now.getDay());
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                params.start = format(start, 'yyyy-MM-dd');
                params.end = format(end, 'yyyy-MM-dd');
            } else if (filter === 'month') {
                const d = selectedMonthDate ? parseDateLocal(selectedMonthDate) : now;
                if (isReportsFullMonth) {
                    const start = new Date(d.getFullYear(), d.getMonth(), 1);
                    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    params.start = format(start, 'yyyy-MM-dd');
                    params.end = format(end, 'yyyy-MM-dd');
                } else {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    params.start = dateStr;
                    params.end = dateStr;
                }
            } else if (filter === 'custom' && dateRange.start && dateRange.end) {
                params.start = dateRange.start;
                params.end = dateRange.end;
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
    }, [filter, dateRange, selectedMonthDate, isReportsFullMonth, todayStr]);

    const openDetail = async (tx) => {
        setModalOpen(true);
        setSelectedTx({ ...tx, items: null });
        setDetailLoading(true);
        try {
            if (String(tx.id).startsWith('p-')) {
                setSelectedTx({ ...tx });
            } else {
                const { data } = await api.get(`/sales/${tx.id}`);
                setSelectedTx({ ...data.data });
            }
        } catch (e) { }
        finally { setDetailLoading(false); }
    };

    const closeModal = () => {
        setModalOpen(false);
        setInvoiceModalOpen(false);
        setSelectedTx(null);
    };

    const handleEdit = async (tx) => {
        if (String(tx.id).startsWith('p-')) {
            toast.error('Debt payments cannot be edited here');
            return;
        }
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
            if (String(deleteConfirm.id).startsWith('p-')) {
                toast.error('Debt payment deletion not supported yet');
            } else {
                await api.delete(`/sales/${deleteConfirm.id}`);
                toast.success('Transaction deleted successfully');
                fetchReports();
            }
            setDeleteConfirm(null);
        } catch (e) {
            toast.error('Failed to delete transaction');
        } finally {
            setDeleting(false);
        }
    };

    const summary = data?.summary || {};
    const salesTrend = data?.sales_trend || [];
    const paymentBreakdown = data?.payment_breakdown || [];

    const getReportDateString = () => {
        const now = new Date();
        if (filter === 'today') {
            return `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
        } else if (filter === 'week') {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return `${start.getDate()}-${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
        } else if (filter === 'month') {
            const [y, m, d] = (selectedMonthDate || format(now, 'yyyy-MM-dd')).split('-').map(Number);
            if (isReportsFullMonth) {
                const endDay = new Date(y, m, 0).getDate();
                return `1-${endDay}/${m}/${y}`;
            } else {
                return `${d}/${m}/${y}`;
            }
        } else if (filter === 'custom' && dateRange.start && dateRange.end) {
            const [sy, sm, sd] = dateRange.start.split('-').map(Number);
            const [ey, em, ed] = dateRange.end.split('-').map(Number);
            if (sm === em && sy === ey) {
                return `${sd}-${ed}/${em}/${ey}`;
            }
            return `${sd}/${sm}/${sy} - ${ed}/${em}/${ey}`;
        }
        return `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = async () => {
        toast('PDF Download is temporarily disabled.', { icon: 'ℹ️' });
        /*
        if (!data?.recent_transactions || data.recent_transactions.length === 0) {
            toast.error('No transaction data to export');
            return;
        }

        const toastId = toast.loading('Generating PDF format...');

        try {
            const originalElement = document.getElementById('report-main-container');
            if (!originalElement) throw new Error("Report container not found.");

            const clone = originalElement.cloneNode(true);

            clone.id = 'pdf-clone-container';
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = '1100px';
            clone.style.backgroundColor = '#ffffff';

            const mainUI = clone.querySelector('#main-table-ui');
            if (mainUI) mainUI.style.display = 'none';

            const filterBtns = clone.querySelector('#filter-buttons');
            if (filterBtns) filterBtns.style.display = 'none';

            const printTable = clone.querySelector('.print-only-container');
            if (printTable) {
                printTable.classList.remove('hidden');
                printTable.style.display = 'block';
            }

            const printDates = clone.querySelectorAll('.print\\:block');
            printDates.forEach(el => {
                if (el && el.classList) {
                    el.classList.remove('hidden');
                    el.style.display = 'block';
                }
            });

            const subtitles = clone.querySelectorAll('.print\\:hidden');
            subtitles.forEach(el => {
                if (el) el.style.display = 'none';
            });

            const kpiCards = clone.querySelector('#kpi-cards');
            if (kpiCards) {
                kpiCards.className = "grid grid-cols-4 gap-4 mb-8";
            }

            const netIncome = clone.querySelector('#net-income-card');
            if (netIncome) {
                netIncome.className = "grid grid-cols-1 gap-4 mb-8";
            }

            const charts = clone.querySelector('#charts-container');
            if (charts) {
                charts.className = "grid grid-cols-2 gap-8 mb-12";

                // CRITICAL FIX: Recharts uses React ResizeObserver which breaks in isolated clones.
                // We copy the already-painted SVG innerHTML from the real DOM so it is perfectly sized.
                const liveCharts = originalElement.querySelector('#charts-container');
                if (liveCharts) {
                    charts.innerHTML = liveCharts.innerHTML;
                }
            }

            // CRITICAL FIX: dom-to-image fails to parse Tailwind v4 oklch() colors, 
            // falling back to ugly black borders. We explicitly inline hex values here.
            clone.querySelectorAll('*').forEach(el => {
                // Prevent scrollbars in the screenshot
                if (el.classList.contains('overflow-x-auto') || el.classList.contains('overflow-y-auto')) {
                    el.style.overflow = 'visible';
                    el.style.overflowX = 'visible';
                    el.style.overflowY = 'visible';
                }

                // Inline standard borders
                if (el.classList.contains('border-gray-100')) el.style.borderColor = '#f3f4f6';
                if (el.classList.contains('border-gray-200')) el.style.borderColor = '#e5e7eb';
                if (el.classList.contains('border-gray-300')) el.style.borderColor = '#d1d5db';
                if (el.classList.contains('border-blue-600')) el.style.borderColor = '#2563eb';

                // Inline accent left borders (KPI Cards)
                if (el.classList.contains('border-l-emerald-600')) el.style.borderLeftColor = '#059669';
                if (el.classList.contains('border-l-blue-600')) el.style.borderLeftColor = '#2563eb';
                if (el.classList.contains('border-l-amber-600')) el.style.borderLeftColor = '#d97706';
                if (el.classList.contains('border-l-red-600')) el.style.borderLeftColor = '#dc2626';

                // Inline text colors
                if (el.classList.contains('text-green-600')) el.style.color = '#16a34a';
                if (el.classList.contains('text-blue-600')) el.style.color = '#2563eb';
                if (el.classList.contains('text-gray-500')) el.style.color = '#6b7280';
                if (el.classList.contains('text-gray-900')) el.style.color = '#111827';
                if (el.classList.contains('text-sky-700')) el.style.color = '#0369a1';

                // Inline backgrounds
                if (el.classList.contains('bg-white')) el.style.backgroundColor = '#ffffff';
                if (el.classList.contains('bg-[#e6f4fe]')) el.style.backgroundColor = '#e6f4fe';
                if (el.classList.contains('bg-gray-50')) el.style.backgroundColor = '#f9fafb';

                // Fix table cell styling which might lose context
                if (el.tagName === 'TH') {
                    el.style.backgroundColor = '#e6f4fe';
                    el.style.color = '#0369a1';
                    el.style.borderColor = '#e5e7eb';
                    el.style.borderWidth = '1px';
                    el.style.borderStyle = 'solid';
                }
                if (el.tagName === 'TD') {
                    el.style.borderColor = '#e5e7eb';
                    el.style.borderWidth = '1px';
                    el.style.borderStyle = 'solid';
                }
            });

            document.body.appendChild(clone);

            // Wait for styles to settle
            await new Promise(resolve => setTimeout(resolve, 300));

            const scrollHeight = clone.scrollHeight;
            clone.style.height = `${scrollHeight}px`;

            const dataUrl = await domtoimage.toPng(clone, {
                quality: 1.0,
                width: 1100,
                height: scrollHeight,
                bgcolor: '#ffffff',
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left',
                    margin: '0',
                    padding: '20px'
                }
            });

            document.body.removeChild(clone);

            // Generate multi-page PDF
            const doc = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = (scrollHeight * pdfWidth) / 1100;

            let position = 0;
            let pageHeight = doc.internal.pageSize.getHeight();
            let imgHeight = pdfHeight;

            doc.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
            imgHeight -= pageHeight;

            while (imgHeight > 0) {
                position -= pageHeight;
                doc.addPage();
                doc.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
                imgHeight -= pageHeight;
            }

            const safeDate = format(new Date(), 'yyyy-MM-dd');
            doc.save(`report-${safeDate}.pdf`);

            toast.success('Report downloaded successfully as PDF', { id: toastId });

        } catch (error) {
            console.error('PDF Generation Error:', error);
            toast.error('Failed to generate PDF', { id: toastId });

            const clone = document.getElementById('pdf-clone-container');
            if (clone) document.body.removeChild(clone);
        }
        */
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
        <>
            <div id="report-main-container" className={`min-h-screen bg-gray-50 pb-12 print:bg-white print:pb-0`}>
                <style type="text/css" media="print">
                    {`
                        @media print {
                            body { 
                                background-color: white !important;
                                -webkit-print-color-adjust: exact !important; 
                                print-color-adjust: exact !important; 
                            }
                            .print\\:hidden { display: none !important; }
                            .print\\:block { display: block !important; }

                            ${!invoiceModalOpen ? `
                            @page { 
                                size: A4 landscape; 
                                margin: 15mm;
                                margin-bottom: 5mm;
                            }
                            body { 
                                width: 100% !important;
                                height: auto !important;
                                overflow: visible !important;
                            }
                            .print-no-break { break-inside: avoid !important; }
                            .print-only-container {
                                display: block !important;
                                width: 100% !important;
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            * { overflow: visible !important; }
                            ::-webkit-scrollbar { display: none !important; }
                            ` : `
                            @page { 
                                size: portrait; 
                                margin: 10mm;
                            }
                            .fixed, .absolute { position: relative !important; }
                            `}
                        }
                    `}
                </style>

                <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:m-0 print:max-w-none print:overflow-visible`}>
                    <div className={invoiceModalOpen ? 'print:hidden' : ''}>
                        {/* Header Section */}
                        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 print:mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                                <p className="text-gray-600 mt-2 print:hidden">Real-time business performance and financial insights</p>
                                <p className="hidden print:block text-gray-900 font-bold text-lg mt-1">{getReportDateString()}</p>
                            </div>

                            <div id="filter-buttons" className="flex flex-wrap items-center gap-3 print:hidden">
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

                                {/* <button onClick={handleExport} className="p-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors" title="Export PDF">
                                    <Download size={18} />
                                </button> */}
                                <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 border border-transparent rounded-lg text-white hover:bg-blue-700 shadow-sm transition-all font-bold text-sm" title="Print Report">
                                    <Printer size={18} />
                                    <span>Print</span>
                                </button>
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div id="kpi-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 print:grid-cols-4 print:gap-3 print:mb-8">
                            <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-blue-600 p-4 print:p-4 print:border-l-2">
                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Total Income</p>
                                <p className="text-xl font-black text-gray-900 mt-1 print:text-[14pt]">{formatCurrency(summary.total_revenue)}</p>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-emerald-600 p-4 print:p-4 print:border-l-2">
                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Total Profit</p>
                                <p className="text-xl font-black text-gray-900 mt-1 print:text-[14pt]">{formatCurrency(summary.net_profit)}</p>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-amber-600 p-4 print:p-4 print:border-l-2">
                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Total Sales</p>
                                <p className="text-xl font-black text-gray-900 mt-1 print:text-[14pt]">{summary.total_transactions || 0}</p>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-red-600 p-4 print:p-4 print:border-l-2">
                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Total Expenses</p>
                                <p className="text-xl font-black text-gray-900 mt-1 print:text-[14pt]">{formatCurrency(summary.total_expenses)}</p>
                            </div>
                        </div>

                        <div id="net-income-card" className="grid grid-cols-1 gap-4 mb-8 print:mb-8">
                            <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-emerald-600 p-4 print:p-4 print:border-l-2">
                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider print:text-[10pt]">Net Income</p>
                                <p className="text-xl font-black text-green-600 mt-1 print:text-[14pt]">{formatCurrency(summary.actual_collected)}</p>
                            </div>
                        </div>

                        <div id="charts-container" className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 print:block print:mb-12">
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
                                                    paymentBreakdown
                                                        .filter(p => p.name.toLowerCase() !== 'credit')
                                                        .map((p, idx) => (
                                                            <tr key={idx} className="border-b border-gray-100">
                                                                <td className="px-4 py-3 font-medium uppercase text-gray-700">
                                                                    {p.name}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                                    ETB {Number(p.total).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                                </td>
                                                            </tr>
                                                        ))
                                                ) : (
                                                    <tr><td colSpan="2" className="px-4 py-4 text-center text-gray-400">No payment data</td></tr>
                                                )}
                                                {paymentBreakdown.filter(p => p.name.toLowerCase() !== 'credit').length > 0 && (
                                                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                                                        <td className="px-4 py-3 font-bold uppercase text-gray-900">Total</td>
                                                        <td className="px-4 py-3 text-right font-black text-blue-700">
                                                            ETB {paymentBreakdown
                                                                .filter(p => p.name.toLowerCase() !== 'credit')
                                                                .reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 relative print:border-none print:shadow-none">
                            <div id="main-table-ui" className="print:hidden">
                                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
                                    <h3 className="text-lg font-semibold text-gray-900">Transactions Summary</h3>
                                    <div className="flex items-center gap-2 sm:gap-4">
                                        {/* Mobile View Selector */}
                                        {isMobile && (
                                            <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100 shadow-sm mr-2">
                                                <button
                                                    onClick={() => setMobileViewMode('table')}
                                                    className={`p-2 rounded-lg transition-all flex items-center gap-2 ${mobileViewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                    title="Table View"
                                                >
                                                    <List size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setMobileViewMode('card')}
                                                    className={`p-2 rounded-lg transition-all flex items-center gap-2 ${mobileViewMode === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                    title="Card View"
                                                >
                                                    <LayoutGrid size={18} />
                                                </button>
                                            </div>
                                        )}
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowColumnFilter(!showColumnFilter)}
                                                className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-gray-100 shadow-sm"
                                                title="Column Visibility"
                                            >
                                                <Filter size={20} />
                                            </button>

                                            {showColumnFilter && (
                                                <>
                                                    <div className="fixed inset-0 z-30" onClick={() => setShowColumnFilter(false)} />
                                                    <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-40 animate-fade-in py-2">
                                                        <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Display Columns</span>
                                                        </div>
                                                        <div className="max-h-[300px] overflow-y-auto px-1">
                                                            {COLUMNS.map(col => (
                                                                <button
                                                                    key={col.id}
                                                                    onClick={() => toggleColumn(col.id)}
                                                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
                                                                >
                                                                    <span className={`text-[13px] font-medium ${visibleColumns[col.id] ? 'text-gray-900' : 'text-gray-400'}`}>
                                                                        {col.label}
                                                                    </span>
                                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${visibleColumns[col.id]
                                                                        ? 'bg-blue-600 border-blue-600 shadow-sm'
                                                                        : 'bg-white border-gray-200'
                                                                        }`}>
                                                                        {visibleColumns[col.id] && <Check size={12} className="text-white" />}
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400">Total: {allTransactions.length}</span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    {(!isMobile || mobileViewMode === 'table') ? (
                                        <table className="w-full text-left text-sm border-separate" style={{ borderSpacing: '0' }}>
                                            <thead className="bg-[#e6f4fe] text-sky-700 capitalize tracking-wide text-[13px] font-semibold sticky top-0 z-20 shadow-[0_4px_8px_-2px_rgba(0,0,0,0.05)]">
                                                <tr>
                                                    {visibleColumns.invoice_number && <th className="px-4 py-3 whitespace-nowrap">Invoice #</th>}
                                                    {visibleColumns.user && <th className="px-4 py-3 whitespace-nowrap">User</th>}
                                                    {visibleColumns.medicine && <th className="px-4 py-3 whitespace-nowrap">Medicine Name</th>}
                                                    {visibleColumns.qty && <th className="px-4 py-3 text-center whitespace-nowrap">Qty</th>}
                                                    {visibleColumns.date && <th className="px-4 py-3 whitespace-nowrap">Date & Time</th>}
                                                    {visibleColumns.payment && <th className="px-4 py-3 whitespace-nowrap">Payment Method</th>}
                                                    {visibleColumns.total && <th className="px-4 py-3 text-right whitespace-nowrap">Cost Price</th>}
                                                    {visibleColumns.paid && <th className="px-4 py-3 text-right whitespace-nowrap">Selling Price</th>}
                                                    {visibleColumns.actions && <th className="px-4 py-3 text-center whitespace-nowrap print:hidden">Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white text-[13px]">
                                                {allTransactions.slice(indexOfFirst, indexOfLast).map((t) => {
                                                    const rawMethod = (t.payment_method || '').toLowerCase();
                                                    const badge = PAYMENT_BADGE[rawMethod] || { label: rawMethod || '—', cls: 'bg-gray-100 text-gray-600' };

                                                    let totalCostPrice = 0;
                                                    let totalSellingPrice = 0;
                                                    if (t.items && t.items.length > 0) {
                                                        t.items.forEach(item => {
                                                            totalCostPrice += (parseFloat(item.purchase_price) || 0) * (parseInt(item.quantity) || 0);
                                                            totalSellingPrice += (parseFloat(item.selling_price) || 0) * (parseInt(item.quantity) || 0);
                                                        });
                                                    } else {
                                                        totalSellingPrice = parseFloat(t.total_amount || 0);
                                                        totalCostPrice = totalSellingPrice;
                                                    }

                                                    return (
                                                        <tr key={t.id || t.invoice_number} className="odd:bg-gray-50 even:bg-white hover:bg-gray-100/50 transition-colors [&>td]:border-b [&>td]:border-gray-200">
                                                            {visibleColumns.invoice_number && (
                                                                <td className="px-4 py-2.5 whitespace-nowrap">
                                                                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100/50">
                                                                        {t.invoice_number}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {visibleColumns.user && (
                                                                <td className="px-4 py-2.5 whitespace-nowrap text-gray-800 font-semibold">
                                                                    {t.user_name || '—'}
                                                                </td>
                                                            )}
                                                            {visibleColumns.medicine && (
                                                                <td className="px-4 py-2.5 min-w-[160px]">
                                                                    <div className="flex flex-col gap-1 whitespace-normal">
                                                                        {(t.items && t.items.length > 0) ? (
                                                                            t.items.map((item, i) => (
                                                                                <span key={i} className="font-bold text-gray-800 leading-tight">{item.name}</span>
                                                                            ))
                                                                        ) : (
                                                                            <span className="font-bold text-blue-600 italic">{t.medicines}</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            )}
                                                            {visibleColumns.qty && (
                                                                <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                                                    <span className="text-[12px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded shadow-sm min-w-[24px] inline-block">
                                                                        {t.items?.reduce((s, i) => s + i.quantity, 0) || t.quantity || 0}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {visibleColumns.date && (
                                                                <td className="px-4 py-2.5 text-gray-500 font-medium whitespace-nowrap">
                                                                    {t.date ? format(new Date(t.date), 'MMM dd, yyyy HH:mm') : '—'}
                                                                </td>
                                                            )}
                                                            {visibleColumns.payment && (
                                                                <td className="px-4 py-2.5 whitespace-nowrap">
                                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight ${badge.cls}`}>
                                                                        {badge.label}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {visibleColumns.total && (
                                                                <td className="px-4 py-2.5 font-bold text-gray-900 text-right whitespace-nowrap">
                                                                    <span>{formatCurrency(totalCostPrice)}</span>
                                                                </td>
                                                            )}
                                                            {visibleColumns.paid && (
                                                                <td className="px-4 py-2.5 whitespace-nowrap text-right font-bold text-gray-900">
                                                                    {formatCurrency(totalSellingPrice)}
                                                                </td>
                                                            )}
                                                            {visibleColumns.actions && (
                                                                <td className="px-4 py-2.5 text-center whitespace-nowrap print:hidden">
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <button onClick={() => openDetail(t)} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold transition-all cursor-pointer">
                                                                            <Eye size={14} /> View
                                                                        </button>
                                                                         <button onClick={() => { setSelectedTx(t); setInvoiceModalOpen(true); }} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold transition-all cursor-pointer">
                                                                             <Printer size={14} /> Invoice
                                                                         </button>
                                                                         {canEdit && (
                                                                             <button onClick={() => handleEdit(t)} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 text-[11px] font-bold transition-all cursor-pointer">
                                                                                 <Pencil size={14} /> Edit
                                                                             </button>
                                                                         )}
                                                                         {canDelete && (
                                                                             <button onClick={() => setDeleteConfirm(t)} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-bold transition-all cursor-pointer">
                                                                                 <Trash2 size={14} />
                                                                             </button>
                                                                         )}
                                                                     </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                                {allTransactions.length > 0 && (
                                                    <tr className="bg-white">
                                                        <td
                                                            colSpan={Object.values(visibleColumns).filter(Boolean).length}
                                                            className="px-4 py-6 text-right whitespace-nowrap relative"
                                                        >
                                                            {/* Gradient Top Border */}
                                                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-600 to-emerald-500 rounded-t-md"></div>

                                                            <span className="font-black uppercase tracking-[0.2em] text-[13px] text-gray-500 mr-8">
                                                                TOTAL:
                                                            </span>

                                                            <span className="font-black text-blue-900 text-2xl tabular-nums">
                                                                {formatCurrency(transactionsTotal)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-4 space-y-4 animate-fade-in">
                                            {allTransactions.slice(indexOfFirst, indexOfLast).map((t) => {
                                                const rawMethod = (t.payment_method || '').toLowerCase();
                                                const badge = PAYMENT_BADGE[rawMethod] || { label: rawMethod || '—', cls: 'bg-gray-100 text-gray-600' };

                                                let totalCostPrice = 0;
                                                let totalSellingPrice = 0;
                                                if (t.items && t.items.length > 0) {
                                                    t.items.forEach(item => {
                                                        totalCostPrice += (parseFloat(item.purchase_price) || 0) * (parseInt(item.quantity) || 0);
                                                        totalSellingPrice += (parseFloat(item.selling_price) || 0) * (parseInt(item.quantity) || 0);
                                                    });
                                                } else {
                                                    totalSellingPrice = parseFloat(t.total_amount || 0);
                                                    totalCostPrice = totalSellingPrice;
                                                }

                                                return (
                                                    <div key={t.id || t.invoice_number} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4 hover:shadow-md transition-all">
                                                        <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                                                            {visibleColumns.invoice_number && (
                                                                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100/50">
                                                                    #{t.invoice_number}
                                                                </span>
                                                            )}
                                                            {visibleColumns.payment && (
                                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight ${badge.cls}`}>
                                                                    {badge.label}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-[13px]">
                                                            {visibleColumns.user && (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cashier</span>
                                                                    <span className="font-bold text-gray-800">{t.user_name || '—'}</span>
                                                                </div>
                                                            )}
                                                            {visibleColumns.date && (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</span>
                                                                    <span className="text-gray-500 font-medium">{t.date ? format(new Date(t.date), 'MMM dd, HH:mm') : '—'}</span>
                                                                </div>
                                                            )}
                                                            {visibleColumns.medicine && (
                                                                <div className="flex flex-col gap-1 col-span-2">
                                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Medicines</span>
                                                                    <div className="flex flex-col gap-1">
                                                                        {(t.items && t.items.length > 0) ? (
                                                                            t.items.map((item, i) => (
                                                                                <div key={i} className="flex justify-between items-center bg-gray-50/50 p-2 rounded-lg border border-gray-100/50">
                                                                                    <span className="font-bold text-gray-800">{item.name}</span>
                                                                                    <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">x{item.quantity}</span>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <span className="font-bold text-blue-600 italic">{t.medicines}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {visibleColumns.total && (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cost Price</span>
                                                                    <span className="font-bold text-gray-900">{formatCurrency(totalCostPrice)}</span>
                                                                </div>
                                                            )}
                                                            {visibleColumns.paid && (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Selling Price</span>
                                                                    <span className="font-bold text-blue-600 text-right">{formatCurrency(totalSellingPrice)}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {visibleColumns.actions && (
                                                            <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-50">
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => openDetail(t)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold transition-all cursor-pointer">
                                                                        <Eye size={16} /> View
                                                                    </button>
                                                                    <button onClick={() => { setSelectedTx(t); setInvoiceModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold transition-all cursor-pointer">
                                                                        <Printer size={16} /> Receipt
                                                                    </button>
                                                                </div>
                                                                 <div className="flex gap-2">
                                                                     {canEdit && (
                                                                         <button onClick={() => handleEdit(t)} className="p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all cursor-pointer">
                                                                             <Pencil size={16} />
                                                                         </button>
                                                                     )}
                                                                     {canDelete && (
                                                                         <button onClick={() => setDeleteConfirm(t)} className="p-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer">
                                                                             <Trash2 size={16} />
                                                                         </button>
                                                                     )}
                                                                 </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {allTransactions.length > 0 && (
                                                <div className="bg-gradient-to-r from-blue-600 to-emerald-500 rounded-xl p-5 text-white shadow-lg shadow-blue-200">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80">Total:</span>
                                                        <span className="text-2xl font-black tabular-nums">{formatCurrency(transactionsTotal)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

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

                    {/* Detail Modal */}
                    {modalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
                            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
                                <div className="flex items-center justify-between p-6 border-b-2 border-blue-600/20 bg-gray-50/50">
                                    <div>
                                        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500 uppercase tracking-widest">Transaction Details</h3>
                                        {selectedTx && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter">Receipt #{selectedTx.invoice_number}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                                <span className="text-xs text-gray-500 font-medium">{selectedTx.date ? new Date(selectedTx.date).toLocaleDateString() : ''}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all cursor-pointer">
                                        <X size={20} />
                                    </button>
                                </div>

                                {detailLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : selectedTx ? (
                                    <div className="overflow-y-auto p-5 space-y-5">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                                                <p className="text-[10px] text-blue-600 uppercase font-black tracking-widest mb-1">Date & Time</p>
                                                <p className="text-sm font-bold text-gray-800">{selectedTx.date ? format(new Date(selectedTx.date), 'MMM dd, yyyy HH:mm') : '—'}</p>
                                            </div>
                                            <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                                                <p className="text-[10px] text-blue-600 uppercase font-black tracking-widest mb-1">Cashier</p>
                                                <p className="text-sm font-bold text-gray-800">{selectedTx.user_name || '—'}</p>
                                            </div>
                                            <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                                                <p className="text-[10px] text-blue-600 uppercase font-black tracking-widest mb-1">Payment Method</p>
                                                <p className="text-sm font-bold text-gray-800 capitalize">{(selectedTx.payment_method || '—').replace('_', ' ')}</p>
                                            </div>
                                        </div>

                                        {selectedTx.items && selectedTx.items.length > 0 && (
                                            <div className="border-2 border-blue-600/10 rounded-xl overflow-hidden shadow-sm">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gradient-to-r from-blue-600 to-emerald-500 text-white">
                                                        <tr>
                                                            <th className="text-left px-5 py-3.5 text-xs font-black uppercase tracking-widest">Medicine</th>
                                                            <th className="text-center px-4 py-3.5 text-xs font-black uppercase tracking-widest">Qty</th>
                                                            <th className="text-right px-4 py-3.5 text-xs font-black uppercase tracking-widest">Unit Price</th>
                                                            <th className="text-right px-5 py-3.5 text-xs font-black uppercase tracking-widest">Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {selectedTx.items.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-blue-50/10 transition-colors">
                                                                <td className="px-5 py-3.5 font-bold text-gray-800">{item.name}</td>
                                                                <td className="px-4 py-3.5 text-center font-black text-gray-700 bg-gray-50/50">{item.quantity}</td>
                                                                <td className="px-4 py-3.5 text-right text-gray-600 font-medium">{formatCurrency(item.selling_price)}</td>
                                                                <td className="px-5 py-3.5 text-right font-black text-blue-700">{formatCurrency(item.selling_price * item.quantity)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        <div className="bg-gradient-to-br from-blue-600/5 to-emerald-500/5 rounded-2xl p-6 border-2 border-blue-600/10 shadow-inner">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500 uppercase tracking-[0.2em] text-[13px]">Total Amount</span>
                                                <span className="text-2xl font-black text-gray-900 tabular-nums">{formatCurrency(selectedTx.total_amount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 text-emerald-600 border-t border-blue-600/5">
                                                <span className="font-bold text-[11px] uppercase tracking-wider">Amount Paid</span>
                                                <span className="font-black text-lg tabular-nums">{formatCurrency(selectedTx.amount_paid)}</span>
                                            </div>
                                            {parseFloat(selectedTx.change_amount || 0) > 0 && (
                                                <div className="flex justify-between items-center pt-1 text-blue-600">
                                                    <span className="font-bold text-[11px] uppercase tracking-wider">Change Returned</span>
                                                    <span className="font-black tabular-nums">{formatCurrency(selectedTx.change_amount)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}

                    {deleteConfirm && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 print:hidden">
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
                            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in text-center">
                                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Trash2 size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">Delete Transaction?</h3>
                                <p className="text-gray-500 mb-8">
                                    Permanent delete invoice <span className="font-bold text-gray-900">#{deleteConfirm.invoice_number}</span>? This restores stock and cannot be undone.
                                </p>
                                <div className="flex gap-4">
                                    <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-100 font-bold hover:bg-gray-50 disabled:opacity-50 transition-all">Cancel</button>
                                    <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 px-4 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                        {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                        {deleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

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
                                                                            <p className="font-bold text-gray-900">{item.name || item.medicine?.name || `Product #${item.medicine_id}`}</p>
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
                                                        <span className="text-gray-500">Total Profit</span>
                                                        <span className={`font-bold text-emerald-600`}>
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
                                                                    <td className="px-3 sm:px-5 py-3.5 text-gray-800 font-medium truncate" title={item.name || item.medicine?.name || `Product #${item.medicine_id}`}>{item.name || item.medicine?.name || `Product #${item.medicine_id}`}</td>
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
                </div>
            </div>

            <div className={`print-only-container hidden ${invoiceModalOpen ? 'print:hidden' : 'print:block'} !mt-10`}>
                <table className="w-full text-[10pt] text-left border-collapse table-fixed">
                    <thead>
                        <tr className="bg-[#e6f4fe] text-sky-700 border-b-2 border-sky-100">
                            <th className="px-2 py-3 w-[12%] font-bold">Date</th>
                            <th className="px-2 py-3 w-[13%] font-bold">Invoice</th>
                            <th className="px-2 py-3 w-[15%] font-bold">User</th>
                            <th className="px-2 py-3 w-[22%] font-bold">Medicines</th>
                            <th className="px-2 py-3 w-[6%] text-center font-bold">Qty</th>
                            <th className="px-2 py-3 w-[15%] text-right font-bold">Amount</th>
                            <th className="px-2 py-3 w-[17%] text-center font-bold">Payment</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {allTransactions.map((t, idx) => (
                            <tr key={`pr-${idx}`} className="print-no-break border-b border-gray-100">
                                <td className="px-2 py-2 text-gray-700">{t.date ? format(new Date(t.date), 'MMM dd, yyyy') : '—'}</td>
                                <td className="px-2 py-2 font-bold text-gray-900">{t.invoice_number}</td>
                                <td className="px-2 py-2 text-gray-800">{t.user_name || '—'}</td>
                                <td className="px-2 py-2">
                                    <div className="flex flex-col">
                                        {(t.items && t.items.length > 0) ? t.items.map((item, i) => (<span key={i} className="font-bold text-gray-900 leading-tight">{item.name}</span>)) : (<span className="font-bold text-blue-600 italic">{t.medicines}</span>)}
                                    </div>
                                </td>
                                <td className="px-2 py-2 text-center font-bold">{t.items?.reduce((s, i) => s + i.quantity, 0) || t.quantity || 0}</td>
                                <td className="px-2 py-2 text-right font-bold">{formatCurrency(t.total_amount)}</td>
                                <td className="px-2 py-2 text-center uppercase font-bold text-[9pt]">{t.payment_method}</td>
                            </tr>
                        ))}
                        {allTransactions.length > 0 && (
                            <>
                                <tr className="bg-white">
                                    <td colSpan="7" className="px-3 py-6 text-right whitespace-nowrap border-t-2 border-blue-500">
                                        <span className="font-black uppercase tracking-[0.2em] text-[12pt] text-gray-400 mr-10">TOTAL:</span>
                                        <span className="font-black text-blue-900 text-[18pt] tabular-nums">{formatCurrency(transactionsTotal)}</span>
                                    </td>
                                </tr>

                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}