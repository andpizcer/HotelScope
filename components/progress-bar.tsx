import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ProgressBarProps {
    currentPage: number
    totalPages: number
    isActive: boolean
}

export function ProgressBar({ currentPage, totalPages, isActive }: ProgressBarProps) {
    const percentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0

    if (!isActive) return null

    return (
        <Card className="w-full max-w-2xl mx-auto mb-6">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Progreso del Scraping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                        Página {currentPage} de {totalPages}
                    </span>
                    <span>{percentage}%</span>
                </div>
                <Progress value={percentage} className="w-full" />
                <p className="text-sm text-center text-muted-foreground">Procesando reseñas... Por favor espere.</p>
            </CardContent>
        </Card>
    )
}
