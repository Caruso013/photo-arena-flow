# 📸 STA Fotos - Plataforma de Fotografia de Eventos# STA Fotos - Plataforma de Fotografia Esportiva



Plataforma moderna para venda de fotos de eventos com sistema de fotógrafos, organizações e usuários.## Visão Geral



## 🚀 Stack TecnológicaSTA Fotos é uma plataforma moderna e completa para comercialização de fotografias esportivas, conectando fotógrafos profissionais com atletas, familiares e organizadores de eventos.



- **Frontend**: React 18 + TypeScript + Vite## Características Principais

- **UI**: Tailwind CSS + shadcn/ui

- **Backend**: Supabase (PostgreSQL + Edge Functions)### 🏃‍♂️ Para Atletas e Compradores

- **Email**: Resend (stafotos.com)- **Navegação intuitiva** por eventos e galerias

- **Pagamentos**: Stripe- **Visualização com marca d'água** para proteção do conteúdo

- **Deploy**: Vercel (Frontend) + Supabase (Backend)- **Carrinho de compras** com seleção múltipla

- **Pagamento seguro** via Mercado Pago

## 🎨 Features- **Download imediato** em alta resolução

- **Interface responsiva** para todos os dispositivos

### ✅ Implementado

- ✅ Sistema de autenticação (Admin, Fotógrafo, Usuário)### 📸 Para Fotógrafos

- ✅ Upload e venda de fotos com watermark- **Upload em background** - continue trabalhando enquanto as fotos são enviadas

- ✅ Dashboard responsivo com dark mode- **Gerenciamento de eventos** e álbuns organizados

- ✅ Sistema de campanhas e eventos- **Sistema de precificação** flexível por foto

- ✅ Carrinho de compras- **Dashboard completo** com estatísticas e vendas

- ✅ Pagamentos via Stripe- **Notificações automáticas** do progresso de upload

- ✅ Sistema de repasses (7% plataforma + divisão fotógrafo/organização)- **Proteção automática** com marca d'água

- ✅ Relatórios financeiros em PDF

- ✅ 10 Edge Functions de email com branding STA### 🏢 Para Organizadores

- ✅ Mobile-first design (otimizado para celular)- **Criação de eventos** com múltiplos álbuns

- ✅ Anti-screenshot protection- **Gestão de fotógrafos** credenciados

- **Relatórios de vendas** detalhados

### 🔄 Em Desenvolvimento- **Controle de acesso** por evento

- 🔄 Sistema de colaboradores (photo_collaborators)

- 🔄 Dark theme para emails## Tecnologias Utilizadas

- 🔄 PWA (Progressive Web App)

### Frontend

## 📦 Instalação- **React 18** com TypeScript

- **Vite** para desenvolvimento rápido

```bash- **Tailwind CSS** para estilização

# Instalar dependências- **shadcn/ui** para componentes

npm install- **React Router** para navegação

- **React Query** para gerenciamento de estado

# Configurar .env (copiar de .env.example)

cp .env.example .env### Backend & Infraestrutura

- **Supabase** como Backend-as-a-Service

# Rodar dev server- **PostgreSQL** para banco de dados

npm run dev- **Supabase Storage** para armazenamento de imagens

- **Edge Functions** para processamento serverless

# Build para produção- **Service Workers** para uploads em background

npm run build

```### Pagamentos & Comunicação

- **Mercado Pago** para processamento de pagamentos

## 🔑 Variáveis de Ambiente- **Resend** para sistema de e-mails transacionais

- **Webhooks** para sincronização automática

```env

VITE_SUPABASE_URL=https://your-project.supabase.co## Instalação e Configuração

VITE_SUPABASE_ANON_KEY=your-anon-key

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...### Pré-requisitos

```- Node.js 18+ 

- npm ou yarn

## 📁 Estrutura do Projeto- Conta Supabase

- Credenciais Mercado Pago

```- API Key Resend

photo-arena-flow/

├── src/### Configuração do Ambiente

│   ├── components/       # Componentes React

│   │   ├── dashboard/    # Dashboards (Admin, Fotógrafo, Usuário)1. **Clone o repositório**

│   │   ├── modals/       # Modais (Upload, Pagamento, etc)```bash

│   │   └── ui/           # Componentes shadcn/uigit clone [url-do-repositorio]

│   ├── pages/            # Páginas da aplicaçãocd photo-arena-flow

│   ├── contexts/         # Contextos React (Auth, Cart, Search)```

│   ├── hooks/            # Hooks customizados

│   └── lib/              # Utilitários2. **Instale as dependências**

├── supabase/```bash

│   ├── functions/        # Edge Functions (emails)npm install

│   └── migrations/       # Migrações SQL```

├── docs/                 # Documentação completa

├── scripts/              # Scripts utilitários3. **Configure as variáveis de ambiente**

└── public/               # Assets estáticos```bash

```# Copie o arquivo de exemplo

cp .env.example .env

## 🎯 Roles e Permissões

# Configure as seguintes variáveis:

| Role | Pode |VITE_SUPABASE_URL=sua_url_supabase

|------|------|VITE_SUPABASE_ANON_KEY=sua_chave_publica_supabase

| **Admin** | Tudo - gerenciar organizações, usuários, fotógrafos, eventos |VITE_MERCADO_PAGO_PUBLIC_KEY=sua_chave_publica_mp

| **Fotógrafo** | Criar eventos, upload fotos, ver vendas, solicitar saques |VITE_RESEND_API_KEY=sua_chave_resend

| **Organização** | Gerenciar eventos da organização |```

| **Usuário** | Comprar fotos, ver compras |

4. **Configure o Supabase**

