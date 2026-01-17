import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Plus, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

// Componente placeholder para quando a tabela extra_services for criada
export const ExtraServicesManager: React.FC = () => {
  const { user } = useAuth();
  const [showInfo, setShowInfo] = useState(true);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Serviços Extras
            </CardTitle>
            <CardDescription>
              Ofereça serviços adicionais aos seus clientes (entrega rápida, vídeos, gravação)
            </CardDescription>
          </div>
          <Button className="gap-2" disabled>
            <Plus className="h-4 w-4" />
            Novo Serviço
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showInfo && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Funcionalidade em desenvolvimento</AlertTitle>
            <AlertDescription>
              A funcionalidade de serviços extras está sendo desenvolvida e estará disponível em breve.
              Com ela, você poderá oferecer serviços adicionais como entrega rápida, vídeos e gravações personalizadas.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="text-center py-8 mt-4">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Em breve!</h3>
          <p className="text-sm text-muted-foreground">
            Serviços extras como entrega rápida, vídeos e gravações estarão disponíveis em breve.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExtraServicesManager;
