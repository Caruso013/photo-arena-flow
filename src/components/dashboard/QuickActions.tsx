import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface QuickAction {
  icon: LucideIcon;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  variant?: 'yellow' | 'blue' | 'green' | 'purple' | 'red' | 'gray';
  badge?: string | number;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  columns?: 2 | 3 | 4;
}

const variantStyles = {
  yellow: {
    bg: 'from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20',
    icon: 'from-yellow-400 to-orange-500',
    hover: 'hover:border-yellow-500/30',
  },
  blue: {
    bg: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    icon: 'from-blue-500 to-cyan-500',
    hover: 'hover:border-blue-500/30',
  },
  green: {
    bg: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
    icon: 'from-green-500 to-emerald-500',
    hover: 'hover:border-green-500/30',
  },
  purple: {
    bg: 'from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20',
    icon: 'from-purple-500 to-pink-500',
    hover: 'hover:border-purple-500/30',
  },
  red: {
    bg: 'from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20',
    icon: 'from-red-500 to-rose-500',
    hover: 'hover:border-red-500/30',
  },
  gray: {
    bg: 'from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20',
    icon: 'from-slate-500 to-gray-500',
    hover: 'hover:border-slate-500/30',
  },
};

const QuickActions = ({ actions, title, columns = 4 }: QuickActionsProps) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      )}
      <div className={`grid ${gridCols[columns]} gap-3 sm:gap-4`}>
        {actions.map((action, index) => {
          const styles = variantStyles[action.variant || 'gray'];
          const Icon = action.icon;

          const content = (
            <Card
              className={`cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border-2 border-transparent ${styles.hover} bg-gradient-to-br ${styles.bg} group overflow-hidden relative`}
              onClick={action.onClick}
            >
              {action.badge !== undefined && (
                <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  {action.badge}
                </span>
              )}
              <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center h-[140px] sm:h-[160px]">
                <div className={`h-12 w-12 sm:h-14 sm:w-14 mx-auto rounded-xl bg-gradient-to-br ${styles.icon} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 mb-3`}>
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <h4 className="font-semibold text-sm sm:text-base text-foreground">{action.label}</h4>
                {action.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{action.description}</p>
                )}
              </CardContent>
            </Card>
          );

          if (action.href) {
            return (
              <Link key={index} to={action.href} className="block">
                {content}
              </Link>
            );
          }

          return <div key={index}>{content}</div>;
        })}
      </div>
    </div>
  );
};

export default QuickActions;
