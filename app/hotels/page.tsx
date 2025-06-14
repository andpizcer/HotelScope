"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Star, MapPin, Calendar, TrendingDown, Eye, Trash2, Loader2, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

interface Hotel {
    id: string
    name: string
    location: string
    rating: number
    totalReviews: number
    negativeReviews: number
    lastAnalyzed: string
    url: string
    opportunities: number
    status: string
    reviewCount?: number
}

export default function HotelesPage() {
    const [hotels, setHotels] = useState<Hotel[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    // Fetch hotels from API
    const fetchHotels = async () => {
        try {
            setIsLoading(true)
            const response = await fetch("/api/hotels/listAll")

            if (!response.ok) {
                throw new Error("Error al cargar los hoteles")
            }

            const data = await response.json()
            setHotels(data.hotels || [])

            toast({
                title: "Hoteles cargados",
                description: `Se cargaron ${data.hotels?.length || 0} hoteles correctamente`,
            })
        } catch (error) {
            console.error("Error fetching hotels:", error)
            toast({
                title: "Error",
                description: "No se pudieron cargar los hoteles. Por favor intente de nuevo.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    // Load hotels on component mount
    useEffect(() => {
        fetchHotels()
    }, [])

    // Filter hotels based on search term
    useEffect(() => {
        const filtered = hotels.filter(
            (hotel) =>
                hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                hotel.location.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        setFilteredHotels(filtered)
    }, [searchTerm, hotels])

    const handleDelete = async (hotelId: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar este hotel? Esta acción no se puede deshacer.")) {
            return
        }

        try {
            setIsDeleting(hotelId)
            const response = await fetch(`/api/hotels/listAll?id=${hotelId}`, {
                method: "DELETE",
            })

            if (!response.ok) {
                throw new Error("Error al eliminar el hotel")
            }

            setHotels(hotels.filter((hotel) => hotel.id !== hotelId))

            toast({
                title: "Hotel eliminado",
                description: "El hotel ha sido eliminado correctamente",
            })
        } catch (error) {
            console.error("Error deleting hotel:", error)
            toast({
                title: "Error",
                description: "No se pudo eliminar el hotel. Por favor intente de nuevo.",
                variant: "destructive",
            })
        } finally {
            setIsDeleting(null)
        }
    }

    const getStatusColor = (opportunities: number) => {
        if (opportunities >= 12) return "destructive"
        if (opportunities >= 8) return "secondary"
        return "default"
    }

    if (isLoading) {
        return (
            <main className="container mx-auto py-10 px-4 md:px-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        <p className="text-muted-foreground">Cargando hoteles...</p>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="container mx-auto py-10 px-4 md:px-6">
            <div className="space-y-6">
                <div className="flex flex-col space-y-2">
                    <h1 className="text-3xl font-bold tracking-tighter">Hoteles Analizados</h1>
                    <p className="text-muted-foreground">Gestiona y revisa los hoteles que has analizado previamente</p>
                </div>

                <div className="flex items-center space-x-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar hoteles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Button onClick={fetchHotels} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualizar
                    </Button>
                    <Link href="/">
                        <Button>Analizar Nuevo Hotel</Button>
                    </Link>
                </div>

                <Tabs defaultValue="grid" className="w-full">
                    <TabsList>
                        <TabsTrigger value="grid">Vista de Tarjetas</TabsTrigger>
                        <TabsTrigger value="table">Vista de Tabla</TabsTrigger>
                    </TabsList>

                    <TabsContent value="grid" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredHotels.map((hotel) => (
                                <Card key={hotel.id} className="hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="text-lg">{hotel.name}</CardTitle>
                                                <CardDescription className="flex items-center">
                                                    <MapPin className="h-3 w-3 mr-1" />
                                                    {hotel.location}
                                                </CardDescription>
                                            </div>
                                            <Badge variant={getStatusColor(hotel.opportunities)}>{hotel.opportunities} oportunidades</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center">
                                                <Star className="h-4 w-4 text-yellow-400 mr-1" />
                                                <span className="font-medium">{hotel.rating.toFixed(1)}</span>
                                            </div>
                                            <div className="text-muted-foreground">{hotel.totalReviews} reseñas</div>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center text-red-600">
                                                <TrendingDown className="h-4 w-4 mr-1" />
                                                <span>{hotel.negativeReviews} negativas</span>
                                            </div>
                                            <div className="flex items-center text-muted-foreground">
                                                <Calendar className="h-4 w-4 mr-1" />
                                                <span>{new Date(hotel.lastAnalyzed).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex space-x-2 pt-2">
                                            <Button size="sm" className="flex-1" asChild>
                                                <Link href={`/hotels/${hotel.id}`}>
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Ver Análisis
                                                </Link>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDelete(hotel.id)}
                                                disabled={isDeleting === hotel.id}
                                            >
                                                {isDeleting === hotel.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="table" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Lista de Hoteles</CardTitle>
                                <CardDescription>Todos los hoteles analizados en formato de tabla</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2">Hotel</th>
                                                <th className="text-left p-2">Ubicación</th>
                                                <th className="text-left p-2">Rating</th>
                                                <th className="text-left p-2">Reseñas</th>
                                                <th className="text-left p-2">Negativas</th>
                                                <th className="text-left p-2">Oportunidades</th>
                                                <th className="text-left p-2">Último Análisis</th>
                                                <th className="text-left p-2">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredHotels.map((hotel) => (
                                                <tr key={hotel.id} className="border-b hover:bg-muted/50">
                                                    <td className="p-2 font-medium">{hotel.name}</td>
                                                    <td className="p-2 text-muted-foreground">{hotel.location}</td>
                                                    <td className="p-2">
                                                        <div className="flex items-center">
                                                            <Star className="h-4 w-4 text-yellow-400 mr-1" />
                                                            {hotel.rating.toFixed(1)}
                                                        </div>
                                                    </td>
                                                    <td className="p-2">{hotel.totalReviews}</td>
                                                    <td className="p-2 text-red-600">{hotel.negativeReviews}</td>
                                                    <td className="p-2">
                                                        <Badge variant={getStatusColor(hotel.opportunities)}>{hotel.opportunities}</Badge>
                                                    </td>
                                                    <td className="p-2 text-muted-foreground">
                                                        {new Date(hotel.lastAnalyzed).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-2">
                                                        <div className="flex space-x-1">
                                                            <Button size="sm" variant="outline" asChild>
                                                                <Link href={`/hotels/${hotel.id}`}>
                                                                    <Eye className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleDelete(hotel.id)}
                                                                disabled={isDeleting === hotel.id}
                                                            >
                                                                {isDeleting === hotel.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {filteredHotels.length === 0 && !isLoading && (
                    <Card className="text-center py-10">
                        <CardContent>
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium">
                                    {searchTerm ? "No se encontraron hoteles" : "No hay hoteles analizados"}
                                </h3>
                                <p className="text-muted-foreground">
                                    {searchTerm ? "Intenta con otros términos de búsqueda" : "Aún no has analizado ningún hotel"}
                                </p>
                                <Link href="/">
                                    <Button className="mt-4">{searchTerm ? "Limpiar búsqueda" : "Analizar Primer Hotel"}</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </main>
    )
}
