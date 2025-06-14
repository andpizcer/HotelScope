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
          // If no SDR data exists yet, we'll generate it later
          setSdrData(null)
        }
      } catch (error) {
        console.error("Error fetching SDR data:", error)
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
        throw new Error("Failed to generate SDR strategy")
      }

      const data = await response.json()
      setSdrData(data)
      toast({
        title: "SDR Strategy Generated",
        description: "Successfully created a sales strategy based on review analysis",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate SDR strategy. Please try again.",
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
# SDR Strategy for ${sdrData.hotelName || "Hotel"}

## Sales Pitch
${sdrData.pitch}

## Key Pain Points
${sdrData.painPoints.map((point: string) => `- ${point}`).join("\n")}

## Estimated Value Proposition
${sdrData.estimatedValue}

## Recommendations
${sdrData.recommendations.map((rec: string) => `- ${rec}`).join("\n")}
    `.trim()

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sdr-strategy-${hotelId}.txt`
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
          <CardTitle>Generate SDR Strategy</CardTitle>
          <CardDescription>Create a sales development strategy based on review analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            No SDR strategy has been generated yet. Click the button below to create one using AI.
          </p>
          <Button onClick={generateSdrStrategy} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate SDR Strategy"
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
              <CardTitle>Sales Pitch</CardTitle>
              <CardDescription>AI-generated pitch based on review analysis</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={downloadSdrStrategy}>
              <Download className="h-4 w-4 mr-2" />
              Download
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
            <CardTitle>Key Pain Points</CardTitle>
            <CardDescription>Issues identified from negative reviews</CardDescription>
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
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Savvy solutions for identified issues</CardDescription>
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
          <CardTitle>Estimated Value Proposition</CardTitle>
          <CardDescription>Potential impact of implementing Savvy</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium">{sdrData.estimatedValue}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={generateSdrStrategy} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              "Regenerate Strategy"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
