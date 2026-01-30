import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, XCircle, AlertCircle, Camera } from 'lucide-react';

interface AttendanceResultProps {
  type: 'success' | 'error' | 'already_confirmed';
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
      <CardContent className="p-8 text-center">
        {/* Icon */}
        <div className={`w-20 h-20 rounded-full ${bgColor} mx-auto mb-6 flex items-center justify-center`}>
          <Icon className="h-10 w-10 text-white" />
        </div>

        {/* Title */}
        <h2 className={`text-2xl font-bold mb-2 ${textColor}`}>
          {title}
        </h2>

        {/* Photographer Info */}
        {photographerName && (
          <div className="flex items-center justify-center gap-3 my-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={photographerAvatar} />
              <AvatarFallback>
                {photographerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-lg">{photographerName}</span>
          </div>
        )}

        {/* Message */}
        <p className="text-muted-foreground mb-8">
          {message}
        </p>

        {/* Action Button */}
        <Button 
          size="lg" 
          className="w-full"
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
