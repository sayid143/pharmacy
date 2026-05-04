import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Medicines from './pages/Medicines';
import AddMedicine from './pages/AddMedicine';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Debts from './pages/Debts';
import Expenses from './pages/Expenses';
import Users from './pages/Users';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Transactions from './pages/Transactions';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Loading PharmaCare...</p>
            </div>
        </div>
    );
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role_name)) return <Navigate to="/" replace />;
    return children;
};

const AppRoutes = () => {
    const { user } = useAuth();
    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="medicines" element={<ProtectedRoute allowedRoles={['admin', 'pharmacist']}><Medicines /></ProtectedRoute>} />
                <Route path="medicines/add" element={<ProtectedRoute allowedRoles={['admin', 'pharmacist']}><AddMedicine /></ProtectedRoute>} />
                <Route path="medicines/edit/:id" element={<ProtectedRoute allowedRoles={['admin', 'pharmacist']}><AddMedicine /></ProtectedRoute>} />
                <Route path="sales" element={<Sales />} />
                <Route path="reports" element={<ProtectedRoute allowedRoles={['admin', 'pharmacist']}><Reports /></ProtectedRoute>} />
                <Route path="debts" element={<Debts />} />
                <Route path="expenses" element={<ProtectedRoute allowedRoles={['admin', 'pharmacist']}><Expenses /></ProtectedRoute>} />
                <Route path="customers" element={<Customers />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="suppliers" element={<ProtectedRoute allowedRoles={['admin', 'pharmacist']}><Suppliers /></ProtectedRoute>} />
                <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><Users /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}
