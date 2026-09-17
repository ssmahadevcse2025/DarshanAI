import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Polygon, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Shield, Users, HeartPulse, Flame, Utensils, LogOut, Car, AlertTriangle, CheckCircle } from 'lucide-react';

// Controller component to smoothly update map center ONLY when temple or coordinates change significantly
const MapController = ({ targetLat, targetLng, zoom = 18 }) => {
  const map = useMap();
  const prevCoordsRef = useRef({ lat: null, lng: null, zoom: null });

  useEffect(() => {
    if (typeof targetLat !== 'number' || typeof targetLng !== 'number' || isNaN(targetLat) || isNaN(targetLng)) {
      return;
    }

    const prev = prevCoordsRef.current;
    const latDiff = prev.lat !== null ? Math.abs(prev.lat - targetLat) : 999;
    const lngDiff = prev.lng !== null ? Math.abs(prev.lng - targetLng) : 999;
    const zoomDiff = prev.zoom !== null ? Math.abs(prev.zoom - zoom) : 999;

    // Only reposition map if coordinates changed significantly (e.g. switching temples)
    // This prevents continuous flyTo animation loops and vibration/shaking
    if (latDiff > 0.001 || lngDiff > 0.001 || zoomDiff >= 1) {
      prevCoordsRef.current = { lat: targetLat, lng: targetLng, zoom };
      map.setView([targetLat, targetLng], zoom || 18, { animate: false });
    }
  }, [targetLat, targetLng, zoom, map]);

  return null;
};

