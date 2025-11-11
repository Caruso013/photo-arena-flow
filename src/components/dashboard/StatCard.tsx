import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  bgGradient?: string;
}

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor, 
  trend,
  bgGradient = "from-background to-background"
}: StatCardProps) {
  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${bgGradient} dark:from-card dark:to-secondary border dark:border-border shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer group`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <div className="flex items-center space-x-2">
              <p className="text-2xl sm:text-3xl font-bold">{value}</p>
              {trend && (
                <Badge 
                  variant={trend.isPositive ? "default" : "secondary"}
                  className={`text-xs ${
                    trend.isPositive 
                      ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/30" 
                      : "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/30"
                  }`}
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full ${iconColor} flex-shrink-0 ml-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
        
        {/* Decorative background element */}
        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/5 dark:bg-white/[0.02]" />
        <div className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-white/10 dark:bg-white/[0.05]" />
      </CardContent>
    </Card>
  );
}