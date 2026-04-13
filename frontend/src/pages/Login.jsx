import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, User, Lock, LogIn, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: {
            username: '',
            password: '',
        },
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        setLoginError('');
        try {
            await login(data.username, data.password);
            navigate('/', { replace: true });
        } catch (err) {
            setLoginError(err.response?.data?.message || 'Invalid credentials');
            console.error('Login failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4 sm:p-6">
            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100/50 p-8 md:p-12 text-center animate-fade-in mx-auto">

                {/* Activity Icon */}
                <div className="flex justify-center mb-10">
                    <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 shadow-inner rotate-3 hover:rotate-0 transition-transform duration-300">
                        <Activity size={48} strokeWidth={2.5} />
                    </div>
                </div>

                <div className="mb-10">
                    <h2 className="text-4xl font-black mb-3 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent tracking-tight">
                        Pharmacy System
                    </h2>
                    <p className="text-gray-500 font-medium tracking-tight">
                        Your personalized dashboard awaits
                    </p>
                    <p className="mt-4 text-sky-400 font-bold text-sm">
                        Sign in to access your account
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
                    {/* Username Field */}
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                            <User size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Enter username"
                            autoComplete="username"
                            className={`w-full h-14 pl-12 pr-4 bg-white border-2 rounded-2xl transition-all outline-none font-medium placeholder:text-gray-300 text-gray-700
                                ${errors.username || loginError ? 'border-red-100 focus:border-red-400' : 'border-blue-50 focus:border-blue-400'}`}
                            {...register('username', { required: 'Please enter your username' })}
                        />
                    </div>

                    {/* Password Field */}
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                            <Lock size={20} />
                        </div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter password"
                            autoComplete="current-password"
                            className={`w-full h-14 pl-12 pr-12 bg-white border-2 rounded-2xl transition-all outline-none font-medium placeholder:text-gray-300 text-gray-700
                                ${errors.password || loginError ? 'border-red-100 focus:border-red-400' : 'border-blue-50 focus:border-blue-400'}`}
                            {...register('password', { required: 'Please enter your password' })}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {/* Error Message */}
                    {loginError && (
                        <div className="bg-red-50 text-red-600 py-3 rounded-xl text-sm font-bold animate-shake">
                            {loginError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-14 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-6"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <LogIn size={20} strokeWidth={3} />
                                <span>Sign In</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <p className="text-gray-500 font-medium">
                        Don't have an account?{' '}
                        <Link
                            to="/signup"
                            className="text-blue-600 font-bold hover:text-blue-700 transition-colors hover:underline"
                        >
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}