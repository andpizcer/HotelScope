// Función exportable en TypeScript para scrapear reseñas de Booking.com desde una URL

import puppeteer from 'puppeteer';

export interface Review {
  title: string;
  text: string;
  score: number;
  date: string;
  travelerType: string;
  nationality: string;
}

// Lista de User-Agents comunes para rotar
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/109.0.1518.78',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/108.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
];

// Función para obtener un retraso aleatorio entre min y max segundos (en milisegundos)
function getRandomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Función exportable para obtener el número de la última página de reseñas de Booking.com.
 * Lanza su propia instancia de Puppeteer.
 * @param url La URL de la página de reseñas de Booking.com.
 * @returns El número de la última página como string o null si no se encuentra.
 */
export async function getLastPageNumber(url: string): Promise<string | null> {
  const browser = await puppeteer.launch({
    headless: true, // true para producción
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
    ],
  });
  const page = await browser.newPage();

  // Rotar el User-Agent para esta nueva sesión
  const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  await page.setUserAgent(randomUserAgent);
  console.log(`[getLastPageNumber] Usando User-Agent: ${randomUserAgent}`);

  await page.setCacheEnabled(false);

  let lastPageNumber: string | null = null;
  const maxRetries = 3; // Menos reintentos ya que solo es para una página
  let retryCount = 0;
  let navigationSuccess = false;

  while (!navigationSuccess && retryCount < maxRetries) {
    try {
      console.log(`[getLastPageNumber] Intentando navegar a: ${url} (Intento ${retryCount + 1}/${maxRetries})`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }); // Ajustado timeout
      navigationSuccess = true;
    } catch (error: any) {
      if (error.message.includes('ERR_TOO_MANY_RETRIES') || error.message.includes('429')) {
        retryCount++;
        const delay = getRandomDelay(3000, 8000) * retryCount; // Retroceso exponencial para errores de navegación
        console.warn(`[getLastPageNumber] Demasiadas peticiones (429) o error de conexión. Reintentando en ${delay / 1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        const newRandomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        await page.setUserAgent(newRandomUserAgent);
        console.log(`[getLastPageNumber] Cambiando User-Agent a: ${newRandomUserAgent}`);
      } else {
        console.error(`[getLastPageNumber] Error no 429 al navegar a ${url}:`, error);
        break; // Romper el bucle para otros tipos de errores
      }
    }
  }

  if (!navigationSuccess) {
    console.error(`[getLastPageNumber] Fallo al navegar a ${url} después de ${maxRetries} reintentos.`);
    await browser.close();
    return null;
  }

  // Pulsar el botón "Leer todos los comentarios" si existe
  const readAllReviewsButtonSelector = 'button[data-testid="fr-read-all-reviews"]';
  try {
    const hasReadAllButton = await page.$(readAllReviewsButtonSelector);
    if (hasReadAllButton) {
      console.log('[getLastPageNumber] Botón "Leer todos los comentarios" encontrado. Haciendo clic...');
      await hasReadAllButton.click();
      await new Promise(resolve => setTimeout(resolve, getRandomDelay(1500, 3000))); // Retraso aleatorio
      await page.waitForSelector('[data-testid="review-card"]', { timeout: 20000 }); // Esperar reviews después del clic
    }
  } catch (error) {
    console.warn('[getLastPageNumber] No se encontró el botón "Leer todos los comentarios" o error al hacer clic.', error);
  }

  // Gestionar cookies
  const acceptButtonSelector = '#onetrust-accept-btn-handler';
  try {
    const hasCookieBanner = await page.$(acceptButtonSelector);
    if (hasCookieBanner) {
      console.log('[getLastPageNumber] Banner de cookies encontrado. Aceptando...');
      await hasCookieBanner.click();
      await new Promise(resolve => setTimeout(resolve, getRandomDelay(500, 1500))); // Retraso aleatorio
    }
  } catch (error) {
    console.warn('[getLastPageNumber] No se encontró el banner de cookies o error al aceptarlas.', error);
  }

  // Espera a que el selector de la navegación esté disponible en la página
  try {
    await page.waitForSelector('div[role="navigation"] ol', { timeout: 10000 }); // Aumentado timeout
    lastPageNumber = await page.evaluate(() => {
      const pageItems = Array.from(document.querySelectorAll('div[role="navigation"] ol li'));
      const visiblePageItems = pageItems.filter(item => {
        const button = item.querySelector('button');
        return (button && (!item.hasAttribute('aria-hidden') || item.getAttribute('aria-hidden') === 'false'));
      });
      const lastVisiblePageItem = visiblePageItems[visiblePageItems.length - 1];

      if (lastVisiblePageItem) {
        const button = lastVisiblePageItem.querySelector('button');
        if (button) {
          return button.textContent?.trim() || null;
        }
      }
      return null;
    });
  } catch (e: any) {
    console.error("[getLastPageNumber] Error al obtener el número de la última página:", e.message);
    lastPageNumber = null;
  } finally {
    await browser.close();
  }

  return lastPageNumber;
}


export async function scrapeBookingReviews(url: string): Promise<Review[]> {
  const browser = await puppeteer.launch({
    headless: true, // Se recomienda true para producción para ahorrar recursos y evitar problemas visuales
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-zygote',
      '--single-process', // Opcional: a veces ayuda en entornos limitados
      '--disable-gpu', // Deshabilitar GPU para entornos sin soporte
    ],
  });
  const page = await browser.newPage();

  // Rotar el User-Agent para esta nueva sesión
  const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  await page.setUserAgent(randomUserAgent);
  console.log(`[scrapeBookingReviews] Usando User-Agent: ${randomUserAgent}`);

  await page.setCacheEnabled(false);

  // Navegar a la URL con reintentos y retroceso exponencial
  const maxRetries = 5;
  let retryCount = 0;
  let navigationSuccess = false;

  while (!navigationSuccess && retryCount < maxRetries) {
    try {
      console.log(`[scrapeBookingReviews] Intentando navegar a: ${url} (Intento ${retryCount + 1}/${maxRetries})`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // Aumentar timeout de navegación a 60s
      navigationSuccess = true;
    } catch (error: any) {
      if (error.message.includes('ERR_TOO_MANY_RETRIES') || error.message.includes('429')) {
        retryCount++;
        const delay = getRandomDelay(5000, 15000) * retryCount; // Retroceso exponencial: 5s, 10s, 15s... por reintento
        console.warn(`[scrapeBookingReviews] Demasiadas peticiones (429) o error de conexión. Reintentando en ${delay / 1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Cambiar User-Agent en reintento para parecer un nuevo cliente
        const newRandomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        await page.setUserAgent(newRandomUserAgent);
        console.log(`[scrapeBookingReviews] Cambiando User-Agent a: ${newRandomUserAgent}`);
      } else {
        console.error(`[scrapeBookingReviews] Error no 429 al navegar a ${url}:`, error);
        throw error; // Lanzar otros errores que no sean 429
      }
    }
  }

  if (!navigationSuccess) {
    throw new Error(`[scrapeBookingReviews] Fallo al navegar a ${url} después de ${maxRetries} reintentos.`);
  }

  // Pulsar el botón "Leer todos los comentarios" si existe
  const readAllReviewsButtonSelector = 'button[data-testid="fr-read-all-reviews"]';
  try {
    const hasReadAllButton = await page.$(readAllReviewsButtonSelector);
    if (hasReadAllButton) {
      console.log('[scrapeBookingReviews] Botón "Leer todos los comentarios" encontrado. Haciendo clic...');
      await hasReadAllButton.click();
      await new Promise(resolve => setTimeout(resolve, getRandomDelay(2000, 4000))); // Retraso aleatorio
      await page.waitForSelector('[data-testid="review-card"]', { timeout: 30000 }); // Esperar reviews después del clic
    }
  } catch (error) {
    console.warn('[scrapeBookingReviews] No se encontró el botón "Leer todos los comentarios" o error al hacer clic (puede que no exista).', error);
  }

  // Gestionar cookies
  const acceptButtonSelector = '#onetrust-accept-btn-handler';
  try {
    const hasCookieBanner = await page.$(acceptButtonSelector);
    if (hasCookieBanner) {
      console.log('[scrapeBookingReviews] Banner de cookies encontrado. Aceptando...');
      await hasCookieBanner.click();
      await new Promise(resolve => setTimeout(resolve, getRandomDelay(1000, 2000))); // Retraso aleatorio
    }
  } catch (error) {
    console.warn('[scrapeBookingReviews] No se encontró el banner de cookies o error al aceptarlas (puede que ya se hayan gestionado).', error);
  }

  // Ahora sigue el scraping normal
  await page.waitForSelector('[data-testid="review-card"]', { timeout: 30000 }); // Asegurarse de que las reseñas están cargadas

  // Obtener el número total de páginas (usando la función exportada)
  const totalPages = await getLastPageNumber(url); // Ahora se le pasa la URL completa
  if (totalPages) {
    console.log(`[scrapeBookingReviews] Número total de páginas de reseñas detectado: ${totalPages}`);
  } else {
    console.log('[scrapeBookingReviews] No se pudo determinar el número total de páginas de reseñas.');
  }

  let reviews: Review[] = [];
  let hasNext = true;
  let currentPage = 1;

  while (hasNext) {
    console.log(`[scrapeBookingReviews] Scrapeando página ${currentPage} de ${totalPages || 'desconocido'}...`);

    const pageReviews = await page.$$eval('[data-testid="review-card"]', (nodes) => {
      return nodes.map(node => {
        const n = node as HTMLElement;
        const scoreStr = (
          n.querySelector('[data-testid="review-score"] .bc946a29db')?.textContent || ''
        ).replace('Puntuación:', '').trim().replace(',', '.');

        return {
          title: (n.querySelector('[data-testid="review-title"]')?.textContent || '').trim(),
          text: (n.querySelector('[data-testid="review-positive-text"] .b99b6ef58f')?.textContent || '').trim(),
          score: parseFloat(scoreStr),
          date: (n.querySelector('[data-testid="review-date"]')?.textContent || '').replace('Fecha del comentario:', '').trim(),
          travelerType: (n.querySelector('[data-testid="review-traveler-type"]')?.textContent || '').trim(),
          nationality: (
            n.querySelector('img[class*="b8d1620349"]')?.getAttribute('alt') ||
            n.querySelector('span[class*="d838fb5f41"]')?.textContent ||
            ''
          ).trim()
        };
      });
    });

    reviews = reviews.concat(pageReviews);

    const nextButton = await page.$('button[aria-label="Página siguiente"]:not([disabled])');
    if (nextButton) {
      retryCount = 0; // Resetear contador de reintentos para el siguiente clic de página
      let clickSuccess = false;

      while (!clickSuccess && retryCount < maxRetries) {
        try {
          console.log(`[scrapeBookingReviews] Haciendo clic en "Página siguiente" (Intento ${retryCount + 1}/${maxRetries})...`);
          await nextButton.click();
          await new Promise(resolve => setTimeout(resolve, getRandomDelay(3000, 7000))); // Retraso aleatorio más largo para la navegación
          await page.waitForSelector('[data-testid="review-card"]', { timeout: 45000 }); // Aumentar timeout de espera de reviews
          currentPage++;
          clickSuccess = true;
        } catch (error: any) {
          if (error.message.includes('429') || error.message.includes('net::ERR_TOO_MANY_RETRIES') || error.message.includes('TimeoutError')) {
            retryCount++;
            const delay = getRandomDelay(10000, 25000) * retryCount; // Mayor retroceso exponencial para clics de página (10s, 20s, 30s...)
            console.warn(`[scrapeBookingReviews] Demasiadas peticiones (429/Timeout) al hacer clic en siguiente. Reintentando en ${delay / 1000} segundos...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            // Opcional: Podrías considerar recargar la página aquí si el error es muy persistente
            // await page.reload({ waitUntil: 'networkidle2' });
          } else {
            console.error(`[scrapeBookingReviews] Error no 429 al hacer clic en "Página siguiente" en la página ${currentPage}:`, error);
            hasNext = false; // Detener el bucle si hay otro tipo de error grave
            break;
          }
        }
      }
      if (!clickSuccess) { // Si falló después de reintentos, asumir que no hay más páginas o un error irrecuperable
        console.error(`[scrapeBookingReviews] Fallo al avanzar a la siguiente página después de ${maxRetries} reintentos.`);
        hasNext = false;
      }
    } else {
      hasNext = false;
      console.log('[scrapeBookingReviews] No hay más páginas de reseñas.');
    }
  }

  await browser.close();
  console.log(`[scrapeBookingReviews] Scraping completado. Total de reseñas obtenidas: ${reviews.length}`);
  return reviews;
}

// Ejemplo de cómo usarla (en un archivo main o de prueba)
/*
(async () => {
  const url = 'URL_DE_TU_PROPIEDAD_BOOKING_COM'; // ¡Cambia esto por una URL real!
  try {
    console.log("Iniciando scraping...");
    const allReviews = await scrapeBookingReviews(url);
    console.log(`Se han scrapeado ${allReviews.length} reseñas.`);
    if (allReviews.length > 0) {
      console.log("Primera reseña de ejemplo:", allReviews[0]);
    }
  } catch (error) {
    console.error('Error general al scrapear las reseñas:', error);
  } finally {
    // Asegurarse de que el navegador se cierre incluso si hay errores
    // Si estás en un entorno de Next.js API, el navegador se cierra al final de la función
  }
})();
*/
