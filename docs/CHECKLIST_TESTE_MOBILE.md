# 📱 Guia de Teste Mobile - Checklist Completo

## ⚠️ IMPORTANTE: Testar antes de fazer commit!

### 🛠️ Ferramentas para Teste

1. **Chrome DevTools**
   - F12 → Ícone de dispositivo (Ctrl+Shift+M)
   - Testar em: iPhone 12/13, Samsung Galaxy, iPad

2. **Dispositivos Reais**
   - Teste em pelo menos 1 Android + 1 iOS
   - Acesse via IP local: `http://[seu-ip]:8081`

### ✅ Checklist de Testes Mobile

#### 1. **Navegação Geral**
- [ ] Menu hamburger abre/fecha corretamente
- [ ] Logo STA clicável e redireciona para home
- [ ] Todos os links do menu funcionam
- [ ] Navegação entre páginas suave
- [ ] Botão voltar funciona corretamente

#### 2. **Página Inicial (Index)**
- [ ] Cards de eventos visíveis e responsivos
- [ ] Imagens carregam corretamente
- [ ] Botões "Ver Fotos" funcionam
- [ ] Footer visível com Instagram
- [ ] Link do Instagram abre em nova aba

#### 3. **Autenticação (Auth)**
- [ ] Formulário de login responsivo
- [ ] Formulário de cadastro responsivo
- [ ] Link "Esqueceu a senha?" visível e funcional
- [ ] Formulário de recuperação de senha funciona
- [ ] Tabs (Login/Cadastro) funcionam bem
- [ ] Campos de input não cortados

#### 4. **Dashboard**
- [ ] Sidebar colapsável funciona
- [ ] Cards de estatísticas responsivos (2 colunas em mobile)
- [ ] Tabs (Eventos/Fotos/Repasses/Perfil) funcionam
- [ ] Avatar do usuário visível
- [ ] Dropdowns funcionam corretamente

#### 5. **Upload de Fotos (Modal)**
- [ ] Modal abre e fecha corretamente
- [ ] Select de evento funciona
- [ ] Select de pasta/álbum funciona
- [ ] Botão "Nova Pasta" funciona
- [ ] **NOVO**: Select de colaboradores funciona
- [ ] **NOVO**: Input de percentual colaborador funciona
- [ ] Botão de remover colaborador funciona
- [ ] Campo de preço não cortado
- [ ] Botão de upload de arquivo funciona
- [ ] Preview de fotos selecionadas visível

#### 6. **Página de Campanha/Álbum**
- [ ] Header com botão voltar funciona
- [ ] **NOVO**: Card do fotógrafo destacado e legível
- [ ] Cards de álbuns responsivos
- [ ] Grid de fotos responsivo (2-3 colunas)
- [ ] Skeleton loaders funcionam
- [ ] Botão "Carregar mais" funciona
- [ ] Zoom em fotos funciona
- [ ] Adicionar ao carrinho funciona

#### 7. **Carrinho e Checkout**
- [ ] Drawer do carrinho abre lateralmente
- [ ] Lista de itens visível
- [ ] Botões de remover funcionam
- [ ] Total calculado corretamente
- [ ] Botão finalizar compra funciona
- [ ] Modal de pagamento responsivo

#### 8. **Dashboard Fotógrafo**
- [ ] Cards de stats responsivos
- [ ] Tab "Meus Eventos" com grid responsivo
- [ ] Botão "Editar Capa" acessível
- [ ] Botão "Criar Álbum" acessível
- [ ] Tab "Repasses" funcional
- [ ] **NOVO**: Card de saldo visível e legível
- [ ] Input de valor de repasse funciona
- [ ] Lista de solicitações visível

#### 9. **Dashboard Admin**
- [ ] Stats cards responsivos
- [ ] Tabs compactas e funcionais
- [ ] Tabelas responsivas (scroll horizontal se necessário)
- [ ] Botões de ação acessíveis
- [ ] Modais funcionam corretamente

#### 10. **Formulários e Inputs**
- [ ] Todos os inputs têm tamanho adequado (min 44px altura)
- [ ] Selects abrem corretamente
- [ ] Date pickers funcionam
- [ ] Textareas não cortadas
- [ ] Botões não sobrepostos
- [ ] Labels visíveis

#### 11. **Performance Mobile**
- [ ] Páginas carregam em < 3 segundos
- [ ] Scroll suave
- [ ] Transições não travadas
- [ ] Imagens carregam progressivamente
- [ ] Lazy loading funciona

#### 12. **Orientação**
- [ ] Portrait (vertical) funciona bem
- [ ] Landscape (horizontal) funciona bem
- [ ] Rotação não quebra layout

### 🐛 Problemas Comuns Mobile a Verificar

1. **Textos pequenos demais** (< 12px)
2. **Botões muito juntos** (< 44px)
3. **Modais ocupando tela toda** (sem scroll)
4. **Inputs cortados** (fora da viewport)
5. **Tabelas não responsivas** (sem scroll horizontal)
6. **Imagens muito grandes** (carregamento lento)
7. **Menu não fecha ao clicar item**
8. **Zoom involuntário** (viewport não configurado)

### 🔧 Como Rodar em Dispositivo Real

```bash
# 1. Descobrir seu IP local
ipconfig  # Windows
ifconfig  # Mac/Linux

# 2. Iniciar servidor (já rodando na porta 8081)
npm run dev

# 3. No celular, acessar:
http://[SEU_IP]:8081

# Exemplo:
http://192.168.1.100:8081
```

### 📊 Métricas de Sucesso

- ✅ Todos os itens do checklist marcados
- ✅ Nenhum erro no console
- ✅ Tempo de carregamento < 3s (3G)
- ✅ Todas as interações funcionais
- ✅ Layout não quebra em nenhuma tela

### 🚨 Problemas Críticos que Bloqueiam Commit

- ❌ Modal não abre ou não fecha
- ❌ Upload de fotos não funciona
- ❌ Checkout não funciona
- ❌ Login/cadastro não funciona
- ❌ Sidebar não abre/fecha
- ❌ Fotos não carregam

### 📝 Relatório de Teste

Após testar, preencher:

**Data do teste**: ___/___/2025  
**Dispositivos testados**:
- [ ] Chrome DevTools (iPhone 12)
- [ ] Chrome DevTools (Samsung Galaxy)
- [ ] Chrome DevTools (iPad)
- [ ] Dispositivo real Android: _________
- [ ] Dispositivo real iOS: _________

**Problemas encontrados**:
1. ________________________________
2. ________________________________
3. ________________________________

**Status final**: [ ] Aprovado para commit  [ ] Requer correções

---

## 🎯 Foco Especial nas Novas Funcionalidades

### Recuperação de Senha
- [ ] Link "Esqueceu a senha?" visível em mobile
- [ ] Formulário de recuperação responsivo
- [ ] Mensagem de confirmação aparece

### Sistema de Colaboradores
- [ ] Select de colaboradores abre corretamente
- [ ] Input de percentual acessível
- [ ] Lista de colaboradores não quebra layout
- [ ] Botão remover funciona

### Card do Fotógrafo
- [ ] Card destacado visível em mobile
- [ ] Nome do fotógrafo legível
- [ ] Email não cortado

### Melhorias de Saldo
- [ ] Card de saldo visível e legível
- [ ] Valor em destaque
- [ ] Tooltip de 12h visível

---

**LEMBRETE**: Cliente mencionou que está tendo MUITAS reclamações sobre mobile. Testar TUDO com atenção!
