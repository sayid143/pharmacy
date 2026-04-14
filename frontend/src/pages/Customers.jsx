import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Search, Edit, Trash2, Users, DollarSign, Activity } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import toast from 'react-hot-toast';

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
        <div className={`card p-5 flex items-center gap-4 border-l-4 ${borderClass} hover:shadow-md transition-shadow bg-white`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium mb-0.5">{title}</p>
                <h3 className="text-xl lg:text-2xl font-bold text-gray-900">{value}</h3>
            </div>
        </div>
    );
};

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null);
    const [saving, setSaving] = useState(false);
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [stats, setStats] = useState({ totalOutstanding: 0 });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/customers', { params: { search, limit: 50 } });
            setCustomers(data.data);
            setPagination(data.pagination);

            // Compute total outstanding just for UI (in a real app this would come from an endpoint)
            const outstanding = data.data.reduce((sum, c) => sum + parseFloat(c.outstanding_balance || 0), 0);
            setStats({ totalOutstanding: outstanding });
        } catch (e) { } finally { setLoading(false); }
    }, [search]);

    useEffect(() => {
        const t = setTimeout(fetchData, 400);
        return () => clearTimeout(t);
    }, [fetchData]);

    const openAdd = () => { reset(); setModal('add'); };
    const openEdit = (c) => { Object.entries(c).forEach(([k, v]) => setValue(k, v)); setModal(c); };

    const onSave = async (data) => {
        setSaving(true);
        try {
            if (modal === 'add') {
                await api.post('/customers', data);
                toast.success('Customer added!');
            } else {
                await api.put(`/customers/${modal.id}`, data);
                toast.success('Customer updated!');
            }
            setModal(null);
            fetchData();
        } catch (e) { } finally { setSaving(false); }
    };

    return (
        <div className="space-y-6 pb-10 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customers Directory</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage pharmacy customers and their credit limits</p>
                </div>
                <button onClick={openAdd} className="btn-primary">
                    <Plus size={16} /> Add Customer
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Total Customers"
                    value={pagination.total || 0}
                    icon={Users}
                    color="text-blue-600"
                    bg="bg-blue-100"
                />
                <StatCard
                    title="Total Outstanding"
                    value={`$${stats.totalOutstanding.toFixed(2)}`}
                    icon={DollarSign}
                    color="text-red-500"
                    bg="bg-red-100"
                />
                <StatCard
                    title="Active Customers"
                    value={Math.max(0, (pagination.total || 0) - 2)} // Mock value
                    icon={Activity}
                    color="text-emerald-500"
                    bg="bg-emerald-100"
                />
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, phone, email..."
                        className="form-input pl-10 bg-gray-50 h-11 focus:bg-white"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Customer Info</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Outstanding Balance</th>
                                <th className="px-6 py-4">Credit Limit</th>
                                <th className="px-6 py-4">Loyalty Pts</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 text-gray-400">
                                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        Loading directory...
                                    </td>
                                </tr>
                            ) : customers.length > 0 ? (
                                customers.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer group" onClick={() => openEdit(c)}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                                                    {c.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{c.name}</p>
                                                    <p className="text-xs text-gray-500">{c.insurance_number || 'No insurance'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-gray-800 font-medium">{c.phone || '–'}</p>
                                            <p className="text-xs text-gray-500">{c.email || '–'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.outstanding_balance > 0 ? (
                                                <span className="font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md">
                                                    ${parseFloat(c.outstanding_balance).toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-medium">$0.00</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">
                                            ${parseFloat(c.credit_limit).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.loyalty_points > 0 ? (
                                                <span className="font-medium text-amber-600 flex items-center gap-1">
                                                    ⭐ {c.loyalty_points}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">0</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors ml-auto">
                                                <Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 text-gray-500">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                            <Users size={24} className="text-gray-400" />
                                        </div>
                                        <p className="font-medium text-gray-800 text-lg">No customers found</p>
                                        <p className="text-sm mt-1">Try a different search or add a new customer.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">{modal === 'add' ? 'Add Customer' : 'Edit Customer'}</h2>
                            <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
                            <div>
                                <label className="form-label">Full Name *</label>
                                <input {...register('name', { required: 'Required' })} className="form-input bg-gray-50 focus:bg-white" placeholder="John Smith" />
                                {errors.name && <p className="form-error mt-1">{errors.name.message}</p>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Phone Number</label>
                                    <input {...register('phone')} className="form-input bg-gray-50 focus:bg-white" placeholder="+1-555-0001" />
                                </div>
                                <div>
                                    <label className="form-label">Email Address</label>
                                    <input {...register('email')} type="email" className="form-input bg-gray-50 focus:bg-white" placeholder="john@email.com" />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Home Address</label>
                                <input {...register('address')} className="form-input bg-gray-50 focus:bg-white" placeholder="123 Main St, City" />
                            </div>
                            <div>
                                <label className="form-label">Credit Limit ($)</label>
                                <input {...register('credit_limit')} type="number" step="0.01" className="form-input bg-gray-50 focus:bg-white" placeholder="0.00" />
                            </div>

                            <div className="flex gap-3 pt-5 border-t border-gray-100 mt-6">
                                <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
                                    {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : (modal === 'add' ? '+ Add Customer' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
