import * as faceapi from 'face-api.js';

// Dimensões máximas para processamento mobile
const MAX_IMAGE_WIDTH = 640;
const MAX_IMAGE_HEIGHT = 480;

export interface FaceDetectionResult {
  descriptor: Float32Array;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

/**
 * Redimensiona imagem se necessário para otimizar performance em mobile
 */
export function resizeImageForMobile(
  image: HTMLImageElement | HTMLVideoElement
): { canvas: HTMLCanvasElement; wasResized: boolean } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Canvas context not available');

  const width = 'videoWidth' in image ? image.videoWidth : image.naturalWidth;
  const height = 'videoHeight' in image ? image.videoHeight : image.naturalHeight;

  let targetWidth = width;
  let targetHeight = height;
  let wasResized = false;

  if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
    const ratio = Math.min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
    targetWidth = Math.round(width * ratio);
    targetHeight = Math.round(height * ratio);
    wasResized = true;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  return { canvas, wasResized };
}

/**
 * Detectar rostos usando face-api.js otimizado para mobile
 */
export async function detectFaces(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<FaceDetectionResult[]> {
  try {
    console.log('🎭 Detectando rostos com IA otimizada...');

    // Redimensionar para mobile se necessário
    let processImage: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;
    if (imageSource instanceof HTMLCanvasElement) {
      processImage = imageSource;
    } else {
      const { canvas, wasResized } = resizeImageForMobile(imageSource);
      processImage = canvas;
      if (wasResized) {
        console.log('📐 Imagem redimensionada para otimizar performance');
      }
    }

    const config = getOptimizedConfig();
    const detections = await faceapi
      .detectAllFaces(processImage, new faceapi.TinyFaceDetectorOptions({
        inputSize: config.inputSize,
        scoreThreshold: config.scoreThreshold,
      }))
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections || detections.length === 0) {
      console.log('⚠️ Nenhum rosto detectado');
      return [];
    }

    console.log(`✅ Detectados ${detections.length} rosto(s)`);

    return detections.map(detection => ({
      descriptor: detection.descriptor,
      confidence: detection.detection.score,
      boundingBox: {
        x: detection.detection.box.x,
        y: detection.detection.box.y,
        width: detection.detection.box.width,
        height: detection.detection.box.height,
      },
    }));
  } catch (error) {
    console.error('Erro ao detectar rostos:', error);
    throw error;
  }
}

/**
 * Calcular similaridade entre dois descritores faciais
 */
export function calculateSimilarity(
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[]
): number {
  const arr1 = Array.from(descriptor1);
  const arr2 = Array.from(descriptor2);

  if (arr1.length !== arr2.length) {
    throw new Error('Descritores devem ter o mesmo tamanho');
  }

  // Usar distância euclidiana do face-api.js
  const distance = faceapi.euclideanDistance(arr1, arr2);
  
  // Converter para similaridade (0 a 1)
  const similarity = Math.max(0, 1 - distance);
  
  return similarity;
}

/**
 * Carregar modelos face-api.js
 */
export async function loadFaceAPIModels(): Promise<boolean> {
  try {
    const MODEL_URL = '/models';
    
    console.log('⏳ Carregando modelos face-api.js...');
    
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    
    console.log('✅ Modelos face-api.js carregados');
    return true;
  } catch (error) {
    console.error('❌ Erro ao carregar modelos face-api.js:', error);
    return false;
  }
}

/**
 * Verificar dispositivo móvel
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Verificar se tem suporte a WebGPU (futuro)
 */
export function hasWebGPUSupport(): boolean {
  return 'gpu' in navigator;
}

/**
 * Obter configurações otimizadas para o dispositivo
 */
export function getOptimizedConfig() {
  const isMobile = isMobileDevice();
  const hasWebGPU = hasWebGPUSupport();
  
  // Detectar performance do dispositivo
  const isLowEnd = isMobile && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

  return {
    isMobile,
    hasWebGPU,
    isLowEnd,
    maxImageWidth: isMobile ? 480 : 640,
    maxImageHeight: isMobile ? 640 : 480,
    batchSize: isLowEnd ? 2 : isMobile ? 3 : 5, // Processar menos fotos por vez em dispositivos fracos
    maxPhotosToProcess: isLowEnd ? 30 : isMobile ? 50 : 150, // Limitar fotos em dispositivos fracos
    inputSize: isLowEnd ? 160 : isMobile ? 224 : 320, // Tamanho de entrada menor em dispositivos fracos
    scoreThreshold: 0.45, // Threshold mais baixo para detectar mais rostos
  };
}
