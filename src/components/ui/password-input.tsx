import React from 'react';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrength {
  score: number; // 0-100
  label: string;
  color: string;
  requirements: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onValueChange?: (value: string) => void;
  showStrength?: boolean;
  minLength?: number;
}

const calculatePasswordStrength = (password: string, minLength: number = 6): PasswordStrength => {
  const requirements = {
    minLength: password.length >= minLength,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  // Calcular score baseado nos requisitos
  let score = 0;
  if (requirements.minLength) score += 20;
  if (requirements.hasUpperCase) score += 20;
  if (requirements.hasLowerCase) score += 20;
  if (requirements.hasNumber) score += 20;
  if (requirements.hasSpecialChar) score += 20;

  // Bonus por comprimento extra
  if (password.length >= 8) score += 5;
  if (password.length >= 12) score += 5;
  if (password.length >= 16) score += 5;

  // Limitar a 100
  score = Math.min(score, 100);

  // Determinar label e cor
  let label = 'Muito fraca';
  let color = 'bg-red-500';

  if (score >= 80) {
    label = 'Muito forte';
    color = 'bg-green-500';
  } else if (score >= 60) {
    label = 'Forte';
    color = 'bg-emerald-500';
  } else if (score >= 40) {
    label = 'Média';
    color = 'bg-yellow-500';
  } else if (score >= 20) {
    label = 'Fraca';
    color = 'bg-orange-500';
  }

  return { score, label, color, requirements };
};

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onValueChange,
  onChange,
  showStrength = true,
  minLength = 6,
  className,
  ...props
}) => {
  const strength = calculatePasswordStrength(value, minLength);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onValueChange) {
      onValueChange(newValue);
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        type="password"
        value={value}
        onChange={handleChange}
        className={className}
        {...props}
      />
      
      {showStrength && value.length > 0 && (
        <div className="space-y-2">
          {/* Barra de progresso */}
          <div className="flex items-center gap-2">
            <Progress 
              value={strength.score} 
              className={cn("h-2 flex-1", strength.color)}
            />
            <span className={cn(
              "text-xs font-medium w-20 text-right",
              strength.score >= 80 ? "text-green-600 dark:text-green-400" :
              strength.score >= 60 ? "text-emerald-600 dark:text-emerald-400" :
              strength.score >= 40 ? "text-yellow-600 dark:text-yellow-400" :
              strength.score >= 20 ? "text-orange-600 dark:text-orange-400" :
              "text-red-600 dark:text-red-400"
            )}>
              {strength.label}
            </span>
          </div>

          {/* Requisitos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
            <RequirementItem
              met={strength.requirements.minLength}
              text={`Mínimo ${minLength} caracteres`}
            />
            <RequirementItem
              met={strength.requirements.hasNumber}
              text="Contém número"
            />
            <RequirementItem
              met={strength.requirements.hasUpperCase}
              text="Letra maiúscula"
            />
            <RequirementItem
              met={strength.requirements.hasLowerCase}
              text="Letra minúscula"
            />
            <RequirementItem
              met={strength.requirements.hasSpecialChar}
              text="Caractere especial"
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface RequirementItemProps {
  met: boolean;
  text: string;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ met, text }) => (
  <div className={cn(
    "flex items-center gap-1.5",
    met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
  )}>
    {met ? (
      <Check className="h-3 w-3 flex-shrink-0" />
    ) : (
      <X className="h-3 w-3 flex-shrink-0" />
    )}
    <span className="truncate">{text}</span>
  </div>
);
