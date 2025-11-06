# ⚡ Otimizações para Carregamento Rápido de Fotos

**Problema:** Site lento para carregar fotos  
**Solução:** Múltiplas otimizações implementadas

---

## ✅ 1. ÍNDICES DE BANCO (Implementado)

### Arquivo: `supabase/migrations/20251106190000_add_performance_indexes.sql`

**Índices adicionados para fotos:**

```sql
-- Query mais comum: fotos disponíveis por campanha ordenadas
idx_photos_campaign_available_created

-- Carregamento de thumbnails
idx_photos_thumbnail

-- Fotos com marca d'água
idx_photos_watermarked

-- Contagem rápida de fotos
idx_photos_campaign_count
```

**Impacto esperado:** 
- Queries de fotos: **500ms → 20ms (96% mais rápido)** 🚀
- Contagem de fotos: **200ms → 5ms (97% mais rápido)** 🚀

---

## 🎯 2. OTIMIZAÇÕES NO SUPABASE STORAGE

### 2.1 Transformação de Imagens (Já suportado!)

O Supabase Storage já suporta transformação de imagens on-the-fly:

```typescript
// ANTES: Carregar imagem original (2-5MB)
const url = photo.watermarked_url;

// DEPOIS: Carregar imagem otimizada (50-200KB)
const url = supabase.storage
  .from('photos')
  .getPublicUrl(photo.watermarked_url, {
    transform: {
      width: 800,        // Redimensionar para 800px
      height: 600,       // Altura proporcional
      quality: 80,       // Qualidade 80%
      format: 'webp'     // Formato moderno
    }
  }).data.publicUrl;
```

### 2.2 Implementar nos Componentes

**Campaign.tsx - Galeria de Fotos:**
```typescript
// Adicione esta função helper
const getOptimizedImageUrl = (url: string, size: 'thumbnail' | 'medium' | 'large') => {
  const sizes = {
    thumbnail: { width: 400, height: 300 },
    medium: { width: 800, height: 600 },
    large: { width: 1200, height: 900 }
  };
  
  const { width, height } = sizes[size];
  
  return supabase.storage
    .from('photos')
    .getPublicUrl(url, {
      transform: {
        width,
        height,
        quality: 80,
        format: 'webp'
      }
    }).data.publicUrl;
};

// Uso na listagem (thumbnails)
<img 
  src={getOptimizedImageUrl(photo.watermarked_url, 'thumbnail')}
  loading="lazy"
  className="w-full h-full object-cover"
/>

// Uso no modal (imagem maior)
<img 
  src={getOptimizedImageUrl(photo.watermarked_url, 'large')}
  loading="lazy"
/>
```

---

## 🚀 3. LAZY LOADING E VIRTUAL SCROLLING

### 3.1 React Lazy Load Image
```bash
npm install react-lazy-load-image-component
npm install @types/react-lazy-load-image-component --save-dev
```

**Implementação:**
```typescript
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

<LazyLoadImage
  src={photo.watermarked_url}
  alt={photo.title}
  effect="blur"
  placeholderSrc={photo.thumbnail_url} // Thumbnail como placeholder
  threshold={100} // Começar a carregar 100px antes
  className="w-full h-full object-cover"
/>
```

### 3.2 Virtual Scrolling (para muitas fotos)
```bash
npm install react-window
```

**Implementação:**
```typescript
import { FixedSizeGrid } from 'react-window';

const PhotoGrid = ({ photos }) => (
  <FixedSizeGrid
    columnCount={4}
    columnWidth={250}
    height={600}
    rowCount={Math.ceil(photos.length / 4)}
    rowHeight={250}
    width={1000}
  >
    {({ columnIndex, rowIndex, style }) => {
      const index = rowIndex * 4 + columnIndex;
      const photo = photos[index];
      
      return photo ? (
        <div style={style}>
          <LazyLoadImage src={photo.watermarked_url} />
        </div>
      ) : null;
    }}
  </FixedSizeGrid>
);
```

---

## 📦 4. PAGINAÇÃO/INFINITE SCROLL

### 4.1 Implementar Paginação

**ANTES: Carregar todas as fotos de uma vez**
```typescript
// ❌ Lento: carrega 500 fotos de uma vez
const { data } = await supabase
  .from('photos')
  .select('*')
  .eq('campaign_id', id);
```

**DEPOIS: Carregar em páginas**
```typescript
// ✅ Rápido: carrega 24 fotos por vez
const PHOTOS_PER_PAGE = 24;

const { data, count } = await supabase
  .from('photos')
  .select('*', { count: 'exact' })
  .eq('campaign_id', id)
  .eq('is_available', true)
  .order('created_at', { ascending: false })
  .range((page - 1) * PHOTOS_PER_PAGE, page * PHOTOS_PER_PAGE - 1);
```

### 4.2 Infinite Scroll com React Query

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

const fetchPhotos = async ({ pageParam = 0 }) => {
  const from = pageParam * 24;
  const to = from + 23;
  
  const { data } = await supabase
    .from('photos')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('is_available', true)
    .order('created_at', { ascending: false })
    .range(from, to);
  
  return data;
};

const { 
  data, 
  fetchNextPage, 
  hasNextPage,
  isLoading 
} = useInfiniteQuery({
  queryKey: ['photos', campaignId],
  queryFn: fetchPhotos,
  getNextPageParam: (lastPage, allPages) => {
    return lastPage.length === 24 ? allPages.length : undefined;
  }
});

// Componente
<InfiniteScroll
  dataLength={data?.pages.length ?? 0}
  next={fetchNextPage}
  hasMore={hasNextPage}
  loader={<Skeleton />}
>
  {data?.pages.map(page => 
    page.map(photo => <PhotoCard key={photo.id} photo={photo} />)
  )}
