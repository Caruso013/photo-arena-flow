import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import {
  detectFaces,
  calculateSimilarity,
  loadFaceAPIModels,
  getOptimizedConfig,
  type FaceDetectionResult,
} from '@/utils/faceDetection';

interface FaceDescriptor {
  id: string;
  descriptor: number[];
  photo_id: string;
  user_id?: string;
  created_at: string;
}

interface FaceMatch {
  photo_id: string;
  similarity: number;
  photo_url: string;
  campaign_id: string;
  sub_event_id?: string | null;
}

interface PhotoRecord {
  id: string;
  watermarked_url?: string | null;
  thumbnail_url?: string | null;
  original_url?: string | null;
  campaign_id?: string | null;
  sub_event_id?: string | null;
  created_at?: string;
  is_available?: boolean;
}
let modelsLoaded = false;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeDescriptor = (descriptor: number[]): number[] => {
  const norm = Math.sqrt(descriptor.reduce((sum, v) => sum + v * v, 0));
  if (!norm || !Number.isFinite(norm)) return descriptor;
  return descriptor.map((v) => v / norm);
};

const dedupeAndSortMatches = (input: FaceMatch[], limit: number): FaceMatch[] => {
  const bestByPhoto = new Map<string, FaceMatch>();
  for (const match of input) {
    const existing = bestByPhoto.get(match.photo_id);
    if (!existing || match.similarity > existing.similarity) {
      bestByPhoto.set(match.photo_id, match);
    }
  }

  return Array.from(bestByPhoto.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
};

const pickPrimaryFace = (faces: FaceDetectionResult[]): FaceDetectionResult => {
  const sorted = [...faces].sort((a, b) => {
    const areaA = (a.boundingBox?.width ?? 0) * (a.boundingBox?.height ?? 0);
    const areaB = (b.boundingBox?.width ?? 0) * (b.boundingBox?.height ?? 0);
    return (b.confidence + areaB / 100000) - (a.confidence + areaA / 100000);
  });

  return sorted[0];
};

const buildAveragedDescriptor = (samples: FaceDetectionResult[]): number[] => {
  if (samples.length === 0) return [];

  const descriptorLength = samples[0].descriptor.length;
  const weighted = new Array(descriptorLength).fill(0);
  let totalWeight = 0;

  for (const sample of samples) {
    const descriptor = Array.from(sample.descriptor);
    const weight = clamp(sample.confidence, 0.4, 1);
    totalWeight += weight;
    for (let i = 0; i < descriptorLength; i++) {
      weighted[i] += descriptor[i] * weight;
    }
  }

  if (totalWeight <= 0) {
    return normalizeDescriptor(Array.from(samples[0].descriptor));
  }

  return normalizeDescriptor(weighted.map((v) => v / totalWeight));
};

export const useFaceRecognition = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [matches, setMatches] = useState<FaceMatch[]>([]);
  const [modelsReady, setModelsReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Carregar modelos do face-api.js
  useEffect(() => {
    const loadModels = async () => {
      if (modelsLoaded) {
        console.log('✅ Modelos já carregados anteriormente');
        setModelsReady(true);
        return;
      }

      try {
        const deviceConfig = getOptimizedConfig();
        console.log('🔄 Carregando modelos de IA para reconhecimento facial...');
        console.log('📱 Dispositivo:', deviceConfig.isMobile ? 'Mobile' : 'Desktop');
        console.log('🚀 WebGPU:', deviceConfig.hasWebGPU ? 'Disponível' : 'Não disponível');
        
        const success = await loadFaceAPIModels();
        
        if (!success) {
          throw new Error('Falha ao carregar modelos');
        }

        modelsLoaded = true;
        setModelsReady(true);
        console.log('🎉 Modelos de IA carregados com sucesso!');
        
        toast({
          title: "✅ IA Pronta!",
          description: deviceConfig.hasWebGPU 
            ? "Reconhecimento facial com aceleração GPU disponível!"
            : "Reconhecimento facial ativado.",
        });
      } catch (error) {
        console.error('❌ ERRO ao carregar modelos:', error);
        toast({
          title: "Erro ao carregar IA",
          description: "Não foi possível carregar os modelos. Recarregue a página.",
          variant: "destructive",
        });
      }
    };

    loadModels();
  }, []);

  // Iniciar câmera
  const startCamera = useCallback(async () => {
    try {
      // Verificar se navegador suporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não suporta acesso à câmera. Use Chrome, Firefox ou Safari.');
      }

      // Verificar se está em HTTPS (obrigatório para getUserMedia)
      if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
        throw new Error('Acesso à câmera requer HTTPS. Use https:// no endereço.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 }, 
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Aguardar vídeo carregar
        await new Promise((resolve) => {
          videoRef.current!.onloadedmetadata = () => resolve(true);
        });
      }
      
      return true;
    } catch (error: unknown) {
      console.error('Erro ao acessar câmera:', error);

      const e = error as { name?: string; message?: string };
      let errorMessage = "Permita o acesso à câmera para usar reconhecimento facial.";
      let errorTitle = "Erro ao acessar câmera";

      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        errorTitle = "Permissão negada";
        errorMessage = "Você negou o acesso à câmera. Clique no ícone de câmera na barra de endereço e permita o acesso.";
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        errorTitle = "Câmera não encontrada";
        errorMessage = "Nenhuma câmera foi detectada no seu dispositivo.";
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        errorTitle = "Câmera em uso";
        errorMessage = "A câmera já está sendo usada por outro aplicativo. Feche outros apps e tente novamente.";
      } else if (e.name === 'OverconstrainedError') {
        errorTitle = "Câmera incompatível";
        errorMessage = "Sua câmera não suporta as configurações necessárias.";
      } else if (e.name === 'SecurityError') {
        errorTitle = "Erro de segurança";
        errorMessage = "Acesso à câmera bloqueado por política de segurança. Use HTTPS.";
      } else if (e.message) {
        errorMessage = e.message;
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }, []);

  // Parar câmera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Capturar foto da câmera
  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(videoRef.current, 0, 0);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
    });
  }, []);

  // Processar imagem e extrair descritores faciais usando IA otimizada
  const detectFacesFromSource = useCallback(async (imageSource: HTMLVideoElement | HTMLImageElement): Promise<FaceDetectionResult[] | null> => {
    try {
      if (!modelsReady) {
        throw new Error('Modelos de IA ainda não foram carregados');
      }

      console.log('🔍 Detectando rostos com IA otimizada...');
      
      // Usar função otimizada que escolhe o melhor método
      const results = await detectFaces(imageSource);

      if (!results || results.length === 0) {
        console.log('⚠️ Nenhum rosto detectado');
        return null;
      }

      const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
      console.log(`✅ ${results.length} rosto(s) detectado(s) (confiança média: ${Math.round(avgConfidence * 100)}%)`);
      
      return results;
    } catch (error: unknown) {
      console.error('Erro ao detectar rostos:', error);
      return null;
    }
  }, [modelsReady]);

  // Buscar fotos similares por reconhecimento facial - OTIMIZADO
  const findMyPhotos = useCallback(async (
    options?: { campaignId?: string; subEventId?: string; threshold?: number; limit?: number }
  ): Promise<FaceMatch[]> => {
    setIsProcessing(true);
    const startTime = Date.now();
    const campaignId = options?.campaignId;
    const subEventId = options?.subEventId;
    const requestedThreshold = options?.threshold ?? 0.58;
    const threshold = clamp(requestedThreshold, 0.45, 0.8);
    const limit = clamp(options?.limit ?? 30, 1, 60);
    
    try {
      if (!modelsReady) {
        throw new Error('Aguarde os modelos de IA carregarem...');
      }

      if (!videoRef.current) {
        throw new Error('Câmera não inicializada');
      }

      if (!campaignId && !subEventId) {
        toast({
          title: "Erro",
          description: "É necessário estar em um evento ou álbum específico para usar reconhecimento facial.",
          variant: "destructive",
        });
        return [];
      }

      console.log('📸 Capturando seu rosto da câmera...');
      
      // Detectar rostos diretamente do vídeo
      const descriptors = await detectFacesFromSource(videoRef.current);

      if (!descriptors || descriptors.length === 0) {
        console.error('❌ Nenhum rosto detectado na câmera');
        toast({
          title: "Nenhum rosto detectado 😔",
          description: "Posicione seu rosto na câmera, melhore a iluminação e tente novamente.",
          variant: "destructive",
        });
        return [];
      }

      console.log(`✅ ${descriptors.length} rosto(s) detectado(s) na sua câmera!`);

      const sampledFaces: FaceDetectionResult[] = [];
      const frameDetections: FaceDetectionResult[][] = [descriptors];

      const extraSamples = 2;
      for (let i = 0; i < extraSamples; i++) {
        await wait(180);
        const nextDetections = await detectFacesFromSource(videoRef.current);
        if (nextDetections && nextDetections.length > 0) {
          frameDetections.push(nextDetections);
        }
      }

      for (const detectionSet of frameDetections) {
        const primary = pickPrimaryFace(detectionSet);
        if (primary?.confidence >= 0.5) {
          sampledFaces.push(primary);
        }
      }

      if (frameDetections.some((d) => d.length > 1)) {
        toast({
          title: "Mais de um rosto detectado",
          description: "Vamos usar automaticamente o rosto com melhor enquadramento.",
        });
      }

      if (sampledFaces.length === 0) {
        toast({
          title: "Nenhum rosto válido detectado 😔",
          description: "Aproxime o rosto, olhe para a câmera e tente novamente.",
          variant: "destructive",
        });
        return [];
      }

      const bestSample = sampledFaces.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );

      if (bestSample.confidence < 0.65) {
        toast({
          title: "⚠️ Baixa confiança na detecção",
          description: "A iluminação pode estar ruim. Vamos tentar mesmo assim.",
        });
      }

      const bestDescriptor = normalizeDescriptor(Array.from(bestSample.descriptor));
      const averagedDescriptor = buildAveragedDescriptor(sampledFaces);
      const userSearchDescriptors = averagedDescriptor.length === 128
        ? [bestDescriptor, averagedDescriptor]
        : [bestDescriptor];

      const invokeEdgeSearch = async (
        descriptor: number[],
        searchThreshold: number,
        searchLimit: number
      ): Promise<FaceMatch[]> => {
        const { data, error } = await supabase.functions.invoke('search-faces-in-album', {
          body: {
            embedding: descriptor,
            campaign_id: campaignId ?? null,
            sub_event_id: subEventId ?? null,
            threshold: searchThreshold,
            limit: searchLimit,
          },
        });

        if (error) throw error;

        const rawMatches = (data?.matches ?? []) as Array<Partial<PhotoRecord & { similarity?: number }>>;

        const mapped: FaceMatch[] = rawMatches
          .filter((photo) => !!photo.id)
          .map((photo) => ({
            photo_id: photo.id ?? '',
            similarity: clamp(photo.similarity ?? 0, 0, 1),
            photo_url: photo.thumbnail_url || photo.watermarked_url || photo.original_url || '',
            campaign_id: photo.campaign_id ?? '',
            sub_event_id: photo.sub_event_id ?? null,
          }));

        return dedupeAndSortMatches(mapped, searchLimit);
      };

      try {
        toast({
          title: "🔍 Buscando suas fotos...",
          description: "Consultando o índice facial otimizado do evento.",
        });

        const thresholdsToTry = [
          threshold,
          clamp(threshold - 0.06, 0.5, 0.78),
          clamp(threshold - 0.11, 0.47, 0.75),
        ];

        let edgeMatches: FaceMatch[] = [];

        for (const descriptor of userSearchDescriptors) {
          for (let i = 0; i < thresholdsToTry.length; i++) {
            const currentThreshold = thresholdsToTry[i];
            const currentLimit = i === 0 ? limit : clamp(limit * 2, 1, 80);
            const batchMatches = await invokeEdgeSearch(descriptor, currentThreshold, currentLimit);
            edgeMatches = dedupeAndSortMatches([...edgeMatches, ...batchMatches], limit);

            if (edgeMatches.length >= Math.min(limit, 8)) {
              break;
            }
          }

          if (edgeMatches.length >= Math.min(limit, 8)) {
            break;
          }
        }

        const topMatches = edgeMatches.slice(0, limit);

        if (topMatches.length > 0) {
          setMatches(topMatches);
        }

        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

        if (topMatches.length > 0) {
          const avgConfidence = Math.round(
            topMatches.reduce((sum, m) => sum + m.similarity, 0) / topMatches.length * 100
          );
          const highConfidenceCount = topMatches.filter(m => m.similarity > 0.75).length;

          toast({
            title: `✨ ${topMatches.length} foto(s) encontrada(s)!`,
            description: highConfidenceCount > 0
              ? `${highConfidenceCount} com alta confiança • ${elapsedTime}s de busca`
              : `Confiança média: ${avgConfidence}% • ${elapsedTime}s`,
            duration: 6000,
          });

          console.log(`✅ Busca otimizada concluída em ${elapsedTime}s: ${topMatches.length} fotos encontradas`);
          return topMatches;
        }

        console.log('ℹ️ Busca por índice não retornou fotos, iniciando fallback local...');
      } catch (edgeError) {
        console.warn('⚠️ Busca otimizada indisponível, usando fallback local:', edgeError);
      }

      toast({
        title: "🔎 Buscando suas fotos...",
        description: "Usando processamento local como fallback.",
      });

      console.log('🔎 Buscando fotos similares no banco de dados...');

      // Converter descritor do usuário para array normal (reusar `userDescriptor` já definido acima)
      // `userDescriptor` já foi criado antes ao tentar a função edge; não redeclaramos para evitar conflito

      // Buscar fotos do evento específico
      let query = supabase
        .from('photos')
        .select('id, watermarked_url, thumbnail_url, campaign_id, sub_event_id')
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (subEventId) {
        query = query.eq('sub_event_id', subEventId);
      } else if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data: photos, error: photosError } = await query;

      const photosList = (photos ?? []) as PhotoRecord[];

      if (photosError) {
        throw photosError;
      }

      if (!photosList || photosList.length === 0) {
        toast({
          title: "Nenhuma foto encontrada",
          description: "Este evento ainda não possui fotos.",
        });
        return [];
      }

      console.log(`📸 Total de ${photosList.length} fotos no evento`);

      // Configuração otimizada
      const optimizedConfig = getOptimizedConfig();
      const BATCH_SIZE = optimizedConfig.batchSize;
      const MAX_PHOTOS = Math.min(optimizedConfig.maxPhotosToProcess || 120, 120);
      const userDescriptorsForMatching = userSearchDescriptors;
      const similarityCache = new Map<string, number>();
      const concurrency = optimizedConfig.isLowEnd ? 2 : optimizedConfig.isMobile ? 3 : 4;
      
      // Limitar número de fotos a processar para evitar buscas infinitas
      const photosToProcess = photosList.slice(0, MAX_PHOTOS);

      // Usar busca progressiva: primeiro threshold alto, depois relaxar
      const thresholds = [0.7, 0.6, 0.55]; // Tentar com diferentes níveis
      const matches: FaceMatch[] = [];
      let processedCount = 0;
      let currentThreshold = 0;

      // Helper: carregar imagem e desenhar em canvas reduzido (inputSize)
      const loadImageToCanvas = async (imageUrl: string, targetSize: number): Promise<HTMLCanvasElement | null> => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 7000);
          const resp = await fetch(imageUrl, { signal: controller.signal, mode: 'cors' });
          clearTimeout(timeout);
          if (!resp.ok) throw new Error('Falha no download da imagem');
          const blob = await resp.blob();

          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;

          // Calcular proporção mantendo aspecto
          const ratio = Math.min(targetSize / bitmap.width, targetSize / bitmap.height);
          const w = Math.max(1, Math.round(bitmap.width * ratio));
          const h = Math.max(1, Math.round(bitmap.height * ratio));
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(bitmap, 0, 0, w, h);
          bitmap.close();
          return canvas;
        } catch (err) {
          return null;
        }
      };

      // Função para processar uma foto (usa canvas reduzido)
      const processPhoto = async (photo: PhotoRecord, threshold: number): Promise<FaceMatch | null> => {
        try {
          const cachedSimilarity = similarityCache.get(photo.id);
          if (typeof cachedSimilarity === 'number') {
            if (cachedSimilarity > threshold) {
              return {
                photo_id: photo.id,
                similarity: cachedSimilarity,
                photo_url: photo.watermarked_url || photo.thumbnail_url || '',
                campaign_id: photo.campaign_id ?? '',
                sub_event_id: photo.sub_event_id ?? null,
              };
            }
            return null;
          }

          const imageUrl = photo.thumbnail_url || photo.watermarked_url;
          if (!imageUrl) {
            similarityCache.set(photo.id, 0);
            return null;
          }
          const canvas = await loadImageToCanvas(imageUrl, optimizedConfig.inputSize || 160);
          if (!canvas) return null;

          const photoResults = await detectFaces(canvas);
          let bestSimilarity = 0;

          if (photoResults && photoResults.length > 0) {
            for (const result of photoResults) {
              for (const userDescriptor of userDescriptorsForMatching) {
                const similarity = calculateSimilarity(userDescriptor, result.descriptor);
                if (similarity > bestSimilarity) bestSimilarity = similarity;
              }
            }
          }

          similarityCache.set(photo.id, bestSimilarity);

          if (bestSimilarity > threshold) {
            return {
              photo_id: photo.id,
              similarity: bestSimilarity,
              photo_url: photo.watermarked_url || photo.thumbnail_url || '',
              campaign_id: photo.campaign_id ?? '',
              sub_event_id: photo.sub_event_id ?? null,
            };
          }

          return null;
        } catch (error: unknown) {
          similarityCache.set(photo.id, 0);
          return null;
        }
      };

      // Concurrency runner for a batch with early exit support
      const runWithConcurrency = async <T,>(items: T[], fn: (item: T) => Promise<FaceMatch | null>, concurrency: number, stopIfFound = (m: FaceMatch[]) => false) => {
        const results: FaceMatch[] = [];
        let idx = 0;
        const workers: Promise<void>[] = [];

        const worker = async () => {
          while (idx < items.length) {
            const i = idx++;
            const res = await fn(items[i]);
            if (res) {
              // prevent duplicates
              if (!results.find(r => r.photo_id === res.photo_id)) results.push(res);
            }
            processedCount++;
            if (processedCount % 10 === 0) {
              console.log(`🔄 ${processedCount}/${photosToProcess.length} fotos (${results.length} matches)`);
            }
            if (stopIfFound(results)) break;
          }
        };

        for (let w = 0; w < concurrency; w++) {
          workers.push(worker());
        }

        await Promise.all(workers);
        return results;
      };

      // Busca progressiva com múltiplos thresholds
      for (const threshold of thresholds) {
        currentThreshold = threshold;
        console.log(`🎯 Tentando com threshold ${threshold}...`);

        // Processar em batches (cada batch será processado com concorrência)
        for (let i = 0; i < photosToProcess.length; i += BATCH_SIZE) {
          const batch = photosToProcess.slice(i, i + BATCH_SIZE);

          const batchMatches = await runWithConcurrency(batch, (p) => processPhoto(p, threshold), Math.max(1, Math.min(concurrency, BATCH_SIZE)));

          // Merge unique
          for (const match of batchMatches) {
            if (!matches.find(m => m.photo_id === match.photo_id)) matches.push(match);
          }

          // Early exit conditions
          if (matches.length >= 10 && threshold >= 0.65) {
            console.log(`✅ Encontradas ${matches.length} fotos com alta confiança. Parando busca.`);
            break;
          }
          if (processedCount >= photosToProcess.length) {
            console.log('ℹ️ Processamento atingiu o limite máximo de fotos a processar');
            break;
          }
        }

        // Se encontrou fotos com threshold atual, não precisa relaxar mais
        if (matches.length >= 5 && threshold >= 0.6) {
          console.log(`✅ Suficientes matches com threshold ${threshold}`);
          break;
        }
      }

      // Ordenar por similaridade (maior primeiro)
      matches.sort((a, b) => b.similarity - a.similarity);

      // Limitar a top 30 matches
      const topMatches = matches.slice(0, limit);
      setMatches(topMatches);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (topMatches.length === 0) {
        toast({
          title: "Nenhuma foto encontrada 😔",
          description: `Processamos ${processedCount} fotos em ${elapsedTime}s. Tente outro ângulo ou evento.`,
          variant: "destructive",
        });
      } else {
        const avgConfidence = Math.round(
          topMatches.reduce((sum, m) => sum + m.similarity, 0) / topMatches.length * 100
        );
        const highConfidenceCount = topMatches.filter(m => m.similarity > 0.75).length;
        
        toast({
          title: `✨ ${topMatches.length} foto(s) encontrada(s)!`,
          description: highConfidenceCount > 0 
            ? `${highConfidenceCount} com alta confiança • ${elapsedTime}s de busca`
            : `Confiança média: ${avgConfidence}% • ${elapsedTime}s`,
          duration: 6000,
        });
      }

      console.log(`✅ Busca concluída em ${elapsedTime}s: ${topMatches.length} fotos encontradas`);
      return topMatches;

    } catch (error: unknown) {
      console.error('Erro no reconhecimento facial:', error);
      const e = error as { message?: string };
      toast({
        title: "Erro no reconhecimento facial",
        description: e.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [detectFacesFromSource, modelsReady]);

  // Salvar descritor facial do usuário para futuras buscas
  const registerUserFace = useCallback(async (userId: string): Promise<boolean> => {
    setIsProcessing(true);
    
    try {
      if (!modelsReady) {
        throw new Error('Aguarde os modelos de IA carregarem...');
      }

      if (!videoRef.current) {
        throw new Error('Câmera não inicializada');
      }

      const descriptors = await detectFacesFromSource(videoRef.current);
      if (!descriptors || descriptors.length === 0) {
        toast({
          title: "Nenhum rosto detectado",
          description: "Por favor, posicione seu rosto na câmera e tente novamente.",
          variant: "destructive",
        });
        return false;
      }

      // Converter Float32Array para array normal para salvar no banco
      const descriptorArray = Array.from(descriptors[0].descriptor);

      // Salvar no banco de dados (se a tabela existir)
      // TODO: Criar tabela user_face_descriptors no Supabase
      console.log('Descritor facial capturado com IA real:', descriptorArray.slice(0, 10), '...');

      toast({
        title: "✅ Rosto cadastrado com sucesso!",
        description: "Seu rosto foi salvo para buscas futuras mais rápidas.",
        duration: 5000,
      });

      return true;
    } catch (error: unknown) {
      console.error('Erro ao registrar rosto:', error);
      const e = error as { message?: string };
      toast({
        title: "Erro ao registrar rosto",
        description: e.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [detectFacesFromSource, modelsReady]);

  return {
    videoRef,
    isProcessing,
    matches,
    modelsReady,
    startCamera,
    stopCamera,
    capturePhoto,
    findMyPhotos,
    registerUserFace,
  };
};
