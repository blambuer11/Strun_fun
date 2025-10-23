import { useEffect, useRef, useState } from "react";

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  onMapReady?: (map: any) => void;
  tracking?: boolean;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
  path?: Array<{ lat: number; lng: number }>;
  markers?: Array<{ lat: number; lng: number; label?: string }>;
}

const GoogleMap = ({
  center = { lat: 40.7128, lng: -74.0060 }, // New York default
  zoom = 15,
  onMapReady,
  tracking = false,
  onLocationUpdate,
  path: externalPath,
  markers = []
}: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [path, setPath] = useState<any>(null);
  const pathCoordinates = useRef<Array<{ lat: number; lng: number }>>([]);
  const polygonRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const markersRef = useRef<any[]>([]);

  // Get user's initial location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Error getting initial location:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Load Google Maps script only once
  useEffect(() => {
    if ((window as any).google) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBLxwAmL1BCnMp0cLJ3kYZEWDRdWENl5vA`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setScriptLoaded(true);
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize map when both script and user location are ready
  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || !(window as any).google || map) return;

    const initialCenter = userLocation || center;
    
    const mapInstance = new (window as any).google.maps.Map(mapRef.current, {
      center: initialCenter,
      zoom,
      mapTypeId: 'roadmap',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });

    setMap(mapInstance);
    if (onMapReady) {
      onMapReady(mapInstance);
    }

    // Create marker at user location or default center
    const newMarker = new (window as any).google.maps.Marker({
      position: initialCenter,
      map: mapInstance,
      icon: {
        path: (window as any).google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#10b981",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });
    setMarker(newMarker);

    // Create polyline for path
    const newPath = new (window as any).google.maps.Polyline({
      strokeColor: "#10b981",
      strokeOpacity: 1.0,
      strokeWeight: 4,
      map: mapInstance,
    });
    setPath(newPath);
  }, [scriptLoaded, userLocation]);

  // Update path and polygon from external prop
  useEffect(() => {
    if (externalPath && path && externalPath.length > 0) {
      path.setPath(externalPath);
    }

    // Update or create polygon for filled area visualization
    if (!map) return;

    if (!externalPath || externalPath.length < 3) {
      // Clear polygon if not enough points
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }
      return;
    }

    // Update or create polygon
    if (polygonRef.current) {
      polygonRef.current.setPath(externalPath);
    } else {
      polygonRef.current = new (window as any).google.maps.Polygon({
        paths: externalPath,
        strokeColor: "#0066ff",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#0066ff",
        fillOpacity: 0.25,
        map: map,
      });
    }
  }, [externalPath, path, map]);

  // Handle location tracking
  useEffect(() => {
    if (!tracking || !map || !marker || !path) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // Update marker position
        marker.setPosition(newLocation);
        map.panTo(newLocation);

        // Only add to internal path if no external path is provided
        if (!externalPath) {
          pathCoordinates.current.push(newLocation);
          path.setPath(pathCoordinates.current);
        }

        // Call callback
        if (onLocationUpdate) {
          onLocationUpdate(newLocation);
        }
      },
      (error) => {
        console.error("Geolocation tracking error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [tracking, map, marker, path, onLocationUpdate, externalPath]);

  // Handle custom markers
  useEffect(() => {
    if (!map || !scriptLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Add new markers
    markers.forEach(markerData => {
      const newMarker = new (window as any).google.maps.Marker({
        position: { lat: markerData.lat, lng: markerData.lng },
        map: map,
        title: markerData.label,
        animation: (window as any).google.maps.Animation.DROP,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#10b981",
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });

      if (markerData.label) {
        const infoWindow = new (window as any).google.maps.InfoWindow({
          content: `<div style="padding:8px;font-weight:bold;color:#10b981;">${markerData.label}</div>`,
        });
        newMarker.addListener('click', () => {
          infoWindow.open(map, newMarker);
        });
      }

      markersRef.current.push(newMarker);
    });
  }, [markers, map, scriptLoaded]);

  return <div ref={mapRef} className="absolute inset-0 w-full h-full rounded-lg" />;
};

export default GoogleMap;
