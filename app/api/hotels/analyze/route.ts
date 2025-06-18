export const runtime = 'nodejs'; // 👈 Necesario para permitir puppeteer en Next.js

import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/lib/db"
import { analyzeReviews } from "@/lib/ai"
import { parse } from "path"

function parseSpanishDate(dateStr: string): string {
  const months: Record<string, string> = {
    enero: '01',
    febrero: '02',
    marzo: '03',
    abril: '04',
    mayo: '05',
    junio: '06',
    julio: '07',
    agosto: '08',
    septiembre: '09',
    octubre: '10',
    noviembre: '11',
    diciembre: '12',
  };

  const match = dateStr.match(/(\d{1,2}) de (\w+) de (\d{4})/i);
  if (!match) return ''; // O lanza un error si prefieres

  const day = match[1].padStart(2, '0');
  const month = months[match[2].toLowerCase()];
  const year = match[3];

  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const { getLastPageNumber } = await import('@/lib/scraper');
    const lastPageNumber = await getLastPageNumber(url);

    return NextResponse.json({ lastPageNumber });
  } catch (error) {
    console.error("Error getting last page number:", error);
    return NextResponse.json({ error: "Failed to get last page number" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url, hotelName } = body

    if (!url && !hotelName) {
      return NextResponse.json({ error: "URL or hotel name is required" }, { status: 400 })
    }

    // Generate a unique ID for the hotel
    const hotelId = uuidv4()

    // Reviews realizadas despues de scrapping
    const { scrapeBookingReviews } = await import('@/lib/scraper');
    let reviews = await scrapeBookingReviews(url)

    // Analyze reviews using Gemini AI
    const analysis = await analyzeReviews(reviews)
    console.log("Analysis result:", analysis)

    // Extract a proper hotel name from the URL if no name is provided
    let extractedHotelName = hotelName || url
    if (extractedHotelName.includes("booking.com/hotel")) {
      try {
        // Try to extract hotel name from URL path
        const urlObj = new URL(extractedHotelName)
        const pathParts = urlObj.pathname.split("/")
        const hotelSlug = pathParts[pathParts.indexOf("hotel") + 2] || ""

        // Convert slug to readable name (e.g., "el-cicerone-de-sevilla" -> "El Cicerone De Sevilla")
        if (hotelSlug) {
          extractedHotelName = hotelSlug
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        }
      } catch (e) {
        console.error("Error extracting hotel name from URL:", e)
        extractedHotelName = "Hotel " + hotelId.substring(0, 8)
      }
    }

    // Store hotel information in the database
    await db.query(
      `
      INSERT INTO hotels (id, name, url, total_reviews, negative_reviews)
      VALUES (?, ?, ?, ?, ?)
    `,
      [hotelId, extractedHotelName, url, reviews.length, analysis.negativeReviews.length],
    )

    // Store reviews in the database
    for (const review of analysis.negativeReviews) {
      await db.query(
        `
        INSERT INTO reviews (id, hotel_id, title, text, score, date, traveler_type, nationality, issues)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          uuidv4(),
          hotelId,
          review.title,
          review.text,
          review.score,
          parseSpanishDate(review.date),
          review.travelerType,
          review.nationality,
          review.issues.join(', ') // Convertimos el array de issues en un string separado por comas
        ]
      );

    }

    // Store common issues in the database
    for (const issue of analysis.commonIssues) {
      await db.query(
        `
        INSERT INTO issues (hotel_id, issue, count)
        VALUES (?, ?, ?)
      `,
        [hotelId, issue.issue, issue.count],
      )
    }

    return NextResponse.json({
      hotelId,
      hotelName: extractedHotelName,
      status: "success",
      data: {
        totalReviews: reviews.length,
        negativeReviews: analysis.negativeReviews.length,
        reviews: analysis.negativeReviews.slice(0, 10),
        commonIssues: analysis.commonIssues,
      },
    })
  } catch (error) {
    console.error("Error analyzing hotel:", error)
    return NextResponse.json({ error: "Failed to analyze hotel" }, { status: 500 })
  }
}

// Sample data for demo purposes
async function getSampleReviews() {
  return [
    {
      title: "Disappointing stay",
      text: "The room was not clean when we arrived. Hair in the bathroom and stains on the sheets. The staff was not helpful when we complained.",
      score: 4.2,
      date: "2023-05-15",
      travelerType: "Family",
      nationality: "United States",
      issues: ["Cleanliness", "Staff"],
    },
    {
      title: "Noisy and uncomfortable",
      text: "Could hear everything from the hallway and neighboring rooms. The bed was hard as a rock and the pillows were flat.",
      score: 3.8,
      date: "2023-06-02",
      travelerType: "Couple",
      nationality: "United Kingdom",
      issues: ["Noise", "Comfort"],
    },
    // Add more sample reviews here
  ]
}
