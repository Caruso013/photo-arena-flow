import React, { forwardRef } from 'react';
import InputMask from 'react-input-mask';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask: string;
  maskChar?: string | null;
}

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, maskChar = '_', className, ...props }, ref) => {
    return (
      <InputMask
        mask={mask}
        maskChar={maskChar}
        {...props}
      >
        {/* @ts-ignore - InputMask has typing issues with children */}
        {(inputProps: any) => (
          <Input
            {...inputProps}
            ref={ref}
            className={cn(className)}
          />
        )}
      </InputMask>
    );
  }
);

MaskedInput.displayName = 'MaskedInput';

export { MaskedInput };

// Máscaras pré-definidas comuns
export const masks = {
  phone: '(99) 99999-9999',
  phoneShort: '(99) 9999-9999',
  cpf: '999.999.999-99',
  cnpj: '99.999.999/9999-99',
  cep: '99999-999',
  date: '99/99/9999',
  creditCard: '9999 9999 9999 9999',
  cvv: '999',
  cvvAmex: '9999',
  expiry: '99/99',
  expiryShort: '99/9999',
} as const;

// Validação de CPF
export const validateCPF = (cpf: string): boolean => {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
};

// Validação de CNPJ
export const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validação dos dígitos verificadores
  let size = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, size);
  const digits = cleanCNPJ.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cleanCNPJ.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

// Validação de CEP
export const validateCEP = (cep: string): boolean => {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
};

// Validação de data
export const validateDate = (date: string): boolean => {
  const cleanDate = date.replace(/\D/g, '');
  if (cleanDate.length !== 8) return false;
  
  const day = parseInt(cleanDate.substring(0, 2));
  const month = parseInt(cleanDate.substring(2, 4));
  const year = parseInt(cleanDate.substring(4, 8));
  
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  // Validação de dias por mês
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Ano bissexto
  if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
    daysInMonth[1] = 29;
  }
  
  return day <= daysInMonth[month - 1];
};
