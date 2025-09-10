# Google Maps Setup Instructions

## 1. Get Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geocoding API
4. Go to Credentials > Create Credentials > API Key
5. Copy your API key

## 2. Add to Environment Variables
Add to your `.env.local` file:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## 3. API Restrictions (Recommended)
1. Go to your API key in Google Cloud Console
2. Set Application restrictions to "HTTP referrers"
3. Add your domain: `localhost:3001/*`
4. For production: `yourdomain.com/*`

## 4. Billing Setup
- Google Maps requires billing to be enabled
- You get $200 free credit per month
- Most small applications stay within free tier

## 5. Test the Integration
1. Start the development server
2. Go to booking page
3. Try to create a booking
4. Check tracking page for map display

## 6. Features Implemented
- ✅ Live tracking map with pickup/destination markers
- ✅ Driver location tracking
- ✅ Route calculation and display
- ✅ Real-time location updates
- ✅ Dark theme map styling
- ✅ Mobile responsive design

## 7. Troubleshooting
- **Map not loading**: Check API key and billing
- **Places not working**: Enable Places API
- **Directions not working**: Enable Directions API
- **Location not updating**: Check browser permissions