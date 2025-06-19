import puppeteer from "puppeteer"

export interface Review {
  title: string
  text: string
  score: number
  date: string
  travelerType: string
  nationality: string
}

// Configuración de Puppeteer optimizada para Railway
function getPuppeteerConfig() {
  const isProduction = process.env.NODE_ENV === "production"

  return {
    headless: true, // Siempre true en producción
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
    // En producción (Railway), usa Chrome del sistema
    executablePath: isProduction ? process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome-stable" : undefined,
  }
}

// Función helper para crear browser con configuración optimizada
async function createBrowser() {
  const config = getPuppeteerConfig()
  console.log("🚀 Launching browser with config:", {
    headless: config.headless,
    executablePath: config.executablePath || "default",
  })

  try {
    return await puppeteer.launch(config)
  } catch (error) {
    console.error("❌ Error launching browser:", error)
    // Fallback: intentar sin executablePath
    if (config.executablePath) {
      console.log("🔄 Retrying without custom executable path...")
      const fallbackConfig = { ...config, executablePath: undefined }
      return await puppeteer.launch(fallbackConfig)
    }
    throw error
  }
}

export async function getLastPageNumber(url: string): Promise<string | null> {
  const browser = await createBrowser()
  const page = await browser.newPage()

  try {
    await page.setCacheEnabled(false)
    await page.setViewport({ width: 1280, height: 720 })
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    )

    console.log("📄 Navigating to:", url)
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000, // 60 segundos timeout para Railway
    })

    // Pulsar el botón "Leer todos los comentarios" si existe
    const readAllReviewsButtonSelector = 'button[data-testid="fr-read-all-reviews"]'
    const hasReadAllButton = await page.$(readAllReviewsButtonSelector)

    if (hasReadAllButton) {
      console.log('🔘 Clicking "Read all reviews" button')
      await page.click(readAllReviewsButtonSelector)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Gestionar cookies
    const acceptButtonSelector = "#onetrust-accept-btn-handler"
    const hasCookieBanner = await page.$(acceptButtonSelector)

    if (hasCookieBanner) {
      console.log("🍪 Accepting cookies")
      await page.click(acceptButtonSelector)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Espera a que el selector de la navegación esté disponible en la página
    await page.waitForSelector('div[role="navigation"] ol', { timeout: 10000 }).catch((e) => {
      console.error("❌ Navigation selector not found:", e.message)
      return null
    })

    // Evalúa el script dentro del contexto del navegador
    const lastPageNumber = await page.evaluate(() => {
      const pageItems = Array.from(document.querySelectorAll('div[role="navigation"] ol li'))

      const visiblePageItems = pageItems.filter((item) => {
        const button = item.querySelector("button")
        return button && (!item.hasAttribute("aria-hidden") || item.getAttribute("aria-hidden") === "false")
      })

      const lastVisiblePageItem = visiblePageItems[visiblePageItems.length - 1]

      if (lastVisiblePageItem) {
        const button = lastVisiblePageItem.querySelector("button")
        if (button) {
          return button.textContent?.trim() || null
        }
      }
      return null
    })

    console.log("📊 Last page number found:", lastPageNumber)
    return lastPageNumber
  } catch (error) {
    console.error("❌ Error in getLastPageNumber:", error)
    throw error
  } finally {
    await browser.close()
  }
}

export async function scrapeBookingReviews(url: string): Promise<Review[]> {
  const browser = await createBrowser()
  const page = await browser.newPage()

  try {
    await page.setCacheEnabled(false)
    await page.setViewport({ width: 1280, height: 720 })
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    )

    console.log("🚀 Starting scrape for:", url)
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000, // 60 segundos timeout para Railway
    })

    // Pulsar el botón "Leer todos los comentarios" si existe
    const readAllReviewsButtonSelector = 'button[data-testid="fr-read-all-reviews"]'
    const hasReadAllButton = await page.$(readAllReviewsButtonSelector)

    if (hasReadAllButton) {
      console.log('🔘 Clicking "Read all reviews" button')
      await page.click(readAllReviewsButtonSelector)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Gestionar cookies
    const acceptButtonSelector = "#onetrust-accept-btn-handler"
    const hasCookieBanner = await page.$(acceptButtonSelector)

    if (hasCookieBanner) {
      console.log("🍪 Accepting cookies")
      await page.click(acceptButtonSelector)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Esperar a que las reseñas carguen
    console.log("⏳ Waiting for review cards to load...")
    await page.waitForSelector('[data-testid="review-card"]', { timeout: 15000 })

    let reviews: Review[] = []
    let hasNext = true
    let pageCount = 0
    const maxPages = process.env.NODE_ENV === "production" ? 5 : 10 // Limitar páginas en producción

    while (hasNext && pageCount < maxPages) {
      console.log(`📄 Processing page ${pageCount + 1}/${maxPages}`)

      const pageReviews = await page.$$eval('[data-testid="review-card"]', (nodes) => {
        return nodes.map((node) => {
          const n = node as HTMLElement

          // Obtiene el score como string y convierte
          const scoreStr = (n.querySelector('[data-testid="review-score"] .bc946a29db')?.textContent || "")
            .replace("Puntuación:", "")
            .trim()
            .replace(",", ".")

          return {
            title: (n.querySelector('[data-testid="review-title"]')?.textContent || "").trim(),
            text: (n.querySelector('[data-testid="review-positive-text"] .b99b6ef58f')?.textContent || "").trim(),
            score: Number.parseFloat(scoreStr) || 0, // Usar Number.parseFloat y fallback a 0
            date: (n.querySelector('[data-testid="review-date"]')?.textContent || "")
              .replace("Fecha del comentario:", "")
              .trim(),
            travelerType: (n.querySelector('[data-testid="review-traveler-type"]')?.textContent || "").trim(),
            nationality: (
              node.querySelector('img[class*="b8d1620349"]')?.getAttribute("alt") ||
              node.querySelector('span[class*="d838fb5f41"]')?.textContent ||
              ""
            ).trim(),
          }
        })
      })

      reviews = reviews.concat(pageReviews)
      pageCount++

      console.log(`✅ Scraped ${pageReviews.length} reviews from page ${pageCount}. Total: ${reviews.length}`)

      // Intentar ir a la siguiente página
      const nextButton = await page.$('button[aria-label="Página siguiente"]:not([disabled])')
      if (nextButton && pageCount < maxPages) {
        console.log("➡️ Going to next page...")
        await nextButton.click()
        await new Promise((resolve) => setTimeout(resolve, 3000)) // Más tiempo entre páginas

        // Esperar a que las nuevas reseñas carguen
        try {
          await page.waitForSelector('[data-testid="review-card"]', { timeout: 15000 })
        } catch (error) {
          console.log("⚠️ Timeout waiting for next page, stopping pagination")
          hasNext = false
        }
      } else {
        hasNext = false
        if (pageCount >= maxPages) {
          console.log(`🛑 Reached maximum pages limit (${maxPages})`)
        } else {
          console.log("🏁 No more pages available")
        }
      }
    }

    console.log(`✅ Scraping completed: ${reviews.length} total reviews from ${pageCount} pages`)
    return reviews
  } catch (error) {
    console.error("❌ Error during scraping:", error)
    throw error
  } finally {
    await browser.close()
  }
}
