import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
    try {
        console.log("Fetching all hotels from database...")

        // Get all hotels with their basic information and calculated metrics
        const hotels = await db.query(`
      SELECT 
        h.id,
        h.name,
        h.url,
        h.total_reviews,
        h.negative_reviews,
        h.created_at,
        h.updated_at,
        COUNT(r.id) as review_count,
        AVG(r.score) as average_rating,
        COUNT(CASE WHEN r.score <= 5 THEN 1 END) as actual_negative_reviews,
        (SELECT COUNT(*) FROM issues i WHERE i.hotel_id = h.id) as opportunities_count
      FROM hotels h
      LEFT JOIN reviews r ON h.id = r.hotel_id
      GROUP BY h.id, h.name, h.url, h.total_reviews, h.negative_reviews, h.created_at, h.updated_at
      ORDER BY h.updated_at DESC
    `)

        console.log(`Successfully fetched ${hotels.length} hotels from database`)

        // Transform the data to match the expected format
        const transformedHotels = hotels.map((hotel: any) => ({
            id: hotel.id,
            name: hotel.name,
            location: "Ubicación no especificada", // No tenemos este campo en la BD
            rating: Number.parseFloat(hotel.average_rating) || 0,
            totalReviews: hotel.total_reviews || 0,
            negativeReviews: hotel.actual_negative_reviews || 0,
            lastAnalyzed: hotel.updated_at
                ? new Date(hotel.updated_at).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
            url: hotel.url,
            opportunities: hotel.opportunities_count || 0,
            status: "analyzed",
            reviewCount: hotel.review_count || 0,
        }))

        return NextResponse.json({
            hotels: transformedHotels,
            total: transformedHotels.length,
        })
    } catch (error) {
        console.error("Error fetching hotels:", error)
        return NextResponse.json(
            { error: "Failed to fetch hotels", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        )
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const hotelId = searchParams.get("id")

        if (!hotelId) {
            return NextResponse.json({ error: "Hotel ID is required" }, { status: 400 })
        }

        // Verificación básica para VARCHAR(36)
        if (!hotelId || hotelId.length !== 36) {
            return NextResponse.json({ error: "Invalid hotel ID format" }, { status: 400 })
        }

        console.log(`Attempting to delete hotel with ID: ${hotelId}`)

        // Delete hotel (CASCADE will handle reviews, issues, and sdr_strategies)
        const result = await db.query(`DELETE FROM hotels WHERE id = ?`, [hotelId])

        console.log(`Successfully deleted hotel with ID: ${hotelId}`)

        return NextResponse.json({
            message: "Hotel deleted successfully",
            deletedId: hotelId,
        })
    } catch (error) {
        console.error("Error deleting hotel:", error)
        return NextResponse.json(
            { error: "Failed to delete hotel", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        )
    }
}
