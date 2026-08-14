/**
 * Watermark + resize no cliente (canvas)
 *
 * Gera, ANTES do upload, a versão de exibição que vai para o bucket público
 * `photos-watermarked`:
 *   - redimensionada (lado maior <= MAX_DISPLAY_EDGE)
 *   - com a marca d'água EMBUTIDA no pixel (não removível por inspeção)
 *   - exportada em WebP/JPEG com qualidade reduzida (~150KB no lugar de 2-5MB)
 *
 * Isso substitui a antiga estratégia de:
 *   1) subir o ORIGINAL em alta para o bucket público (vazava a foto sem marca)
 *   2) redimensionar a cada visualização via /render/image/ (cobrança de
 *      Storage Image Transformations)
 *
 * Ver também [[supabaseImageTransform]] e o overlay em WatermarkedPhoto.tsx.
 */

// Marcador no NOME do arquivo para identificar imagens que já têm a marca
// d'água embutida. Usado por WatermarkedPhoto para NÃO aplicar a sobreposição
// de novo (evita marca d'água dobrada) durante a transição / após o backfill.
export const BAKED_WATERMARK_PREFIX = 'wmb_';

/** Retorna true se a URL/caminho aponta para uma imagem com watermark embutida. */
export function isBakedWatermarkUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  // Pega o último segmento do caminho (nome do arquivo), ignorando querystring.
  const path = url.split('?')[0];
  const fileName = path.substring(path.lastIndexOf('/') + 1);
  return fileName.startsWith(BAKED_WATERMARK_PREFIX);
}

const WATERMARK_SRC = '/watermark_front.png';
const MAX_DISPLAY_EDGE = 1600; // lado maior da imagem de exibição
const DISPLAY_QUALITY = 0.72; // qualidade de compressão
const WATERMARK_OPACITY = 0.85; // igual ao overlay atual em WatermarkedPhoto

export interface WatermarkResult {
  blob: Blob;
  /** Extensão correspondente ao tipo gerado ('webp' ou 'jpg'). */
  ext: string;
}

let watermarkPromise: Promise<HTMLImageElement> | null = null;

/** Carrega o PNG da marca d'água uma única vez e reaproveita. */
function loadWatermark(): Promise<HTMLImageElement> {
  if (!watermarkPromise) {
    watermarkPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Falha ao carregar a marca d\'água'));
      img.src = WATERMARK_SRC;
    });
  }
  return watermarkPromise;
}

/** Carrega o arquivo de foto respeitando a orientação EXIF (via <img>). */
function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao decodificar a imagem'));
    };
    img.src = url;
  });
}

/** Desenha uma imagem cobrindo todo o canvas (object-fit: cover), centralizada. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number,
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

/** Exporta o canvas, preferindo WebP e caindo para JPEG se indisponível. */
function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<WatermarkResult> {
  return new Promise((resolve, reject) => {
    const finish = (blob: Blob | null, ext: string) => {
      if (blob) resolve({ blob, ext });
      else reject(new Error('Falha ao exportar a imagem do canvas'));
    };

    canvas.toBlob(
      (webp) => {
        if (webp && webp.type === 'image/webp') {
          finish(webp, 'webp');
          return;
        }
        // Navegador não gerou WebP: cai para JPEG (opaco, sem alpha).
        canvas.toBlob((jpeg) => finish(jpeg, 'jpg'), 'image/jpeg', quality);
      },
      'image/webp',
      quality,
    );
  });
}

/**
 * Gera a imagem de exibição (redimensionada + marca d'água embutida).
 * Lança erro se não conseguir decodificar a foto ou a marca d'água — o chamador
 * decide o fallback.
 */
export async function generateWatermarkedDisplayImage(
  file: File,
  options?: { maxEdge?: number; quality?: number; opacity?: number },
): Promise<WatermarkResult> {
  const maxEdge = options?.maxEdge ?? MAX_DISPLAY_EDGE;
  const quality = options?.quality ?? DISPLAY_QUALITY;
  const opacity = options?.opacity ?? WATERMARK_OPACITY;

  const [photo, watermark] = await Promise.all([loadImageFromFile(file), loadWatermark()]);

  let width = photo.naturalWidth || photo.width;
  let height = photo.naturalHeight || photo.height;
  const longEdge = Math.max(width, height);
  if (longEdge > maxEdge) {
    const scale = maxEdge / longEdge;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível neste navegador');

  // 1) foto redimensionada
  ctx.drawImage(photo, 0, 0, width, height);

  // 2) marca d'água cobrindo toda a imagem (mesmo posicionamento do overlay atual)
  ctx.globalAlpha = opacity;
  drawCover(ctx, watermark, width, height);
  ctx.globalAlpha = 1;

  return canvasToBlob(canvas, quality);
}
