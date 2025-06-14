"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Search, List, Hotel } from "lucide-react"

export function Navbar() {
    const pathname = usePathname()

    const navItems = [
        {
            href: "/",
            label: "Scrapping y Análisis",
            icon: Search,
            description: "Analizar reseñas de hoteles",
        },
        {
            href: "/hotels",
            label: "Listar Hoteles Analizados",
            icon: List,
            description: "Ver hoteles previamente analizados",
        },
    ]

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Hotel className="h-6 w-6 text-primary" />
                        <span className="text-xl font-bold">Hotel Analytics for SAVVY</span>
                    </div>

                    <div className="flex items-center space-x-1">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{item.label}</span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>
        </nav>
    )
}
