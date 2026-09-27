import React, { useState, useEffect, useContext, useRef } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import TempleMap from '../components/TempleMap';
import Loading from '../components/Loading';
import { 
  Map, 
  Layers, 
  MapPin, 
  ShieldAlert, 
  Users, 
  Clock, 
  Sparkles, 
  Settings2, 
  Building, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Sliders,
  Plus,
  Search,
  Crosshair,
  ExternalLink,
  Globe
} from 'lucide-react';

const DEFAULT_MAP_DATA = {
  temple: {
    temple_id: 'TEMPLE-001',
    name: 'Sri Somnath Jyotirlinga Temple',
    city: 'Somnath',
    state: 'Gujarat',
    country: 'India',
    latitude: 20.8880,
    longitude: 70.4012,
    zoom_level: 18,
    capacity: 18000,
    status: 'ACTIVE'
  },
  zones: [
    {
      id: 1,
      zone_code: 'main_entrance',
      name: 'Main Gopuram Mahadwar Entry',
      zone_type: 'ENTRY',
      latitude: 20.8888,
      longitude: 70.4005,
      capacity: 3000,
      current_devotees: 1240,
      occupancy_percent: 41,
      queue_length: 320,
      estimated_wait_min: 12.8,
      risk_level: 'LOW',
      is_verified: true,
      icon_type: 'LogIn',
      staff_assigned: 8,
      ai_predicted_devotees_30min: 1302,
      ai_recommendation: 'Optimal capacity. Green zone.'
    },
    {
      id: 2,
      zone_code: 'queue_area',
      name: 'Main Darshan Queue Complex',
      zone_type: 'QUEUE',
      latitude: 20.8882,
      longitude: 70.4010,
      capacity: 4500,
      current_devotees: 2450,
      occupancy_percent: 54,
      queue_length: 580,
      estimated_wait_min: 23.2,
      risk_level: 'MODERATE',
      is_verified: true,
      icon_type: 'Users',
      staff_assigned: 12,
      ai_predicted_devotees_30min: 2572,
      ai_recommendation: 'Devotee flow is stable. Continue normal operations.'
    },
    {
      id: 3,
      zone_code: 'darshan_hall',
      name: 'Garbagriha Sanctum Corridor',
      zone_type: 'SANCTUM',
      latitude: 20.8880,
      longitude: 70.4012,
      capacity: 2000,
      current_devotees: 1100,
      occupancy_percent: 55,
      queue_length: 0,
      estimated_wait_min: 0,
      risk_level: 'LOW',
      is_verified: true,
      icon_type: 'Sparkles',
      staff_assigned: 15,
      ai_predicted_devotees_30min: 1155,
      ai_recommendation: 'Optimal capacity. Green zone.'
    },
    {
      id: 4,
      zone_code: 'prasadam_area',
      name: 'Prasadam & Annakshetra Hall',
      zone_type: 'PRASADAM',
      latitude: 20.8875,
      longitude: 70.4015,
      capacity: 2500,
      current_devotees: 850,
      occupancy_percent: 34,
      queue_length: 60,
      estimated_wait_min: 2.4,
      risk_level: 'LOW',
      is_verified: true,
      icon_type: 'Utensils',
      staff_assigned: 6,
      ai_predicted_devotees_30min: 892,
      ai_recommendation: 'Optimal capacity. Green zone.'
    },
    {
      id: 5,
      zone_code: 'exit_gates',
      name: 'Coastal Sea Promenade Exit',
      zone_type: 'EXIT',
      latitude: 20.8874,
      longitude: 70.4008,
      capacity: 3500,
      current_devotees: 920,
      occupancy_percent: 26,
      queue_length: 0,
      estimated_wait_min: 0,
      risk_level: 'LOW',
      is_verified: true,
      icon_type: 'LogOut',
      staff_assigned: 7,
      ai_predicted_devotees_30min: 966,
      ai_recommendation: 'Optimal capacity. Green zone.'
    }
  ],
  boundary_coordinates: null,
  mode: 'LIVE DATA',
  total_inside_devotees: 4820,
  total_waiting_devotees: 1248,
  overall_temple_risk: 'LOW'
};

