import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Megaphone,
  Wallet,
  Users,
  MessageSquare,
  BarChart3,
  Link2,
  FileText,
  Bell,
  Settings,
} from 'lucide-react';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-[10px] transition-all duration-150 ${
      active
        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
    }`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </button>
);

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isOpen,
  onClose,
  activeMenu,
  onMenuChange,
}) => {
  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'campaigns', icon: <Megaphone size={18} />, label: 'Kampanyalar' },
    { id: 'budget', icon: <Wallet size={18} />, label: 'Bütçe & Harcamalar' },
    { id: 'offers', icon: <Users size={18} />, label: 'Influencer Teklifleri' },
    { id: 'messages', icon: <MessageSquare size={18} />, label: 'Mesajlar' },
    { id: 'analytics', icon: <BarChart3 size={18} />, label: 'Analitik' },
    { id: 'tracking', icon: <Link2 size={18} />, label: 'Takip Linkleri' },
    { id: 'reports', icon: <FileText size={18} />, label: 'Raporlar' },
    { id: 'notifications', icon: <Bell size={18} />, label: 'Bildirimler' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Ayarlar' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 mt-14"
          />

          {/* Sidebar Panel */}
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 p-4 z-40 overflow-y-auto mac-scrollbar"
          >
            <div className="mb-6">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
                Navigasyon
              </p>
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => (
                <MenuItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeMenu === item.id}
                  onClick={() => {
                    onMenuChange(item.id);
                    onClose();
                  }}
                />
              ))}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
