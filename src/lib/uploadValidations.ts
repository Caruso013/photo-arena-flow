/**
 * Validações para upload de arquivos
 * Previne uploads de arquivos muito grandes, tipos inválidos, etc.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Configurações
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5MB para capas
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

/**
 * Valida tamanho do arquivo
 */
export const validateFileSize = (file: File, maxSize = MAX_FILE_SIZE): ValidationResult => {
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024);
    const fileMB = (file.size / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `Arquivo muito grande (${fileMB}MB). Máximo permitido: ${maxMB}MB`
    };
  }
  return { valid: true };
};

/**
 * Valida tipo MIME do arquivo
 */
export const validateFileType = (file: File, allowedTypes = ALLOWED_IMAGE_TYPES): ValidationResult => {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Use apenas: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
    };
  }
  return { valid: true };
};

/**
 * Valida dimensões da imagem
 */
export const validateImageDimensions = async (
  file: File,
  minWidth = MIN_WIDTH,
  minHeight = MIN_HEIGHT
): Promise<ValidationResult> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      
      if (img.width < minWidth || img.height < minHeight) {
        resolve({
          valid: false,
          error: `Imagem muito pequena (${img.width}×${img.height}px). Mínimo: ${minWidth}×${minHeight}px`
        });
      } else {
        resolve({ valid: true });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: 'Não foi possível ler a imagem. Arquivo pode estar corrompido.'
      });
    };

    img.src = url;
  });
};

/**
 * Validação completa para foto de evento
 */
export const validatePhotoUpload = async (file: File): Promise<ValidationResult> => {
  // 1. Validar tamanho
  const sizeCheck = validateFileSize(file, MAX_FILE_SIZE);
  if (!sizeCheck.valid) return sizeCheck;

  // 2. Validar tipo
  const typeCheck = validateFileType(file);
  if (!typeCheck.valid) return typeCheck;

  // 3. Validar dimensões
  const dimensionsCheck = await validateImageDimensions(file);
  if (!dimensionsCheck.valid) return dimensionsCheck;

  return { valid: true };
};

/**
 * Validação para capa de evento (menos restritivo)
 */
export const validateCoverUpload = async (file: File): Promise<ValidationResult> => {
  // 1. Validar tamanho (menor que fotos)
  const sizeCheck = validateFileSize(file, MAX_COVER_SIZE);
  if (!sizeCheck.valid) return sizeCheck;

  // 2. Validar tipo
  const typeCheck = validateFileType(file);
  if (!typeCheck.valid) return typeCheck;

  // 3. Dimensões mínimas menores para capas
  const dimensionsCheck = await validateImageDimensions(file, 400, 300);
  if (!dimensionsCheck.valid) return dimensionsCheck;

  return { valid: true };
};

/**
 * Validação batch para múltiplos arquivos
 */
export const validateMultiplePhotos = async (files: File[]): Promise<{
  valid: boolean;
  errors: string[];
  validFiles: File[];
}> => {
  const errors: string[] = [];
  const validFiles: File[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await validatePhotoUpload(file);
    
    if (result.valid) {
      validFiles.push(file);
    } else {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return {
    valid: validFiles.length > 0,
    errors,
    validFiles
  };
};
