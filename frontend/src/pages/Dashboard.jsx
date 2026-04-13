import { useState, useEffect } from 'react';
import { Pill, DollarSign, TrendingUp, CreditCard, CheckCircle2, ShoppingCart } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import api from '../services/api';
import { format, parseISO } from 'date-fns';

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
        'text-orange-500': 'border-l-orange-500'
    }[color] || 'border-l-gray-200';

    return (
        <div className={`card p-3.5 flex items-center gap-3 border-l-4 ${borderClass} hover:shadow-md transition-shadow bg-white`}>
            <div>
                <p className="text-[11px] text-gray-500 font-medium mb-0.5">{title}</p>
                <h3 className="text-xl font-bold text-gray-900 leading-tight">{value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
                <Icon size={24} />
            </div>
        </div>
    );
};

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/analytics/dashboard')
            .then(res => setData(res.data.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const stats = data?.summary || {};

    // Weekly Sales Data
    const weeklyData = (data?.weekly_trend || []).map(item => ({
        date: format(parseISO(item.date), 'MMM dd'),
        sales: parseFloat(item.revenue)
    }));

    // Income vs Expenses (using monthly trend for this demo)
    const incomeExpenseData = (data?.monthly_trend || []).map(item => ({
        date: format(parseISO(item.month + '-01'), 'MMM dd'),
        Income: parseFloat(item.revenue),
        Expenses: parseFloat(stats.monthly_expenses / (data?.monthly_trend?.length || 1) || 0) // Approximation if daily expenses aren't sent
    }));

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 text-sm mt-1">Welcome back, Pharmacare!</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <StatCard
                    title="Total Medicines"
                    value={stats.total_medicines || 0}
                    icon={Pill}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatCard
                    title="Today's Sales"
                    value={stats.today_transactions || 0}
                    icon={ShoppingCart}
                    color="text-violet-600"
                    bg="bg-violet-50"
                />
                <StatCard
                    title="Today's Profit"
                    value={`$${Number(stats.today_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={TrendingUp}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <StatCard
                    title="Today's Revenue"
                    value={`$${Number(stats.today_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    color="text-blue-500"
                    bg="bg-blue-50"
                />
                <StatCard
                    title="Today's Debts"
                    value={`$${Number(stats.today_debt_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={CreditCard}
                    color="text-amber-500"
                    bg="bg-amber-50"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card p-5 lg:col-span-2">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 font-display">Sales Analytics</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => [`$${value.toFixed(2)}`, 'Sales']}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Medicine Stock Status */}
                <div className="card p-5">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 font-display">Stock Overview</h2>

                    <div className="space-y-3">
                        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-emerald-800">In Stock</p>
                                    <p className="text-xs text-emerald-600">Available for sale</p>
                                </div>
                            </div>
                            <span className="text-2xl font-bold text-emerald-700">{stats.in_stock_count || 0}</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-between transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-600 shadow-sm">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-amber-800">Low Stock</p>
                                    <p className="text-xs text-amber-600">Reorder soon</p>
                                </div>
                            </div>
                            <span className="text-2xl font-bold text-amber-700">{stats.low_stock_count || 0}</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-between transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-red-600 shadow-sm">
                                    <Pill size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-red-800">Out of Stock</p>
                                    <p className="text-xs text-red-600">Unavailable</p>
                                </div>
                            </div>
                            <span className="text-2xl font-bold text-red-700">{stats.out_of_stock_count || 0}</span>
                        </div>

                        <div className="mt-6 p-4 rounded-2xl bg-gray-50 border border-gray-100 italic text-xs text-gray-500">
                            * Stock alerts are triggered when quantity falls below the minimum stock level defined per item.
                        </div>
                    </div>
                </div>
            </div>

            {/* Income vs Expenses & Recent Sales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-5">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 font-display">Revenue vs Expenses</h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={incomeExpenseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="Expenses" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card p-5 overflow-hidden">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 font-display">Recent Transactions</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#e6f4fe] text-sky-700 uppercase tracking-widest text-[11px] font-bold">
                                <tr>
                                    <th className="px-3 py-3">Invoice</th>
                                    <th className="px-3 py-3">Customer</th>
                                    <th className="px-3 py-3 text-right">Amount</th>
                                    <th className="px-3 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {(data?.recent_sales || []).map((sale) => (
                                    <tr key={sale.id} className="text-sm transition-colors hover:bg-gray-50/50">
                                        <td className="px-3 py-4 font-bold text-gray-900">#{sale.invoice_number}</td>
                                        <td className="px-3 py-4 text-gray-700">{sale.customer_name || 'Walk-in'}</td>
                                        <td className="px-3 py-4 text-right font-bold text-gray-900">ETB {Number(sale.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-3 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${sale.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                sale.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {sale.payment_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}