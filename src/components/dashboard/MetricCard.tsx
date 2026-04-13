import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}

const variantStyles = {
  default: {
    bg: 'bg-card',
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
  },
  primary: {
    bg: 'bg-gradient-to-br from-primary/10 to-primary/5',
    iconBg: 'bg-primary',
    iconColor: 'text-primary-foreground',
  },
  secondary: {
    bg: 'bg-gradient-to-br from-blue-500/10 to-indigo-500/5',
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-500',
    iconColor: 'text-white',
  },
  success: {
    bg: 'bg-gradient-to-br from-green-500/10 to-emerald-500/5',
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
    iconColor: 'text-white',
  },
  warning: {
    bg: 'bg-gradient-to-br from-yellow-500/10 to-orange-500/5',
    iconBg: 'bg-gradient-to-br from-yellow-500 to-orange-500',
    iconColor: 'text-white',
  },
  danger: {
    bg: 'bg-gradient-to-br from-red-500/10 to-rose-500/5',
    iconBg: 'bg-gradient-to-br from-red-500 to-rose-500',
    iconColor: 'text-white',
  },
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  loading = false,
}: MetricCardProps) => {
  const styles = variantStyles[variant];

  if (loading) {
    return (
      <Card className={`${styles.bg} animate-pulse`}>
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-11 sm:w-11 bg-muted rounded-lg sm:rounded-xl shrink-0"></div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="h-3 w-16 bg-muted rounded"></div>
              <div className="h-5 w-20 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${styles.bg} hover:shadow-lg transition-all duration-300 border-border/50`}>
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`h-9 w-9 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl ${styles.iconBg} flex items-center justify-center shadow-md shrink-0`}>
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${styles.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-sm sm:text-lg lg:text-2xl font-bold text-foreground truncate">{value}</p>
            <div className="flex items-center gap-1">
              {subtitle && (
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
              {trend && (
                <span className={`flex items-center gap-0.5 text-[10px] sm:text-xs font-medium shrink-0 ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {trend.value}%
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
