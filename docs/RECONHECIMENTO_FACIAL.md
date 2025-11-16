# 🔍 Sistema de Reconhecimento Facial - Documentação Completa

## 📋 Visão Geral

Sistema de reconhecimento facial para facilitar a compra de fotos pelos clientes. Os usuários podem usar sua câmera para encontrar automaticamente todas as fotos onde aparecem em um evento.

## ✨ Funcionalidades

### Para Clientes:
- 📸 **Busca por Rosto**: Tire uma selfie e encontre todas as suas fotos automaticamente
- 🎯 **Filtro por Evento**: Busque apenas no evento específico
- 🚀 **Compra Rápida**: Adicione todas as suas fotos ao carrinho de uma vez
- 🔒 **Privacidade**: Imagens não são armazenadas, apenas processadas

### Para Fotógrafos:
- 🤖 **Detecção Automática**: Sistema detecta rostos nas fotos enviadas
- 💾 **Embeddings Salvos**: Descritores faciais armazenados para busca rápida
- 📊 **Analytics**: Veja quantas buscas foram feitas

## 🏗️ Arquitetura

```
┌─────────────────┐
│   Cliente Web   │
│   (React App)   │
└────────┬────────┘
         │
         │ 1. Captura foto da câmera
         ↓
┌─────────────────┐
│  useFaceReco-   │
│   gnition.ts    │
└────────┬────────┘
         │
         │ 2. Envia foto (base64)
         ↓
┌─────────────────┐
│ Edge Function:  │
│  detect-faces   │
│  (Face API)     │
└────────┬────────┘
         │
         │ 3. Retorna descritor facial (128D)
         ↓
┌─────────────────┐
│ Edge Function:  │
│ find-photos-by  │
│     -face       │
└────────┬────────┘
         │
         │ 4. Busca fotos similares
         ↓
┌─────────────────┐
│   Supabase DB   │
│ (photo_face_    │
│  descriptors)   │
└─────────────────┘
         │
         │ 5. Retorna matches
         ↓
┌─────────────────┐
│   Galeria de    │
│  Fotos Filtrada │
└─────────────────┘
```

## 📁 Estrutura de Arquivos

```
src/
├── hooks/
│   └── useFaceRecognition.ts       # Hook principal do reconhecimento facial
├── components/
│   └── FaceRecognitionModal.tsx    # Modal com UI da câmera
└── pages/
    └── Campaign.tsx                 # Página do evento (botão de busca)

supabase/
├── migrations/
│   └── 20250113000000_add_face_recognition.sql  # Tabelas do banco
└── functions/
    ├── detect-faces/
    │   └── index.ts                 # Detecção de rostos
    └── find-photos-by-face/
        └── index.ts                 # Busca por similaridade
```

## 🛠️ Configuração

### 1. Banco de Dados

Execute a migration para criar as tabelas:

```sql
-- Já criado em: supabase/migrations/20250113000000_add_face_recognition.sql
```

As tabelas criadas:
- **`photo_face_descriptors`**: Armazena descritores faciais das fotos
  - `photo_id`: Referência à foto
  - `descriptor`: Array de float8 (embedding 128D)
  - `confidence`: Confiança da detecção (0-1)
  - `bounding_box`: Posição do rosto na foto

- **`user_face_descriptors`**: (Opcional) Armazena descritor do usuário
  - `user_id`: ID do usuário
  - `descriptor`: Embedding facial do usuário

### 2. Edge Functions

#### Deploy das Functions:

```bash
# Fazer deploy da função de detecção
supabase functions deploy detect-faces

# Fazer deploy da função de busca
supabase functions deploy find-photos-by-face
```

#### Variáveis de Ambiente (para produção):

```bash
# AWS Rekognition (recomendado para produção)
supabase secrets set AWS_REGION=us-east-1
supabase secrets set AWS_ACCESS_KEY_ID=your_key
supabase secrets set AWS_SECRET_ACCESS_KEY=your_secret

# OU Azure Face API
supabase secrets set AZURE_FACE_KEY=your_key
supabase secrets set AZURE_FACE_ENDPOINT=https://your-region.api.cognitive.microsoft.com
```

### 3. Frontend

As implementações já estão prontas:
- ✅ `useFaceRecognition.ts` - Hook React
- ✅ `FaceRecognitionModal.tsx` - UI do modal
- ✅ `Campaign.tsx` - Botão de busca integrado

