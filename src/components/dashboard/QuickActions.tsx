import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface QuickAction {
  icon: LucideIcon;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  columns?: 2 | 3 | 4;
}

const QuickActions = ({ actions, title, columns = 4 }: QuickActionsProps) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {title && (
        <h3 className="text-base sm:text-lg font-semibold text-foreground">{title}</h3>
      )}
      <div className={`grid ${gridCols[columns]} gap-2 sm:gap-3`}>
        {actions.map((action, index) => {
          const Icon = action.icon;

          const content = (
            <Card
              className="cursor-pointer hover:shadow-lg active:scale-[0.97] transition-all duration-200 border hover:border-primary/30 bg-card group overflow-hidden relative"
              onClick={action.onClick}
            >
              {action.badge !== undefined && (
                <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {action.badge}
                </span>
              )}
              <CardContent className="p-3 sm:p-4 lg:p-6 flex flex-col items-center justify-center text-center h-[100px] sm:h-[130px] lg:h-[160px]">
                <div className="h-10 w-10 sm:h-12 sm:w-12 mx-auto rounded-lg sm:rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 mb-2 sm:mb-3">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
                <h4 className="font-semibold text-xs sm:text-sm text-foreground leading-tight">{action.label}</h4>
                {action.description && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">{action.description}</p>
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
