# STA Fotos - Plataforma de Fotografia Esportiva

## Visão Geral

STA Fotos é uma plataforma moderna e completa para comercialização de fotografias esportivas, conectando fotógrafos profissionais com atletas, familiares e organizadores de eventos.

## Características Principais

### 🏃‍♂️ Para Atletas e Compradores
- **Navegação intuitiva** por eventos e galerias
- **Visualização com marca d'água** para proteção do conteúdo
- **Carrinho de compras** com seleção múltipla
- **Pagamento seguro** via Mercado Pago
- **Download imediato** em alta resolução
- **Interface responsiva** para todos os dispositivos

### 📸 Para Fotógrafos
- **Upload em background** - continue trabalhando enquanto as fotos são enviadas
- **Gerenciamento de eventos** e álbuns organizados
- **Sistema de precificação** flexível por foto
- **Dashboard completo** com estatísticas e vendas
- **Notificações automáticas** do progresso de upload
- **Proteção automática** com marca d'água

### 🏢 Para Organizadores
- **Criação de eventos** com múltiplos álbuns
- **Gestão de fotógrafos** credenciados
- **Relatórios de vendas** detalhados
- **Controle de acesso** por evento

## Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript
- **Vite** para desenvolvimento rápido
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes
- **React Router** para navegação
- **React Query** para gerenciamento de estado

### Backend & Infraestrutura
- **Supabase** como Backend-as-a-Service
- **PostgreSQL** para banco de dados
- **Supabase Storage** para armazenamento de imagens
- **Edge Functions** para processamento serverless
- **Service Workers** para uploads em background

### Pagamentos & Comunicação
- **Mercado Pago** para processamento de pagamentos
- **Resend** para sistema de e-mails transacionais
- **Webhooks** para sincronização automática

## Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta Supabase
- Credenciais Mercado Pago
- API Key Resend

### Configuração do Ambiente

1. **Clone o repositório**
```bash
git clone [url-do-repositorio]
cd photo-arena-flow
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Configure as seguintes variáveis:
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_publica_supabase
VITE_MERCADO_PAGO_PUBLIC_KEY=sua_chave_publica_mp
VITE_RESEND_API_KEY=sua_chave_resend
```

4. **Configure o Supabase**
- Crie as tabelas necessárias no Supabase
- Configure as políticas RLS (Row Level Security)
- Faça upload das Edge Functions

5. **Deploy das Edge Functions**
```bash
supabase functions deploy mercadopago-webhook
supabase functions deploy send-purchase-confirmation
supabase functions deploy send-email-resend
```

### Desenvolvimento

```bash
# Executar em modo de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## Funcionalidades Avançadas

### Sistema de Upload em Background
- **Uploads não-bloqueantes**: Fotógrafos podem fechar o navegador
- **Retry automático**: Tentativas em caso de falha
- **Progresso visual**: Interface persistente de acompanhamento
- **Notificações push**: Alertas nativos do sistema operacional

### Gestão de Erros
- **Error Boundary**: Captura erros React automaticamente
- **Interceptação HTTP**: Tratamento global de erros de rede
- **Mensagens localizadas**: Feedback em português brasileiro
- **Sistema de contato**: Orientação para suporte em todos os erros

### Segurança
- **Autenticação robusta** via Supabase Auth
- **Proteção de rotas** com middleware
- **Validação de uploads** (tipo e tamanho)
- **Marca d'água automática** para proteção de conteúdo

## Fluxo de Funcionamento

### 1. Cadastro e Autenticação
- Fotógrafos e compradores criam contas
- Verificação por e-mail automática
- Perfis diferenciados por tipo de usuário

### 2. Criação de Eventos
- Administradores criam eventos esportivos
- Definição de datas, locais e modalidades
- Organização em álbuns temáticos

### 3. Upload de Fotos
- Fotógrafos fazem upload em lotes
- Processamento em background
- Geração automática de versões com marca d'água

### 4. Compra e Pagamento
- Navegação por galerias organizadas
- Seleção múltipla no carrinho
- Pagamento seguro via Mercado Pago
- E-mail de confirmação automático

### 5. Entrega
- Download imediato após pagamento
- Fotos em alta resolução sem marca d'água
- Histórico de compras no dashboard

## Estrutura do Projeto

```
src/
├── components/           # Componentes reutilizáveis
│   ├── dashboard/       # Dashboards por tipo de usuário
│   ├── modals/          # Modais e popups
│   └── ui/             # Componentes base do design system
├── contexts/            # Contextos React (Auth, Cart)
├── hooks/              # Hooks customizados
├── integrations/       # Integrações externas (Supabase)
├── lib/                # Utilitários e serviços
├── pages/              # Páginas principais
└── styles/             # Estilos globais

supabase/
├── functions/          # Edge Functions
└── migrations/         # Migrações do banco

public/
├── upload-sw.js        # Service Worker para uploads
└── assets/             # Imagens e ícones
```

## Suporte e Manutenção

### Monitoramento
- Logs automáticos de erros
- Métricas de performance
- Acompanhamento de uploads

### Backup e Recuperação
- Backup automático do Supabase
- Versionamento de código via Git
- Políticas de retenção de dados

---

**Desenvolvido com ❤️ para a comunidade esportiva brasileira**

Para suporte técnico: contato@stafotos.com