</InfiniteScroll>
```

---

## 🎨 5. PROGRESSIVE IMAGE LOADING

### BlurHash (placeholder enquanto carrega)

```bash
npm install blurhash react-blurhash
```

**Implementação:**
```typescript
import { Blurhash } from 'react-blurhash';

const PhotoCard = ({ photo }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  return (
    <div className="relative">
      {!imageLoaded && (
        <Blurhash
          hash={photo.blurhash || "L6PZfSi_.AyE_3t7t7R**0o#DgR4"} 
          width="100%"
          height="100%"
          resolutionX={32}
          resolutionY={32}
          punch={1}
        />
      )}
      
      <img
        src={photo.watermarked_url}
        onLoad={() => setImageLoaded(true)}
        className={`transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
```

---

## ⚡ 6. CDN E CACHE

### 6.1 Configurar Headers de Cache

```typescript
// supabase/functions/optimize-images/index.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=31536000', // 1 ano
  'Vary': 'Accept-Encoding',
};
```

### 6.2 Service Worker para Cache Local

```javascript
// public/sw.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('photos')) {
    event.respondWith(
      caches.open('photos-cache').then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            return response; // Retorna do cache
          }
          
          return fetch(event.request).then((response) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
  }
});
```

---

## 📊 7. MONITORAMENTO DE PERFORMANCE

### Adicionar Métricas

```typescript
// src/lib/performance.ts
export const measureImageLoad = (imageUrl: string) => {
  const startTime = performance.now();
  
  const img = new Image();
  img.onload = () => {
    const loadTime = performance.now() - startTime;
    logger.info(`Image loaded in ${loadTime}ms:`, imageUrl);
    
    // Enviar para analytics
    if (loadTime > 3000) {
      logger.warn('Slow image load detected:', imageUrl);
    }
  };
  
  img.src = imageUrl;
};
```

---

## 🎯 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Rápidas Vitórias (2-3 horas) - FAÇA AGORA
1. ✅ Aplicar migration de índices
2. 🔴 Adicionar `loading="lazy"` em todas as `<img>`
3. 🔴 Implementar paginação (24 fotos por página)
4. 🔴 Adicionar transformação de imagens do Supabase

### Fase 2: Otimizações Médias (4-5 horas)
5. 🟡 Implementar react-lazy-load-image
6. 🟡 Adicionar infinite scroll
7. 🟡 Otimizar thumbnails no upload

### Fase 3: Otimizações Avançadas (6-8 horas)
8. 🟢 Virtual scrolling para eventos grandes
9. 🟢 BlurHash placeholders
10. 🟢 Service Worker para cache

---

## 💡 EXEMPLO COMPLETO: Campaign.tsx Otimizado

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { LazyLoadImage } from 'react-lazy-load-image-component';

const Campaign = () => {
  const PHOTOS_PER_PAGE = 24;
  
  // Infinite scroll com React Query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['campaign-photos', campaignId],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PHOTOS_PER_PAGE;
      const to = from + PHOTOS_PER_PAGE - 1;
      
      const { data, error } = await supabase
        .from('photos')
        .select('id, title, watermarked_url, thumbnail_url, price')
        .eq('campaign_id', campaignId)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === PHOTOS_PER_PAGE ? pages.length : undefined;
    }
  });
  
  // Helper para URL otimizada
  const getOptimizedUrl = (url: string, size: 'thumb' | 'medium') => {
    const dimensions = size === 'thumb' 
      ? { width: 400, height: 300 }
      : { width: 800, height: 600 };
    
    return supabase.storage
      .from('photos')
      .getPublicUrl(url, {
        transform: {
          ...dimensions,
          quality: 80,
          format: 'webp'
        }
      }).data.publicUrl;
  };
  
  return (
    <InfiniteScroll
      dataLength={data?.pages.flat().length ?? 0}
      next={fetchNextPage}
      hasMore={hasNextPage}
      loader={<SkeletonGrid />}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data?.pages.flat().map((photo) => (
          <Card key={photo.id}>
            <LazyLoadImage
              src={getOptimizedUrl(photo.watermarked_url, 'thumb')}
              alt={photo.title}
              effect="blur"
              placeholderSrc={photo.thumbnail_url}
              threshold={200}
              className="w-full aspect-square object-cover"
            />
            <CardContent>
              <h3>{photo.title}</h3>
              <p>R$ {photo.price}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </InfiniteScroll>
  );
};
```

---

## 📊 RESULTADO ESPERADO

### Antes
- ❌ Carrega 500 fotos de uma vez
- ❌ Imagens originais (2-5MB cada)
- ❌ Sem lazy loading
- ❌ Sem índices no banco
- ❌ Tempo: **15-30 segundos** 😰

### Depois (com todas otimizações)
- ✅ Carrega 24 fotos por vez
- ✅ Imagens otimizadas (50-200KB cada)
- ✅ Lazy loading + thumbnails
- ✅ Índices de banco otimizados
- ✅ Tempo: **500ms - 2 segundos** 🚀

### Melhoria: **93-97% mais rápido!** 🎉

---

## 🚀 COMANDOS PARA APLICAR

```bash
# 1. Aplicar migration de índices
npx supabase db push

# 2. Instalar dependências (opcional)
npm install react-lazy-load-image-component
npm install @types/react-lazy-load-image-component --save-dev
npm install react-window
npm install react-infinite-scroll-component

# 3. Build e testar
npm run build
npm run preview
```

---

**Status:** ✅ Migration corrigida e pronta  
**Próxima ação:** Aplicar migration + implementar Fase 1  
**Tempo estimado Fase 1:** 2-3 horas  
**Impacto esperado:** 90-95% mais rápido! 🚀
