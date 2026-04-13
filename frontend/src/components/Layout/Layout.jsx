import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Navbar from '../Navbar';

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex bg-gray-50 min-h-screen transition-all duration-300">
            {/* Sidebar component handles both desktop (fixed) and mobile (overlay) */}
            <Sidebar 
                mobileOpen={sidebarOpen} 
                onClose={() => setSidebarOpen(false)} 
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
            />
            
            <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300`}>
                {/* Navbar with mobile menu toggle */}
                <Navbar onMenuClick={() => setSidebarOpen(true)} />
                
                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-3 md:p-5 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