const TempleMap = ({ 
  templeLat = 20.8880, 
  templeLng = 70.4012, 
  zoomLevel = 18,
  templeName = "Sri Somnath Jyotirlinga Temple",
  zones = [], 
  boundaryCoords = null,
  selectedZoneId = null,
  onSelectZone = () => {} 
}) => {

  const safeLat = typeof templeLat === 'number' && !isNaN(templeLat) ? templeLat : 20.8880;
  const safeLng = typeof templeLng === 'number' && !isNaN(templeLng) ? templeLng : 70.4012;

  // Defensive Zone Normalization (Handles both Array and Object map from Simulation)
  const normalizedZones = Array.isArray(zones)
    ? zones
    : typeof zones === 'object' && zones !== null
      ? Object.entries(zones).map(([key, z], idx) => {
          const offsetMap = {
            main_entrance: [0.0008, -0.0007],
            registration: [0.0005, -0.0004],
            queue_area: [0.0002, -0.0002],
            darshan_hall: [0, 0],
            prasadam_area: [-0.0005, 0.0003],
            exit_gates: [-0.0006, -0.0004],
            parking_lot: [0.0015, -0.0017],
            medical_center: [0.0007, 0]
          };
          const offsets = offsetMap[key] || [0.0001 * (idx + 1), 0.0001 * (idx + 1)];
          const lat = z.latitude || safeLat + offsets[0];
          const lng = z.longitude || safeLng + offsets[1];
          const cap = z.capacity || 2000;
          const vis = z.visitors || z.current_devotees || 0;
          const q = z.queue || z.queue_length || 0;

          return {
            id: z.id || idx + 1,
            zone_code: z.zone_code || key,
            name: z.name || key.replace(/_/g, ' ').toUpperCase(),
            zone_type: z.zone_type || 'QUEUE',
            latitude: lat,
            longitude: lng,
            capacity: cap,
            current_devotees: vis,
            occupancy_percent: z.occupancy_percent || Math.min(100, Math.round((vis / cap) * 100)),
            queue_length: q,
            estimated_wait_min: z.estimated_wait_min || Math.round(q / 25.0),
            risk_level: z.risk_level || 'LOW',
            is_verified: z.is_verified ?? false,
            icon_type: z.icon_type || 'MapPin',
            staff_assigned: z.staff_assigned || 5
          };
        })
      : [];

  const getMarkerColor = (risk) => {
    switch (risk?.toUpperCase()) {
      case 'CRITICAL': return '#D32F2F'; // Red
      case 'HIGH': return '#E65100';     // Deep Orange
      case 'MODERATE': return '#ED6C02'; // Amber
      default: return '#2E7D32';         // Green
    }
  };

  const getZoneIconBadge = (zoneType) => {
    switch (zoneType?.toUpperCase()) {
      case 'SANCTUM': return '🛕';
      case 'ENTRY': return '🚪';
      case 'QUEUE': return '👥';
      case 'VIP': return '👑';
      case 'MEDICAL': return '🏥';
      case 'SECURITY': return '🛡️';
      case 'PRASADAM': return '🍲';
      case 'EXIT': return '🚶';
      case 'PARKING': return '🚗';
      default: return '📍';
    }
  };

  return (
    <div className="w-100 h-100 position-relative rounded overflow-hidden" style={{ minHeight: '420px', border: '1px solid #E0D5C7', backgroundColor: '#FDFBF7' }}>
      {/* Map Legend Overlay */}
      <div 
        className="position-absolute top-0 end-0 m-3 p-2 rounded shadow-sm bg-white border border-gold" 
        style={{ zIndex: 1000, maxWidth: '280px', fontSize: '0.78rem' }}
      >
        <div className="fw-bold text-maroon mb-1 d-flex align-items-center justify-content-between">
          <span>Live GIS Risk Legend</span>
          <span className="badge bg-ivory border border-beige text-dark-brown" style={{ fontSize: '0.68rem' }}>Real GPS</span>
        </div>
        <div className="d-flex flex-wrap gap-1">
          <span className="badge" style={{ backgroundColor: '#2E7D32' }}>🟢 Low (&lt;50%)</span>
          <span className="badge" style={{ backgroundColor: '#ED6C02' }}>🟡 Moderate (50-70%)</span>
          <span className="badge" style={{ backgroundColor: '#E65100' }}>🟠 High (70-85%)</span>
          <span className="badge" style={{ backgroundColor: '#D32F2F' }}>🔴 Critical (&gt;85%)</span>
        </div>
      </div>

      <MapContainer 
        center={[safeLat, safeLng]} 
        zoom={zoomLevel} 
        scrollWheelZoom={true} 
        style={{ width: '100%', height: '100%', minHeight: '420px' }}
      >
        <MapController targetLat={safeLat} targetLng={safeLng} zoom={zoomLevel} />
        
        {/* OpenStreetMap Standard Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Temple Main Shrine Center Marker */}
        <CircleMarker
          center={[safeLat, safeLng]}
          radius={12}
          pathOptions={{
            color: '#6B1D2F',
            fillColor: '#C59B27',
            fillOpacity: 0.9,
            weight: 3
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            <span className="fw-bold text-maroon" style={{ fontSize: '0.8rem' }}>{templeName}</span>
          </Tooltip>
          <Popup>
            <div style={{ color: '#2C1810', minWidth: '180px' }}>
              <strong className="text-maroon d-block">{templeName}</strong>
              <small className="text-muted">Primary GPS Center Point</small>
              <div className="mt-1" style={{ fontSize: '0.75rem' }}>
                Lat: {safeLat.toFixed(4)}, Lng: {safeLng.toFixed(4)}
              </div>
            </div>
          </Popup>
        </CircleMarker>

        {/* Optional Temple Boundary Polygon */}
        {boundaryCoords && boundaryCoords.length > 2 && (
          <Polygon 
            positions={boundaryCoords}
            pathOptions={{
              color: '#6B1D2F',
              fillColor: '#C59B27',
              fillOpacity: 0.12,
              weight: 2,
              dashArray: '4, 4'
            }}
          />
        )}

        {/* Operational Zone Markers */}
        {normalizedZones.map((zone) => {
          const color = getMarkerColor(zone.risk_level);
          const isSelected = selectedZoneId === zone.id;
          const badge = getZoneIconBadge(zone.zone_type);
          const lat = typeof zone.latitude === 'number' && !isNaN(zone.latitude) ? zone.latitude : safeLat;
          const lng = typeof zone.longitude === 'number' && !isNaN(zone.longitude) ? zone.longitude : safeLng;

          return (
            <CircleMarker
              key={zone.id || zone.zone_code}
              center={[lat, lng]}
              radius={isSelected ? 24 : 18}
              eventHandlers={{
                click: () => onSelectZone(zone)
              }}
              pathOptions={{
                color: isSelected ? '#6B1D2F' : color,
                fillColor: color,
                fillOpacity: isSelected ? 0.95 : 0.85,
                weight: isSelected ? 4 : 2
              }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <span className="fw-bold" style={{ fontSize: '0.75rem' }}>
                  {badge} {zone.name} ({zone.occupancy_percent}%)
                </span>
              </Tooltip>

              <Popup>
                <div style={{ minWidth: '220px', color: '#2C1810', fontFamily: 'system-ui, sans-serif' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <h6 className="fw-bold text-maroon m-0" style={{ fontSize: '0.9rem' }}>
                      {badge} {zone.name}
                    </h6>
                  </div>
                  <span className={`badge my-1 ${zone.is_verified ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.65rem' }}>
                    {zone.is_verified ? 'Verified GPS point' : 'Operational simulation'}
                  </span>
                  
                  <hr style={{ margin: '6px 0', borderColor: '#E0D5C7' }} />
                  
                  <div style={{ fontSize: '0.78rem', lineHeight: '1.5' }}>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Current Devotees:</span>
                      <strong>{zone.current_devotees} / {zone.capacity}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Occupancy Load:</span>
                      <strong style={{ color: color }}>{zone.occupancy_percent}%</strong>
                    </div>
                    {zone.queue_length > 0 && (
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Queue / Wait Time:</span>
                        <strong>{zone.queue_length} dev ({zone.estimated_wait_min} min)</strong>
                      </div>
                    )}
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Risk Level:</span>
                      <span className="fw-bold" style={{ color: color }}>{zone.risk_level}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Active Staff:</span>
                      <span>{zone.staff_assigned} personnel</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => onSelectZone(zone)} 
                    className="btn btn-maroon btn-xs text-gold fw-bold w-100 mt-2 py-1"
                    style={{ fontSize: '0.72rem' }}
                  >
                    Inspect Zone Details
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default TempleMap;
