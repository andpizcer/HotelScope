"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, ExternalLink, Star, Calendar, User, Flag } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { HotelDashboard } from "@/components/hotel-dashboard"
import { SdrStrategy } from "@/components/sdr-strategy"

interface Review {
    id: string
    title: string
    text: string
    score: string // Viene como string de la API
    date: string
    traveler_type: string
    nationality: string
    issues: string
}

interface Hotel {
    id: string
    name: string
    url: string
    total_reviews: number
    negative_reviews: number
}

interface HotelData {
    hotel: Hotel
    reviews: Review[]
}

export default function HotelDetailPage() {
    const params = useParams()
    const hotelId = params.hotelId as string

    const [hotelData, setHotelData] = useState<HotelData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("dashboard")

    useEffect(() => {
        const fetchHotelData = async () => {
            if (!hotelId) {
                setError("ID de hotel no válido")
                setIsLoading(false)
                return
            }

            try {
                console.log("Fetching hotel data for ID:", hotelId)
                setIsLoading(true)
                setError(null)

                const response = await fetch(`/api/hotels/${hotelId}/reviews`)

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.error || `Error ${response.status}`)
                }

                const data = await response.json()
                console.log("Received data:", data)

                setHotelData(data)
            } catch (error) {
                console.error("Error fetching hotel data:", error)
                const errorMessage = error instanceof Error ? error.message : "Error desconocido"
                setError(errorMessage)
                toast({
                    title: "Error",
                    description: `No se pudieron cargar los datos del hotel: ${errorMessage}`,
                    variant: "destructive",
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchHotelData()
    }, [hotelId])

    if (isLoading) {
        return (
            <main className="container mx-auto py-10 px-4 md:px-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        <p className="text-muted-foreground">Cargando datos del hotel...</p>
                    </div>
                </div>
            </main>
        )
    }

    if (error) {
        return (
            <main className="container mx-auto py-10 px-4 md:px-6">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-red-600">Error al cargar el hotel</h1>
                    <p className="text-muted-foreground">{error}</p>
                    <div className="space-x-2">
                        <Link href="/hotels">
                            <Button>Volver a la lista</Button>
                        </Link>
                        <Button variant="outline" onClick={() => window.location.reload()}>
                            Reintentar
                        </Button>
                    </div>
                </div>
            </main>
        )
    }

    if (!hotelData) {
        return (
            <main className="container mx-auto py-10 px-4 md:px-6">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">Hotel no encontrado</h1>
                    <p className="text-muted-foreground">El hotel que buscas no existe o ha sido eliminado.</p>
                    <Link href="/hoteles">
                        <Button>Volver a la lista</Button>
                    </Link>
                </div>
            </main>
        )
    }

    const { hotel, reviews } = hotelData

    // Convertir scores de string a number y calcular métricas
    const reviewsWithNumericScore = reviews.map((review) => ({
        ...review,
        score: Number.parseFloat(review.score),
    }))

    const negativeReviews = reviewsWithNumericScore.filter((review) => review.score <= 5)
    const averageRating =
        reviewsWithNumericScore.length > 0
            ? reviewsWithNumericScore.reduce((sum, review) => sum + review.score, 0) / reviewsWithNumericScore.length
            : 0

    // Preparar datos para HotelDashboard
    const dashboardData = {
        hotelId: hotel.id,
        hotelName: hotel.name,
        data: {
            totalReviews: hotelData.hotel.total_reviews,
            negativeReviews: hotelData.hotel.negative_reviews,
            averageRating: averageRating,
            commonIssues: hotelData.reviews.issues
        },
    }

    console.log("Dashboard data:", dashboardData)

    return (
        <main className="container mx-auto py-10 px-4 md:px-6">
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex items-center space-x-4">
                    <Link href="/hotels">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Volver a la lista
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold tracking-tighter">{hotel.name}</h1>
                        <div className="flex items-center space-x-4 mt-2">
                            <Badge variant="secondary">{hotelData.hotel.total_reviews} reseñas analizadas</Badge>
                            <Badge variant="destructive">{hotelData.hotel.negative_reviews} reseñas negativas</Badge>
                            <div className="flex items-center">
                                <Star className="h-4 w-4 text-yellow-400 mr-1" />
                                <span className="text-sm font-medium">{averageRating.toFixed(1)}/10</span>
                            </div>
                            {hotel.url && (
                                <a
                                    href={hotel.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                    Ver en Booking.com
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="dashboard">Panel de Control</TabsTrigger>
                        <TabsTrigger value="reviews">Reseñas ({reviewsWithNumericScore.length})</TabsTrigger>
                        <TabsTrigger value="sdr">Estrategia SDR</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-6">
                        <HotelDashboard hotelData={dashboardData} />
                    </TabsContent>

                    <TabsContent value="reviews" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Todas las Reseñas</CardTitle>
                                <CardDescription>
                                    Reseñas analizadas para {hotel.name} - {negativeReviews.length} negativas de{" "}
                                    {reviewsWithNumericScore.length} totales
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                    {reviewsWithNumericScore.length > 0 ? (
                                        reviewsWithNumericScore.map((review) => (
                                            <div key={review.id} className="border rounded-lg p-4 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-medium">{review.title || "Sin título"}</h4>
                                                    <div className="flex items-center space-x-2">
                                                        <div className="flex items-center">
                                                            <Star className="h-4 w-4 text-yellow-400 mr-1" />
                                                            <span className="text-sm font-medium">{review.score}/10</span>
                                                        </div>
                                                        <Badge
                                                            variant={review.score <= 5 ? "destructive" : review.score <= 6 ? "secondary" : "default"}
                                                        >
                                                            {review.score <= 5 ? "Negativa" : review.score <= 6 ? "Regular" : "Positiva"}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {review.text && <p className="text-sm text-muted-foreground">{review.text}</p>}

                                                {review.issues && review.issues.trim() !== "" && (
                                                    <div className="bg-red-50 border border-red-200 rounded p-2">
                                                        <p className="text-sm text-red-800">
                                                            <strong>Aspectos mencionados:</strong> {review.issues}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                                    {review.date && (
                                                        <div className="flex items-center">
                                                            <Calendar className="h-3 w-3 mr-1" />
                                                            {new Date(review.date).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                    {review.traveler_type && (
                                                        <div className="flex items-center">
                                                            <User className="h-3 w-3 mr-1" />
                                                            {review.traveler_type}
                                                        </div>
                                                    )}
                                                    {review.nationality && (
                                                        <div className="flex items-center">
                                                            <Flag className="h-3 w-3 mr-1" />
                                                            {review.nationality}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-muted-foreground">No se encontraron reseñas para este hotel.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sdr" className="space-y-6">
                        <SdrStrategy hotelId={hotel.id} />
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    )
}