## 🚀 Como Usar

### Para Clientes:

1. **Abrir um evento**
   - Navegue para a página de um evento

2. **Clicar em "Buscar por Rosto"**
   - Botão no header da página do evento

3. **Permitir acesso à câmera**
   - Navegador solicitará permissão

4. **Posicionar o rosto**
   - Centralizar dentro do círculo guia
   - Garantir boa iluminação

5. **Clicar em "Buscar Minhas Fotos"**
   - Sistema processará em 2-5 segundos
   - Mostrará quantidade de fotos encontradas

6. **Visualizar resultados**
   - Fotos filtradas aparecerão
   - Ordenadas por similaridade (mais parecidas primeiro)

### Para Fotógrafos:

**Processo Automático:**
- Quando um fotógrafo faz upload de fotos, o sistema:
  1. Detecta rostos automaticamente
  2. Extrai descritores faciais
  3. Salva na tabela `photo_face_descriptors`
  4. Foto fica disponível para busca facial

**Manual (opcional):**
```sql
-- Reprocessar fotos antigas sem descritores
SELECT id, photo_url FROM photos 
WHERE id NOT IN (SELECT photo_id FROM photo_face_descriptors);
```

## 🔧 API Reference

### Hook: `useFaceRecognition`

```typescript
const {
  videoRef,           // Ref para elemento <video>
  isProcessing,       // Estado de processamento
  matches,            // Array de fotos encontradas
  startCamera,        // Iniciar câmera
  stopCamera,         // Parar câmera
  capturePhoto,       // Capturar frame da câmera
  findMyPhotos,       // Buscar fotos pelo rosto
  registerUserFace,   // Registrar rosto do usuário
} = useFaceRecognition();
```

#### Métodos:

**`startCamera()`**
- Solicita acesso à câmera
- Retorna: `Promise<boolean>`

**`findMyPhotos(campaignId?: string)`**
- Captura foto da câmera
- Processa reconhecimento facial
- Busca fotos similares
- Parâmetros:
  - `campaignId` (opcional): ID do evento para filtrar busca
- Retorna: `Promise<FaceMatch[]>`

**`registerUserFace(userId: string)`**
- Salva descritor facial do usuário para buscas futuras
- Retorna: `Promise<boolean>`

### Edge Function: `detect-faces`

**Endpoint:** `POST /functions/v1/detect-faces`

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response:**
```json
{
  "success": true,
  "descriptors": [
    [0.123, -0.456, 0.789, ...] // 128 valores
  ],
  "faces_detected": 1
}
```

### Edge Function: `find-photos-by-face`

**Endpoint:** `POST /functions/v1/find-photos-by-face`

**Request:**
```json
{
  "descriptors": [[0.123, -0.456, ...]],
  "campaign_id": "uuid-do-evento",
  "threshold": 0.6
}
```

**Response:**
```json
{
  "success": true,
  "matches": [
    {
      "photo_id": "uuid-da-foto",
      "similarity": 0.89,
      "photo_url": "https://...",
      "campaign_id": "uuid-do-evento",
      "campaign_name": "Formatura 2024"
    }
  ],
  "total": 15
}
```

## 🔐 Segurança & Privacidade

### Políticas RLS (Row Level Security):

```sql
-- Qualquer um pode ler descritores (para busca)
CREATE POLICY "Anyone can read photo face descriptors"
ON photo_face_descriptors FOR SELECT
USING (true);

-- Apenas fotógrafos podem inserir
CREATE POLICY "Photographers can insert photo face descriptors"
ON photo_face_descriptors FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM photos p
    INNER JOIN campaigns c ON p.campaign_id = c.id
    WHERE p.id = photo_face_descriptors.photo_id
    AND c.photographer_id = auth.uid()
  )
);
```

### Privacidade:

- ✅ Imagens da câmera **NÃO são armazenadas**
- ✅ Apenas descritores matemáticos (vetores) são salvos
- ✅ Impossível reconstruir foto original do descritor
- ✅ Processamento client-side + server-side seguro
- ✅ LGPD/GDPR compliant

## 📊 Performance

### Otimizações:

1. **Índices no Banco:**
```sql
CREATE INDEX idx_photo_face_descriptors_photo_id 
ON photo_face_descriptors(photo_id);
```

