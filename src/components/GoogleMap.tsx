import { useEffect, useRef, useState } from "react";

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  tracking?: boolean;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
  path?: Array<{ lat: number; lng: number }>;
}

const GoogleMap = ({
  center = { lat: 40.7128, lng: -74.0060 }, // New York default
  zoom = 15,
  onMapReady,
  tracking = false,
  onLocationUpdate,
  path: externalPath
}: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [path, setPath] = useState<google.maps.Polyline | null>(null);
  const pathCoordinates = useRef<google.maps.LatLngLiteral[]>([]);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  useEffect(() => {
    // Load Google Maps script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBLxwAmL1BCnMp0cLJ3kYZEWDRdWENl5vA`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (mapRef.current && window.google) {
        // Use user location if available, otherwise use provided center
        const initialCenter = userLocation || center;
        
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: initialCenter,
          zoom,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: "all",
              elementType: "geometry",
              stylers: [{ color: "#242f3e" }],
            },
            {
              featureType: "all",
              elementType: "labels.text.stroke",
              stylers: [{ color: "#242f3e" }],
            },
            {
              featureType: "all",
              elementType: "labels.text.fill",
              stylers: [{ color: "#746855" }],
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#17263c" }],
            },
          ],
        });

        setMap(mapInstance);
        if (onMapReady) {
          onMapReady(mapInstance);
        }

        // Create marker at user location or default center
        const newMarker = new google.maps.Marker({
          position: initialCenter,
          map: mapInstance,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
        setMarker(newMarker);

        // Create polyline for path
        const newPath = new google.maps.Polyline({
          strokeColor: "#10b981",
          strokeOpacity: 1.0,
          strokeWeight: 4,
          map: mapInstance,
        });
        setPath(newPath);
      }
    };

    document.head.appendChild(script);

    return () => {
      // Clean up script on unmount
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [userLocation]);

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
      polygonRef.current = new google.maps.Polygon({
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

  return <div ref={mapRef} className="absolute inset-0 w-full h-full rounded-lg" />;
};

export default GoogleMap;
