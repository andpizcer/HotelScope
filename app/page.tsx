"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { HotelDashboard } from "@/components/hotel-dashboard"
import { SdrStrategy } from "@/components/sdr-strategy"

const formSchema = z.object({
  hotelInput: z
    .string()
    .min(3, "Por favor ingrese al menos 3 caracteres")
    .refine(
      (value) => {
        // Validar si es URL o nombre de hotel (al menos 1 palabra)
        return value.startsWith("http") || value.split(" ").length >= 1
      },
      {
        message: "Por favor ingrese una URL válida o nombre de hotel",
      },
    ),
  inputType: z.enum(["url", "name"]),
})

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [hotelData, setHotelData] = useState(null)
  const [activeTab, setActiveTab] = useState("dashboard")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hotelInput: "",
      inputType: "url",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const hotels = await fetch("/api/hotels/listAll")
      const hotelsData = await hotels.json()
      console.log("Hoteles existentes:", hotelsData.hotels)
      for (let hotel of hotelsData.hotels) {
        if (hotel.name === values.hotelInput || hotel.url === values.hotelInput) {
          toast({
            title: "Error",
            description: "El hotel ya ha sido analizado previamente.",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }
      }

      const response = await fetch("/api/hotels/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: values.inputType === "url" ? values.hotelInput : "",
          hotelName: values.inputType === "name" ? values.hotelInput : "",
        }),
      })

      if (!response.ok) {
        throw new Error("Error al analizar el hotel")
      }

      const data = await response.json()
      setHotelData(data)
      toast({
        title: "Análisis completado",
        description: `Se analizaron correctamente ${data.data.totalReviews} reseñas para ${data.hotelName}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al analizar el hotel. Por favor intente de nuevo.",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="container mx-auto py-10 px-4 md:px-6">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Análisis Inteligente de Reseñas de Hoteles</h1>
          <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
            Identifica oportunidades de venta analizando reseñas negativas de hoteles
          </p>
        </div>
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Analizar reseñas de hoteles</CardTitle>
            <CardDescription>Ingrese una URL de Booking.com o el nombre del hotel para analizar reseñas negativas</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* <FormField
                  control={form.control}
                  name="inputType"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel>Tipo de entrada</FormLabel>
                      <div className="flex space-x-4">
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="url"
                              value="url"
                              checked={field.value === "url"}
                              onChange={() => field.onChange("url")}
                              className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                            />
                            <label htmlFor="url" className="text-sm font-medium">
                              URL de Booking.com
                            </label>
                          </div>
                        </FormControl>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="name"
                              value="name"
                              checked={field.value === "name"}
                              onChange={() => field.onChange("name")}
                              className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                            />
                            <label htmlFor="name" className="text-sm font-medium">
                              Nombre del hotel
                            </label>
                          </div>
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                /> */}
                <FormField
                  control={form.control}
                  name="hotelInput"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{form.watch("inputType") === "url" ? "URL del hotel" : "Nombre del hotel"}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            form.watch("inputType") === "url"
                              ? "https://www.booking.com/hotel/..."
                              : "Ingrese el nombre del hotel"
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {form.watch("inputType") === "url"
                          ? "Ingrese una URL de Booking.com para analizar"
                          : "Ingrese un nombre de hotel para analizar"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    "Analizar reseñas"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {hotelData && (
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle>{hotelData.hotelName || "Análisis del Hotel"}</CardTitle>
              <CardDescription>Análisis de reseñas y oportunidades de venta</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dashboard">Panel</TabsTrigger>
                  <TabsTrigger value="sdr">Estrategia SDR</TabsTrigger>
                </TabsList>
                <TabsContent value="dashboard">
                  <HotelDashboard hotelData={hotelData} />
                </TabsContent>
                <TabsContent value="sdr">
                  <SdrStrategy hotelId={hotelData.hotelId} />
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-muted-foreground">Última actualización: {new Date().toLocaleDateString()}</p>
            </CardFooter>
          </Card>
        )}
      </div>
    </main>
  )
}
