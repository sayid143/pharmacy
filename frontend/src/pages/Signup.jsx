import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, User, Mail, Phone, Lock, UserPlus, Activity, Shield } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Signup() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [signupError, setSignupError] = useState('');
    const [roles, setRoles] = useState([]);
    const [isLoadingRoles, setIsLoadingRoles] = useState(true);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const { data } = await api.get('/auth/roles');
                setRoles(data.data || []);
            } catch (err) {
                toast.error('Failed to load roles for registration.');
            } finally {
                setIsLoadingRoles(false);
            }
        };
        fetchRoles();
    }, []);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm({
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            role_id: '',
        },
    });

    const password = watch('password');

    const onSubmit = async (data) => {
        setIsLoading(true);
        setSignupError('');
        try {
            await api.post('/auth/register', {
                name: data.name,
                email: data.email,
                phone: data.phone,
                password: data.password,
                role_id: parseInt(data.role_id, 10),
            });
            toast.success('Account created successfully! Please sign in.');
            navigate('/login', { replace: true });
        } catch (err) {
            setSignupError(err.response?.data?.message || 'Registration failed');
            console.error('Signup failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4 sm:p-6 overflow-hidden">
            <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100/50 p-8 md:p-12 text-center animate-fade-in mx-auto border-t-4 border-t-emerald-500">
                
                {/* Activity Icon */}
                <div className="flex justify-center mb-8">
                    <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 shadow-inner rotate-3 hover:rotate-0 transition-transform duration-300">
                        <Activity size={40} strokeWidth={2.5} />
                    </div>
                </div>

                <div className="mb-8">
                    <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent tracking-tight">
                        Pharmacy System
                    </h2>
                    <p className="text-gray-500 font-medium tracking-tight text-sm">
                        Enterprise Pharmacy Network
                    </p>
                    <p className="mt-3 text-emerald-500 font-bold text-sm">
                        Create an account to join
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="text-left space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Username */}
                        <div>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10">
                                    <User size={20} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Username"
                                    autoComplete="username"
                                    className={`w-full h-14 pl-12 pr-4 bg-gray-50/50 hover:bg-white border-2 rounded-2xl transition-all outline-none font-medium placeholder:text-gray-400 text-gray-700
                                        ${errors.name || signupError ? 'border-red-200 focus:border-red-400 bg-white' : 'border-gray-100 focus:border-blue-400 focus:bg-white'}`}
                                    {...register('name', { required: 'Required', minLength: { value: 3, message: 'Min 3 chars' } })}
                                />
                            </div>
                            {errors.name && <p className="mt-1 text-[11px] text-red-500 font-bold px-2">{errors.name.message}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10">
                                    <Mail size={20} />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    autoComplete="email"
                                    className={`w-full h-14 pl-12 pr-4 bg-gray-50/50 hover:bg-white border-2 rounded-2xl transition-all outline-none font-medium placeholder:text-gray-400 text-gray-700
                                        ${errors.email || signupError ? 'border-red-200 focus:border-red-400 bg-white' : 'border-gray-100 focus:border-blue-400 focus:bg-white'}`}
                                    {...register('email', { 
                                        required: 'Required',
                                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
                                    })}
                                />
                            </div>
                            {errors.email && <p className="mt-1 text-[11px] text-red-500 font-bold px-2">{errors.email.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Phone */}
                        <div>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10">
                                    <Phone size={20} />
                                </div>
                                <input
                                    type="tel"
                                    placeholder="Phone Number"
                                    autoComplete="tel"
                                    className={`w-full h-14 pl-12 pr-4 bg-gray-50/50 hover:bg-white border-2 rounded-2xl transition-all outline-none font-medium placeholder:text-gray-400 text-gray-700
                                        ${errors.phone || signupError ? 'border-red-200 focus:border-red-400 bg-white' : 'border-gray-100 focus:border-blue-400 focus:bg-white'}`}
                                    {...register('phone', { required: 'Required' })}
                                />
                            </div>
                            {errors.phone && <p className="mt-1 text-[11px] text-red-500 font-bold px-2">{errors.phone.message}</p>}
                        </div>

                        {/* Role */}
                        <div>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10">
                                    <Shield size={20} />
                                </div>
                                <select
                                    className={`w-full h-14 pl-12 pr-10 bg-gray-50/50 hover:bg-white border-2 rounded-2xl transition-all outline-none font-medium text-gray-700 appearance-none cursor-pointer
                                        ${errors.role_id || signupError ? 'border-red-200 focus:border-red-400 bg-white' : 'border-gray-100 focus:border-blue-400 focus:bg-white'}`}
                                    {...register('role_id', { required: 'Required' })}
                                    disabled={isLoadingRoles}
                                >
                                    <option value="" disabled className="text-gray-300">
                                        {isLoadingRoles ? 'Loading...' : 'Select Role'}
                                    </option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors z-10">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            {errors.role_id && <p className="mt-1 text-[11px] text-red-500 font-bold px-2">{errors.role_id.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Password */}
                        <div>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    autoComplete="new-password"
                                    className={`w-full h-14 pl-12 pr-12 bg-gray-50/50 hover:bg-white border-2 rounded-2xl transition-all outline-none font-medium placeholder:text-gray-400 text-gray-700
                                        ${errors.password || signupError ? 'border-red-200 focus:border-red-400 bg-white' : 'border-gray-100 focus:border-blue-400 focus:bg-white'}`}
                                    {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-[11px] text-red-500 font-bold px-2">{errors.password.message}</p>}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Confirm Password"
                                    autoComplete="new-password"
                                    className={`w-full h-14 pl-12 pr-12 bg-gray-50/50 hover:bg-white border-2 rounded-2xl transition-all outline-none font-medium placeholder:text-gray-400 text-gray-700
                                        ${errors.confirmPassword || signupError ? 'border-red-200 focus:border-red-400 bg-white' : 'border-gray-100 focus:border-blue-400 focus:bg-white'}`}
                                    {...register('confirmPassword', { 
                                        required: 'Required',
                                        validate: (value) => value === password || 'No match'
                                    })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10 focus:outline-none"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="mt-1 text-[11px] text-red-500 font-bold px-2">{errors.confirmPassword.message}</p>}
                        </div>
                    </div>

                    {/* Error Message */}
                    {signupError && (
                        <div className="bg-red-50 text-red-600 py-3 rounded-xl text-sm font-bold animate-shake text-center mt-2">
                            {signupError}
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <UserPlus size={20} strokeWidth={3} />
                                    <span>Create Account</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <p className="text-gray-500 font-medium">
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="text-blue-600 font-bold hover:text-blue-700 transition-colors hover:underline"
                        >
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
