import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

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

export const useFaceRecognition = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [matches, setMatches] = useState<FaceMatch[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // Processar imagem e extrair descritores faciais (usando API do Supabase Edge Function)
  const detectFaces = useCallback(async (imageBlob: Blob): Promise<number[][] | null> => {
    try {
      // MODO MOCK - Simular detecção de rostos (até fazer deploy das Edge Functions)
      console.log('🎭 MODO SIMULAÇÃO: Detectando rostos...');
      
      // Simular delay de processamento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Retornar um descritor facial simulado (128 dimensões)
      const mockDescriptor = Array(128).fill(0).map(() => Math.random() * 2 - 1);
      
      console.log('✅ Rosto detectado (simulado)!');
      return [mockDescriptor];
      
      // TODO: Descomentar quando Edge Functions estiverem no ar
      /*
      // Converter blob para base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imageBlob);
      });

      // Chamar Edge Function para detectar rostos
      const { data, error } = await supabase.functions.invoke('detect-faces', {
        body: { image: base64 }
      });

      if (error) throw error;
      
      return data.descriptors || null;
      */
    } catch (error) {
      console.error('Erro ao detectar rostos:', error);
      return null;
    }
  }, []);

  // Buscar fotos similares por reconhecimento facial
  const findMyPhotos = useCallback(async (campaignId?: string): Promise<FaceMatch[]> => {
    setIsProcessing(true);
    
    try {
      // Capturar foto
      const photoBlob = await capturePhoto();
      if (!photoBlob) {
        throw new Error('Não foi possível capturar a foto');
      }

      // Detectar rostos
      const descriptors = await detectFaces(photoBlob);
      if (!descriptors || descriptors.length === 0) {
        toast({
          title: "Nenhum rosto detectado",
          description: "Por favor, posicione seu rosto na câmera e tente novamente.",
          variant: "destructive",
        });
        return [];
      }

      // MODO MOCK - Simular busca de fotos (até fazer deploy das Edge Functions)
      console.log('🔍 MODO SIMULAÇÃO: Buscando fotos similares...');
      
      // Simular delay de busca
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular resultado: encontrar algumas fotos do evento
      const mockMatches: FaceMatch[] = [
        {
          photo_id: '1',
          similarity: 0.95,
          photo_url: 'https://via.placeholder.com/400x600?text=Foto+1',
          campaign_id: campaignId || 'mock-campaign'
        },
        {
          photo_id: '2',
          similarity: 0.87,
          photo_url: 'https://via.placeholder.com/400x600?text=Foto+2',
          campaign_id: campaignId || 'mock-campaign'
        },
        {
          photo_id: '3',
          similarity: 0.76,
          photo_url: 'https://via.placeholder.com/400x600?text=Foto+3',
          campaign_id: campaignId || 'mock-campaign'
        }
      ];
      
      setMatches(mockMatches);
      
      toast({
        title: `${mockMatches.length} foto(s) encontrada(s)! (DEMO)`,
        description: "Modo demonstração - Em produção buscará fotos reais.",
      });
      
      console.log('✅ Busca concluída (simulada)!', mockMatches);
      return mockMatches;
      
      // TODO: Descomentar quando Edge Functions estiverem no ar
      /*
      // Buscar fotos similares via Edge Function
      const { data, error } = await supabase.functions.invoke('find-photos-by-face', {
        body: { 
          descriptors,
          campaign_id: campaignId,
          threshold: 0.6 // Similaridade mínima 60%
        }
      });

      if (error) throw error;

      const foundMatches: FaceMatch[] = data.matches || [];
      setMatches(foundMatches);

      if (foundMatches.length === 0) {
        toast({
          title: "Nenhuma foto encontrada",
          description: "Não encontramos fotos suas neste evento. Tente outro ângulo ou evento.",
        });
      } else {
        toast({
          title: `${foundMatches.length} foto(s) encontrada(s)!`,
          description: "Suas fotos foram identificadas com sucesso.",
        });
      }

      return foundMatches;
      */
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
  }, [capturePhoto, detectFaces]);

  // Salvar descritor facial do usuário para futuras buscas
  // TODO: Implementar após executar migration no Supabase
  const registerUserFace = useCallback(async (userId: string): Promise<boolean> => {
    setIsProcessing(true);
    
    try {
      const photoBlob = await capturePhoto();
      if (!photoBlob) {
        throw new Error('Não foi possível capturar a foto');
      }

      const descriptors = await detectFaces(photoBlob);
      if (!descriptors || descriptors.length === 0) {
        toast({
          title: "Nenhum rosto detectado",
          description: "Por favor, posicione seu rosto na câmera e tente novamente.",
          variant: "destructive",
        });
        return false;
      }

      // Funcionalidade em desenvolvimento
      console.log('Descritor facial capturado:', descriptors[0]);

      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "Em breve você poderá salvar seu rosto para buscas mais rápidas.",
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
  }, [capturePhoto, detectFaces]);

  return {
    videoRef,
    isProcessing,
    matches,
    startCamera,
    stopCamera,
    capturePhoto,
    findMyPhotos,
    registerUserFace,
  };
};
