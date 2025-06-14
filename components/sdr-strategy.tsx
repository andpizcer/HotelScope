"use client"

import { useState, useEffect } from "react"
import { Loader2, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

interface SdrStrategyProps {
  hotelId: string
}

export function SdrStrategy({ hotelId }: SdrStrategyProps) {
  const [sdrData, setSdrData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    async function fetchSdrData() {
      try {
        const response = await fetch(`/api/hotels/${hotelId}/sdr`)
        if (response.ok) {
          const data = await response.json()
          setSdrData(data)
        } else {
          setSdrData(null)
        }
      } catch (error) {
        console.error("Error al obtener la estrategia SDR:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (hotelId) {
      fetchSdrData()
    }
  }, [hotelId])

  async function generateSdrStrategy() {
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/hotels/${hotelId}/generate-sdr`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("No se pudo generar la estrategia SDR")
      }

      const data = await response.json()
      setSdrData(data)
      toast({
        title: "Estrategia SDR generada",
        description: "Se ha creado correctamente una estrategia de ventas basada en el análisis de reseñas.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar la estrategia SDR. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  function downloadSdrStrategy() {
    if (!sdrData) return

    const content = `
# Estrategia SDR para ${sdrData.hotelName || "Hotel"}

## Argumento de venta
${sdrData.pitch}

## Puntos de dolor clave
${sdrData.painPoints.map((point: string) => `- ${point}`).join("\n")}

## Propuesta de valor estimada
${sdrData.estimatedValue}

## Recomendaciones
${sdrData.recommendations.map((rec: string) => `- ${rec}`).join("\n")}
    `.trim()

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `estrategia-sdr-${hotelId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!sdrData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generar estrategia SDR</CardTitle>
          <CardDescription>Crea una estrategia de desarrollo de ventas basada en el análisis de reseñas</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Aún no se ha generado una estrategia SDR. Haz clic en el botón de abajo para crear una usando IA.
          </p>
          <Button onClick={generateSdrStrategy} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              "Generar estrategia SDR"
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Argumento de venta</CardTitle>
              <CardDescription>Argumento generado por IA basado en el análisis de reseñas</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={downloadSdrStrategy}>
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line">{sdrData.pitch}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Puntos de dolor clave</CardTitle>
            <CardDescription>Problemas identificados en las reseñas negativas</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {sdrData.painPoints.map((point: string, index: number) => (
                <li key={index} className="flex items-start">
                  <Badge className="mr-2 mt-0.5" variant="destructive">
                    {index + 1}
                  </Badge>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recomendaciones</CardTitle>
            <CardDescription>Soluciones inteligentes para los problemas identificados</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {sdrData.recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex items-start">
                  <Badge className="mr-2 mt-0.5" variant="secondary">
                    {index + 1}
                  </Badge>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Propuesta de valor estimada</CardTitle>
          <CardDescription>Impacto potencial de implementar Savvy</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium">{sdrData.estimatedValue}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={generateSdrStrategy} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerando...
              </>
            ) : (
              "Regenerar estrategia"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
