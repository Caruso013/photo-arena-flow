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
    <Card className={`relative overflow-hidden bg-gradient-to-br ${bgGradient} border-0 shadow-md hover:shadow-lg transition-all duration-200`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center space-x-2">
              <p className="text-3xl font-bold">{value}</p>
              {trend && (
                <Badge 
                  variant={trend.isPositive ? "default" : "secondary"}
                  className={`text-xs ${
                    trend.isPositive 
                      ? "bg-green-100 text-green-700 hover:bg-green-100" 
                      : "bg-red-100 text-red-700 hover:bg-red-100"
                  }`}
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconColor}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        
        {/* Decorative background element */}
        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/5" />
        <div className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-white/10" />
      </CardContent>
    </Card>
  );
}