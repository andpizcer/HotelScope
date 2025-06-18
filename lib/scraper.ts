import puppeteer, { Page } from 'puppeteer';

export interface Review {
  title: string;
  text: string;
  score: number;
  date: string;
  travelerType: string;
  nationality: string;
}

const launchBrowser = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', // Indispensable en entornos Docker/Cloud Run
      '--disable-setuid-sandbox', // También indispensable
      '--disable-dev-shm-usage', // Reduce el uso de /dev/shm, importante en contenedores con poca RAM
      '--disable-accelerated-2d-canvas',
      '--no-zygote', // Evita un proceso "zygote" que a veces causa problemas
      '--single-process', // Ejecuta todo en un solo proceso (puede reducir sobrecarga, pero ten cuidado con la estabilidad)
      '--disable-gpu', // Deshabilita el soporte de GPU
      '--no-first-run', // No realiza el "first run wizard"
      '--disable-sync', // Deshabilita la sincronización del navegador
      '--disable-background-networking', // Deshabilita la red en segundo plano
      '--disable-background-timer-throttling', // Evita la limitación de temporizadores en segundo plano
      '--disable-backgrounding-occluded-windows', // No desactiva ventanas o pestañas ocultas
      '--disable-breakpad', // Deshabilita el envío de informes de fallos
      '--disable-client-side-phishing-detection', // Deshabilita la detección de phishing
      '--disable-component-update', // Deshabilita la actualización de componentes
      '--disable-default-apps', // Deshabilita las apps predeterminadas
      '--disable-extensions', // Deshabilita extensiones
      '--disable-features=TranslateUI,BlinkGenPropertyTrees', // Deshabilita características específicas de UI
      '--disable-hang-monitor', // Deshabilita el monitor de cuelgues
      '--disable-ipc-flooding-protection', // Deshabilita la protección contra inundaciones IPC
      '--disable-popup-blocking', // Deshabilita el bloqueo de pop-ups
      '--disable-prompt-on-repost', // Deshabilita el prompt de reenvío
      '--disable-renderer-backgrounding', // No desactiva el renderizado en segundo plano
      '--disable-site-isolation-trials', // Deshabilita las pruebas de aislamiento de sitios
      '--disable-speech-api', // Deshabilita la API de voz
      '--disable-web-security', // Puede ser útil para algunos casos de scraping, pero úsalo con precaución
      '--enable-automation', // Habilita características para automatización
      '--enable-features=NetworkService,NetworkServiceInProcess', // Habilita servicios de red
      '--ignore-certificate-errors', // Ignora errores de certificado
      '--metrics-recording-only', // Solo registra métricas, no las envía
      '--no-default-browser-check', // No comprueba si es el navegador predeterminado
      '--no-first-run', // No ejecuta el asistente de primera ejecución
      '--safeBrowse-disable-auto-update', // Deshabilita la actualización automática de SafeBrowse
      '--disable-logging', // Deshabilita el registro excesivo de Chromium
      '--mute-audio' // Silencia el audio
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);

  page.on('error', err => console.error('Puppeteer page error:', err));
  page.on('pageerror', err => console.error('Puppeteer page script error:', err));
  browser.on('disconnected', () => console.error('Puppeteer browser disconnected'));

  return { browser, page };
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const preparePage = async (page: Page, url: string) => {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

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
};

export async function getLastPageNumber(url: string): Promise<string | null> {
  const { browser, page } = await launchBrowser();

  try {
    await preparePage(page, url);

    const navSelector = 'div[role="navigation"] ol';
    await page.waitForSelector(navSelector, { timeout: 5000 });

    const lastPageNumber = await page.evaluate(() => {
      const pageItems = Array.from(document.querySelectorAll('div[role="navigation"] ol li'));
      const visible = pageItems.filter(item => {
        const button = item.querySelector('button');
        return button && (!item.hasAttribute('aria-hidden') || item.getAttribute('aria-hidden') === 'false');
      });
      const last = visible[visible.length - 1];
      return last?.querySelector('button')?.textContent?.trim() || null;
    });

    return lastPageNumber;
  } catch (err: any) {
    console.error("Error getting last page number:", err.message);
    return null;
  } finally {
    await browser.close();
  }
}

export async function scrapeBookingReviews(url: string): Promise<Review[]> {
  const { browser, page } = await launchBrowser();

  try {
    await preparePage(page, url);
    await page.waitForSelector('[data-testid="review-card"]', { timeout: 30000 });

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
        await page.waitForSelector('[data-testid="review-card"]', { timeout: 10000 });
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