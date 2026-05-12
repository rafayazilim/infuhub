import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
  trend?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  title,
  value,
  description,
  trend,
}) => (
  <motion.div
    whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
    transition={{ duration: 0.15, ease: 'easeOut' }}
    className="aspect-[4/3]"
  >
    <Card className="h-full p-6 border border-gray-200/50 dark:border-gray-800/50 rounded-xl bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 rounded-[10px] bg-[#08afd5]/15 dark:bg-[#08afd5]/20 text-[#08afd5] dark:text-[#6edff3]">
            {icon}
          </div>
          {trend && (
            <Badge variant="secondary" className="text-xs rounded-md">
              {trend}
            </Badge>
          )}
        </div>
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{value}</h3>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500">{description}</p>
      </div>
    </Card>
  </motion.div>
);