## 📊 Sistema de Repasses- Crie as tabelas necessárias no Supabase

- Configure as políticas RLS (Row Level Security)

- **7%** - Taxa da plataforma (STA Fotos)- Faça upload das Edge Functions

- **Restante** - Dividido entre fotógrafo e organização

  - Ex: Fotógrafo 70% / Organização 30%5. **Deploy das Edge Functions**

  - Configurável por campanha```bash

supabase functions deploy mercadopago-webhook

## 🎨 Brandingsupabase functions deploy send-purchase-confirmation

supabase functions deploy send-email-resend

- **Logo**: STA FOTOS```

- **Cores**:

  - Preto: `#0d0d0d` (backgrounds)### Desenvolvimento

  - Dourado: `#e6b800` (primary)

  - Cinza escuro: `#1a1a1a` (cards)```bash

# Executar em modo de desenvolvimento

## 📧 Sistema de Emailsnpm run dev



10 Edge Functions com Resend:# Build para produção

1. send-welcome-email - Boas-vindasnpm run build

2. send-password-reset-email - Reset de senha

3. send-sale-notification-email - Notificação de venda# Preview da build

4. send-purchase-confirmation-email - Confirmação de compranpm run preview

5. send-payout-approved-email - Saque aprovado```

6. send-new-campaign-email - Nova campanha

7. send-application-notification - Notificação de candidatura## Funcionalidades Avançadas

8. send-email-resend - Email genérico

9. send-photographer-notification - Notificação fotógrafo### Sistema de Upload em Background

10. send-purchase-confirmation - Confirmação de compra 2- **Uploads não-bloqueantes**: Fotógrafos podem fechar o navegador

- **Retry automático**: Tentativas em caso de falha

**Domínio**: noreply@stafotos.com- **Progresso visual**: Interface persistente de acompanhamento

- **Notificações push**: Alertas nativos do sistema operacional

## 🧪 Testes

### Gestão de Erros

```bash- **Error Boundary**: Captura erros React automaticamente

# Rodar dev server- **Interceptação HTTP**: Tratamento global de erros de rede

npm run dev- **Mensagens localizadas**: Feedback em português brasileiro

- **Sistema de contato**: Orientação para suporte em todos os erros

# Build e preview

npm run build### Segurança

npm run preview- **Autenticação robusta** via Supabase Auth

```- **Proteção de rotas** com middleware

- **Validação de uploads** (tipo e tamanho)

## 📚 Documentação- **Marca d'água automática** para proteção de conteúdo



Toda a documentação detalhada está em [`/docs`](./docs/):## Fluxo de Funcionamento



- [Dark Theme App](./docs/DARK_THEME_APP_IMPROVEMENTS.md)### 1. Cadastro e Autenticação

- [Dark Theme Email](./docs/DARK_THEME_EMAIL_PATTERN.md)- Fotógrafos e compradores criam contas

- [Relatórios PDF](./docs/PDF_REPORT_DOCUMENTATION.md)- Verificação por e-mail automática

- [Deploy Instructions](./docs/DEPLOY_INSTRUCTIONS.md)- Perfis diferenciados por tipo de usuário

- [Sistema de Emails](./docs/EMAIL_SYSTEM_SUMMARY.md)

- [Mobile Improvements](./docs/MOBILE_DARK_IMPROVEMENTS.md)### 2. Criação de Eventos

- Administradores criam eventos esportivos

Ver [INDEX.md](./docs/INDEX.md) para lista completa.- Definição de datas, locais e modalidades

- Organização em álbuns temáticos

## 🚢 Deploy

### 3. Upload de Fotos

### Frontend (Vercel)- Fotógrafos fazem upload em lotes

```bash- Processamento em background

git push origin main- Geração automática de versões com marca d'água

# Vercel faz deploy automático

```### 4. Compra e Pagamento

- Navegação por galerias organizadas

### Edge Functions (Supabase)- Seleção múltipla no carrinho

```bash- Pagamento seguro via Mercado Pago

cd scripts- E-mail de confirmação automático

./deploy-emails.sh

```### 5. Entrega

- Download imediato após pagamento

## 🔒 Segurança- Fotos em alta resolução sem marca d'água

- Histórico de compras no dashboard

- ✅ Row Level Security (RLS) no Supabase

- ✅ Anti-screenshot protection## Estrutura do Projeto

- ✅ Watermarks em fotos

- ✅ Autenticação JWT```

- ✅ HTTPS onlysrc/

├── components/           # Componentes reutilizáveis

## 🤝 Contribuindo│   ├── dashboard/       # Dashboards por tipo de usuário

│   ├── modals/          # Modais e popups

1. Fork o projeto│   └── ui/             # Componentes base do design system

2. Crie uma branch (`git checkout -b feature/NovaFeature`)├── contexts/            # Contextos React (Auth, Cart)

3. Commit suas mudanças (`git commit -m 'feat: Nova feature'`)├── hooks/              # Hooks customizados

4. Push para a branch (`git push origin feature/NovaFeature`)├── integrations/       # Integrações externas (Supabase)

5. Abra um Pull Request├── lib/                # Utilitários e serviços

├── pages/              # Páginas principais

## 📝 Licença└── styles/             # Estilos globais



Propriedade de STA Fotos - Todos os direitos reservados.supabase/

├── functions/          # Edge Functions

## 👨‍💻 Autor└── migrations/         # Migrações do banco



Desenvolvido para STA Fotospublic/

├── upload-sw.js        # Service Worker para uploads

---└── assets/             # Imagens e ícones

```

**Última atualização**: 13 de Janeiro de 2025

**Versão**: 1.0.0## Suporte e Manutenção


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