import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface EventTermsEditorProps {
  campaignId: string;
  eventTerms: string | null;
  eventTermsPdfUrl: string | null;
  onUpdate: (terms: string | null, pdfUrl: string | null) => void;
  disabled?: boolean;
}

export const EventTermsEditor: React.FC<EventTermsEditorProps> = ({
  campaignId,
  eventTerms,
  eventTermsPdfUrl,
  onUpdate,
  disabled = false
}) => {
  const [terms, setTerms] = useState(eventTerms || '');
  const [pdfUrl, setPdfUrl] = useState(eventTermsPdfUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadPdf = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast.error('Por favor, selecione um arquivo PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 10MB');
      return;
    }

    try {
      setUploading(true);

      const fileName = `${campaignId}_terms_${Date.now()}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('event-terms')
        .upload(fileName, file, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('event-terms')
        .getPublicUrl(fileName);

      setPdfUrl(urlData.publicUrl);
      toast.success('PDF enviado com sucesso!');
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      toast.error('Erro ao enviar PDF: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePdf = async () => {
    if (!pdfUrl) return;

    try {
      // Extrair nome do arquivo da URL
      const fileName = pdfUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('event-terms').remove([fileName]);
      }
      setPdfUrl('');
      toast.success('PDF removido');
    } catch (error) {
      console.error('Error removing PDF:', error);
      // Mesmo com erro, limpar localmente
      setPdfUrl('');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('campaigns')
        .update({
          event_terms: terms.trim() || null,
          event_terms_pdf_url: pdfUrl || null,
        })
        .eq('id', campaignId);

      if (error) throw error;

      onUpdate(terms.trim() || null, pdfUrl || null);
      toast.success('Termos salvos com sucesso!');
    } catch (error: any) {
      console.error('Error saving terms:', error);
      toast.error('Erro ao salvar termos: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = terms !== (eventTerms || '') || pdfUrl !== (eventTermsPdfUrl || '');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText className="h-4 w-4 text-primary" />
        Termos do Evento para Fotógrafos
      </div>

      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 dark:text-blue-100 text-sm">
          Os termos serão exibidos aos fotógrafos antes de se candidatarem. 
          Eles precisarão aceitar para enviar a candidatura.
        </AlertDescription>
      </Alert>

      {/* Campo de texto para termos */}
      <div className="space-y-2">
        <Label htmlFor="event-terms">Resumo dos Termos</Label>
        <Textarea
          id="event-terms"
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          placeholder="Descreva as condições, valores, horários e outras informações importantes para os fotógrafos..."
          rows={6}
          disabled={disabled}
          className="resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Inclua informações como local, horário, valor pago, e regras específicas do evento.
        </p>
      </div>

      {/* Upload de PDF */}
      <div className="space-y-2">
        <Label>Documento Completo (PDF)</Label>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadPdf(file);
          }}
          disabled={disabled || uploading}
        />

        {pdfUrl ? (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileText className="h-5 w-5 text-red-500" />
            <span className="flex-1 text-sm truncate">Termos anexados</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(pdfUrl, '_blank')}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemovePdf}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="w-full gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Anexar PDF com termos completos
              </>
            )}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Opcional. Máximo 10MB.
        </p>
      </div>

      {/* Botão Salvar */}
      {hasChanges && (
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || disabled}
          className="w-full gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Salvar Termos
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default EventTermsEditor;
