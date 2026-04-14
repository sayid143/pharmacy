import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, X, DollarSign, AlertTriangle, Check, Clock, CheckCircle2, Trash2, ChevronDown, Bell } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, color, bg }) => {
    const borderClass = {
        'text-blue-600': 'border-l-blue-600',
        'text-violet-600': 'border-l-violet-600',
        'text-emerald-600': 'border-l-emerald-600',
        'text-emerald-500': 'border-l-emerald-500',
        'text-blue-500': 'border-l-blue-500',
        'text-amber-500': 'border-l-amber-500',
        'text-red-500': 'border-l-red-500',
        'text-gray-600': 'border-l-gray-600',
        'text-orange-500': 'border-l-orange-500',
        'text-rose-500': 'border-l-rose-500'
    }[color] || 'border-l-gray-200';

    return (
        <div className={`card p-4 flex items-center gap-3 border-l-4 ${borderClass} hover:shadow-md transition-shadow bg-white`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">{title}</p>
                <h3 className="text-xl font-black text-gray-900 leading-tight">{value}</h3>
            </div>
        </div>
    );
};

export default function Debts() {
    const [debts, setDebts] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('all'); // all, today, weekly, monthly, custom
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [paymentModal, setPaymentModal] = useState(null);
    const [addModal, setAddModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null); // stores the debt object to delete
    const [paying, setPaying] = useState(false);
    const [adding, setAdding] = useState(false);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filter) params.status = filter;

            let startDate, endDate;
            const now = new Date();

            if (dateFilter === 'today') {
                startDate = startOfDay(now);
                endDate = endOfDay(now);
            } else if (dateFilter === 'weekly') {
                startDate = startOfWeek(now, { weekStartsOn: 1 });
                endDate = endOfWeek(now, { weekStartsOn: 1 });
            } else if (dateFilter === 'monthly') {
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
            } else if (dateFilter === 'custom' && customDateRange.start && customDateRange.end) {
                startDate = startOfDay(parseISO(customDateRange.start));
                endDate = endOfDay(parseISO(customDateRange.end));
            }

            if (startDate && endDate) {
                params.start_date = startDate.toISOString();
                params.end_date = endDate.toISOString();
            }

            const [debtsRes, sumRes] = await Promise.all([
                api.get('/debts', { params }),
                api.get('/debts/summary', { params }),
            ]);
            setDebts(debtsRes.data.data);
            setSummary(sumRes.data.data);
        } catch (e) { } finally { setLoading(false); }
    }, [filter, dateFilter, customDateRange]);

    useEffect(() => {
        if (dateFilter === 'custom' && (!customDateRange.start || !customDateRange.end)) return;
        fetchData();
    }, [fetchData]);

    const onPayment = async (data) => {
        setPaying(true);
        try {
            await api.post('/debts/payments', { debt_id: paymentModal.id, ...data });
            toast.success('Payment recorded successfully!');
            setPaymentModal(null);
            reset();
            fetchData();
        } catch (e) { } finally { setPaying(false); }
    };

    const sendReminder = async (debtId) => {
        try {
            await api.post(`/debts/${debtId}/remind`);
            toast.success('Payment reminder sent!');
        } catch (e) { }
    };

    const onDelete = async (id) => {
        try {
            await api.delete(`/debts/${id}`);
            toast.success('Debt record deleted');
            setDeleteConfirm(null);
            fetchData();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error deleting record');
        }
    };

    const statusColor = (s) => {
        if (s === 'paid') return 'badge-success';
        if (s === 'partial') return 'badge-warning';
        if (s === 'overdue') return 'badge-danger';
        return 'badge-info';
    };

    return (
        <div className="space-y-6 pb-10 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Debts Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Track and manage customer debts across the pharmacy</p>
                </div>
                <button
                    onClick={() => { reset(); setAddModal(true); }}
                    className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                    <Plus size={18} strokeWidth={2.5} />
                    <span className="font-bold tracking-tight">Add New Debt</span>
                </button>
            </div>

            {/* Top Stat Cards (Like Screenshot) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Debts"
                    value={summary.total_debts_count || 0}
                    icon={DollarSign}
                    color="text-blue-600"
                    bg="bg-blue-100"
                />
                <StatCard
                    title="Paid Debts"
                    value={`ETB ${parseFloat(summary.total_paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={CheckCircle2}
                    color="text-emerald-500"
                    bg="bg-emerald-100"
                />
                <StatCard
                    title="Outstanding Debts"
                    value={`ETB ${parseFloat(summary.total_outstanding_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={Clock}
                    color="text-amber-500"
                    bg="bg-amber-100"
                />
                <StatCard
                    title="Overdue Debts"
                    value={summary.overdue_debts_count || 0}
                    icon={AlertTriangle}
                    color="text-red-500"
                    bg="bg-red-100"
                />
            </div>

            {/* Filter */}
            <div className="card p-4 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-gray-50 border border-gray-100 rounded-lg p-1">
                        {['all', 'today', 'weekly', 'monthly', 'custom'].map(df => (
                            <button
                                key={df}
                                onClick={() => setDateFilter(df)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${dateFilter === df ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {df}
                            </button>
                        ))}
                    </div>

                    {dateFilter === 'custom' && (
                        <div className="flex items-center gap-2 animate-fade-in">
                            <input
                                type="date"
                                value={customDateRange.start}
                                onChange={e => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="form-input text-sm py-1.5 h-9"
                            />
                            <span className="text-gray-400">to</span>
                            <input
                                type="date"
                                value={customDateRange.end}
                                onChange={e => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="form-input text-sm py-1.5 h-9"
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                    {['', 'pending', 'partial', 'overdue', 'paid'].map(s => (
                        <button key={s} onClick={() => setFilter(s)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${filter === s ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 shadow-sm border border-gray-100'}`}>
                            {s || 'All Debts'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Data Table */}
            <div className="card shadow-sm border border-gray-200">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-sm border-separate min-w-[1200px]" style={{ borderSpacing: '0' }}>
                        <thead className="bg-[#e6f4fe] text-sky-700 capitalize tracking-wide text-[13px] font-semibold sticky top-0 z-20 shadow-[0_4px_8px_-2px_rgba(0,0,0,0.05)]">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">Invoice</th>
                                <th className="px-4 py-3">Medicine Name</th>
                                <th className="px-4 py-3 text-center">Qty</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap">Total Amount</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap">Paid Amount</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap">Remaining</th>
                                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                                <th className="px-4 py-3 whitespace-nowrap">Due Date</th>
                                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 whitespace-nowrap">Payment</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap print:hidden">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white text-[13px]">
                            {loading ? (
                                <tr>
                                    <td colSpan={12} className="text-center py-20 text-gray-400">
                                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        Loading debts...
                                    </td>
                                </tr>
                            ) : debts.length > 0 ? (
                                debts.map(d => (
                                    <tr key={d.id} className="bg-white even:bg-slate-50 hover:bg-gray-50/80 transition-colors shadow-[0_-1px_2px_rgba(0,0,0,0.05)] relative z-0 hover:z-10">
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100/50">
                                                {d.sale?.invoice_number || d.invoice_number || '–'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 min-w-[140px]">
                                            <div className="flex flex-col gap-1 whitespace-normal">
                                                {d.sale?.items && d.sale.items.length > 0 ? (
                                                    d.sale.items.map((item, idx) => (
                                                        <span key={idx} className="font-bold text-gray-800 leading-tight">
                                                            {item.medicine?.name}
                                                        </span>
                                                    ))
                                                ) : <span className="text-gray-400">—</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                            <div className="flex flex-col gap-1 items-center">
                                                {d.sale?.items && d.sale.items.length > 0 ? (
                                                    d.sale.items.map((item, idx) => (
                                                        <span key={idx} className="text-[12px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded shadow-sm min-w-[24px] inline-block">
                                                            {item.quantity}
                                                        </span>
                                                    ))
                                                ) : <span className="text-gray-400">—</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 min-w-[120px]">
                                            <div className="flex flex-col whitespace-normal">
                                                <span className="font-semibold text-gray-900 leading-tight">{d.customer?.name || d.customer_name || 'Walk-in Customer'}</span>
                                                <span className="text-[10px] text-gray-400 font-medium">{d.customer?.phone || d.customer_phone || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 font-bold text-gray-900 text-right whitespace-nowrap">
                                            ETB {parseFloat(d.amount).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2.5 font-bold text-emerald-600 text-right whitespace-nowrap">
                                            ETB {parseFloat(d.paid_amount).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2.5 font-black text-rose-600 text-right whitespace-nowrap">
                                            ETB {parseFloat(d.balance).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-500 font-medium whitespace-nowrap">
                                            {(d.sale?.created_at || d.sale?.createdAt || d.created_at || d.createdAt || d.date) ? format(new Date(d.sale?.created_at || d.sale?.createdAt || d.created_at || d.createdAt || d.date), 'MMM dd, yyyy') : '–'}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-500 font-semibold whitespace-nowrap">
                                            {d.due_date ? format(new Date(d.due_date), 'MMM dd, yyyy') : '–'}
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${d.status === 'paid' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50' :
                                                d.status === 'partial' ? 'bg-amber-100 text-amber-700 border border-amber-200/50' :
                                                    d.status === 'overdue' ? 'bg-red-100 text-red-700 border border-red-200/50' :
                                                        'bg-blue-100 text-blue-700 border border-blue-200/50'
                                                }`}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight ${d.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-700' :
                                                d.payment_method === 'ebirr' ? 'bg-teal-50 text-teal-700' :
                                                    d.payment_method === 'ebirr_kaafi' ? 'bg-violet-50 text-violet-700' :
                                                        'bg-gray-100 text-gray-600'
                                                }`}>
                                                {d.payment_method || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right print:hidden">
                                            <div className="flex gap-2 justify-end items-center">
                                                {d.status !== 'paid' ? (
                                                    <button
                                                        onClick={() => setPaymentModal(d)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-white text-blue-600 hover:border-blue-400 transition-all cursor-pointer text-[12px] font-bold shadow-sm"
                                                    >
                                                        <span className="text-[10px] bg-blue-50 px-1 rounded">ETB</span>
                                                        <span>Pay</span>
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                                                        <CheckCircle2 size={12} />
                                                        Cleared
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => setDeleteConfirm(d)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all cursor-pointer text-[12px] font-bold border border-rose-100 shadow-sm group"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={14} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                                                    <span>Delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={12} className="text-center py-20 text-gray-500">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                            <CheckCircle2 size={24} className="text-gray-400" />
                                        </div>
                                        <p className="font-medium text-gray-800 text-lg">No debts found</p>
                                        <p className="text-sm mt-1">Try changing your filters or there are really no debts to show.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals - Standardized System Style */}

            {/* 1. Payment Modal */}
            {paymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-gray-100" onClick={e => e.stopPropagation()}>
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-emerald-500 px-6 py-6 text-white rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold tracking-tight">Record Debt Payment</h2>
                                <button
                                    onClick={() => { setPaymentModal(null); reset(); }}
                                    className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-sm text-blue-100 mt-1 opacity-90">
                                Recording payment for {paymentModal.customer?.name || paymentModal.customer_name}
                            </p>
                        </div>

                        {/* Balance Overview Card */}
                        <div className="px-6 pt-6">
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-inner">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Remaining Balance</span>
                                    <span className="text-xl font-black text-rose-600">ETB {parseFloat(paymentModal.balance).toFixed(2)}</span>
                                </div>
                                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                                    <div
                                        className="bg-emerald-500 h-full rounded-full transition-all duration-700 shadow-sm"
                                        style={{ width: `${(parseFloat(paymentModal.paid_amount) / parseFloat(paymentModal.amount)) * 100}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2.5 items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-medium text-gray-400">Paid: ETB {parseFloat(paymentModal.paid_amount).toFixed(2)}</span>
                                        <span className="text-[10px] font-medium text-gray-400">Total: ETB {parseFloat(paymentModal.amount).toFixed(2)}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-center min-w-[80px]">
                                        {((parseFloat(paymentModal.paid_amount) / parseFloat(paymentModal.amount)) * 100).toFixed(0)}% Complete
                                    </span>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit(onPayment)} className="p-6 space-y-6">
                            <div className="relative">
                                <input
                                    {...register('amount', {
                                        required: 'Required',
                                        min: { value: 0.01, message: 'Min 0.01' },
                                        max: { value: paymentModal.balance, message: 'Exceeds balance' }
                                    })}
                                    id="modal_payment_amount"
                                    type="number"
                                    step="0.01"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white font-bold text-gray-900"
                                    placeholder=" "
                                    autoFocus
                                />
                                <label
                                    htmlFor="modal_payment_amount"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Payment Amount (ETB) <span className="text-red-500">*</span>
                                </label>
                                {errors.amount && (
                                    <p className="text-rose-600 text-[10px] font-bold mt-1.5 flex items-center gap-1">
                                        <AlertTriangle size={10} /> {errors.amount.message}
                                    </p>
                                )}
                            </div>

                            <div className="relative">
                                <select
                                    {...register('payment_method', { required: true })}
                                    id="modal_payment_method"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white appearance-none"
                                    defaultValue="cash"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="ebirr">Ebirr</option>
                                    <option value="ebirr_kaafi">Ebirr Kaafi</option>
                                </select>
                                <label
                                    htmlFor="modal_payment_method"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Payment Method <span className="text-red-500">*</span>
                                </label>
                            </div>

                            <div className="relative">
                                <textarea
                                    {...register('notes')}
                                    id="modal_payment_notes"
                                    className="peer w-full px-4 pt-8 pb-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white resize-none min-h-[100px]"
                                    placeholder=" "
                                />
                                <label
                                    htmlFor="modal_payment_notes"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-6 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Notes (Optional)
                                </label>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => { setPaymentModal(null); reset(); }}
                                    className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={paying}
                                    className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold rounded-xl hover:from-blue-700 hover:to-emerald-600 transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {paying ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin " />
                                    ) : (
                                        'Confirm Payment'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Add New Debt Modal */}
            {addModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-gray-100" onClick={e => e.stopPropagation()}>
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-emerald-500 px-6 py-6 text-white rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold tracking-tight">Add New Debt</h2>
                                <button
                                    onClick={() => { setAddModal(false); reset(); }}
                                    className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors"
                                >
                                    <X size={22} />
                                </button>
                            </div>
                            <p className="text-sm text-blue-100 mt-1 opacity-90">Enter details for a new business debt record</p>
                        </div>

                        <form onSubmit={handleSubmit(async (data) => {
                            setAdding(true);
                            try {
                                await api.post('/debts', data);
                                toast.success('Debt record created!');
                                setAddModal(false);
                                reset();
                                fetchData();
                            } catch (e) {
                                toast.error(e.response?.data?.message || 'Error creating debt');
                            } finally { setAdding(false); }
                        })} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="relative">
                                    <input
                                        {...register('customer_name', { required: 'Name is required' })}
                                        id="customer_name"
                                        className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white font-medium"
                                        placeholder=" "
                                    />
                                    <label
                                        htmlFor="customer_name"
                                        className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                    >
                                        Customer Name <span className="text-red-500">*</span>
                                    </label>
                                    {errors.customer_name && <p className="text-rose-600 text-[10px] mt-1 font-bold underline decoration-rose-200">{errors.customer_name.message}</p>}
                                </div>

                                <div className="relative">
                                    <input
                                        {...register('customer_phone', { required: 'Phone is required' })}
                                        id="customer_phone"
                                        className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white font-medium"
                                        placeholder=" "
                                    />
                                    <label
                                        htmlFor="customer_phone"
                                        className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                    >
                                        Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    {errors.customer_phone && <p className="text-rose-600 text-[10px] mt-1 font-bold underline decoration-rose-200">{errors.customer_phone.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="relative">
                                    <input
                                        {...register('amount', { required: 'Amount required', min: 0.01 })}
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white font-bold"
                                        placeholder=" "
                                    />
                                    <label
                                        htmlFor="amount"
                                        className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                    >
                                        Total Amount (ETB) <span className="text-red-500">*</span>
                                    </label>
                                </div>

                                <div className="relative">
                                    <input
                                        {...register('paid_amount')}
                                        id="paid_amount"
                                        type="number"
                                        step="0.01"
                                        className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white font-medium"
                                        placeholder=" "
                                    />
                                    <label
                                        htmlFor="paid_amount"
                                        className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                    >
                                        Paid amount
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="relative">
                                    <select
                                        {...register('payment_method')}
                                        id="payment_method"
                                        className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white appearance-none"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="ebirr">Ebirr</option>
                                        <option value="ebirr_kaafi">Ebirr Kaafi</option>
                                        <option value="card">Card</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                    </select>
                                    <label
                                        htmlFor="payment_method"
                                        className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                    >
                                        Initial Payment Method
                                    </label>
                                </div>

                                <div className="relative">
                                    <input
                                        {...register('due_date')}
                                        id="due_date"
                                        type="date"
                                        className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                    />
                                    <label
                                        htmlFor="due_date"
                                        className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                    >
                                        Due Date
                                    </label>
                                </div>
                            </div>

                            <div className="relative">
                                <textarea
                                    {...register('notes')}
                                    id="notes"
                                    className="peer w-full px-4 pt-8 pb-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white resize-none min-h-[100px]"
                                    placeholder=" "
                                />
                                <label
                                    htmlFor="notes"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-6 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Notes (Optional)
                                </label>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => { setAddModal(false); reset(); }}
                                    className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adding}
                                    className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold rounded-xl hover:from-blue-700 hover:to-emerald-600 transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {adding ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        'Create Debt Record'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-slide-up border border-gray-100 text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-rose-100 shadow-inner">
                            <Trash2 size={36} strokeWidth={2.5} className="animate-pulse" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-3 tracking-tight">Delete Record?</h2>
                        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                            Are you sure you want to delete the debt record for <span className="font-bold text-gray-900 underline decoration-rose-200">{deleteConfirm.customer?.name || deleteConfirm.customer_name}</span>? This action is irreversible.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all active:scale-95 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onDelete(deleteConfirm.id)}
                                className="flex-1 py-3.5 rounded-xl bg-rose-600 text-white font-black hover:bg-rose-700 shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}