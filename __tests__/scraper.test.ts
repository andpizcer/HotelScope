const axios = require('axios');

test('scraping functionality handles no reviews found', async () => {
    const response = await axios.post('/api/hotels/analyze', { hotelId: 'test-hotel-id' });
    expect(response.status).toBe(200);
    expect(response.data.reviews).toEqual([]);
});

test('API endpoint returns reviews for a valid hotelId', async () => {
    const response = await axios.get('/api/hotels/0024fae2-9106-4781-9c8e-be7349572236/reviews');
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('reviews');
});