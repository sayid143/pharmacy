import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, AlertTriangle, Pill, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Filter, Check, List, LayoutGrid } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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
        <div className={`card p-5 flex items-center gap-4 border-l-4 ${borderClass} hover:shadow-md transition-shadow bg-white`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium mb-0.5">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            </div>
        </div>
    );
};

const COLUMNS = [
    { id: 'medicine', label: 'Medicine' },
    { id: 'batch', label: 'Batch' },
    { id: 'expiry', label: 'Expiry' },
    { id: 'status', label: 'Status' },
    { id: 'stock', label: 'In Stock' },
    { id: 'buying_price', label: 'Buying Price' },
    { id: 'selling_price', label: 'Selling Price' },
    { id: 'actions', label: 'Actions' },
];

export default function Medicines() {
    const { isPharmacist, isAdmin } = useAuth();
    const [searchParams] = useSearchParams();
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all, low, out
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [deleteId, setDeleteId] = useState(null);
    const [stats, setStats] = useState({ total: 0, inStock: 0, lowStock: 0, outOfStock: 0, expired: 0, expiringSoon: 0 });

    // Table Features (Like Reports Page)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [mobileViewMode, setMobileViewMode] = useState('card'); // 'table' | 'card'
    const [showColumnFilter, setShowColumnFilter] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const saved = localStorage.getItem('medicine_column_visibility');
            return saved ? JSON.parse(saved) : {
                medicine: true,
                batch: true,
                expiry: true,
                status: true,
                stock: true,
                buying_price: true,
                selling_price: true,
                actions: true
            };
        } catch (e) {
            return {
                medicine: true,
                batch: true,
                expiry: true,
                status: true,
                stock: true,
                buying_price: true,
                selling_price: true,
                actions: true
            };
        }
    });

    useEffect(() => {
        localStorage.setItem('medicine_column_visibility', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleColumn = (column) => {
        setVisibleColumns(prev => ({
            ...prev,
            [column]: !prev[column]
        }));
    };



    const fetchMedicines = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 15, search };
            if (filter === 'low') params.low_stock = 'true';
            if (filter === 'out') params.out_of_stock = 'true';
            if (filter === 'expired') params.expired = 'true';
            if (filter === 'expiring') params.expiring_soon = 'true';

            const { data } = await api.get('/medicines', { params });
            setMedicines(data.data);
            setPagination(data.pagination);

            // Fetch real stats
            const statsRes = await api.get('/medicines/stats');
            if (statsRes.data.success) {
                setStats({
                    total: statsRes.data.data.total,
                    inStock: statsRes.data.data.inStock,
                    lowStock: statsRes.data.data.lowStock,
                    outOfStock: statsRes.data.data.outOfStock,
                    expired: statsRes.data.data.expired,
                    expiringSoon: statsRes.data.data.expiringSoon
                });
            }
        } catch (e) {
            console.error('Error fetching medicines or stats:', e);
        }
        finally { setLoading(false); }
    }, [search, filter]);

    useEffect(() => {
        const t = setTimeout(() => fetchMedicines(1), 400);
        return () => clearTimeout(t);
    }, [fetchMedicines]);

    const handleDelete = async (id) => {
        try {
            await api.delete(`/medicines/${id}`);
            toast.success('Medicine deleted successfully.');
            fetchMedicines(pagination.page);
        } catch (e) { }
        setDeleteId(null);
    };

    const getStockBadge = (med) => {
        if (med.days_to_expiry <= 0) return <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1 w-fit"><XCircle size={12} /> Expired</span>;
        if (med.quantity <= 0) return <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1 w-fit"><XCircle size={12} /> Out of Stock</span>;
        if (med.quantity <= med.min_stock_level) return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full flex items-center gap-1 w-fit"><AlertTriangle size={12} /> Low Stock</span>;
        if (med.days_to_expiry > 0 && med.days_to_expiry <= 30) return <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full flex items-center gap-1 w-fit border border-red-100"><Clock size={12} /> Expiring</span>;
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full flex items-center gap-1 w-fit"><CheckCircle2 size={12} /> In Stock</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Medicines Management</h1>
                </div>
                {isPharmacist && (
                    <Link to="/medicines/add" className="btn-primary">
                        <Plus size={16} /> Add Medicine
                    </Link>
                )}
            </div>

            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard title="Total" value={stats.total} icon={Pill} color="text-blue-600" bg="bg-blue-100" />
                <StatCard title="In Stock" value={stats.inStock} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-100" />
                <StatCard title="Low Stock" value={stats.lowStock} icon={AlertTriangle} color="text-amber-500" bg="bg-amber-100" />
                <StatCard title="Out of Stock" value={stats.outOfStock} icon={XCircle} color="text-red-500" bg="bg-red-100" />
                <StatCard title="Expired" value={stats.expired} icon={XCircle} color="text-gray-600" bg="bg-gray-100" />
                <StatCard title="Expiring Soon" value={stats.expiringSoon} icon={Clock} color="text-orange-500" bg="bg-orange-100" />
            </div>

            {/* Filters Row */}
            <div className="card p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search medicines..."
                            className="form-input pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white"
                        />
                    </div>

                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="form-input w-48 h-11 bg-gray-50 border-gray-200 focus:bg-white"
                    >
                        <option value="all">All Medicines</option>
                        <option value="low">Low Stock</option>
                        <option value="out">Out of Stock</option>
                        <option value="expired">Expired</option>
                        <option value="expiring">Expiring Soon</option>
                    </select>

                    <div className="flex items-center gap-2">
                        {/* Mobile View Selector */}
                        {isMobile && (
                            <div className="flex items-center bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                                <button
                                    onClick={() => setMobileViewMode('table')}
                                    className={`p-2 rounded-lg transition-all ${mobileViewMode === 'table' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Table View"
                                >
                                    <List size={18} />
                                </button>
                                <button
                                    onClick={() => setMobileViewMode('card')}
                                    className={`p-2 rounded-lg transition-all ${mobileViewMode === 'card' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Card View"
                                >
                                    <LayoutGrid size={18} />
                                </button>
                            </div>
                        )}

                        {/* Column Filter Dropdown */}
                        <div className={`relative ${showColumnFilter ? 'z-[100]' : 'z-10'}`}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowColumnFilter(!showColumnFilter);
                                }}
                                className={`p-2.5 rounded-xl transition-all flex items-center justify-center border shadow-sm cursor-pointer ${showColumnFilter ? 'bg-blue-600 border-blue-600 text-white' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 border-gray-200 bg-white'}`}
                                title="Column Visibility"
                            >
                                <Filter size={20} />
                            </button>

                            {showColumnFilter && (
                                <>
                                    <div className="fixed inset-0 z-[90] bg-black/5" onClick={() => setShowColumnFilter(false)} />
                                    <div 
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[110] overflow-hidden"
                                    >
                                        <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Display Columns</span>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto px-1">
                                            {COLUMNS.filter(col => col.id !== 'actions' || isPharmacist).map(col => (
                                                <button
                                                    key={col.id}
                                                    onClick={() => toggleColumn(col.id)}
                                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
                                                >
                                                    <span className={`text-[13px] font-medium ${visibleColumns[col.id] ? 'text-gray-900' : 'text-gray-400'}`}>
                                                        {col.label}
                                                    </span>
                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${visibleColumns[col.id]
                                                        ? 'bg-blue-600 border-blue-600 shadow-sm'
                                                        : 'bg-white border-gray-200'
                                                        }`}>
                                                        {visibleColumns[col.id] && <Check size={12} className="text-white" />}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="card overflow-hidden">
                {(!isMobile || mobileViewMode === 'table') ? (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-sm border-separate min-w-[1000px]" style={{ borderSpacing: '0' }}>
                            <thead className="bg-[#e6f4fe] text-sky-700 capitalize tracking-wide text-[13px] font-semibold sticky top-0 z-20 shadow-[0_4px_8px_-2px_rgba(0,0,0,0.05)]">
                                <tr>
                                    {visibleColumns.medicine && <th className="px-4 py-3 whitespace-nowrap">Medicine</th>}
                                    {visibleColumns.batch && <th className="px-4 py-3 whitespace-nowrap">Batch</th>}
                                    {visibleColumns.expiry && <th className="px-4 py-3 whitespace-nowrap">Expiry</th>}
                                    {visibleColumns.status && <th className="px-4 py-3 whitespace-nowrap">Status</th>}
                                    {visibleColumns.stock && <th className="px-4 py-3 text-center whitespace-nowrap">In Stock</th>}
                                    {visibleColumns.buying_price && <th className="px-4 py-3 text-right whitespace-nowrap">Buying Price</th>}
                                    {visibleColumns.selling_price && <th className="px-4 py-3 text-right whitespace-nowrap">Selling Price</th>}
                                    {visibleColumns.actions && isPharmacist && <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="bg-white text-[13px]">
                                {loading ? (
                                    <tr>
                                        <td colSpan={COLUMNS.filter(c => visibleColumns[c.id] && (c.id !== 'actions' || isPharmacist)).length} className="text-center py-20 text-gray-400">
                                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                            Loading inventory...
                                        </td>
                                    </tr>
                                ) : medicines.length > 0 ? (
                                    medicines.map(med => (
                                        <tr key={med.id} className="odd:bg-gray-50 even:bg-white hover:bg-gray-100/50 transition-colors [&>td]:border-b [&>td]:border-gray-200">
                                            {visibleColumns.medicine && (
                                                <td className="px-4 py-2.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-50/50 rounded-xl flex items-center justify-center border border-blue-100/50 flex-shrink-0 shadow-sm">
                                                            {med.image ? <img src={med.image} className="w-full h-full object-cover rounded-xl" alt="" /> : <Pill size={18} className="text-blue-500" />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <p className="font-bold text-gray-900 leading-tight">{med.name}</p>
                                                            <p className="text-[11px] text-gray-500 font-medium">{med.category_name || med.dosage_form}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.batch && (
                                                <td className="px-4 py-2.5 whitespace-nowrap">
                                                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded text-[11px] border border-blue-100/50">{med.batch_number}</span>
                                                </td>
                                            )}
                                            {visibleColumns.expiry && (
                                                <td className="px-4 py-2.5 whitespace-nowrap font-medium">
                                                    <span className={`${med.days_to_expiry <= 30 ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                                        {format(new Date(med.expiry_date), 'MMM dd, yyyy')}
                                                    </span>
                                                </td>
                                            )}
                                            {visibleColumns.status && (
                                                <td className="px-4 py-2.5 whitespace-nowrap">
                                                    {getStockBadge(med)}
                                                </td>
                                            )}
                                            {visibleColumns.stock && (
                                                <td className="px-4 py-2.5 whitespace-nowrap text-center">
                                                    <span className="font-bold text-gray-900 border border-gray-200/60 bg-white px-2 py-0.5 rounded shadow-sm">{med.quantity}</span>
                                                    <span className="ml-1 text-[11px] text-gray-500">{med.unit || 'pcs'}</span>
                                                </td>
                                            )}
                                            {visibleColumns.buying_price && (
                                                <td className="px-4 py-2.5 text-right whitespace-nowrap font-bold text-gray-900">
                                                    <span className="mr-1">ETB</span>
                                                    {parseFloat(med.purchase_price).toFixed(0)}
                                                </td>
                                            )}
                                            {visibleColumns.selling_price && (
                                                <td className="px-4 py-2.5 text-right whitespace-nowrap font-bold text-gray-900 text-[14px]">
                                                    <span className="mr-1">ETB</span>
                                                    {parseFloat(med.selling_price).toFixed(0)}
                                                </td>
                                            )}
                                            {visibleColumns.actions && isPharmacist && (
                                                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Link to={`/medicines/edit/${med.id}`} className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                                                            <Edit size={16} />
                                                        </Link>
                                                        {isAdmin && (
                                                            <button onClick={() => setDeleteId(med.id)} className="p-1 rounded text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer" title="Delete">
                                                                <Trash2 size={16} strokeWidth={2.5} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={COLUMNS.filter(c => visibleColumns[c.id] && (c.id !== 'actions' || isPharmacist)).length} className="text-center py-20 text-gray-500">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                                <AlertTriangle size={24} className="text-gray-400" />
                                            </div>
                                            <p className="font-medium text-gray-800 text-lg">No medicines found</p>
                                            <p className="text-sm mt-1 mb-4 text-gray-500">Try changing your search terms or filters.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Card View for Mobile */
                    <div className="bg-gray-50/50 p-4">
                        {loading ? (
                            <div className="text-center py-20 text-gray-400">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                Loading inventory...
                            </div>
                        ) : medicines.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {medicines.map(med => (
                                    <div key={med.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4 hover:border-blue-200 transition-all">
                                        <div className="flex items-start justify-between">
                                            {visibleColumns.medicine ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-blue-50/50 rounded-xl flex items-center justify-center border border-blue-100/50 flex-shrink-0 shadow-sm">
                                                        {med.image ? <img src={med.image} className="w-full h-full object-cover rounded-xl" alt="" /> : <Pill size={20} className="text-blue-500" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-base leading-tight">{med.name}</p>
                                                        <p className="text-xs text-gray-500 font-medium mt-0.5">{med.category_name || med.dosage_form}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-gray-400 italic text-xs">
                                                    <Pill size={14} /> Medicine Hidden
                                                </div>
                                            )}
                                            {visibleColumns.status && getStockBadge(med)}
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-3 text-[13px] pt-2 border-t border-gray-50">
                                            {visibleColumns.batch && (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Batch #</span>
                                                    <span className="font-mono font-bold text-blue-700 bg-blue-50 w-fit px-2 py-0.5 rounded border border-blue-100/50">{med.batch_number}</span>
                                                </div>
                                            )}
                                            {visibleColumns.expiry && (
                                                <div className="flex flex-col text-right">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Expiry Date</span>
                                                    <span className={`font-bold ${med.days_to_expiry <= 30 ? 'text-red-600' : 'text-gray-700'}`}>
                                                        {format(new Date(med.expiry_date), 'MMM dd, yyyy')}
                                                    </span>
                                                </div>
                                            )}
                                            {visibleColumns.stock && (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Available Stock</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-black text-gray-900 text-base">{med.quantity}</span>
                                                        <span className="text-[11px] text-gray-500 font-bold uppercase">{med.unit || 'pcs'}</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex flex-col text-right">
                                                {visibleColumns.selling_price && (
                                                    <>
                                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Selling Price</span>
                                                        <span className="font-black text-blue-700 text-lg">ETB {parseFloat(med.selling_price).toFixed(0)}</span>
                                                    </>
                                                )}
                                                {visibleColumns.buying_price && (
                                                    <span className="text-[10px] text-gray-400 font-bold mt-0.5">Cost: ETB {parseFloat(med.purchase_price).toFixed(0)}</span>
                                                )}
                                            </div>
                                        </div>

                                        {visibleColumns.actions && isPharmacist && (
                                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-50">
                                                <Link to={`/medicines/edit/${med.id}`} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-blue-600 bg-blue-50 text-xs font-black uppercase tracking-wider hover:bg-blue-100 transition-all border border-blue-100">
                                                    <Edit size={14} /> Edit
                                                </Link>
                                                {isAdmin && (
                                                    <button onClick={() => setDeleteId(med.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-rose-600 bg-rose-50 text-xs font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all border border-rose-100 cursor-pointer">
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-500">
                                <p className="font-medium">No medicines found</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                        <p className="text-sm text-gray-500">
                            Showing <span className="font-medium text-gray-900">{(pagination.page - 1) * 15 + 1}</span> to <span className="font-medium text-gray-900">{Math.min(pagination.page * 15, pagination.total)}</span> of <span className="font-medium text-gray-900">{pagination.total}</span> results
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => fetchMedicines(pagination.page - 1)}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>
                            <button
                                disabled={pagination.page >= pagination.pages}
                                onClick={() => fetchMedicines(pagination.page + 1)}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirm Modal */}
            {deleteId && (
                <div className="modal-overlay" onClick={() => setDeleteId(null)}>
                    <div className="modal-content max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
                            <Trash2 className="text-red-600" size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Medicine?</h3>
                        <p className="text-gray-500 text-sm text-center mb-6">Are you sure you want to delete this medicine? This action cannot be undone and will remove it from inventory.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 py-2.5 cursor-pointer">Cancel</button>
                            <button onClick={() => handleDelete(deleteId)} className="btn-danger flex-1 py-2.5 cursor-pointer">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

