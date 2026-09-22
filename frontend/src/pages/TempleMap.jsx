import React, { useState, useEffect, useContext } from 'react';
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
  Sliders
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

  // Fetch list of temples for Super Admin
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      API.get('/temples')
        .then(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setAllTemples(res.data);
          }
        })
        .catch(err => console.error(err));
    }
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
    fetchMapData(newTempleId, true);
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
          <small className="text-muted">Real-world spatial intelligence, verified GPS coordinates, and live crowd risk overlays</small>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Super Admin Temple Selector */}
          {user?.role === 'SUPER_ADMIN' && allTemples.length > 0 && (
            <div className="d-flex align-items-center gap-1 bg-white p-1 rounded border border-beige">
              <Building size={16} className="text-maroon ms-1" />
              <select 
                className="form-select form-select-sm border-0 fw-bold text-maroon"
                value={selectedTempleId}
                onChange={e => handleTempleChange(e.target.value)}
                style={{ width: '220px' }}
              >
                {allTemples.map(t => (
                  <option key={t.temple_id} value={t.temple_id}>
                    {t.name} ({t.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mode & Risk Badges */}
          <span className={`badge ${mapData.mode === 'LIVE DATA' ? 'bg-success' : 'bg-warning text-dark'} px-2 py-2 fw-bold`}>
            {mapData.mode}
          </span>

          <button 
            onClick={() => setShowLocationModal(true)} 
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
          >
            <Settings2 size={15} /> Configure location
          </button>

          <button 
            onClick={() => fetchMapData(selectedTempleId)} 
            className="btn btn-outline-secondary btn-sm p-2"
          >
            <RefreshCw size={15} />
          </button>
        </div>
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
        {/* Left / Center: Interactive Leaflet Map */}
        <div className="col-lg-8">
          <div className="temple-card p-2" style={{ height: '560px' }}>
            <TempleMap
              templeLat={temple.latitude}
              templeLng={temple.longitude}
              zoomLevel={temple.zoom_level || 18}
              templeName={temple.name}
              zones={zones}
              boundaryCoords={mapData.boundary_coordinates}
              selectedZoneId={selectedZone?.id}
              onSelectZone={(z) => setSelectedZone(z)}
            />
          </div>

          {/* Quick Zone Navigator Buttons */}
          <div className="d-flex flex-wrap gap-1 mt-2">
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