const TempleMapPage = () => {
  const { user } = useContext(AuthContext);

  const [mapData, setMapData] = useState(DEFAULT_MAP_DATA);
  const [selectedTempleId, setSelectedTempleId] = useState(user?.temple_id || 'TEMPLE-001');
  const [allTemples, setAllTemples] = useState([]);
  const [selectedZone, setSelectedZone] = useState(DEFAULT_MAP_DATA.zones[0]);
  const [loading, setLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAddTempleModal, setShowAddTempleModal] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState(null);

  // Real Geocoding Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Edit Location Form State
  const [editForm, setEditForm] = useState({
    latitude: 20.8880,
    longitude: 70.4012,
    address: 'Prabhas Patan, Veraval, Somnath, Gujarat',
    zoom_level: 18
  });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  // Add New Temple Form State
  const [addForm, setAddForm] = useState({
    temple_id: '',
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    contact_number: '+91-9876543210',
    email: '',
    capacity: 20000,
    opening_time: '04:00 AM',
    closing_time: '10:00 PM',
    status: 'ACTIVE',
    latitude: 28.6139,
    longitude: 77.2090,
    zoom_level: 18
  });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addingTemple, setAddingTemple] = useState(false);

  // Fetch list of temples
  const fetchTemplesList = async () => {
    try {
      const res = await API.get('/temples');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setAllTemples(res.data);
      }
    } catch (err) {
      console.error('Error fetching temples:', err);
    }
  };

  useEffect(() => {
    fetchTemplesList();
  }, [user]);

  const fetchMapData = async (templeId, isInitial = false) => {
    try {
      const res = await API.get(`/temples/${templeId}/map-data`);
      if (res.data && res.data.temple) {
        setMapData(res.data);
        if (res.data.zones && res.data.zones.length > 0 && (!selectedZone || isInitial)) {
          setSelectedZone(res.data.zones[0]);
        }
        if (isInitial) {
          setEditForm({
            latitude: res.data.temple.latitude,
            longitude: res.data.temple.longitude,
            address: res.data.temple.address || '',
            zoom_level: res.data.temple.zoom_level || 18
          });
        }
      }
    } catch (err) {
      console.error('Failed to load map data:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData(selectedTempleId, true);
    const interval = setInterval(() => fetchMapData(selectedTempleId, false), 4000);
    return () => clearInterval(interval);
  }, [selectedTempleId]);

  const handleTempleChange = (newTempleId) => {
    setSelectedTempleId(newTempleId);
    setPinnedLocation(null);
    fetchMapData(newTempleId, true);
  };

  // Real Geocoding Search via OpenStreetMap Nominatim API
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val.trim() || val.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const query = encodeURIComponent(`${val} temple India`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=in&limit=6&addressdetails=1`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Nominatim Geocoding error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    // Set pinned point for real map preview
    setPinnedLocation({ lat, lng: lon, name: result.display_name });
    
    // Prepopulate Add Temple Modal if user wants to add it
    const address = result.address || {};
    const cityName = address.city || address.town || address.village || address.suburb || 'Central';
    const stateName = address.state || 'India';
    const shortName = result.display_name.split(',')[0] || searchQuery;

    setAddForm(prev => ({
      ...prev,
      temple_id: `TEMPLE-${Math.floor(100 + Math.random() * 900)}`,
      name: shortName,
      address: result.display_name,
      city: cityName,
      state: stateName,
      latitude: lat,
      longitude: lon,
      zoom_level: 18
    }));

    setSearchResults([]);
    setSearchQuery(shortName);
  };

  const handleMapClick = (latlng) => {
    setPinnedLocation({ lat: latlng.lat, lng: latlng.lng });
    // Update active forms with clicked coordinates
    setEditForm(prev => ({
      ...prev,
      latitude: parseFloat(latlng.lat.toFixed(5)),
      longitude: parseFloat(latlng.lng.toFixed(5))
    }));
    setAddForm(prev => ({
      ...prev,
      latitude: parseFloat(latlng.lat.toFixed(5)),
      longitude: parseFloat(latlng.lng.toFixed(5))
    }));
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    const lat = parseFloat(editForm.latitude);
    const lng = parseFloat(editForm.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setEditError('Latitude must be a valid number between -90 and 90 degrees.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setEditError('Longitude must be a valid number between -180 and 180 degrees.');
      return;
    }

    setSavingLocation(true);
    try {
      await API.put(`/temples/${selectedTempleId}/location`, {
        latitude: lat,
        longitude: lng,
        address: editForm.address,
        zoom_level: parseInt(editForm.zoom_level) || 18
      });
      setEditSuccess('Temple location updated successfully!');
      fetchMapData(selectedTempleId);
      setTimeout(() => {
        setShowLocationModal(false);
        setEditSuccess('');
      }, 1500);
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update location.');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleCreateNewTemple = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    setAddingTemple(true);

    try {
      const payload = {
        ...addForm,
        latitude: parseFloat(addForm.latitude),
        longitude: parseFloat(addForm.longitude),
        capacity: parseInt(addForm.capacity) || 15000,
        zoom_level: parseInt(addForm.zoom_level) || 18
      };

      const res = await API.post('/temples', payload);
      setAddSuccess(`Temple "${payload.name}" successfully created with auto-seeded GIS zones!`);
      
      await fetchTemplesList();
      setSelectedTempleId(payload.temple_id);
      fetchMapData(payload.temple_id, true);

      setTimeout(() => {
        setShowAddTempleModal(false);
        setAddSuccess('');
        setPinnedLocation(null);
      }, 1500);
    } catch (err) {
      setAddError(err.response?.data?.detail || 'Failed to add temple map.');
    } finally {
      setAddingTemple(false);
    }
  };

  const temple = mapData?.temple || DEFAULT_MAP_DATA.temple;
  const zones = mapData?.zones || DEFAULT_MAP_DATA.zones;

  return (
    <div className="container-fluid p-4">
      {/* Header Section */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <div>
          <h4 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
            <Map size={24} /> Geographically accurate temple GIS map
          </h4>
          <small className="text-muted">Real-world spatial intelligence, verified GPS satellite imagery, and live crowd risk overlays</small>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Temple Selector */}
          {allTemples.length > 0 && (
            <div className="d-flex align-items-center gap-1 bg-white p-1 rounded border border-beige shadow-sm">
              <Building size={16} className="text-maroon ms-1" />
              <select 
                className="form-select form-select-sm border-0 fw-bold text-maroon"
                value={selectedTempleId}
                onChange={e => handleTempleChange(e.target.value)}
                style={{ width: '230px' }}
              >
                {allTemples.map(t => (
                  <option key={t.temple_id} value={t.temple_id}>
                    {t.name} ({t.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Add New Temple Map Button */}
          <button 
            onClick={() => {
              setAddForm(prev => ({
                ...prev,
                temple_id: `TEMPLE-00${allTemples.length + 1}`
              }));
              setShowAddTempleModal(true);
            }} 
            className="btn btn-maroon text-gold fw-bold btn-sm d-flex align-items-center gap-1 shadow-sm"
          >
            <Plus size={15} /> Add Temple Map
          </button>

          {/* Mode Badge */}
          <span className={`badge ${mapData.mode === 'LIVE DATA' ? 'bg-success' : 'bg-warning text-dark'} px-2 py-2 fw-bold`}>
            {mapData.mode}
          </span>

          <button 
            onClick={() => setShowLocationModal(true)} 
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            title="Configure GPS coordinates"
          >
            <Settings2 size={15} /> Configure GPS
          </button>

          <button 
            onClick={() => fetchMapData(selectedTempleId)} 
            className="btn btn-outline-secondary btn-sm p-2"
            title="Refresh map telemetry"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Real Geocoding Search Bar */}
      <div className="position-relative mb-3">
        <div className="input-group shadow-sm border border-gold rounded overflow-hidden">
          <span className="input-group-text bg-white border-0 text-maroon">
            <Search size={18} />
          </span>
          <input 
            type="text" 
            className="form-control border-0 py-2"
            placeholder="Search any real temple, city, or shrine in India (e.g. Kedarnath, Puri Jagannath, Siddhivinayak, Golden Temple)..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {isSearching && (
            <span className="input-group-text bg-white border-0 text-muted small">
              Searching real map API...
            </span>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {searchResults.length > 0 && (
          <div 
            className="position-absolute w-100 bg-white shadow-lg rounded border border-gold mt-1 p-2 overflow-auto" 
            style={{ zIndex: 1100, maxHeight: '280px' }}
          >
            <small className="text-muted fw-bold d-block px-2 pb-1 border-bottom border-beige">
              Real OpenStreetMap GPS Results (Click to preview or add to map):
            </small>
            {searchResults.map((item, idx) => (
              <div 
                key={idx}
                className="p-2 rounded hover-bg-ivory cursor-pointer border-bottom border-light d-flex align-items-center justify-content-between"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelectSearchResult(item)}
              >
                <div>
                  <strong className="text-maroon d-block" style={{ fontSize: '0.85rem' }}>
                    <MapPin size={14} className="me-1 inline text-saffron" />
                    {item.display_name.split(',')[0]}
                  </strong>
                  <small className="text-muted" style={{ fontSize: '0.74rem' }}>
                    {item.display_name}
                  </small>
                </div>
                <div className="text-end">
                  <span className="badge bg-ivory text-dark-brown border border-beige" style={{ fontSize: '0.7rem' }}>
                    {parseFloat(item.lat).toFixed(4)}° N, {parseFloat(item.lon).toFixed(4)}° E
                  </span>
                  <button 
                    type="button" 
                    className="btn btn-xs btn-outline-maroon ms-2 py-0 px-1"
                    style={{ fontSize: '0.7rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSearchResult(item);
                      setShowAddTempleModal(true);
                    }}
                  >
                    + Add Map
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Overview Bar */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="temple-card p-3 gold-glow">
            <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.72rem' }}>TEMPLE COMPLEX</small>
            <h6 className="fw-bold text-maroon m-0 text-truncate">{temple.name}</h6>
            <small className="text-dark-brown" style={{ fontSize: '0.75rem' }}>GPS: {temple.latitude.toFixed(4)}° N, {temple.longitude.toFixed(4)}° E</small>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="temple-card p-3">
            <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.72rem' }}>DEVOTEES INSIDE</small>
            <h5 className="fw-bold text-primary m-0">{mapData.total_inside_devotees.toLocaleString()} <span className="text-muted small fs-6">/ {temple.capacity.toLocaleString()}</span></h5>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>{Math.round((mapData.total_inside_devotees / temple.capacity) * 100)}% compound load</small>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="temple-card p-3">
            <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.72rem' }}>ACTIVE QUEUED DEVOTEES</small>
            <h5 className="fw-bold text-saffron m-0">{mapData.total_waiting_devotees.toLocaleString()}</h5>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>Across verified queue corridors</small>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="temple-card p-3">
            <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.72rem' }}>OVERALL RISK ASSESSMENT</small>
            <h5 className={`fw-bold m-0 ${mapData.overall_temple_risk === 'CRITICAL' ? 'text-danger' : mapData.overall_temple_risk === 'HIGH' ? 'text-warning' : 'text-success'}`}>
              {mapData.overall_temple_risk}
            </h5>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>Real-time ML safety status</small>
          </div>
        </div>
      </div>

      {/* Main Map & Zone Inspector Row */}
      <div className="row g-3">
        {/* Left / Center: Interactive Real Map APIs (Satellite, Voyager, OSM) */}
        <div className="col-lg-8">
          <div className="temple-card p-2" style={{ height: '560px' }}>
            <TempleMap
              templeLat={pinnedLocation ? pinnedLocation.lat : temple.latitude}
              templeLng={pinnedLocation ? pinnedLocation.lng : temple.longitude}
              zoomLevel={temple.zoom_level || 18}
              templeName={pinnedLocation ? pinnedLocation.name || 'Searched Location' : temple.name}
              zones={zones}
              boundaryCoords={mapData.boundary_coordinates}
              selectedZoneId={selectedZone?.id}
              onSelectZone={(z) => setSelectedZone(z)}
              onMapClick={handleMapClick}
              pinnedPoint={pinnedLocation}
            />
          </div>

          {/* Quick Zone Navigator Buttons */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mt-2">
            <div className="d-flex flex-wrap gap-1">
              {zones.map(z => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZone(z)}
                  className={`btn btn-xs ${selectedZone?.id === z.id ? 'btn-maroon text-gold fw-bold' : 'btn-outline-secondary'}`}
                  style={{ fontSize: '0.72rem' }}
                >
                  {z.name}
                </button>
              ))}
            </div>

            {pinnedLocation && (
              <div className="d-flex align-items-center gap-1">
                <span className="badge bg-warning text-dark small" style={{ fontSize: '0.72rem' }}>
                  Pinned: {pinnedLocation.lat.toFixed(4)}, {pinnedLocation.lng.toFixed(4)}
                </span>
                <button 
                  onClick={() => setShowAddTempleModal(true)} 
                  className="btn btn-xs btn-maroon text-gold fw-bold"
                  style={{ fontSize: '0.72rem' }}
                >
                  + Add Map Here
                </button>
                <button 
                  onClick={() => setPinnedLocation(null)} 
                  className="btn btn-xs btn-outline-secondary"
                  style={{ fontSize: '0.72rem' }}
                >
                  Clear Pin
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Zone Inspector & AI Insights Sidebar */}
        <div className="col-lg-4">
          <div className="temple-card p-3 h-100 d-flex flex-column justify-content-between gold-glow">
            {selectedZone ? (
              <div>
                {/* Zone Header */}
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h5 className="fw-bold text-maroon m-0">{selectedZone.name}</h5>
                    <span className="badge bg-ivory border border-beige text-dark-brown mt-1" style={{ fontSize: '0.7rem' }}>
                      Type: {selectedZone.zone_type}
                    </span>
                  </div>
                  <span className={`badge ${selectedZone.is_verified ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.7rem' }}>
                    {selectedZone.is_verified ? 'Verified GPS point' : 'Operational simulation'}
                  </span>
                </div>

                {/* Occupancy Progress Bar */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="text-muted">Occupancy Load</span>
                    <strong className={selectedZone.occupancy_percent > 80 ? 'text-danger' : selectedZone.occupancy_percent > 65 ? 'text-warning' : 'text-success'}>
                      {selectedZone.occupancy_percent}%
                    </strong>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div 
                      className={`progress-bar ${selectedZone.occupancy_percent > 80 ? 'bg-danger' : selectedZone.occupancy_percent > 65 ? 'bg-warning' : 'bg-success'}`} 
                      role="progressbar" 
                      style={{ width: `${selectedZone.occupancy_percent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Zone Metrics Grid */}
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <div className="p-2 rounded bg-ivory border border-beige">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>CURRENT DEVOTEES</small>
                      <strong className="text-dark-brown fs-6">{selectedZone.current_devotees.toLocaleString()}</strong>
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}> / {selectedZone.capacity}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 rounded bg-ivory border border-beige">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>EST. WAITING TIME</small>
                      <strong className="text-saffron fs-6">{selectedZone.estimated_wait_min} min</strong>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 rounded bg-ivory border border-beige">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>ACTIVE QUEUE</small>
                      <strong className="text-maroon fs-6">{selectedZone.queue_length} devotees</strong>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 rounded bg-ivory border border-beige">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>ASSIGNED STAFF</small>
                      <strong className="text-dark-brown fs-6">{selectedZone.staff_assigned} personnel</strong>
                    </div>
                  </div>
                </div>

                {/* AI Predictive Intelligence Box */}
                <div className="p-3 rounded bg-ivory border border-gold mb-3">
                  <div className="d-flex align-items-center gap-1 text-maroon fw-bold small mb-2">
                    <Sparkles size={16} /> AI Real-Time Predictive Intelligence
                  </div>
                  <div className="small mb-1">
                    <span className="text-muted">Predicted in 30 min: </span>
                    <strong className="text-maroon">{selectedZone.ai_predicted_devotees_30min} devotees</strong>
                  </div>
                  <div className="small mb-2">
                    <span className="text-muted">Calculated Risk: </span>
                    <span className={`badge ${selectedZone.risk_level === 'CRITICAL' ? 'bg-danger' : selectedZone.risk_level === 'HIGH' ? 'bg-warning text-dark' : 'bg-success'}`}>
                      {selectedZone.risk_level}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white border border-beige small text-dark-brown fst-italic">
                    "{selectedZone.ai_recommendation}"
                  </div>
                </div>

                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                  GPS Coordinates: <code>{selectedZone.latitude.toFixed(5)}, {selectedZone.longitude.toFixed(5)}</code>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 text-muted">
                <MapPin size={32} className="mb-2 text-maroon opacity-50" />
                <p>Click any marker on the map to inspect live zone metrics and AI recommendations.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add New Temple Map */}
      {showAddTempleModal && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content temple-card border-gold">
              <div className="modal-header border-beige">
                <h5 className="modal-title text-maroon fw-bold d-flex align-items-center gap-2">
                  <Plus size={20} /> Add New Real Temple Map
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAddTempleModal(false)}></button>
              </div>
              <form onSubmit={handleCreateNewTemple}>
                <div className="modal-body">
                  <p className="text-muted small mb-3">
                    Onboard a new temple with verified GPS coordinates. Standard GIS operational zones (Main Entrance, Queue Complex, Sanctum, Prasadam, Exits) will be automatically generated.
                  </p>

                  {addError && <div className="alert alert-danger py-2 small">{addError}</div>}
                  {addSuccess && <div className="alert alert-success py-2 small">{addSuccess}</div>}

                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label text-dark-brown small fw-bold">Temple Identifier ID</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        placeholder="e.g. TEMPLE-006"
                        value={addForm.temple_id}
                        onChange={e => setAddForm({ ...addForm, temple_id: e.target.value })}
                      />
                    </div>

                    <div className="col-md-8">
                      <label className="form-label text-dark-brown small fw-bold">Temple Full Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        placeholder="e.g. Shri Kedarnath Jyotirlinga Temple"
                        value={addForm.name}
                        onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">City / Town</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        placeholder="e.g. Rudraprayag"
                        value={addForm.city}
                        onChange={e => setAddForm({ ...addForm, city: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">State / Province</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        placeholder="e.g. Uttarakhand"
                        value={addForm.state}
                        onChange={e => setAddForm({ ...addForm, state: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark-brown small fw-bold">GPS Latitude</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-control" 
                        required 
                        value={addForm.latitude}
                        onChange={e => setAddForm({ ...addForm, latitude: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark-brown small fw-bold">GPS Longitude</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-control" 
                        required 
                        value={addForm.longitude}
                        onChange={e => setAddForm({ ...addForm, longitude: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark-brown small fw-bold">Max Crowd Capacity</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        required 
                        value={addForm.capacity}
                        onChange={e => setAddForm({ ...addForm, capacity: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark-brown small fw-bold">Address / Landmark</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={addForm.address}
                        onChange={e => setAddForm({ ...addForm, address: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">Opening Time</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={addForm.opening_time}
                        onChange={e => setAddForm({ ...addForm, opening_time: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">Closing Time</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={addForm.closing_time}
                        onChange={e => setAddForm({ ...addForm, closing_time: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-beige">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddTempleModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-maroon text-gold fw-bold" disabled={addingTemple}>
                    {addingTemple ? 'Creating Map & Zones...' : 'Create & Plop On Real Map'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Temple Location Modal */}
      {showLocationModal && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content temple-card border-gold">
              <div className="modal-header border-beige">
                <h5 className="modal-title text-maroon fw-bold d-flex align-items-center gap-2">
                  <Settings2 size={20} /> Configure Temple GPS Coordinates
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowLocationModal(false)}></button>
              </div>
              <form onSubmit={handleLocationSubmit}>
                <div className="modal-body">
                  <p className="text-muted small mb-3">
                    Configure the verified geographic latitude and longitude for <strong>{temple.name}</strong>.
                  </p>

                  {editError && <div className="alert alert-danger py-2 small">{editError}</div>}
                  {editSuccess && <div className="alert alert-success py-2 small">{editSuccess}</div>}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">Latitude (GPS)</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-control" 
                        required 
                        value={editForm.latitude}
                        onChange={e => setEditForm({ ...editForm, latitude: e.target.value })}
                      />
                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>Range: -90.0 to 90.0</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">Longitude (GPS)</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-control" 
                        required 
                        value={editForm.longitude}
                        onChange={e => setEditForm({ ...editForm, longitude: e.target.value })}
                      />
                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>Range: -180.0 to 180.0</small>
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark-brown small fw-bold">Address / Landmark</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={editForm.address}
                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">Default Zoom Level</label>
                      <input 
                        type="number" 
                        min="12"
                        max="20"
                        className="form-control" 
                        value={editForm.zoom_level}
                        onChange={e => setEditForm({ ...editForm, zoom_level: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-beige">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowLocationModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-maroon text-gold fw-bold" disabled={savingLocation}>
                    {savingLocation ? 'Saving...' : 'Update Temple Location'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TempleMapPage;
