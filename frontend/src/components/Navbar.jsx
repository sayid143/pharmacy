import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, Search, MessageSquare, LogOut, User, Settings, Plus, MapPin, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserFormModal from './UserFormModal';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Navbar({ onMenuClick }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profileOpen, setProfileOpen] = useState(false);

    // Profile Settings state
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [roles, setRoles] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        api.get('/auth/roles').catch(() => api.get('/users/roles'))
            .then(res => setRoles(res.data.data || []))
            .catch(() => { });
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleProfileSubmit = async (formData) => {
        setSubmitting(true);
        try {
            await api.put(`/users/${user.id}`, {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role_id: formData.role_id,
                is_active: formData.is_active
            });
            toast.success('Profile updated successfully. Please sign in again to apply changes.', { duration: 5000 });
            setShowProfileModal(false);

            // Log out to force a token refresh with new details
            setTimeout(() => {
                handleLogout();
            }, 1000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSubmitting(false);
        }
    };

    const openProfileSettings = () => {
        setProfileOpen(false);
        setShowProfileModal(true);
    };

    return (
        <>
            <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center gap-4 sticky top-0 z-30 print:hidden">
                {/* Mobile menu button */}
                <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-700">
                    <Menu size={22} />
                </button>

                {/* Branch Info - Center */}
                <div className="flex-1 hidden md:flex justify-center">
                    {user?.branch && (
                        <div className="flex items-center gap-4 bg-gray-50/50 px-4 py-1.5 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 text-blue-600">
                                <Building size={16} className="opacity-70" />
                                <span className="text-xs font-bold uppercase tracking-wider">{user.branch.name}</span>
                            </div>
                            <div className="w-px h-4 bg-gray-200" />
                            <div className="flex items-center gap-2 text-gray-500">
                                <MapPin size={16} className="opacity-70" />
                                <span className="text-xs font-medium">{user.branch.address || 'Location N/A'}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    {/* New Sale button */}
                    <button
                        onClick={() => navigate('/sales')}
                        className="btn-primary btn-sm hidden md:flex"
                    >
                        <Plus size={15} />
                        New Sale
                    </button>

                    {/* Profile */}
                    <div className="relative">
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm">
                                {user?.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-medium text-gray-800 leading-tight">{user?.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{user?.role_name}</p>
                            </div>
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-card-hover border border-gray-100 py-1 z-50">
                                <div className="px-3 py-2 border-b border-gray-100">
                                    <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                                    <p className="text-xs text-gray-500">{user?.email}</p>
                                </div>
                                <button
                                    onClick={openProfileSettings}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                                >
                                    <User size={15} /> Profile Settings
                                </button>

                                <div className="border-t border-gray-100 mt-1">
                                    <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer">
                                        <LogOut size={15} /> Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Profile Settings Modal */}
            <UserFormModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                editMode={true}
                initialData={user}
                roles={roles}
                onSubmit={handleProfileSubmit}
                submitting={submitting}
            />
        </>
    );
}
