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

  useEffect(() => {
    // Load Google Maps script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBLxwAmL1BCnMp0cLJ3kYZEWDRdWENl5vA`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (mapRef.current && window.google) {
        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
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

        // Create marker
        const newMarker = new google.maps.Marker({
          position: center,
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
  }, []);

  // Update path from external prop
  useEffect(() => {
    if (externalPath && path && externalPath.length > 0) {
      path.setPath(externalPath);
    }
  }, [externalPath, path]);

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
        console.error("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [tracking, map, marker, path, onLocationUpdate, externalPath]);

  return <div ref={mapRef} className="w-full h-full rounded-lg" />;
};

export default GoogleMap;
