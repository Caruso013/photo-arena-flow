import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-header text-header-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Sobre nós */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">Sobre nós</h3>
            <div className="space-y-2 text-sm">
              <p>contato@stafotos.com.br</p>
              <p>(11) 95771-9467</p>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">Links</h3>
            <div className="space-y-2 text-sm">
              <div><Link to="/auth" className="hover:text-primary transition-colors">Login</Link></div>
              <div><Link to="/auth" className="hover:text-primary transition-colors">Cadastro</Link></div>
              <div><Link to="/recuperacao" className="hover:text-primary transition-colors">Recuperação de acesso</Link></div>
            </div>
          </div>

          {/* Ajuda */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">Ajuda</h3>
            <div className="space-y-2 text-sm">
              <div><Link to="/faq" className="hover:text-primary transition-colors">Dúvidas frequentes</Link></div>
              <div><Link to="/contato" className="hover:text-primary transition-colors">Contato</Link></div>
              <div><Link to="/fotografos" className="hover:text-primary transition-colors">Seja Fotógrafo</Link></div>
              <div><Link to="/admin" className="hover:text-primary transition-colors text-xs opacity-70">Área Admin</Link></div>
            </div>
          </div>

          {/* Redes Sociais */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">Redes sociais</h3>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-gray-600 rounded"></div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-white/60">
          <p>© 2024 STA Fotos. Todos os direitos reservados.</p>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <span>Pagamentos seguros via</span>
            <div className="bg-primary px-2 py-1 rounded text-primary-foreground text-xs font-semibold">
              MERCADO PAGO
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
