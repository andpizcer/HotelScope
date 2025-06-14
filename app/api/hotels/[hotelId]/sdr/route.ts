import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { hotelId: string } }) {
  try {
    const hotelId = params.hotelId
    console.log("Fetching SDR strategy for hotelId:", params)

    // Get hotel information
    const [hotel] = await db.query(
      `
      SELECT * FROM hotels WHERE id = ?
    `,
      [hotelId],
    )

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 })
    }

    // Get SDR strategy for the hotel
    const [sdrStrategy] = await db.query(
      `
      SELECT * FROM sdr_strategies WHERE hotel_id = ?
    `,
      [hotelId],
    )

    if (!sdrStrategy) {
      return NextResponse.json({ error: "SDR strategy not found" }, { status: 404 })
    }

    return NextResponse.json({
      hotelId,
      hotelName: hotel.name,
      pitch: sdrStrategy.pitch,
      painPoints: JSON.parse(sdrStrategy.pain_points),
      estimatedValue: sdrStrategy.estimated_value,
      recommendations: JSON.parse(sdrStrategy.recommendations),
    })
  } catch (error) {
    console.error("Error fetching SDR strategy:", error)
    return NextResponse.json({ error: "Failed to fetch SDR strategy" }, { status: 500 })
  }
}
