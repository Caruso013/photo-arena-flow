import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const STA_WHATSAPP = '5511957719467';

const FloatingHelpChat = () => {
  const location = useLocation();
  const isDashboardRoute = location.pathname.startsWith('/dashboard');
  const isHomeRoute = location.pathname === '/' || location.pathname === '/home';

  if (!isHomeRoute) {
    return null;
  }

  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [urgency, setUrgency] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);

  const canSend = topic !== '' && urgency !== '';
  const canGoNext = (currentStep: number) => {
    if (currentStep === 1) return topic !== '';
    if (currentStep === 2) return urgency !== '';
    return true;
  };

  const whatsappUrl = useMemo(() => {
    const detailText = message.trim() || 'Sem detalhes adicionais.';
    const text = [
      'Ola! Preciso de ajuda na STA Fotos.',
      `Assunto: ${topic || 'Nao informado'}`,
      `Urgencia: ${urgency || 'Nao informado'}`,
      `Detalhes: ${detailText}`,
    ].join('\n');

    return `https://wa.me/${STA_WHATSAPP}?text=${encodeURIComponent(text)}`;
  }, [message, topic, urgency]);

  const handleSend = () => {
    if (!canSend) return;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setOpen(false);
    setStep(1);
  };

  const handleDialogChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setStep(1);
    }
  };

  const stepTitle =
    step === 1 ? 'Qual assunto?' : step === 2 ? 'Qual urgencia?' : 'Conte em poucas palavras';

  const stepHint =
    step === 1
      ? 'Assim direcionamos voce para o atendimento certo.'
      : step === 2
        ? 'Isso ajuda a priorizar seu chamado.'
        : 'Opcional, mas ajuda muito nosso suporte.';

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className={`fixed left-4 ${isDashboardRoute ? 'bottom-24' : 'bottom-6'} z-[60] h-14 w-14 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700`}
          aria-label="Abrir ajuda no WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
          <DialogTitle className="text-xl font-semibold text-slate-900">
            Posso te ajudar?
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Etapa {step} de 3
          </DialogDescription>
          <div className="mt-3 h-1.5 w-full rounded-full bg-white/70">
            <div
              className="h-1.5 rounded-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
            <Label className="text-slate-900 font-semibold">{stepTitle}</Label>
            <p className="text-sm text-slate-600">{stepHint}</p>

            {step === 1 && (
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="Selecione o assunto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Comprar fotos">Comprar fotos</SelectItem>
                  <SelectItem value="Acesso ao evento">Acesso ao evento</SelectItem>
                  <SelectItem value="Pagamento">Pagamento</SelectItem>
                  <SelectItem value="Suporte tecnico">Suporte tecnico</SelectItem>
                  <SelectItem value="Contratar servico">Contratar servico</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            )}

            {step === 2 && (
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="Selecione a urgencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            )}

            {step === 3 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Opcional</span>
                  <span className="text-xs text-slate-500">{message.length}/240</span>
                </div>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: nao estou conseguindo finalizar a compra do evento X"
                  rows={4}
                  maxLength={240}
                  className="resize-none bg-white"
                />
              </>
            )}
          </div>

          {step === 3 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-900">
              Resumo: assunto {topic || 'Nao informado'} • urgencia {urgency || 'Nao informado'}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              onClick={() => setStep((prev) => Math.max(1, prev - 1))}
              disabled={step === 1}
            >
              Voltar
            </Button>

            {step < 3 ? (
              <Button
                type="button"
                className="h-11 flex-1 bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                disabled={!canGoNext(step)}
              >
                Continuar
              </Button>
            ) : (
              <Button
                className="h-11 flex-1 bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                onClick={handleSend}
                disabled={!canSend}
              >
                Ir para WhatsApp
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FloatingHelpChat;