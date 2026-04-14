import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Search, Package, Phone, Mail, Building, Edit, Truck, Clock } from 'lucide-react';
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

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null);
    const [saving, setSaving] = useState(false);
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    const activeSuppliersCount = suppliers.filter(s => s.is_active).length;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/suppliers', { params: { search, limit: 50 } });
            setSuppliers(data.data);
            setPagination(data.pagination || { total: data.data.length });
        } catch (e) { } finally { setLoading(false); }
    }, [search]);

    useEffect(() => {
        const t = setTimeout(fetchData, 400);
        return () => clearTimeout(t);
    }, [fetchData]);

    const openAdd = () => { reset(); setModal('add'); };
    const openEdit = (s) => { Object.entries(s).forEach(([k, v]) => setValue(k, v)); setModal(s); };

    const onSave = async (data) => {
        setSaving(true);
        try {
            if (modal === 'add') {
                await api.post('/suppliers', data);
                toast.success('Supplier added!');
            } else {
                await api.put(`/suppliers/${modal.id}`, data);
                toast.success('Supplier updated!');
            }
            setModal(null);
            fetchData();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error saving supplier');
        } finally { setSaving(false); }
    };

    const toggleActive = async (s) => {
        try {
            await api.put(`/suppliers/${s.id}`, { ...s, is_active: !s.is_active });
            toast.success(`Supplier ${!s.is_active ? 'enabled' : 'disabled'}.`);
            fetchData();
        } catch (e) { }
    };

    return (
        <div className="space-y-6 pb-10 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage wholesale vendors and order contacts</p>
                </div>
                <button onClick={openAdd} className="btn-primary">
                    <Plus size={16} /> Add Supplier
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                    title="Total Suppliers"
                    value={pagination.total || suppliers.length}
                    icon={Building}
                    color="text-blue-600"
                    bg="bg-blue-100"
                />
                <StatCard
                    title="Active Suppliers"
                    value={activeSuppliersCount}
                    icon={Truck}
                    color="text-emerald-500"
                    bg="bg-emerald-100"
                />
                <StatCard
                    title="Pending Orders"
                    value="0"
                    icon={Clock}
                    color="text-amber-500"
                    bg="bg-amber-100"
                />
            </div>

            {/* Filter */}
            <div className="card p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by company name, contact, email..."
                        className="form-input pl-10 bg-gray-50 h-11 focus:bg-white"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="card shadow-sm border border-gray-200">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-sm border-separate min-w-[800px]" style={{ borderSpacing: '0' }}>
                        <thead className="bg-[#e6f4fe] text-sky-700 capitalize tracking-wide text-[13px] font-semibold sticky top-0 z-20 shadow-[0_4px_8px_-2px_rgba(0,0,0,0.05)]">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">Supplier / Contact</th>
                                <th className="px-4 py-3 whitespace-nowrap">Contact Info</th>
                                <th className="px-4 py-3 whitespace-nowrap">Terms</th>
                                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white text-[13px]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-20 text-gray-400">
                                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        Loading suppliers...
                                    </td>
                                </tr>
                            ) : suppliers.length > 0 ? (
                                suppliers.map(s => (
                                    <tr key={s.id} className="bg-white even:bg-slate-50 hover:bg-gray-50/80 transition-colors shadow-[0_-1px_2px_rgba(0,0,0,0.05)] relative z-0 hover:z-10 cursor-pointer group" onClick={() => openEdit(s)}>
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                                                    <Package size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-base">{s.name}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Building size={12} /> {s.contact_person || 'No Contact'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 space-y-1 whitespace-nowrap">
                                            {s.phone ? (
                                                <p className="flex items-center gap-1.5 text-gray-600"><Phone size={13} className="text-gray-400" /> {s.phone}</p>
                                            ) : <p className="text-gray-400 italic text-xs">No phone</p>}
                                            {s.email ? (
                                                <p className="flex items-center gap-1.5 text-gray-600"><Mail size={13} className="text-gray-400" /> {s.email}</p>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-gray-600 font-medium bg-gray-100 px-2.5 py-1 rounded w-max text-xs">
                                                    {s.payment_terms} Days
                                                </span>
                                                {s.tax_number && <span className="text-gray-400 text-xs mt-1">Tax: {s.tax_number}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleActive(s); }}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${s.is_active
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                    {s.is_active ? 'Active' : 'Inactive'}
                                                </div>
                                            </button>
                                        </td>
                                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                            <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors ml-auto">
                                                <Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-20 text-gray-500">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                            <Package size={24} className="text-gray-400" />
                                        </div>
                                        <p className="font-medium text-gray-800 text-lg">No suppliers found</p>
                                        <p className="text-sm mt-1">Try adjusting your search or add a new supplier.</p>
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
                    <div className="modal-content p-6 shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">{modal === 'add' ? 'Add Supplier' : 'Edit Supplier'}</h2>
                            <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
                            <div>
                                <label className="form-label">Company Name *</label>
                                <input {...register('name', { required: 'Required' })} className="form-input bg-gray-50 focus:bg-white" placeholder="Pharma Wholesale Ltd." />
                                {errors.name && <p className="form-error mt-1">{errors.name.message}</p>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Contact Person</label>
                                    <input {...register('contact_person')} className="form-input bg-gray-50 focus:bg-white" placeholder="Jane Doe" />
                                </div>
                                <div>
                                    <label className="form-label">Tax Number</label>
                                    <input {...register('tax_number')} className="form-input bg-gray-50 focus:bg-white" placeholder="TAX-12345" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Phone Number</label>
                                    <input {...register('phone')} className="form-input bg-gray-50 focus:bg-white" placeholder="+1-555-1001" />
                                </div>
                                <div>
                                    <label className="form-label">Email Address</label>
                                    <input {...register('email')} type="email" className="form-input bg-gray-50 focus:bg-white" placeholder="contact@supplier.com" />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Address</label>
                                <input {...register('address')} className="form-input bg-gray-50 focus:bg-white" placeholder="100 Pharma Blvd, City" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                <div>
                                    <label className="form-label">Payment Terms (Days)</label>
                                    <input {...register('payment_terms')} type="number" className="form-input bg-gray-50 focus:bg-white" placeholder="30" />
                                </div>
                                {modal !== 'add' && (
                                    <div className="flex items-center gap-2 pt-6">
                                        <input {...register('is_active')} type="checkbox" id="is_active" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" defaultChecked={modal.is_active} />
                                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">Active Supplier Account</label>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 pt-6 border-t border-gray-100 mt-6">
                                <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
                                    {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : (modal === 'add' ? '+ Add Supplier' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
