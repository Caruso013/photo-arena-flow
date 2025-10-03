import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Mail, MessageCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "Erro 404: Usuário tentou acessar rota inexistente:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="text-center space-y-6 p-8 max-w-md">
        <div className="space-y-2">
          <h1 className="text-8xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold">Página não encontrada</h2>
          <p className="text-muted-foreground">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={() => navigate("/")}
            className="gap-2 w-full"
            size="lg"
          >
            <Home className="h-4 w-4" />
            Voltar para o início
          </Button>
          
          <div className="text-sm text-muted-foreground">
            <p>Precisa de ajuda? Entre em contato conosco:</p>
            <div className="flex justify-center gap-4 mt-2">
              <a 
                href="mailto:contato@stafotos.com" 
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Mail className="h-3 w-3" />
                contato@stafotos.com
              </a>
              <a 
                href="/contato" 
                className="inline-flex items-center gap-1 text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/contato");
                }}
              >
                <MessageCircle className="h-3 w-3" />
                Fale conosco
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
