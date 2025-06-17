// Simulación en un componente padre
import { useEffect, useState } from "react"
import { ProgressBar } from "@/components/progress-bar"

export default function ScrapingSimulator({ totalPages }: { totalPages: number }) {
    const [currentPage, setCurrentPage] = useState(1)
    const [isActive, setIsActive] = useState(true)

    useEffect(() => {
        if (!isActive) return
        if (currentPage < totalPages) {
            const timer = setTimeout(() => setCurrentPage(currentPage + 1), 800) // 800ms por página
            return () => clearTimeout(timer)
        } else {
            setTimeout(() => setIsActive(false), 1200) // Oculta barra al terminar
        }
    }, [currentPage, totalPages, isActive])

    return (
        <ProgressBar
            currentPage={currentPage}
            totalPages={totalPages}
            isActive={isActive}
        />
    )
}