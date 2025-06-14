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

export async function scrapeBookingReviews(url: string): Promise<Review[]> {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setCacheEnabled(false)

  await page.goto(url, { waitUntil: 'networkidle2' });

  // Pulsar el botón "Leer todos los comentarios" si existe
  const readAllReviewsButtonSelector = 'button[data-testid="fr-read-all-reviews"]';
  const hasReadAllButton = await page.$(readAllReviewsButtonSelector);

  if (hasReadAllButton) {
    await page.click(readAllReviewsButtonSelector);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Gestionar cookies
  const acceptButtonSelector = '#onetrust-accept-btn-handler';
  const hasCookieBanner = await page.$(acceptButtonSelector);

  if (hasCookieBanner) {
    await page.click(acceptButtonSelector);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Ahora sigue el scraping normal
  await page.waitForSelector('[data-testid="review-card"]');

  let reviews: Review[] = [];
  let hasNext = true;

  while (hasNext) {
    const pageReviews = await page.$$eval('[data-testid="review-card"]', (nodes) => {
      return nodes.map(node => {
        const n = node as HTMLElement;

        // Obtiene el score como string y convierte
        const scoreStr = (
          n.querySelector('[data-testid="review-score"] .bc946a29db')?.textContent || ''
        ).replace('Puntuación:', '').trim().replace(',', '.');

        console.log('Score String:', scoreStr); // Debugging line

        return {
          title: (n.querySelector('[data-testid="review-title"]')?.textContent || '').trim(),
          text: (n.querySelector('[data-testid="review-positive-text"] .b99b6ef58f')?.textContent || '').trim(),
          score: parseFloat(scoreStr),  // AQUÍ se convierte a number
          date: (n.querySelector('[data-testid="review-date"]')?.textContent || '').replace('Fecha del comentario:', '').trim(),
          travelerType: (n.querySelector('[data-testid="review-traveler-type"]')?.textContent || '').trim(),
          nationality: (
            node.querySelector('img[class*="b8d1620349"]')?.getAttribute('alt') ||
            node.querySelector('span[class*="d838fb5f41"]')?.textContent ||
            ''
          ).trim()
        };
      });
    });



    reviews = reviews.concat(pageReviews);

    const nextButton = await page.$('button[aria-label="Página siguiente"]:not([disabled])');
    if (nextButton) {
      await nextButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.waitForSelector('[data-testid="review-card"]');
    } else {
      hasNext = false;
    }
  }

  await browser.close();
  return reviews;
}