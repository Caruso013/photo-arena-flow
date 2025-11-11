import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, Mail, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  eventId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
    
    // Enviar erro para o Sentry
    Sentry.withScope((scope) => {
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
      });
      const eventId = Sentry.captureException(error);
      this.setState({ eventId });
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Ops! Algo deu errado</h1>
                <p className="text-muted-foreground">
                  Ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={this.handleReload}
                className="gap-2 w-full"
                size="lg"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
              
              <Button 
                onClick={this.handleGoHome}
                variant="outline"
                className="gap-2 w-full"
                size="lg"
              >
                <Home className="h-4 w-4" />
                Voltar ao início
              </Button>
              
              {this.state.eventId && (
                <Button 
                  variant="secondary"
                  onClick={() => Sentry.showReportDialog({ eventId: this.state.eventId })}
                  className="gap-2 w-full"
                  size="sm"
                >
                  <Mail className="h-4 w-4" />
                  Reportar problema com detalhes
                </Button>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Se o problema persistir, entre em contato:</p>
              <div className="flex justify-center gap-4">
                <a 
                  href="mailto:contato@stafotos.com" 
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Mail className="h-3 w-3" />
                  contato@stafotos.com
                </a>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    Detalhes técnicos (desenvolvimento)
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;