import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2, Maximize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CollapsibleWidgetProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onExpand?: () => void;
  defaultCollapsed?: boolean;
  onCollapseChange?: (id: string, collapsed: boolean) => void;
}

export function CollapsibleWidget({
  id,
  icon,
  title,
  badge,
  children,
  className = '',
  onExpand,
  defaultCollapsed = false,
  onCollapseChange,
}: CollapsibleWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(id, newState);
  };

  return (
    <motion.div
      layout
      initial={false}
      transition={{ duration: 0.3, ease: 'easeInOut', layout: { duration: 0.3 } }}
      className={`rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden flex flex-col ${className}`}
    >
      <motion.div 
        layout
        className="flex justify-between items-center p-4 bg-gradient-to-br from-white/90 to-transparent dark:from-gray-900/80 dark:to-transparent flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          {onExpand && (
            <button
              onClick={onExpand}
              className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-700 inline-flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-900 transition-colors"
              title="Tam ekran"
            >
              <Maximize2 size={14} />
            </button>
          )}
          <button
            onClick={toggleCollapse}
            className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-700 inline-flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-900 transition-colors"
            title={isCollapsed ? 'Genişlet' : 'Küçült'}
          >
            <Minimize2 size={14} />
          </button>
        </div>
      </motion.div>
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key={`content-${id}`}
            layout
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
