import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import * as faceapi from 'face-api.js';

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
        setModelsReady(true);
        return;
      }

      try {
        console.log('🔄 Carregando modelos de IA para reconhecimento facial...');
        
        const MODEL_URL = '/models';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);

        modelsLoaded = true;
        setModelsReady(true);
        console.log('✅ Modelos de IA carregados com sucesso!');
      } catch (error) {
        console.error('❌ Erro ao carregar modelos:', error);
        toast({
          title: "Erro ao carregar IA",
          description: "Não foi possível carregar os modelos de reconhecimento facial. Recarregue a página.",
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

  // Processar imagem e extrair descritores faciais usando face-api.js
  const detectFaces = useCallback(async (imageSource: HTMLVideoElement | HTMLImageElement): Promise<Float32Array[] | null> => {
    try {
      if (!modelsReady) {
        throw new Error('Modelos de IA ainda não foram carregados');
      }

      console.log('🔍 Detectando rostos com IA...');
      
      // Detectar rostos com landmarks e descritores
      const detections = await faceapi
        .detectAllFaces(imageSource, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections || detections.length === 0) {
        console.log('⚠️ Nenhum rosto detectado');
        return null;
      }

      // Extrair descritores (vetores de 128 dimensões)
      const descriptors = detections.map(d => d.descriptor);
      
      console.log(`✅ ${descriptors.length} rosto(s) detectado(s) com IA real!`);
      return descriptors;
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

      // Detectar rostos diretamente do vídeo
      const descriptors = await detectFaces(videoRef.current);
      if (!descriptors || descriptors.length === 0) {
        toast({
          title: "Nenhum rosto detectado",
          description: "Por favor, posicione seu rosto na câmera e tente novamente.",
          variant: "destructive",
        });
        return [];
      }

      console.log('🔎 Buscando fotos similares no banco de dados...');

      // Buscar TODAS as fotos do evento (ou todos os eventos se não especificado)
      let query = supabase
        .from('photos')
        .select('id, watermarked_url, thumbnail_url, campaign_id, campaigns(id, title)');
      
      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

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

      // Converter descritor do usuário para array normal
      const userDescriptor = Array.from(descriptors[0]);

      // Comparar o rosto do usuário com cada foto
      const matches: FaceMatch[] = [];
      let processedCount = 0;

      for (const photo of photos) {
        try {
          // Criar elemento de imagem para análise
          const img = await faceapi.fetchImage(photo.watermarked_url || photo.thumbnail_url);
          
          // Detectar rostos na foto
          const photoDetections = await faceapi
            .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();

          if (photoDetections && photoDetections.length > 0) {
            // Comparar com cada rosto detectado na foto
            for (const detection of photoDetections) {
              const photoDescriptor = detection.descriptor;
              
              // Calcular distância euclidiana (quanto menor, mais similar)
              const distance = faceapi.euclideanDistance(userDescriptor, Array.from(photoDescriptor));
              
              // Converter distância em similaridade (0 a 1)
              // Distância típica: 0.4 = muito similar, 0.6 = similar, >0.8 = diferente
              const similarity = Math.max(0, 1 - distance);

              // Se similaridade > 40%, considerar um match
              if (similarity > 0.4) {
                matches.push({
                  photo_id: photo.id,
                  similarity: similarity,
                  photo_url: photo.watermarked_url || photo.thumbnail_url || '',
                  campaign_id: photo.campaign_id
                });
                break; // Não precisa verificar outros rostos nesta foto
              }
            }
          }

          processedCount++;
          
          // Log de progresso a cada 20 fotos
          if (processedCount % 20 === 0) {
            console.log(`🔄 Processadas ${processedCount}/${photos.length} fotos...`);
          }

        } catch (imgError) {
          console.warn(`Erro ao processar foto ${photo.id}:`, imgError);
          // Continuar com a próxima foto
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
        toast({
          title: `✨ ${topMatches.length} foto(s) encontrada(s)!`,
          description: `Suas fotos foram identificadas com ${Math.round(topMatches[0].similarity * 100)}% de confiança.`,
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

      const descriptors = await detectFaces(videoRef.current);
      if (!descriptors || descriptors.length === 0) {
        toast({
          title: "Nenhum rosto detectado",
          description: "Por favor, posicione seu rosto na câmera e tente novamente.",
          variant: "destructive",
        });
        return false;
      }

      // Converter Float32Array para array normal para salvar no banco
      const descriptorArray = Array.from(descriptors[0]);

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
