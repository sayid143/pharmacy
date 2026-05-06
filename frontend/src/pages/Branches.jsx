import { useState, useEffect } from 'react';
import {
    Building, MapPin, Phone, Mail, Plus, Edit2, Trash2, 
    Loader2, Search, X, CheckCircle2, AlertTriangle, Globe
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Branches() {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [search, setSearch] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const [formData, setFormData] = useState({
        id: '', name: '', address: '', phone: '', email: '', is_active: true
    });

    const loadBranches = async () => {
        setLoading(true);
        try {
            const res = await api.get('/branches');
            setBranches(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load branches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadBranches(); }, []);

    const filteredBranches = branches.filter(b => 
        b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.address?.toLowerCase().includes(search.toLowerCase())
    );

    const openAddModal = () => {
        setEditMode(false);
        setFormData({ id: '', name: '', address: '', phone: '', email: '', is_active: true });
        setShowModal(true);
    };

    const openEditModal = (branch) => {
        setEditMode(true);
        setFormData({ ...branch });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editMode) {
                await api.put(`/branches/${formData.id}`, formData);
                toast.success('Branch updated successfully');
            } else {
                await api.post('/branches', formData);
                toast.success('Branch created successfully');
            }
            setShowModal(false);
            loadBranches();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await api.delete(`/branches/${deleteConfirm.id}`);
            toast.success('Branch deleted successfully');
            setDeleteConfirm(null);
            loadBranches();
        } catch (err) {
            toast.error('Failed to delete branch');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Branches Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your pharmacy locations and inventory distribution.</p>
                </div>
                <button onClick={openAddModal} className="btn-primary flex items-center gap-2 px-5 py-2.5 shadow-md hover:shadow-lg transition-all">
                    <Plus size={18} /> Add New Branch
                </button>
            </div>

            {/* Search */}
            <div className="card p-4 bg-white shadow-sm border border-gray-100 rounded-2xl">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search branches by name or location..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="form-input pl-10 py-2.5 w-full bg-gray-50/50 border-gray-200 focus:bg-white transition-colors"
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="card h-48 animate-pulse bg-gray-50 border-gray-100" />
                    ))
                ) : filteredBranches.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        <Building size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No branches found. Start by adding a new location.</p>
                    </div>
                ) : filteredBranches.map(branch => (
                    <div key={branch.id} className="group card bg-white border border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden flex flex-col">
                        <div className="h-2 bg-gradient-to-r from-blue-500 to-emerald-500" />
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform duration-300">
                                    <Building size={24} />
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEditModal(branch)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => setDeleteConfirm(branch)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-1">{branch.name}</h3>
                            <div className="flex items-start gap-2 text-gray-500 text-sm mb-4">
                                <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                                <p>{branch.address || 'No address provided'}</p>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-gray-50">
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <Phone size={14} className="text-gray-400" />
                                    <span>{branch.phone || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <Mail size={14} className="text-gray-400" />
                                    <span className="truncate">{branch.email || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50/50 flex items-center justify-between">
                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border ${branch.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                {branch.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-[10px] font-bold text-gray-300 uppercase">ID: #{branch.id}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Branch Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-gray-100">
                        <div className="bg-gradient-to-r from-blue-600 to-emerald-500 px-8 py-8 text-white">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-2xl flex items-center gap-3">
                                    <Building size={28} />
                                    {editMode ? 'Update Branch' : 'New Branch'}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Branch Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="form-input py-3 px-4 w-full rounded-2xl bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                        placeholder="e.g. Downtown Pharmacy"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Address / Location</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="form-input py-3 px-4 w-full rounded-2xl bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none min-h-[100px]"
                                        placeholder="Physical address or landmark..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="form-input py-3 px-4 w-full rounded-2xl bg-gray-50/50 border-gray-200 focus:bg-white outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="form-input py-3 px-4 w-full rounded-2xl bg-gray-50/50 border-gray-200 focus:bg-white outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-semibold text-gray-700">This branch is currently active</label>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 px-6 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black rounded-2xl hover:shadow-xl hover:shadow-blue-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : (editMode ? 'Save Changes' : 'Create Branch')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-slide-up">
                        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Delete Branch?</h3>
                        <p className="text-gray-500 mb-8 leading-relaxed">
                            Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteConfirm.name}"</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all">
                                No, Keep
                            </button>
                            <button onClick={handleDelete} className="flex-1 py-3 px-6 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all">
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