2. **Limite de Resultados:**
- Máximo 50 fotos retornadas por busca
- Ordenadas por similaridade (maior primeiro)

3. **Threshold de Similaridade:**
- Padrão: 60% (0.6)
- Ajustável conforme necessidade

### Benchmarks Esperados:

- **Detecção de Rosto**: 1-2 segundos
- **Busca (100 fotos)**: 0.5-1 segundo
- **Busca (1000 fotos)**: 2-4 segundos
- **Busca (10000 fotos)**: 10-20 segundos

## 🐛 Troubleshooting

### Problema: "Nenhum rosto detectado"

**Soluções:**
1. Verificar iluminação (rostos devem estar bem iluminados)
2. Posicionar rosto de frente para câmera
3. Remover óculos escuros/máscaras
4. Tentar ângulo diferente

### Problema: "Poucas fotos encontradas"

**Soluções:**
1. Reduzir threshold: `threshold: 0.5` (ao invés de 0.6)
2. Verificar se fotos foram processadas (descritores existem)
3. Testar com foto diferente (outro ângulo)

### Problema: "Erro ao acessar câmera"

**Soluções:**
1. Verificar permissões do navegador
2. Usar HTTPS (obrigatório para getUserMedia)
3. Verificar se navegador suporta WebRTC

### Problema: "Muitos falsos positivos"

**Soluções:**
1. Aumentar threshold: `threshold: 0.7` ou `0.8`
2. Verificar qualidade dos descritores salvos
3. Re-processar fotos com modelo melhor

## 🚀 Roadmap / Melhorias Futuras

### V2.0 - Melhorias Planejadas:

- [ ] **Busca Multi-Rosto**: Detectar múltiplas pessoas em uma foto
- [ ] **Filtro por Qualidade**: Mostrar apenas fotos de alta qualidade
- [ ] **Reconhecimento de Grupo**: "Encontre fotos com meus amigos"
- [ ] **Cache de Descritores**: Cachear descritor do usuário no localStorage
- [ ] **Progressive Loading**: Carregar fotos em batches
- [ ] **Feedback de Relevância**: Usuário avaliar se foto está correta
- [ ] **ML Model Upgrade**: Usar modelo mais preciso (FaceNet, ArcFace)
- [ ] **Busca por Foto Upload**: Upload de foto ao invés de câmera

### V2.1 - Integrações:

- [ ] **Social Login com Face**: Login facial para usuários registrados
- [ ] **Compartilhamento Inteligente**: Sugerir enviar fotos para amigos
- [ ] **Notificações Push**: Avisar quando novas fotos forem encontradas
- [ ] **Analytics Dashboard**: Métricas de uso do reconhecimento facial

## 📝 Integração com Serviços de Produção

### Opção 1: AWS Rekognition (Recomendado)

**Vantagens:**
- Alta precisão (99%+)
- Escalável
- Pay-as-you-go
- Suporte a vídeos também

**Setup:**
```typescript
// supabase/functions/detect-faces/index.ts
import { RekognitionClient, DetectFacesCommand } from "@aws-sdk/client-rekognition";

const client = new RekognitionClient({
  region: Deno.env.get('AWS_REGION'),
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
  },
});
```

### Opção 2: Azure Face API

**Vantagens:**
- Integração fácil
- Bom para eventos na Azure
- Preço competitivo

### Opção 3: Google Cloud Vision API

**Vantagens:**
- Parte do Google Cloud
- Bom para Android apps
- API simples

### Opção 4: Self-Hosted (face-api.js)

**Vantagens:**
- 100% grátis
- Controle total
- Sem limites de API

**Desvantagens:**
- Precisa servidor Node.js
- Manutenção adicional
- Precisão menor (~85-90%)

## 📚 Referências

- [Face-API.js](https://github.com/justadudewhohacks/face-api.js)
- [AWS Rekognition Docs](https://docs.aws.amazon.com/rekognition/)
- [Azure Face API](https://azure.microsoft.com/en-us/services/cognitive-services/face/)
- [FaceNet Paper](https://arxiv.org/abs/1503.03832)
- [MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verificar esta documentação
2. Checar logs no Supabase Dashboard
3. Testar Edge Functions manualmente
4. Reportar issue no repositório

---

**Versão:** 1.0.0  
**Última Atualização:** 13/11/2025  
**Status:** ✅ Implementado e Testado
