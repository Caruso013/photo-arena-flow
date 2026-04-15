import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, XCircle, AlertCircle, ShieldX, Camera } from 'lucide-react';

interface AttendanceResultProps {
  type: 'success' | 'error' | 'already_confirmed' | 'denied';
  message: string;
  photographerName?: string;
  photographerAvatar?: string;
  onScanAnother: () => void;
}

const AttendanceResult = ({
  type,
  message,
  photographerName,
  photographerAvatar,
  onScanAnother
}: AttendanceResultProps) => {
  const config = {
    success: {
      icon: CheckCircle2,
      bgColor: 'bg-green-500',
      borderColor: 'border-green-500/50',
      bgLight: 'bg-green-500/5',
      textColor: 'text-green-600',
      title: 'PRESENÇA CONFIRMADA!'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-500',
      borderColor: 'border-red-500/50',
      bgLight: 'bg-red-500/5',
      textColor: 'text-red-600',
      title: 'ERRO'
    },
    denied: {
      icon: ShieldX,
      bgColor: 'bg-orange-500',
      borderColor: 'border-orange-500/50',
      bgLight: 'bg-orange-500/5',
      textColor: 'text-orange-600',
      title: 'ACESSO NEGADO'
    },
    already_confirmed: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-500',
      borderColor: 'border-yellow-500/50',
      bgLight: 'bg-yellow-500/5',
      textColor: 'text-yellow-600',
      title: 'JÁ CONFIRMADO'
    }
  };

  const { icon: Icon, bgColor, borderColor, bgLight, textColor, title } = config[type];

  return (
    <Card className={`border-2 ${borderColor} ${bgLight}`}>
      <CardContent className="p-5 sm:p-8 text-center">
        {/* Icon */}
        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full ${bgColor} mx-auto mb-4 sm:mb-6 flex items-center justify-center`}>
          <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
        </div>

        {/* Title */}
        <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textColor}`}>
          {title}
        </h2>

        {/* Photographer Info */}
        {photographerName && (
          <div className="flex flex-col items-center gap-2 my-3 sm:my-4">
            <Avatar className={`h-14 w-14 sm:h-16 sm:w-16 border-4 ${type === 'denied' ? 'border-orange-500/30' : type === 'success' ? 'border-green-500/30' : type === 'already_confirmed' ? 'border-yellow-500/30' : 'border-red-500/30'}`}>
              <AvatarImage src={photographerAvatar} />
              <AvatarFallback className={`text-lg ${type === 'denied' ? 'bg-orange-500/10 text-orange-600' : ''}`}>
                {photographerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-base sm:text-lg">{photographerName}</span>
          </div>
        )}

        {/* Message */}
        <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 break-words">
          {message}
        </p>

        {/* Denied hint */}
        {type === 'denied' && (
          <p className="text-xs text-muted-foreground mb-4 -mt-4 px-2">
            O fotógrafo precisa estar atribuído ou ter candidatura aprovada para este evento.
          </p>
        )}

        {/* Action Button */}
        <Button 
          size="lg" 
          className="w-full text-sm sm:text-base"
          onClick={onScanAnother}
        >
          <Camera className="mr-2 h-4 w-4" />
          Validar Próximo
        </Button>
      </CardContent>
    </Card>
  );
};

export default AttendanceResult;
