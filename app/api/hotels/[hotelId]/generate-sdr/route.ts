import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateSdrStrategy } from "@/lib/ai"

export async function POST(request: Request, { params }: { params: { hotelId: string } }) {
  try {
    const hotelId = params.hotelId

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

    // Get reviews for the hotel
    const reviews = await db.query(
      `
      SELECT * FROM reviews WHERE hotel_id = ? ORDER BY date DESC
    `,
      [hotelId],
    )

    // Get common issues for the hotel
    const commonIssues = await db.query(
      `
      SELECT issue, count FROM issues WHERE hotel_id = ? ORDER BY count DESC
    `,
      [hotelId],
    )

    // Generate SDR strategy using Gemini AI
    const sdrStrategy = await generateSdrStrategy(hotel, reviews, commonIssues)

    // Store SDR strategy in the database
    await db.query(
      `
      INSERT INTO sdr_strategies (hotel_id, pitch, pain_points, estimated_value, recommendations)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      pitch = VALUES(pitch),
      pain_points = VALUES(pain_points),
      estimated_value = VALUES(estimated_value),
      recommendations = VALUES(recommendations)
    `,
      [
        hotelId,
        sdrStrategy.pitch,
        JSON.stringify(sdrStrategy.painPoints),
        sdrStrategy.estimatedValue,
        JSON.stringify(sdrStrategy.recommendations),
      ],
    )

    return NextResponse.json({
      hotelId,
      hotelName: hotel.name,
      ...sdrStrategy,
    })
  } catch (error) {
    console.error("Error generating SDR strategy:", error)
    return NextResponse.json({ error: "Failed to generate SDR strategy" }, { status: 500 })
  }
}
