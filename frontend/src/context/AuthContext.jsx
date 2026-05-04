import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        try {
            const { data } = await api.get('/auth/profile');
            setUser(data.data);
        } catch {
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, [fetchProfile]);

    const login = async (username, password) => {
        const { data } = await api.post('/auth/login', { username, password });
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        setUser(data.data.user);
        toast.success(`Welcome back, ${data.data.user.name}!`);
        return data.data.user;
    };

    const register = async (userData) => {
        const { data } = await api.post('/auth/register', userData);
        toast.success('Account created successfully! Please sign in.');
        return data.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
        toast.success('Logged out successfully.');
    };

    const isAdmin = user?.role_name === 'admin';
    const isPharmacist = user?.role_name === 'pharmacist' || isAdmin;

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, register, fetchProfile, isAdmin, isPharmacist }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export default AuthContext;
