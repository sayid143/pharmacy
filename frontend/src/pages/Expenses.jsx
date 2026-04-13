import { useState, useEffect } from 'react';
import {
    DollarSign, Upload, Search, Plus, Trash2, Edit, FileText, Download,
    Loader2, TrendingUp, ShoppingCart, List, Tag, X, AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Expenses() {
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState({});
    const [reports, setReports] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editId, setEditId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [formData, setFormData] = useState({
        category: '',
        amount: '',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        payment_method: 'cash',
        reference_number: ''
    });
    const [receiptFile, setReceiptFile] = useState(null);

    const EXPENSE_CATEGORIES = [
        'Utilities', 'Rent', 'Salaries', 'Supplies', 'Maintenance', 'Marketing', 'Other'
    ];

    const loadData = async () => {
        setLoading(true);
        try {
            const [expensesRes, summaryRes, reportsRes] = await Promise.all([
                api.get('/expenses'),
                api.get('/expenses/summary'),
                api.get('/reports/daily')
            ]);
            setExpenses(expensesRes.data.data || []);
            setSummary(summaryRes.data.data || {});
            setReports(reportsRes.data.data || {});
        } catch (error) {
            toast.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSearch = (e) => setSearch(e.target.value);

    const filterByDate = (dateString, filterType) => {
        if (!dateString || filterType === 'all') return true;
        const d = new Date(dateString);
        const now = new Date();
        if (filterType === 'today') {
            return d.toDateString() === now.toDateString();
        }
        if (filterType === 'week') {
            const diff = now - d;
            return diff <= 7 * 24 * 60 * 60 * 1000;
        }
        if (filterType === 'month') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        return true;
    };

    const filteredExpenses = expenses.filter(ex =>
        (ex.description?.toLowerCase().includes(search.toLowerCase()) ||
            ex.category?.toLowerCase().includes(search.toLowerCase())) &&
        filterByDate(ex.expense_date, dateFilter)
    );

    const openModal = (expense = null) => {
        if (expense) {
            setEditId(expense.id);
            setFormData({
                category: expense.category || '',
                amount: expense.amount || '',
                expense_date: expense.expense_date ? format(new Date(expense.expense_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                description: expense.description || '',
                payment_method: expense.payment_method || 'cash',
                reference_number: expense.reference_number || ''
            });
        } else {
            setEditId(null);
            setFormData({
                category: '', amount: '', expense_date: format(new Date(), 'yyyy-MM-dd'),
                description: '', payment_method: 'cash', reference_number: ''
            });
        }
        setReceiptFile(null);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const fd = new FormData();
            Object.keys(formData).forEach(k => fd.append(k, formData[k]));
            if (receiptFile) fd.append('receipt', receiptFile);

            if (editId) {
                await api.put(`/expenses/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Expense updated');
            } else {
                await api.post('/expenses', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Expense added');
            }
            setShowModal(false);
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving expense');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        try {
            await api.delete(`/expenses/${deleteConfirm.id}`);
            toast.success('Expense deleted successfully');
            setDeleteConfirm(null);
            loadData();
        } catch (error) {
            toast.error('Error deleting expense');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        <TrendingUp size={18} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Income & Expense Management</h1>
                </div>
                <button onClick={() => openModal()} className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium shadow-sm">
                    <Plus size={18} /> Add Expense
                </button>
            </div>

            {/* Stats Cards Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-4 flex justify-between items-center border-l-4 border-l-emerald-500 shadow-sm rounded-xl bg-white hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Today's Income</p>
                        <h3 className="text-xl font-black text-gray-900 mt-1">${Number(reports?.summary?.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
                        <DollarSign size={20} />
                    </div>
                </div>

                <div className="card p-4 flex justify-between items-center border-l-4 border-l-rose-500 shadow-sm rounded-xl bg-white hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Today's Expenses</p>
                        <h3 className="text-xl font-black text-gray-900 mt-1">${Number(summary.today_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500">
                        <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white text-base font-bold leading-none pb-0.5">-</div>
                    </div>
                </div>

                <div className="card p-4 flex justify-between items-center border-l-4 border-l-blue-500 shadow-sm rounded-xl bg-white hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Net Profit Today</p>
                        <h3 className="text-xl font-black text-gray-900 mt-1">${Number(reports?.summary?.net_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500">
                        <TrendingUp size={20} />
                    </div>
                </div>

                <div className="card p-4 flex justify-between items-center border-l-4 border-l-purple-500 shadow-sm rounded-xl bg-white hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Today's Sales</p>
                        <h3 className="text-xl font-black text-gray-900 mt-1">{reports?.summary?.total_transactions || 0}</h3>
                    </div>
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-500">
                        <ShoppingCart size={20} />
                    </div>
                </div>
            </div>

            {/* Stats Cards Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-4 flex justify-between items-center border-l-4 border-l-rose-500 shadow-sm rounded-xl bg-white hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Expenses</p>
                        <h3 className="text-xl font-black text-gray-900 mt-1">${Number(summary.overall_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500">
                        <DollarSign size={20} />
                    </div>
                </div>

                <div className="card p-4 flex justify-between items-center border-l-4 border-l-orange-500 shadow-sm rounded-xl bg-white hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Number of Expenses</p>
                        <h3 className="text-xl font-black text-gray-900 mt-1">{expenses.length || 0}</h3>
                    </div>
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500">
                        <List size={20} />
                    </div>
                </div>

                <div className="card p-4 flex justify-between items-center border-l-4 border-l-purple-500 shadow-sm rounded-xl bg-white hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Categories</p>
                        <h3 className="text-xl font-black text-gray-900 mt-1">{summary.by_category?.length || 0}</h3>
                    </div>
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-500">
                        <Tag size={20} />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="card overflow-hidden border border-gray-100 shadow-sm rounded-xl bg-white mt-4">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search expenses..."
                            value={search}
                            onChange={handleSearch}
                            className="form-input pl-10 py-2 w-full bg-white border border-gray-200 rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="form-input py-2 px-4 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 min-w-[140px] appearance-none"
                        >
                            <option value="all">All Expenses</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-sm border-separate" style={{ borderSpacing: '0' }}>
                        <thead className="bg-[#e6f4fe] text-sky-700 capitalize tracking-wide text-[13px] font-semibold sticky top-0 z-20 shadow-[0_4px_8px_-2px_rgba(0,0,0,0.05)]">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                                <th className="px-4 py-3 whitespace-nowrap">Category</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap">Amount</th>
                                <th className="px-4 py-3 text-center whitespace-nowrap">Payment</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap print:hidden">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white text-[13px]">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-20 text-gray-400">
                                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        Loading expenses...
                                    </td>
                                </tr>
                            ) : filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-20 text-gray-500">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                            <DollarSign size={24} className="text-gray-400" />
                                        </div>
                                        <p className="font-medium text-gray-800 text-lg">No expenses recorded</p>
                                        <p className="text-sm mt-1 mb-4 text-gray-500">Start tracking your business expenses.</p>
                                        <button onClick={() => openModal()} className="btn-primary flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg shadow-sm font-medium mx-auto">
                                            <Plus size={18} /> Add First Expense
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                filteredExpenses.map(item => (
                                    <tr key={item.id} className="bg-white even:bg-slate-50 hover:bg-gray-50/80 transition-colors shadow-[0_-1px_2px_rgba(0,0,0,0.05)] relative z-0 hover:z-10">
                                        <td className="px-4 py-2.5 text-gray-500 font-medium whitespace-nowrap">{format(new Date(item.expense_date), 'MMM dd, yyyy')}</td>
                                        <td className="px-4 py-2.5 whitespace-nowrap"><span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] uppercase font-bold tracking-wider rounded border border-blue-200/50">{item.category}</span></td>
                                        <td className="px-4 py-2.5 text-gray-600 font-medium whitespace-normal min-w-[150px]">{item.description}</td>
                                        <td className="px-4 py-2.5 font-bold text-gray-900 text-right whitespace-nowrap">${Number(item.amount).toFixed(2)}</td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight ${item.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-700' :
                                                item.payment_method === 'ebirr' ? 'bg-teal-50 text-teal-700' :
                                                    item.payment_method === 'bank' ? 'bg-indigo-50 text-indigo-700' :
                                                        'bg-gray-100 text-gray-600'
                                                }`}>
                                                {item.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right whitespace-nowrap print:hidden">
                                            <div className="flex gap-1.5 justify-end items-center">
                                                <button onClick={() => openModal(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"><Edit size={16} /></button>
                                                <button onClick={() => setDeleteConfirm(item)} className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"><Trash2 size={16} strokeWidth={2.5} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Expense Modal - Updated Professional Style */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-gray-100">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-emerald-500 px-6 py-6 text-white rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-xl">
                                    {editId ? 'Edit Expense' : 'Record New Expense'}
                                </h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors"
                                >
                                    <X size={22} />
                                </button>
                            </div>
                            <p className="text-sm text-blue-100 mt-1 opacity-90">
                                {editId ? 'Update expense details' : 'Add a new business expense record'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="relative">
                                    <input
                                        type="date"
                                        required
                                        value={formData.expense_date}
                                        onChange={e => setFormData({ ...formData, expense_date: e.target.value })}
                                        className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                    />
                                    <label className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                </div>

                                <div className="relative">
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white appearance-none"
                                    >
                                        <option value="">Select Category</option>
                                        {EXPENSE_CATEGORIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    <label className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none">
                                        Category <span className="text-red-500">*</span>
                                    </label>
                                </div>

                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white font-mono font-bold"
                                        placeholder=" "
                                    />
                                    <label className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none">
                                        Amount (ETB) <span className="text-red-500">*</span>
                                    </label>
                                </div>

                                <div className="relative">
                                    <select
                                        value={formData.payment_method}
                                        onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                                        className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white appearance-none"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="bank">Bank Transfer</option>
                                        <option value="ebirr">Ebirr</option>
                                    </select>
                                    <label className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none">
                                        Payment Method
                                    </label>
                                </div>
                            </div>

                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder=" "
                                    className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                />
                                <label className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none">
                                    Description <span className="text-red-500">*</span>
                                </label>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase">Receipt Upload</label>
                                <input
                                    type="file"
                                    onChange={e => setReceiptFile(e.target.files[0])}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer border border-gray-200 rounded-xl p-2"
                                />
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="animate-spin w-5 h-5" />
                                            Saving...
                                        </>
                                    ) : (
                                        editId ? 'Update Expense' : 'Save Expense'
                                    )}
                                </button>
                            </div>
                        </form>
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
                            <h3 className="text-lg font-bold text-gray-900">Delete Expense?</h3>
                            <p className="text-sm text-gray-500">
                                Are you sure you want to delete <span className="font-bold text-gray-800">{deleteConfirm.category}</span> expense for <span className="font-bold text-gray-800">${Number(deleteConfirm.amount).toFixed(2)}</span>?
                            </p>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={deleting}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer"
                                    type="button"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                    type="button"
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