import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { SkeletonLoader } from './SkeletonLoader';

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: 'ember' | 'violet' | 'teal' | 'success' | 'danger';
  loading?: boolean;
  icon?: ReactNode;
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps['accent']>, string> = {
  ember: 'text-ember',
  violet: 'text-violet',
  teal: 'text-teal',
  success: 'text-success',
  danger: 'text-danger',
};

export function StatCard({ label, value, sublabel, accent = 'ember', loading, icon }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-iron-700 bg-iron-900 p-5 shadow-lg shadow-black/20"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-steam-400">{label}</span>
        {icon && <span className={ACCENT_CLASSES[accent]}>{icon}</span>}
      </div>
      {loading ? (
        <SkeletonLoader className="h-8 w-2/3" />
      ) : (
        <div
          title={value}
          className={`truncate font-bold ${ACCENT_CLASSES[accent]} ${
            value.length > 14 ? 'font-mono text-lg' : 'font-display text-2xl'
          }`}
        >
          {value}
        </div>
      )}
      {sublabel && !loading && <div className="mt-1 text-xs text-steam-600">{sublabel}</div>}
    </motion.div>
  );
}
