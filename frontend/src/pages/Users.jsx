import { useState, useEffect } from 'react';
import {
    Users, Shield, Clock, Search, Edit2, Key, Loader2, Plus,
    MoreVertical, CheckCircle2, XCircle, Trash2, Mail, Phone, Calendar, X, AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function UsersList() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');

    // Modals state
    const [showUserModal, setShowUserModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [statusConfirm, setStatusConfirm] = useState(null);
    const [changingStatus, setChangingStatus] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        id: '', name: '', email: '', phone: '', role_id: '', password: '', is_active: true
    });

    const [passwordData, setPasswordData] = useState({ id: '', newPassword: '', confirmPassword: '' });

    const loadData = async () => {
        setLoading(true);
        try {
            const [uRes, rRes] = await Promise.all([
                api.get('/users?limit=1000'),
                api.get('/auth/roles').catch(() => api.get('/users/roles')) // Fallback in case route differs
            ]);
            setUsers(uRes.data.data || []);
            setRoles(rRes.data.data || []);
        } catch (err) {
            toast.error('Failed to load users data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (u.email?.toLowerCase() || '').includes(search.toLowerCase());
        const matchesRole = filterRole ? (u.role_id?.toString() === filterRole) : true;
        return matchesSearch && matchesRole;
    });

    const openAddModal = () => {
        setEditMode(false);
        setFormData({ id: '', name: '', email: '', phone: '', role_id: '', password: '', is_active: true });
        setShowUserModal(true);
    };

    const openEditModal = (user) => {
        setEditMode(true);
        setFormData({
            id: user.id,
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            role_id: user.role_id || '',
            is_active: user.is_active !== undefined ? user.is_active : true,
            password: ''
        });
        setShowUserModal(true);
    };

    const openPasswordModal = (user) => {
        setPasswordData({ id: user.id, newPassword: '', confirmPassword: '' });
        setShowPasswordModal(true);
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role_id: formData.role_id,
                is_active: formData.is_active
            };

            if (editMode) {
                await api.put(`/users/${formData.id}`, payload);
                toast.success('User updated successfully');
            } else {
                if (formData.password?.length < 6) return toast.error('Password must be at least 6 characters');
                payload.password = formData.password;
                await api.post('/users', payload);
                toast.success('User created successfully');
            }
            setShowUserModal(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to ${editMode ? 'update' : 'create'} user`);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return toast.error('Passwords do not match');
        }
        if (passwordData.newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        setSubmitting(true);
        try {
            await api.post(`/users/${passwordData.id}/reset-password`, { newPassword: passwordData.newPassword });
            toast.success('Password reset successfully');
            setShowPasswordModal(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!statusConfirm) return;
        setChangingStatus(true);
        try {
            await api.put(`/users/${statusConfirm.id}`, { is_active: !statusConfirm.is_active });
            toast.success(`User has been ${statusConfirm.is_active ? 'deactivated' : 'activated'}!`);
            setStatusConfirm(null);
            loadData();
        } catch (err) {
            toast.error('Failed to change user status');
        } finally {
            setChangingStatus(false);
        }
    };

    const getRoleBadge = (roleName) => {
        const name = (roleName || '').toLowerCase();
        if (name.includes('admin')) return 'bg-purple-100 text-purple-700 border-purple-200';
        if (name.includes('pharmacist')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (name.includes('manager')) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Users Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage system administrators, pharmacists, and staff.</p>
                </div>
                <button onClick={openAddModal} className="btn-primary flex items-center gap-2 px-5 py-2.5 shadow-md hover:shadow-lg transition-all">
                    <Plus size={18} /> Add New User
                </button>
            </div>

            {/* Filters */}
            <div className="card p-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white shadow-sm border border-gray-100 rounded-2xl">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="form-input pl-10 py-2.5 w-full bg-gray-50/50 border-gray-200 focus:bg-white transition-colors"
                    />
                </div>
                <div className="w-full sm:w-auto flex gap-3">
                    <select
                        className="form-input py-2.5 w-full sm:w-48 bg-gray-50/50 cursor-pointer"
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                    >
                        <option value="">All Roles</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card shadow-sm border border-gray-200">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-sm border-separate" style={{ borderSpacing: '0' }}>
                        <thead className="bg-[#e6f4fe] text-sky-700 capitalize tracking-wide text-[13px] font-semibold sticky top-0 z-20 shadow-[0_4px_8px_-2px_rgba(0,0,0,0.05)]">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">User Details</th>
                                <th className="px-4 py-3 whitespace-nowrap">Contact</th>
                                <th className="px-4 py-3 whitespace-nowrap">Role</th>
                                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 whitespace-nowrap">Joined</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white text-[13px]">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-3" size={28} />Loading users...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-400">No users found matching your criteria.</td></tr>
                            ) : filteredUsers.map(user => (
                                <tr key={user.id} className={`bg-white even:bg-slate-50 hover:bg-gray-50/80 transition-colors shadow-[0_-1px_2px_rgba(0,0,0,0.05)] relative z-0 hover:z-10 ${!user.is_active ? 'opacity-70 bg-gray-50/50' : ''}`}>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm
                                                ${user.is_active ? 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                                                {(user.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-900 block">{user.name}</span>
                                                <span className="text-xs text-gray-500 font-mono">ID: #{user.id}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                                            <Mail size={14} className="text-gray-400" /> {user.email}
                                        </div>
                                        {user.phone && (
                                            <div className="flex items-center gap-2 text-gray-500 text-xs">
                                                <Phone size={12} className="text-gray-400" /> {user.phone}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md border ${getRoleBadge(user.role?.name || user.role_name)}`}>
                                            {user.role?.name || user.role_name || 'Staff'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        {user.is_active ? (
                                            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md w-max border border-emerald-100">
                                                <CheckCircle2 size={14} /> <span className="text-xs font-bold uppercase tracking-wider">Active</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md w-max border border-gray-200">
                                                <XCircle size={14} /> <span className="text-xs font-bold uppercase tracking-wider">Inactive</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-gray-400" />
                                            {format(new Date(user.created_at || new Date()), 'MMM dd, yyyy')}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEditModal(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit User">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => openPasswordModal(user)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Reset Password">
                                                <Key size={16} />
                                            </button>
                                            <button onClick={() => setStatusConfirm(user)} className={`p-2 rounded-lg transition-colors ${user.is_active ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={user.is_active ? "Deactivate User" : "Activate User"}>
                                                {user.is_active ? <Trash2 size={16} /> : <CheckCircle2 size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create / Edit User Modal - Modern UI */}
            {showUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-gray-100">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-emerald-500 px-6 py-6 text-white rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-xl flex items-center gap-2">
                                    {editMode ? <Edit2 size={20} className="text-white" /> : <Plus size={20} className="text-white" />}
                                    {editMode ? 'Edit User Profile' : 'Create New User'}
                                </h3>
                                <button
                                    onClick={() => setShowUserModal(false)}
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

                        <form onSubmit={handleUserSubmit} className="p-6 space-y-6">
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
                                    onClick={() => setShowUserModal(false)}
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
            )}

            {/* Reset Password Modal (kept original) */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-lg text-amber-900 flex items-center gap-2">
                                <Key size={20} className="text-amber-600" /> Administrative Password Reset
                            </h3>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                            <p className="text-sm text-gray-600 mb-4">You are forcefully resetting a user's password. They will be required to use this new password immediately.</p>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase">New Password <span className="text-red-500">*</span></label>
                                <input type="password" required minLength={6} value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="form-input py-2.5 w-full" placeholder="Enter new password" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase">Confirm Password <span className="text-red-500">*</span></label>
                                <input type="password" required minLength={6} value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="form-input py-2.5 w-full" placeholder="Re-enter new password" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors w-1/3">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors flex justify-center items-center gap-2 shadow-sm hover:shadow">
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Reset Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Status Change Confirmation Modal */}
            {statusConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !changingStatus && setStatusConfirm(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in shadow-gray-900/10">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${statusConfirm.is_active ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                <AlertTriangle size={28} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">
                                {statusConfirm.is_active ? 'Deactivate User?' : 'Activate User?'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                Are you sure you want to {statusConfirm.is_active ? 'deactivate' : 'activate'}{' '}
                                <span className="font-bold text-gray-800">{statusConfirm.name}</span>?
                                <br />
                                <span className="text-xs mt-1 block italic text-gray-400">
                                    {statusConfirm.is_active ? 'User will no longer be able to sign in.' : 'User will regain access to the system.'}
                                </span>
                            </p>
                            <div className="flex gap-3 w-full mt-4">
                                <button
                                    onClick={() => setStatusConfirm(null)}
                                    disabled={changingStatus}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleToggleStatus}
                                    disabled={changingStatus}
                                    className={`flex-1 py-2.5 rounded-xl text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm
                                        ${statusConfirm.is_active ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                                >
                                    {changingStatus ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        statusConfirm.is_active ? 'Deactivate' : 'Activate'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}