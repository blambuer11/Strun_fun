/**
 * POI Fetcher - OpenStreetMap Overpass API
 */

export interface POI {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  tags: Record<string, any>;
}

export async function fetchPOIsForCity(city: string, limit = 20): Promise<POI[]> {
  try {
    // 1. Geocode city
    const geocodeResp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'StrunApp/1.0 (+https://lovable.app)' } }
    );
    
    const geocodeData = await geocodeResp.json();
    if (!geocodeData || !geocodeData.length) {
      console.error('City not found:', city);
      return [];
    }

    const center = geocodeData[0];
    const lat = parseFloat(center.lat);
    const lon = parseFloat(center.lon);

    // 2. Fetch POIs via Overpass API
    const overpassQuery = `[out:json][timeout:25];
(
  node(around:5000,${lat},${lon})["tourism"];
  node(around:5000,${lat},${lon})["amenity"];
  node(around:5000,${lat},${lon})["leisure"];
);
out center ${limit};`;

    const overpassResp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': 'StrunApp/1.0 (+https://lovable.app)'
      },
      body: overpassQuery
    });

    const overpassData = await overpassResp.json();
    const elements = overpassData.elements || [];

    // 3. Map to POI objects
    return elements.slice(0, limit).map((e: any) => ({
      id: `osm-${e.id}`,
      name: (e.tags?.name || e.tags?.ref) || Object.values(e.tags || {})[0] || 'POI',
      type: e.tags?.tourism || e.tags?.amenity || e.tags?.leisure || 'unknown',
      lat: e.lat || e.center?.lat || 0,
      lon: e.lon || e.center?.lon || 0,
      tags: e.tags || {}
    }));
  } catch (error) {
    console.error('POI fetch error:', error);
    return [];
  }
}
