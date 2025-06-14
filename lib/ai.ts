import { GoogleGenerativeAI } from "@google/generative-ai"

// Inicializa la API de Gemini con tu token
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function analyzeReviews(reviews: any[]) {
  try {
    const negativeReviews = reviews.filter((review) => review.score <= 5.0)

    if (negativeReviews.length === 0) {
      return {
        negativeReviews: [],
        commonIssues: [],
      }
    }

    // Usa Gemini para categorizar problemas en reseñas negativas
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      Analiza las siguientes reseñas negativas de hoteles y categoriza los principales problemas mencionados.
      Para cada reseña, identifica los problemas principales y clasifícalos.
      Luego, proporciona un resumen de los problemas más comunes en todas las reseñas con un conteo de cuántas veces aparece cada problema.
      
      Reseñas:
      ${negativeReviews
        .map(
          (review) =>
            `Título: ${review.title}
            Texto: ${review.text}
            Puntuación: ${review.score}
            Tipo de viajero: ${review.travelerType}
            Fecha: ${review.date}
        `
        )
        .join("\n\n")}
      
      Formatea tu respuesta como JSON con la siguiente estructura:
      {
        "reviewAnalysis": [
          {
            "title": "Título de la reseña",
            "issues": ["Problema1", "Problema2"]
          }
        ],
        "commonIssues": [
          {
            "issue": "Nombre del problema",
            "count": número
          }
        ]
      }
    `

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()
    console.log("AI response:", text)

    // Extraer JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No se pudo analizar la respuesta de la IA")
    }

    const analysis = JSON.parse(jsonMatch[0])

    // Combinar el análisis con los datos de las reseñas
    const analyzedReviews = negativeReviews.map((review, index) => {
      const reviewAnalysis = analysis.reviewAnalysis[index] || { issues: [] }
      return {
        ...review,
        issues: reviewAnalysis.issues,
      }
    })

    return {
      negativeReviews: analyzedReviews,
      commonIssues: analysis.commonIssues,
    }
  } catch (error) {
    console.error("Error al analizar las reseñas con IA:", error)
    // Análisis básico si falla la IA
    const issueCount: Record<string, number> = {}

    const negativeReviews = reviews.filter((review) => review.score <= 5.0)

    negativeReviews.forEach((review) => {
      const defaultIssue = "Insatisfacción general"
      issueCount[defaultIssue] = (issueCount[defaultIssue] || 0) + 1
    })

    const commonIssues = Object.entries(issueCount).map(([issue, count]) => ({
      issue,
      count,
    }))

    return {
      negativeReviews,
      commonIssues,
    }
  }
}

export async function generateSdrStrategy(hotel: any, reviews: any[], commonIssues: any[]) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      Eres un Representante de Desarrollo de Ventas (SDR) de Savvy, una solución que ayuda a los hoteles a evitar malas reseñas y aumentar el gasto promedio mediante la automatización de la gestión de solicitudes y tareas internas.
      
      Con base en los siguientes datos sobre un hotel y sus reseñas negativas, crea una estrategia SDR completa:
      
      Hotel: ${hotel.name}
      Reseñas totales: ${hotel.total_reviews}
      Reseñas negativas: ${reviews.length}
      
      Problemas comunes:
      ${commonIssues.map((issue) => `- ${issue.issue}: ${issue.count} menciones`).join("\n")}
      
      Ejemplos de reseñas negativas:
      ${reviews
        .slice(0, 5)
        .map((review) => `"${review.text}" - ${review.travelerType}, ${review.date}`)
        .join("\n\n")}
      
      Crea una estrategia de ventas con los siguientes componentes:
      1. Un discurso de ventas convincente adaptado a los puntos débiles específicos de este hotel
      2. Una lista de 3 a 5 puntos débiles clave identificados en las reseñas que Savvy puede abordar
      3. Una propuesta de valor estimada (cómo Savvy puede mejorar su negocio)
      4. De 3 a 5 recomendaciones específicas sobre cómo Savvy puede ayudar a este hotel
      
      Formatea tu respuesta como JSON con la siguiente estructura:
      {
        "pitch": "Tu discurso de ventas aquí...",
        "painPoints": ["Punto débil 1", "Punto débil 2", ...],
        "estimatedValue": "Propuesta de valor",
        "recommendations": ["Recomendación 1", "Recomendación 2", ...]
      }
    `

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Extraer JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No se pudo analizar la respuesta de la IA")
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error("Error al generar la estrategia SDR con IA:", error)
    // Estrategia básica si falla la IA
    return {
      pitch:
        "Según nuestro análisis de las reseñas de su hotel, Savvy puede ayudarle a abordar los problemas recurrentes y mejorar la satisfacción de los huéspedes. Nuestra plataforma automatiza la gestión de solicitudes y tareas internas para que nada se pase por alto.",
      painPoints: [
        "Problemas recurrentes de limpieza mencionados en las reseñas",
        "Capacidad de respuesta del personal ante solicitudes",
        "Problemas de mantenimiento que afectan la experiencia del huésped",
      ],
      estimatedValue:
        "La implementación de Savvy podría reducir las reseñas negativas hasta en un 30% y aumentar las puntuaciones de satisfacción de los huéspedes en 3 meses.",
      recommendations: [
        "Implementar la asignación automática de tareas para solicitudes de limpieza",
        "Configurar alertas en tiempo real para problemas urgentes de los huéspedes",
        "Crear un panel para seguir problemas recurrentes y tiempos de resolución",
      ],
    }
  }
}
