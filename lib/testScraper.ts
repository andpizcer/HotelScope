// testScraper.ts para probar la clase scraper.ts

import { scrapeBookingReviews } from './scraper';

(async () => {
    const url = 'https://www.booking.com/hotel/es/el-cicerone-de-sevilla.es.html?label=gx-es-booking-booking-cos2&aid=1799937&ucfs=1&arphpl=1&dest_id=-402849&dest_type=city&group_adults=2&req_adults=2&no_rooms=1&group_children=0&req_children=0&hpos=7&hapos=7&sr_order=popularity&srpvid=d4b264de89e206a8&srepoch=1749824727&from=searchresults#tab-reviews';

    try {
        const reviews = await scrapeBookingReviews(url);
        console.log(JSON.stringify(reviews, null, 2));
    } catch (error) {
        console.error('Error al scrapear:', error);
    }
})();
