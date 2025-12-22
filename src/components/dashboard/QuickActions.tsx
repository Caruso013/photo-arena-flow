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
    4: 'grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      )}
      <div className={`grid ${gridCols[columns]} gap-3 sm:gap-4`}>
        {actions.map((action, index) => {
          const Icon = action.icon;

          const content = (
            <Card
              className="cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border hover:border-primary/30 bg-card group overflow-hidden relative"
              onClick={action.onClick}
            >
              {action.badge !== undefined && (
                <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  {action.badge}
                </span>
              )}
              <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center h-[140px] sm:h-[160px]">
                <div className="h-12 w-12 sm:h-14 sm:w-14 mx-auto rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
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
