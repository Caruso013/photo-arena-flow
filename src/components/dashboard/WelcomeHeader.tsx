import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LucideIcon } from 'lucide-react';

interface WelcomeHeaderProps {
  title: string;
  subtitle: string;
  userName?: string;
  avatarUrl?: string;
  icon?: LucideIcon;
  gradient?: string;
}

const WelcomeHeader = ({
  title,
  subtitle,
  userName,
  avatarUrl,
  icon: Icon,
  gradient = 'from-primary via-primary/95 to-primary/80'
}: WelcomeHeaderProps) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-br ${gradient} text-white shadow-2xl`}>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
        {(avatarUrl || Icon) && (
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-white/30 shadow-xl ring-4 ring-white/10">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={userName || 'Avatar'} className="object-cover" />
            ) : null}
            <AvatarFallback className="text-2xl bg-white/20 backdrop-blur-sm">
              {Icon && <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm sm:text-base opacity-90 mb-1">{getGreeting()}{userName ? `, ${userName}` : ''}!</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">
            {title}
          </h1>
          <p className="text-sm sm:text-base opacity-90 max-w-2xl drop-shadow-md">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeHeader;
