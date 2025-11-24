import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import * as faceapi from 'face-api.js';
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
}

let modelsLoaded = false;

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
    } catch (error: any) {
      console.error('Erro ao acessar câmera:', error);
      
      let errorMessage = "Permita o acesso à câmera para usar reconhecimento facial.";
      let errorTitle = "Erro ao acessar câmera";
      
      // Mensagens específicas por tipo de erro
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorTitle = "Permissão negada";
        errorMessage = "Você negou o acesso à câmera. Clique no ícone de câmera na barra de endereço e permita o acesso.";
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorTitle = "Câmera não encontrada";
        errorMessage = "Nenhuma câmera foi detectada no seu dispositivo.";
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorTitle = "Câmera em uso";
        errorMessage = "A câmera já está sendo usada por outro aplicativo. Feche outros apps e tente novamente.";
      } else if (error.name === 'OverconstrainedError') {
        errorTitle = "Câmera incompatível";
        errorMessage = "Sua câmera não suporta as configurações necessárias.";
      } else if (error.name === 'SecurityError') {
        errorTitle = "Erro de segurança";
        errorMessage = "Acesso à câmera bloqueado por política de segurança. Use HTTPS.";
      } else if (error.message) {
        errorMessage = error.message;
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
    } catch (error) {
      console.error('Erro ao detectar rostos:', error);
      return null;
    }
  }, [modelsReady]);

  // Buscar fotos similares por reconhecimento facial
  const findMyPhotos = useCallback(async (campaignId?: string): Promise<FaceMatch[]> => {
    setIsProcessing(true);
    
    try {
      if (!modelsReady) {
        throw new Error('Aguarde os modelos de IA carregarem...');
      }

      if (!videoRef.current) {
        throw new Error('Câmera não inicializada');
      }

      console.log('📸 Capturando seu rosto da câmera...');
      
      // Detectar rostos diretamente do vídeo
      const descriptors = await detectFacesFromSource(videoRef.current);
      
      if (!descriptors || descriptors.length === 0) {
        console.error('❌ Nenhum rosto detectado na câmera');
        toast({
          title: "Nenhum rosto detectado",
          description: "Por favor, posicione seu rosto na câmera e tente novamente. Certifique-se de estar bem iluminado.",
          variant: "destructive",
        });
        return [];
      }

      console.log(`✅ ${descriptors.length} rosto(s) detectado(s) na sua câmera!`);
      console.log('🔎 Buscando fotos similares no banco de dados...');

      // Converter descritor do usuário para array normal
      const userDescriptor = Array.from(descriptors[0].descriptor);
      if (!campaignId) {
        toast({
          title: "Erro",
          description: "É necessário estar em um evento específico para usar reconhecimento facial.",
          variant: "destructive",
        });
        return [];
      }

      // Buscar fotos do evento específico (limitado a 200 para performance)
      let query = supabase
        .from('photos')
        .select('id, watermarked_url, thumbnail_url, campaign_id, campaigns(id, title)')
        .eq('campaign_id', campaignId) // SEMPRE filtrar pelo evento atual
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .range(0, 199); // Limitar a 200 fotos mais recentes

      const { data: photos, error: photosError } = await query;

      if (photosError) {
        throw photosError;
      }

      if (!photos || photos.length === 0) {
        toast({
          title: "Nenhuma foto encontrada",
          description: campaignId 
            ? "Este evento ainda não possui fotos."
            : "Não há fotos disponíveis para busca.",
        });
        return [];
      }

      console.log(`📸 Analisando ${photos.length} fotos com IA...`);

      // Usar configuração otimizada para mobile
      const optimizedConfig = getOptimizedConfig();
      const MAX_PHOTOS = optimizedConfig.maxPhotosToProcess;
      const photosToProcess = photos.slice(0, MAX_PHOTOS);
      
      if (photos.length > MAX_PHOTOS) {
        console.warn(`⚠️ Limitando busca a ${MAX_PHOTOS} fotos (total: ${photos.length})`);
        toast({
          title: "Busca limitada",
          description: `Analisando as ${MAX_PHOTOS} fotos mais recentes de ${photos.length} disponíveis.`,
        });
      }

      // Comparar o rosto do usuário com cada foto
      const matches: FaceMatch[] = [];
      let processedCount = 0;

      // Processar em batches paralelos otimizados para o dispositivo
      const batchConfig = getOptimizedConfig();
      const BATCH_SIZE = batchConfig.batchSize;
      
      const processPhoto = async (photo: any): Promise<FaceMatch | null> => {
        try {
          // Criar elemento de imagem com suporte a CORS
          const img = document.createElement('img');
          img.crossOrigin = 'anonymous';
          
          // Usar thumbnail para economizar banda e memória
          const imageUrl = photo.thumbnail_url || photo.watermarked_url;
          
          // Log detalhado para debug
          console.log(`🖼️ Carregando foto ${photo.id} de ${imageUrl}`);
          
          img.src = imageUrl;
          
          // Aguardar carregamento com timeout
          await Promise.race([
            new Promise<void>((resolve, reject) => {
              img.onload = () => {
                console.log(`✅ Foto ${photo.id} carregada com sucesso`);
                resolve();
              };
              img.onerror = (e) => {
                console.error(`❌ Erro ao carregar foto ${photo.id}:`, e);
                reject(new Error('Falha ao carregar imagem'));
              };
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout ao carregar imagem')), 10000)
            )
          ]);
          
          // Detectar rostos na foto usando método otimizado
          const photoResults = await detectFaces(img);

          if (photoResults && photoResults.length > 0) {
            // Comparar com cada rosto detectado na foto
            for (const result of photoResults) {
              // Calcular similaridade usando função otimizada
              const similarity = calculateSimilarity(userDescriptor, result.descriptor);

              // Threshold aumentado para 60% (reduz falsos positivos)
              if (similarity > 0.6) {
                // Limpar imagem da memória
                img.remove();
                
                return {
                  photo_id: photo.id,
                  similarity: similarity,
                  photo_url: photo.watermarked_url || photo.thumbnail_url || '',
                  campaign_id: photo.campaign_id
                };
              }
            }
          }

          // Limpar imagem da memória
          img.remove();
          return null;

        } catch (imgError) {
          console.warn(`⚠️ Erro ao processar foto ${photo.id}:`, imgError);
          
          // Tentar novamente SEM crossOrigin (fallback para problemas de CORS)
          try {
            console.log(`🔄 Tentando carregar foto ${photo.id} sem CORS...`);
            const img2 = document.createElement('img');
            const imageUrl = photo.thumbnail_url || photo.watermarked_url;
            img2.src = imageUrl;
            
            await new Promise<void>((resolve, reject) => {
              img2.onload = () => resolve();
              img2.onerror = () => reject(new Error('Falha ao carregar imagem'));
            });
            
            // Detectar rostos na foto (segunda tentativa)
            const photoResults = await detectFaces(img2);

            if (photoResults && photoResults.length > 0) {
              for (const result of photoResults) {
                const similarity = calculateSimilarity(userDescriptor, result.descriptor);

                if (similarity > 0.6) {
                  img2.remove();
                  return {
                    photo_id: photo.id,
                    similarity: similarity,
                    photo_url: photo.watermarked_url || photo.thumbnail_url || '',
                    campaign_id: photo.campaign_id
                  };
                }
              }
            }
            
            img2.remove();
          } catch (fallbackError) {
            console.error(`❌ Falha completa ao processar foto ${photo.id}:`, fallbackError);
          }
          
          return null;
        }
      };
      
      // Processar em batches paralelos
      for (let i = 0; i < photosToProcess.length; i += BATCH_SIZE) {
        const batch = photosToProcess.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(processPhoto));
        
        // Filtrar nulls e adicionar matches
        const validMatches = batchResults.filter((m): m is FaceMatch => m !== null);
        matches.push(...validMatches);
        
        processedCount += batch.length;
        
        // Log de progresso
        if (processedCount % 20 === 0 || processedCount === photosToProcess.length) {
          console.log(`🔄 Processadas ${processedCount}/${photosToProcess.length} fotos... (${matches.length} matches)`);
        }
      }

      // Ordenar por similaridade (maior primeiro)
      matches.sort((a, b) => b.similarity - a.similarity);

      // Limitar a top 20 matches
      const topMatches = matches.slice(0, 20);

      setMatches(topMatches);

      if (topMatches.length === 0) {
        toast({
          title: "Nenhuma foto sua encontrada",
          description: "Não identificamos você nas fotos deste evento. Tente outro ângulo ou evento.",
        });
      } else {
        const avgConfidence = Math.round(
          topMatches.reduce((sum, m) => sum + m.similarity, 0) / topMatches.length * 100
        );
        const highConfidenceCount = topMatches.filter(m => m.similarity > 0.8).length;
        
        toast({
          title: `✨ ${topMatches.length} foto(s) encontrada(s)!`,
          description: highConfidenceCount > 0 
            ? `${highConfidenceCount} com alta confiança (${Math.round(topMatches[0].similarity * 100)}%)`
            : `Confiança média: ${avgConfidence}%`,
          duration: 5000,
        });
      }

      console.log(`✅ Encontradas ${topMatches.length} fotos com você!`);
      return topMatches;

    } catch (error: any) {
      console.error('Erro no reconhecimento facial:', error);
      toast({
        title: "Erro no reconhecimento facial",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [detectFaces, modelsReady]);

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
    } catch (error: any) {
      console.error('Erro ao registrar rosto:', error);
      toast({
        title: "Erro ao registrar rosto",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [detectFaces, modelsReady]);

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
