// Validation schema for buyer info
export const buyerInfoSchema = {
  safeParse: (data: any) => {
    const errors: any[] = [];
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
      errors.push({ field: 'name', message: 'Nome deve ter pelo menos 2 caracteres' });
    }
    
    if (!data.surname || typeof data.surname !== 'string' || data.surname.trim().length < 2) {
      errors.push({ field: 'surname', message: 'Sobrenome deve ter pelo menos 2 caracteres' });
    }
    
    if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
      errors.push({ field: 'email', message: 'Email inválido' });
    }
    
    if (!data.phone || typeof data.phone !== 'string' || !/^\d{10,11}$/.test(data.phone)) {
      errors.push({ field: 'phone', message: 'Telefone deve conter 10 ou 11 dígitos' });
    }
    
    if (!data.document || typeof data.document !== 'string' || !/^\d{11}$/.test(data.document)) {
      errors.push({ field: 'document', message: 'CPF deve conter 11 dígitos' });
    }
    
    return {
      success: errors.length === 0,
      error: { errors },
    };
  },
};
