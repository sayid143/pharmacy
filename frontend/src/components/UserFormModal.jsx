import React, { useState, useEffect } from 'react';
import { Edit2, Plus, X, Loader2 } from 'lucide-react';

export default function UserFormModal({ isOpen, onClose, editMode, initialData, roles, onSubmit, submitting }) {
    const [formData, setFormData] = useState({
        id: '', name: '', email: '', phone: '', role_id: '', password: '', is_active: true
    });

    useEffect(() => {
        if (isOpen) {
            if (editMode && initialData) {
                setFormData({
                    id: initialData.id || '',
                    name: initialData.name || '',
                    email: initialData.email || '',
                    phone: initialData.phone || '',
                    role_id: initialData.role_id || '',
                    is_active: initialData.is_active !== undefined ? initialData.is_active : true,
                    password: ''
                });
            } else {
                setFormData({ id: '', name: '', email: '', phone: '', role_id: '', password: '', is_active: true });
            }
        }
    }, [isOpen, editMode, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-gray-100">
                <div className="bg-gradient-to-r from-blue-600 to-emerald-500 px-6 py-6 text-white rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-xl flex items-center gap-2">
                            {editMode ? <Edit2 size={20} className="text-white" /> : <Plus size={20} className="text-white" />}
                            {editMode ? 'Edit User Profile' : 'Create New User'}
                        </h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors"
                        >
                            <X size={22} />
                        </button>
                    </div>
                    <p className="text-sm text-blue-100 mt-1 opacity-90">
                        {editMode
                            ? 'Update user information and permissions'
                            : 'Fill in the details to add a new system user'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="relative">
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                placeholder=" "
                            />
                            <label className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                        </div>

                        <div className="relative">
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                placeholder=" "
                            />
                            <label className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="relative">
                            <select
                                required
                                value={formData.role_id}
                                onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                                className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white appearance-none"
                            >
                                <option value="" disabled>Select a role...</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            <label className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none">
                                System Role <span className="text-red-500">*</span>
                            </label>
                        </div>

                        <div className="relative">
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                placeholder=" "
                            />
                            <label className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none">
                                Phone Number
                            </label>
                        </div>
                    </div>

                    {!editMode && (
                        <div className="relative">
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                placeholder=" "
                            />
                            <label className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none">
                                Initial Password <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters. User can change this later.</p>
                        </div>
                    )}

                    {editMode && (
                        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label className="text-sm font-medium text-gray-700">User Account is Active</label>
                        </div>
                    )}

                    <div className="flex gap-3 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
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
                                editMode ? 'Save Changes' : 'Create User'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
