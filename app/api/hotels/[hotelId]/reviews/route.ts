// app/api/hotels/[hotelId]/reviews/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // Asegúrate de que esta importación sea correcta

export async function GET(request: Request) { // Solo pasamos 'request'
  try {
    // Extraer el hotelId de la URL del request
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const hotelId = pathParts[pathParts.length - 2];

    // Verificación básica para asegurar que hotelId tiene un formato UUID
    if (!hotelId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(hotelId)) {
      console.error(`Invalid hotel ID extracted: ${hotelId}`);
      return NextResponse.json({ error: "Invalid hotel ID format" }, { status: 400 });
    }

    console.log(`Attempting to fetch reviews for hotelId: ${hotelId}`);

    // Get hotel information
    const [hotel] = await db.query(
      `
      SELECT id, name, url, total_reviews, negative_reviews FROM hotels WHERE id = ?
    `,
      [hotelId]
    );

    if (!hotel) {
      console.error(`Hotel with ID ${hotelId} not found in DB.`);
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    // Get reviews for the hotel
    const reviews = await db.query(
      `
      SELECT id, title, text, score, date, traveler_type, nationality, issues FROM reviews WHERE hotel_id = ? ORDER BY date DESC
    `,
      [hotelId]
    );

    console.log(`Successfully fetched ${reviews.length} reviews for hotel ID: ${hotelId}`);
    return NextResponse.json({ hotel, reviews });
  } catch (error) {
    console.error("Error fetching hotel reviews:", error);
    return NextResponse.json({ error: "Failed to fetch hotel reviews" }, { status: 500 });
  }
}