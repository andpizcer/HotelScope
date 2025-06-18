// Función exportable en TypeScript para scrapear reseñas de Booking.com desde una URL

import puppeteer, { Page } from 'puppeteer'; // Importa Page para tipado si es necesario

export interface Review {
  title: string;
  text: string;
  score: number;
  date: string;
  travelerType: string;
  nationality: string;
}

// --- Función centralizada para lanzar el navegador con configuración de Cloud Run ---
const launchBrowser = async () => {
  const browser = await puppeteer.launch({
    headless: true, // ¡ESTO DEBE SER TRUE EN CLOUD RUN!
    executablePath: '/usr/bin/google-chrome-stable', // Ruta donde instalaste Chrome en el Dockerfile
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Muy importante para reducir RAM en contenedores
      '--disable-accelerated-2d-canvas',
      '--no-zygote',
      // '--single-process', // Puedes probar con y sin este. Quitarlo a veces da más estabilidad.
      '--disable-gpu', // No hay GPU en Cloud Run
      '--no-first-run',
      '--disable-sync',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-features=TranslateUI,BlinkGenPropertyTrees,IndividualMarkers,ReportCriticalImages,AutomationControlled',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disable-site-isolation-trials',
      '--disable-speech-api',
      '--enable-automation',
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--ignore-certificate-errors',
      '--metrics-recording-only',
      '--no-default-browser-check',
      '--safeBrowse-disable-auto-update',
      '--disable-logging',
      '--mute-audio',
      '--window-size=1280,800' // Tamaño explícito de la ventana
    ],
    ignoreHTTPSErrors: true, // Ignora errores HTTPS
    timeout: 120000, // Timeout para el lanzamiento del navegador (2 minutos)
    protocolTimeout: 120000 // Timeout para la comunicación del protocolo DevTools (2 minutos)
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1280, height: 800 }); // Asegura el viewport de la página

  // --- Manejadores de errores de Puppeteer ---
  page.on('error', err => console.error('Puppeteer page error:', err));
  page.on('pageerror', err => console.error('Puppeteer page script error:', err));
  browser.on('disconnected', () => console.error('Puppeteer browser disconnected'));

  return { browser, page };
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Función mejorada para preparar la página (incluye intercepción de peticiones) ---
const preparePage = async (page: Page, url: string) => {
  // Activar intercepción de peticiones para bloquear recursos no esenciales
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    // Bloquear imágenes, hojas de estilo, fuentes, medios y websockets para ahorrar recursos
    if (['image', 'stylesheet', 'font', 'media', 'websocket'].indexOf(request.resourceType()) !== -1) {
      request.abort();
    } else {
      request.continue();
    }
  });

  // Aumentar el timeout de page.goto
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); // 'domcontentloaded' suele ser más rápido que 'networkidle2'

  const acceptSelector = '#onetrust-accept-btn-handler';
  if (await page.$(acceptSelector)) {
    await page.click(acceptSelector);
    await delay(1000);
  }

  const readAllSelector = 'button[data-testid="fr-read-all-reviews"]';
  if (await page.$(readAllSelector)) {
    await page.click(readAllSelector);
    await delay(1000);
  }

  // Desactivar intercepción de peticiones si no se necesita después de la carga inicial
  await page.setRequestInterception(false);
};

// --- Funciones de scraping actualizadas para usar launchBrowser y preparePage ---

export async function getLastPageNumber(url: string): Promise<string | null> {
  const { browser, page } = await launchBrowser(); // Usa la función centralizada
  try {
    await preparePage(page, url);

    const navSelector = 'div[role="navigation"] ol';
    // Aumentar el timeout para waitForSelector
    await page.waitForSelector(navSelector, { timeout: 30000 }).catch(e => {
      console.error("Selector de navegación no encontrado (timeout):", e.message);
      throw e; // Relanza el error para que sea capturado en el catch principal
    });

    const lastPageNumber = await page.evaluate(() => {
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

    return lastPageNumber;
  } catch (err: any) {
    console.error("Error en getLastPageNumber:", err.message);
    return null;
  } finally {
    await browser.close();
  }
}

export async function scrapeBookingReviews(url: string): Promise<Review[]> {
  const { browser, page } = await launchBrowser(); // Usa la función centralizada
  try {
    await preparePage(page, url);
    // Aumentar el timeout para waitForSelector
    await page.waitForSelector('[data-testid="review-card"]', { timeout: 60000 });

    let reviews: Review[] = [];
    let hasNext = true;

    while (hasNext) {
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
        await nextButton.click();
        await delay(2000);
        // Aumentar el timeout para waitForSelector en el bucle de paginación
        await page.waitForSelector('[data-testid="review-card"]', { timeout: 30000 });
      } else {
        hasNext = false;
      }
    }

    return reviews;
  } catch (err: any) {
    console.error('Error scraping reviews:', err.message);
    return [];
  } finally {
    await browser.close();
  }
}