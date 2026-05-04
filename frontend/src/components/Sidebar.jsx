// src/components/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Pill, ShoppingCart, BarChart3, DollarSign, CreditCard,
    LogOut, X, Activity, ChevronRight, Users, Package, Settings, ClipboardList,
    Menu
} from 'lucide-react';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/medicines', label: 'Medicine Management', icon: Pill },
    { to: '/sales', label: 'Sales (POS)', icon: ShoppingCart },
    { to: '/transactions', label: 'Transactions', icon: ClipboardList },
    { to: '/debts', label: 'Debt Management', icon: CreditCard },
    { to: '/expenses', label: 'Expense Tracking', icon: DollarSign },
    { to: '/reports', label: 'Analytics & Reports', icon: BarChart3 },
    { to: '/suppliers', label: 'Suppliers', icon: Package },
    { to: '/users', label: 'Users', icon: Users, adminOnly: true },

];

export default function Sidebar({ mobileOpen, onClose, isCollapsed, setIsCollapsed }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin' || user?.role_name?.toLowerCase() === 'admin';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            {/* SVG Gradient Definition for Logo */}
            <svg width="0" height="0" className="absolute pointer-events-none opacity-0">
                <defs>
                    <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2563eb" /> {/* blue-600 */}
                        <stop offset="100%" stopColor="#10b981" /> {/* emerald-500 */}
                    </linearGradient>
                </defs>
            </svg>

            {/* Desktop Sidebar - WHITE background with GRADIENT Logo */}
            <aside className={`hidden lg:block ${isCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto transition-all duration-300 shadow-sm z-40 print:hidden`}>
                <div className="flex flex-col h-full text-gray-900 ">
                    {/* Logo / Header */}
                    <div className={`p-4 bg-white border-b border-gray-100 flex items-center  ${isCollapsed ? 'justify-center border-none' : 'justify-between shadow-sm '}`}>
                        {!isCollapsed && (
                            <div className="flex items-center gap-3 overflow-hidden ">
                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100 cursor-default">
                                    <Activity className="w-6 h-6" style={{ stroke: 'url(#logo-gradient)' }} />
                                </div>
                                <div className="truncate cursor-default select-none">
                                    <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent ">
                                        Pharmacy OS
                                    </h1>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Admin Portal</p>
                                </div>
                            </div>
                        )}
                        {isCollapsed && (
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 cursor-default">
                                <Activity className="w-6 h-6" style={{ stroke: 'url(#logo-gradient)' }} />
                            </div>
                        )}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={`p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer ${isCollapsed ? 'mt-2' : ''}`}
                        >
                            <Menu size={20} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-6">
                        <ul className="space-y-1">
                            {navItems
                                .filter(item => !item.adminOnly || isAdmin)
                                .map(item => (
                                    <li key={item.to}>
                                        <NavLink
                                            to={item.to}
                                            end={item.exact}
                                            className={({ isActive }) => `
                                                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 mx-2
                                                ${isActive
                                                    ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                                                    : 'text-gray-700 hover:bg-gray-100 hover:text-blue-700'}
                                            `}
                                            onClick={onClose}
                                            title={isCollapsed ? item.label : ''}
                                        >
                                            {({ isActive }) => (
                                                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} w-full`}>
                                                    <item.icon size={20} className="flex-shrink-0" />
                                                    {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                                                    {!isCollapsed && isActive && <ChevronRight size={16} className="opacity-70" />}
                                                </div>
                                            )}
                                        </NavLink>
                                    </li>
                                ))}
                        </ul>
                    </nav>

                    {/* User & Logout - bottom */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50/30">
                        {!isCollapsed && (
                            <div className="flex items-center gap-3 px-2 py-3 mb-3 rounded-xl bg-gray-50">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold flex-shrink-0 border border-blue-200">
                                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate text-gray-900">{user?.name || 'User'}</p>
                                    <p className="text-xs text-gray-500 capitalize">
                                        {user?.role_name || 'Staff'}
                                    </p>
                                </div>
                            </div>
                        )}
                        {isCollapsed && (
                            <div className="flex justify-center mb-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all`}
                            title={isCollapsed ? 'Logout' : ''}
                        >
                            <LogOut size={18} />
                            {!isCollapsed && <span>Logout</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar - same white style */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/60" onClick={onClose} />
                    <div className="relative w-64 h-full bg-white animate-slide-in-left overflow-y-auto">
                        <button
                            className="absolute top-5 right-5 text-gray-700 hover:text-gray-900 z-10 p-2 rounded-full hover:bg-gray-100"
                            onClick={onClose}
                        >
                            <X size={28} strokeWidth={2.5} />
                        </button>

                        <div className="flex flex-col h-full text-gray-900">
                            <div className="p-6 bg-white border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 cursor-default">
                                        <Activity className="w-6 h-6" style={{ stroke: 'url(#logo-gradient)' }} />
                                    </div>
                                    <div className="cursor-default select-none">
                                        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
                                            Pharmacy OS
                                        </h1>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Admin Portal</p>
                                    </div>
                                </div>
                            </div>

                            <nav className="flex-1 px-3 py-6">
                                <ul className="space-y-1">
                                    {navItems
                                        .filter(item => !item.adminOnly || isAdmin)
                                        .map(item => (
                                            <li key={item.to}>
                                                <NavLink
                                                    to={item.to}
                                                    end={item.exact}
                                                    className={({ isActive }) => `
                                                        flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                                                        ${isActive
                                                            ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                                                            : 'text-gray-700 hover:bg-gray-100 hover:text-blue-700'}
                                                    `}
                                                    onClick={onClose}
                                                >
                                                    {({ isActive }) => (
                                                        <div className="flex items-center gap-3 w-full">
                                                            <item.icon size={20} className="flex-shrink-0" />
                                                            <span className="flex-1">{item.label}</span>
                                                            {isActive && <ChevronRight size={16} className="opacity-70" />}
                                                        </div>
                                                    )}
                                                </NavLink>
                                            </li>
                                        ))}
                                </ul>
                            </nav>

                            <div className="p-4 border-t border-gray-200 bg-gray-50/30">
                                <div className="flex items-center gap-3 px-2 py-3 mb-3 rounded-xl bg-gray-50">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold flex-shrink-0 border border-blue-200">
                                        {user?.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate text-gray-900">{user?.name || 'User'}</p>
                                        <p className="text-xs text-gray-500 capitalize">
                                            {user?.role_name || 'Staff'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
                                >
                                    <LogOut size={18} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}