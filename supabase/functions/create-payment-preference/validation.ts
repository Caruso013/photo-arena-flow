// Validation schema for buyer info
export const buyerInfoSchema = {
  safeParse: (data: any) => {
    const errors: any[] = [];
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Nome é obrigatório' });
    }
    
    if (!data.surname || typeof data.surname !== 'string' || data.surname.trim().length === 0) {
      errors.push({ field: 'surname', message: 'Sobrenome é obrigatório' });
    }
    
    if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
      errors.push({ field: 'email', message: 'Email inválido' });
    }
    
    if (!data.phone || !data.phone.area_code || !data.phone.number) {
      errors.push({ field: 'phone', message: 'Telefone inválido' });
    }
    
    if (!data.identification || !data.identification.type || !data.identification.number) {
      errors.push({ field: 'identification', message: 'CPF inválido' });
    }
    
    return {
      success: errors.length === 0,
      error: { errors },
    };
  },
};
