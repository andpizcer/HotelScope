"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface HotelDashboardProps {
  hotelData: any
}

export function HotelDashboard({ hotelData }: HotelDashboardProps) {
  const [reviewData, setReviewData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchReviewData() {
      try {
        const response = await fetch(`/api/hotels/${hotelData.hotelId}/reviews`)
        if (!response.ok) {
          throw new Error("Error al obtener los datos de las reseñas")
        }
        const data = await response.json()
        setReviewData(data)
      } catch (error) {
        console.error("Error al obtener los datos de reseñas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (hotelData?.hotelId) {
      fetchReviewData()
    }
  }, [hotelData])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!reviewData) {
    return <div>No hay datos de reseñas disponibles</div>
  }

  const negativeReviews = reviewData.reviews?.filter((r: any) => parseFloat(r.score) < 5) || []
  const issuesCount: Record<string, number> = {}

  negativeReviews.forEach((review: any) => {
    if (typeof review.issues === "string") {
      review.issues.split(",").forEach((issue: string) => {
        const trimmed = issue.trim()
        if (trimmed) {
          issuesCount[trimmed] = (issuesCount[trimmed] || 0) + 1
        }
      })
    }
  })

  const issuesArray = Object.entries(issuesCount).map(([issue, count]) => ({
    issue,
    count,
  }))

  const leadScore =
    reviewData.reviews.length > 0
      ? Math.round(
        (reviewData.reviews.reduce((acc: number, r: any) => acc + parseFloat(r.score), 0) / reviewData.reviews.length) * 10,
      )
      : null

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reseñas Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewData.hotel.total_reviews}</div>
            <p className="text-xs text-muted-foreground">De Booking.com</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reseñas Negativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewData.hotel.negative_reviews}</div>
            <p className="text-xs text-muted-foreground">
              {((reviewData.hotel.negative_reviews / reviewData.hotel.total_reviews) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Puntuación de Potencial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadScore || "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              {leadScore >= 70
                ? "Alto potencial"
                : leadScore >= 40
                  ? "Potencial medio"
                  : "Bajo potencial"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Problemas Comunes</CardTitle>
          <CardDescription>Problemas más frecuentes mencionados en las reseñas negativas</CardDescription>
        </CardHeader>
        <CardContent>
          {issuesArray.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={issuesArray} margin={{ top: 20, right: 30, left: 10, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="issue"
                  interval={0}
                  angle={0}
                  textAnchor=""   // Ajusta el texto para que no se superponga
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value: string) => value.length > 40 ? `${value.slice(0, 40)}...` : value} // Trunca etiquetas largas
                  height={10} // Aumenta el espacio para las etiquetas
                  dy={10} // Ajusta la posición vertical de las etiquetas
                  style={{ textAnchor: "middle" }} // Centra las etiquetas
                  allowDuplicatedCategory={false} // Evita duplicados en el eje X
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>No se encontraron problemas comunes en las reseñas negativas.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reseñas Negativas Recientes</CardTitle>
          <CardDescription>Todas las reseñas negativas de los huéspedes</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {reviewData.reviews.slice(0, 10).map((review: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{review.title || "Reseña sin título"}</div>
                    <Badge variant="outline">{review.score}/10</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.text}</p>
                  <div className="flex flex-wrap gap-2">
                    {typeof review.issues === "string" &&
                      review.issues.split(",").map((issue: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          {issue.trim()}
                        </Badge>
                      ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{review.traveler_type || "Tipo de viajero desconocido"}</span>
                    <span>{new Date(review.date).toLocaleDateString() || "Fecha desconocida"}</span>
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
