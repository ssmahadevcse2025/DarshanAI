import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Polygon, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Globe, Map as MapIcon, Compass, Moon } from 'lucide-react';

// Tile provider definitions with real map APIs
export const MAP_PROVIDERS = {
  satellite: {
    id: 'satellite',
    name: 'Satellite View',
    icon: Globe,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
    maxZoom: 19,
    hasLabels: true,
    labelUrl: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
  },
  voyager: {
    id: 'voyager',
    name: 'Voyager GIS',
    icon: MapIcon,
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    icon: Compass,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  dark: {
    id: 'dark',
    name: 'Night Ops',
    icon: Moon,
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  }
};

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

    // Reposition map when coordinates change
    if (latDiff > 0.0005 || lngDiff > 0.0005 || zoomDiff >= 1) {
      prevCoordsRef.current = { lat: targetLat, lng: targetLng, zoom };
      map.setView([targetLat, targetLng], zoom || 18, { animate: true, duration: 0.8 });
    }
  }, [targetLat, targetLng, zoom, map]);

  return null;
};

// Map click event listener for picking GPS coordinates
const MapEventsHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    }
  });
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
  onSelectZone = () => {},
  onMapClick = null,
  pinnedPoint = null,
  initialLayer = 'voyager'
}) => {
  const [activeLayer, setActiveLayer] = useState(initialLayer);

  const safeLat = typeof templeLat === 'number' && !isNaN(templeLat) ? templeLat : 20.8880;
  const safeLng = typeof templeLng === 'number' && !isNaN(templeLng) ? templeLng : 70.4012;

  // Defensive Zone Normalization
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
      case 'REGISTRATION': return '🎫';
      default: return '📍';
    }
  };

  const currentTile = MAP_PROVIDERS[activeLayer] || MAP_PROVIDERS.voyager;

  return (
    <div className="w-100 h-100 position-relative rounded overflow-hidden" style={{ minHeight: '420px', border: '1px solid #E0D5C7', backgroundColor: '#FDFBF7' }}>
      
      {/* Real Map API Layer Switcher Control */}
      <div 
        className="position-absolute top-0 start-0 m-3 d-flex flex-column gap-1"
        style={{ zIndex: 1000 }}
      >
        <div className="bg-white rounded shadow-sm border border-gold p-1 d-flex gap-1 align-items-center">
          <span className="px-2 py-1 text-maroon fw-bold small d-none d-sm-inline" style={{ fontSize: '0.72rem' }}>
            <Layers size={13} className="me-1 inline" /> Real Map API:
          </span>
          {Object.values(MAP_PROVIDERS).map(prov => {
            const Icon = prov.icon;
            const isSelected = activeLayer === prov.id;
            return (
              <button
                key={prov.id}
                type="button"
                onClick={() => setActiveLayer(prov.id)}
                className={`btn btn-xs py-1 px-2 d-flex align-items-center gap-1 ${
                  isSelected ? 'btn-maroon text-gold fw-bold shadow-sm' : 'btn-outline-secondary'
                }`}
                style={{ fontSize: '0.72rem' }}
                title={prov.name}
              >
                <Icon size={12} />
                <span className="d-none d-md-inline">{prov.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

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
          <span className="badge" style={{ backgroundColor: '#ED6C02' }}>🟡 Mod (50-70%)</span>
          <span className="badge" style={{ backgroundColor: '#E65100' }}>🟠 High (70-85%)</span>
          <span className="badge" style={{ backgroundColor: '#D32F2F' }}>🔴 Crit (&gt;85%)</span>
        </div>
      </div>

      <MapContainer 
        center={[safeLat, safeLng]} 
        zoom={zoomLevel} 
        scrollWheelZoom={true} 
        style={{ width: '100%', height: '100%', minHeight: '420px' }}
      >
        <MapController targetLat={safeLat} targetLng={safeLng} zoom={zoomLevel} />
        {onMapClick && <MapEventsHandler onMapClick={onMapClick} />}
        
        {/* Dynamic Real Map API Tile Layer */}
        <TileLayer
          key={currentTile.id}
          attribution={currentTile.attribution}
          url={currentTile.url}
          subdomains={currentTile.subdomains || 'abc'}
          maxZoom={currentTile.maxZoom}
        />

        {/* Real Satellite Hybrid Place Labels (if active) */}
        {currentTile.hasLabels && currentTile.labelUrl && (
          <TileLayer
            key={`${currentTile.id}-labels`}
            url={currentTile.labelUrl}
            maxZoom={currentTile.maxZoom}
          />
        )}

        {/* User-pinned temporary coordinate marker (for adding new maps) */}
        {pinnedPoint && (
          <Marker position={[pinnedPoint.lat, pinnedPoint.lng]}>
            <Popup>
              <div style={{ color: '#2C1810', fontSize: '0.8rem' }}>
                <strong className="text-maroon">Selected Pin Location</strong>
                <div>Lat: {pinnedPoint.lat.toFixed(5)}</div>
                <div>Lng: {pinnedPoint.lng.toFixed(5)}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Temple Main Shrine Center Marker */}
        <CircleMarker
          center={[safeLat, safeLng]}
          radius={13}
          pathOptions={{
            color: '#6B1D2F',
            fillColor: '#C59B27',
            fillOpacity: 0.95,
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
                Lat: {safeLat.toFixed(5)}, Lng: {safeLng.toFixed(5)}
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
              fillOpacity: 0.14,
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
              radius={isSelected ? 22 : 16}
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
