import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Loading from '../components/Loading';
import { 
  Camera, 
  Video, 
  Activity, 
  LogIn, 
  LogOut, 
  Users, 
  TrendingUp, 
  ShieldAlert, 
  Sparkles, 
  Settings2, 
  RefreshCw, 
  PlayCircle,
  Clock,
  Eye,
  CheckCircle,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Radio,
  Sliders,
  Youtube,
  Layers,
  Download,
  Flame,
  Zap,
  Info,
  ExternalLink,
  Grid,
  Cpu
} from 'lucide-react';

const CrowdMonitoring = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [cameras, setCameras] = useState([]);
  const [selectedCamId, setSelectedCamId] = useState('CAM-001');
  const [analytics, setAnalytics] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changingSource, setChangingSource] = useState(false);
  const [error, setError] = useState(null);

  // View Layout Modes:
  // 'quad' (All 4 Frames: 2x2 Matrix), 'dual' (Frames 1 & 2), 'temple_yolo' (Frames 3 & 4),
  // 'raw' (Frame 1 only), 'detection' (Frame 2 only), 'youtube' (Frame 3 only), 'yolo_opencv' (Frame 4 only)
  const [viewMode, setViewMode] = useState('quad');

  // Stream refresh key to force re-render when switching cameras or sources
  const [streamKey, setStreamKey] = useState(Date.now());

  // -------------------------------------------------------------
  // MULTI-CHANNEL REAL DEVOTEE FEEDS (Targeting Devotee Crowds & Queues)
  // -------------------------------------------------------------
  const REAL_DEVOTEES_CHANNELS = [
    { 
      id: 'birla_queue',
      name: '👥 Birla Mandir Queue Complex', 
      url: 'https://www.youtube.com/watch?v=1ut9hXFbvaw', 
      source_type: 'DEVOTEES_QUEUE',
      badge: 'REAL QUEUE ROWS',
      desc: 'Real Devotees Standing in Multiple Long Darshan Queue Rows' 
    },
    { 
      id: 'tirupati_rush',
      name: '🛕 Tirumala Tirupati Pilgrims Rush', 
      url: 'https://www.youtube.com/watch?v=_w8ZeY-iPio', 
      source_type: 'TEMPLE_ENTRANCE',
      badge: 'MASSIVE PILGRIM SURGE',
      desc: 'Thousands of Devotees Moving Through Queue Barricades' 
    },
    { 
      id: 'gate_inflow',
      name: '🚶 Temple Mahadwar Waiting Line', 
      url: 'https://www.youtube.com/watch?v=tdxR7kSoDmc', 
      source_type: 'GATE_RUSH',
      badge: 'ENTRY GATES',
      desc: 'Devotee Crowd Waiting to Enter Temple Gates' 
    },
    { 
      id: 'iskcon_hall',
      name: '🪔 ISKCON Vrindavan Devotee Hall', 
      url: 'https://www.youtube.com/watch?v=HwoUJXm90Go', 
      source_type: 'DEVOTEES_QUEUE',
      badge: 'DEVOTEE KIRTAN',
      desc: 'Packed Devotees Singing, Dancing & Chanting Inside Temple' 
    },
    { 
      id: 'jyotirlinga_influx',
      name: '🕉️ Jyotirlinga Shrine Pilgrim Rush', 
      url: 'https://www.youtube.com/watch?v=53nLlxo9vyA', 
      source_type: 'TEMPLE_ENTRANCE',
      badge: 'FESTIVAL RUSH',
      desc: 'Massive Crowd of Pilgrims Gathering at Temple Precinct' 
    },
    { 
      id: 'vaishno_katra',
      name: '⛰️ Katra Vaishno Devi Pilgrim Influx', 
      url: 'https://www.youtube.com/watch?v=XOtlBwrb_IE', 
      source_type: 'GATE_RUSH',
      badge: 'SECURITY CHECK',
      desc: 'High Footfall Pilgrims Walking Past Security Gates' 
    },
    { 
      id: 'live_iskcon',
      name: '🔴 24/7 Live Stream - ISKCON Hall', 
      url: 'https://www.youtube.com/watch?v=hWnVSQgxVwk', 
      source_type: 'YOUTUBE',
      badge: '24/7 LIVE STREAM',
      desc: 'Continuous 24/7 Live Feed with Devotees in Hall' 
    },
  ];

  // Default to Real Devotee Queue feed
  const [selectedChannel, setSelectedChannel] = useState(REAL_DEVOTEES_CHANNELS[0]);
  const [frame3YtUrl, setFrame3YtUrl] = useState(REAL_DEVOTEES_CHANNELS[0].url);
  const [frame3InputUrl, setFrame3InputUrl] = useState(REAL_DEVOTEES_CHANNELS[0].url);
  const [frame3StatusMsg, setFrame3StatusMsg] = useState('');

  const extractYouTubeId = (url) => {
    if (!url) return '1ut9hXFbvaw';
    const clean = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const shortMatch = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];
    const watchMatch = clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];
    const pathMatch = clean.match(/youtube\.com\/(?:live|embed)\/([a-zA-Z0-9_-]{11})/);
    if (pathMatch) return pathMatch[1];
    return '1ut9hXFbvaw';
  };

  // -------------------------------------------------------------
  // FRAME 04: YOLOv8 + OpenCV People Counter State
  // -------------------------------------------------------------
  const [frame4Source, setFrame4Source] = useState('DEVOTEES_QUEUE'); // 'DEVOTEES_QUEUE' | 'TEMPLE_ENTRANCE' | 'GATE_RUSH' | 'YOUTUBE' | 'CAMERA' | 'SYNTHETIC_CROWD'
  const [frame4Analytics, setFrame4Analytics] = useState(null);
  const [frame4Loading, setFrame4Loading] = useState(false);
  const [frame4SuccessMsg, setFrame4SuccessMsg] = useState('');

  const rawImgRef = useRef(null);
  const detectionImgRef = useRef(null);
  const frame4ImgRef = useRef(null);

  // Source configuration modal/panel toggle
  const [showSourceConfig, setShowSourceConfig] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('https://www.youtube.com/watch?v=1ut9hXFbvaw');
  const [isConnectingYt, setIsConnectingYt] = useState(false);
  const [ytSuccessMsg, setYtSuccessMsg] = useState('');

  const isFetchingRef = useRef(false);

  const fetchCCTVData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const targetCam = selectedCamId || 'CAM-001';

      // Parallelize all 4 telemetry requests in a single round-trip cycle
      const [camsResult, anaResult, predResult, f4Result] = await Promise.allSettled([
        API.get('/cctv/cameras'),
        API.get(`/cctv/cameras/${targetCam}/analytics`),
        API.get(`/cctv/predictions?camera_id=${targetCam}`),
        API.get(`/cctv/yolo-opencv/analytics?camera_id=${targetCam}`)
      ]);

      if (camsResult.status === 'fulfilled') {
        setCameras(camsResult.value.data || []);
      }
      if (anaResult.status === 'fulfilled') {
        setAnalytics(anaResult.value.data);
      }
      if (predResult.status === 'fulfilled') {
        setPredictions(predResult.value.data);
      }
      if (f4Result.status === 'fulfilled') {
        setFrame4Analytics(f4Result.value.data);
      }

      setError(null);
    } catch (err) {
      console.error('Failed to load CCTV data:', err);
      setError('CCTV stream or analytics telemetry interrupted.');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCCTVData();
    const interval = setInterval(fetchCCTVData, 4000);
    return () => clearInterval(interval);
  }, [selectedCamId]);

  const handleCameraSelect = (camId) => {
    setSelectedCamId(camId);
    setStreamKey(Date.now());
  };

  const handleSourceChange = async (newSource, customUrl = null) => {
    setChangingSource(true);
    setYtSuccessMsg('');
    try {
      const urlParam = customUrl ? `&stream_url=${encodeURIComponent(customUrl)}` : '';
      await API.put(`/cctv/cameras/${selectedCamId}/source?source_type=${newSource}${urlParam}`);
      setStreamKey(Date.now());
      await fetchCCTVData();
      if (newSource === 'YOUTUBE') {
        setYtSuccessMsg('YouTube stream linked and processing with YOLOv8!');
        setTimeout(() => setYtSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to switch camera source:', err);
      setError('Failed to update camera video source.');
    } finally {
      setChangingSource(false);
    }
  };

  const handleConnectYouTube = (e) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    setIsConnectingYt(true);
    handleSourceChange('YOUTUBE', youtubeUrl.trim()).finally(() => {
      setIsConnectingYt(false);
    });
  };

  const handleFrame3Submit = (e) => {
    e.preventDefault();
    if (!frame3InputUrl.trim()) return;
    setFrame3YtUrl(frame3InputUrl.trim());
    setFrame3StatusMsg('Live video channel updated successfully!');
    setTimeout(() => setFrame3StatusMsg(''), 3000);
  };

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
    setFrame3InputUrl(channel.url);
    setFrame3YtUrl(channel.url);
    setFrame3StatusMsg(`Channel loaded: ${channel.name}`);
    setTimeout(() => setFrame3StatusMsg(''), 3000);

    // If channel has corresponding real devotee video feed, switch Frame 4 to match
    if (channel.source_type) {
      handleFrame4SourceChange(channel.source_type);
    }
  };

  const handleLinkFrame3ToFrame4 = async () => {
    setFrame4Loading(true);
    try {
      await API.put(`/cctv/yolo-opencv/source?source_type=YOUTUBE&stream_url=${encodeURIComponent(frame3YtUrl)}&camera_id=${selectedCamId}`);
      setFrame4Source('YOUTUBE');
      setStreamKey(Date.now());
      setFrame4SuccessMsg('Frame 3 Devotee Channel routed to Frame 4 YOLO+OpenCV engine!');
      setTimeout(() => setFrame4SuccessMsg(''), 4000);
      await fetchCCTVData();
    } catch (e) {
      console.error('Failed to link Frame 3 to Frame 4:', e);
    } finally {
      setFrame4Loading(false);
    }
  };

  const handleFrame4SourceChange = async (newSource) => {
    setFrame4Loading(true);
    try {
      const streamParam = (newSource === 'YOUTUBE') ? `&stream_url=${encodeURIComponent(frame3YtUrl)}` : '';
      await API.put(`/cctv/yolo-opencv/source?source_type=${newSource}&camera_id=${selectedCamId}${streamParam}`);
      setFrame4Source(newSource);
      setStreamKey(Date.now());
      setFrame4SuccessMsg(`YOLO Counter switched to: ${newSource.replace('_', ' ')}`);
      setTimeout(() => setFrame4SuccessMsg(''), 3500);
      await fetchCCTVData();
    } catch (e) {
      console.error('Failed to update Frame 4 source:', e);
    } finally {
      setFrame4Loading(false);
    }
  };

  const handleTakeSnapshot = (type) => {
    let imgElement = null;
    if (type === 'raw') imgElement = rawImgRef.current;
    else if (type === 'detection') imgElement = detectionImgRef.current;
    else if (type === 'frame4') imgElement = frame4ImgRef.current;

    if (!imgElement) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgElement.naturalWidth || 1280;
      canvas.height = imgElement.naturalHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      link.download = `darshanai-${selectedCamId}-${type}-${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (e) {
      let endpoint = 'raw-stream';
      if (type === 'detection') endpoint = 'detection-stream';
      else if (type === 'frame4') endpoint = 'yolo-opencv-stream';
      const url = `${API.defaults.baseURL}/cctv/${type === 'frame4' ? 'yolo-opencv-stream' : `cameras/${selectedCamId}/${endpoint}`}`;
      window.open(url, '_blank');
    }
  };

  if (loading && !analytics) return <Loading />;

  const rawStreamUrl = `${API.defaults.baseURL}/cctv/cameras/${selectedCamId}/raw-stream?t=${streamKey}`;
  const detectionStreamUrl = `${API.defaults.baseURL}/cctv/cameras/${selectedCamId}/detection-stream?t=${streamKey}`;
  const yoloOpencvStreamUrl = `${API.defaults.baseURL}/cctv/yolo-opencv-stream?camera_id=${selectedCamId}&t=${streamKey}`;

  const currentDevotees = analytics?.person_count || 0;
  const isCongested = currentDevotees > 40;
  const isModerate = currentDevotees > 20 && currentDevotees <= 40;

  const f4Devotees = frame4Analytics?.person_count || currentDevotees;
  const isF4Congested = f4Devotees > 35;
  const isF4Moderate = f4Devotees > 15 && f4Devotees <= 35;

  return (
    <div className="container-fluid p-3 p-md-4">
      {/* Top Header & Surveillance Console Bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h4 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
              <Camera size={26} /> CCTV Crowd Intelligence Center
            </h4>
            <span className="badge bg-success text-light px-3 py-2 fw-bold d-flex align-items-center gap-1 shadow-sm" style={{ fontSize: '0.75rem' }}>
              <span className="spinner-grow spinner-grow-sm" role="status" style={{ width: '8px', height: '8px' }}></span>
              REAL DEVOTEES MONITORING ACTIVE
            </span>
            <span className="badge bg-maroon text-gold px-2 py-1 fw-semibold" style={{ fontSize: '0.72rem' }}>
              YOLOv8 Nano • OpenCV cv2 DNN Tracking
            </span>
          </div>
          <small className="text-muted">
            4-Frame Real Crowd Surveillance Console: <strong>Frame 1 (Raw Sensor)</strong> | <strong>Frame 2 (Corridor HUD)</strong> | <strong>Frame 3 (Live Devotees Multi-Channel)</strong> | <strong>Frame 4 (Real Devotees YOLO+OpenCV Counter)</strong>
          </small>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* View Mode Switcher Pills */}
          <div className="btn-group btn-group-sm bg-white p-1 rounded border border-beige shadow-sm" role="group">
            <button 
              type="button" 
              className={`btn btn-sm ${viewMode === 'quad' ? 'btn-maroon text-gold fw-bold shadow-sm' : 'btn-light text-dark'}`}
              onClick={() => setViewMode('quad')}
              title="View all 4 frames in a 2x2 surveillance grid"
            >
              <Grid size={14} className="me-1 text-gold" /> Quad 4-Frame Grid
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${viewMode === 'dual' ? 'btn-maroon text-gold fw-bold shadow-sm' : 'btn-light text-dark'}`}
              onClick={() => setViewMode('dual')}
              title="Frames 1 & 2 only"
            >
              <Layers size={14} className="me-1" /> Frames 1 & 2
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${viewMode === 'temple_yolo' ? 'btn-maroon text-gold fw-bold shadow-sm' : 'btn-light text-dark'}`}
              onClick={() => setViewMode('temple_yolo')}
              title="Frames 3 & 4 only"
            >
              <Youtube size={14} className="me-1 text-danger" /> Frames 3 & 4
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${viewMode === 'raw' ? 'btn-maroon text-gold fw-bold shadow-sm' : 'btn-light text-dark'}`}
              onClick={() => setViewMode('raw')}
            >
              <Radio size={13} className="me-1 text-danger" /> Frame 1
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${viewMode === 'detection' ? 'btn-maroon text-gold fw-bold shadow-sm' : 'btn-light text-dark'}`}
              onClick={() => setViewMode('detection')}
            >
              <Eye size={13} className="me-1 text-success" /> Frame 2
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${viewMode === 'youtube' ? 'btn-maroon text-gold fw-bold shadow-sm' : 'btn-light text-dark'}`}
              onClick={() => setViewMode('youtube')}
            >
              <Youtube size={13} className="me-1 text-danger" /> Frame 3
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${viewMode === 'yolo_opencv' ? 'btn-maroon text-gold fw-bold shadow-sm' : 'btn-light text-dark'}`}
              onClick={() => setViewMode('yolo_opencv')}
            >
              <Cpu size={13} className="me-1 text-primary" /> Frame 4
            </button>
          </div>

          {/* Quick Source Toggle Button */}
          <button 
            onClick={() => setShowSourceConfig(!showSourceConfig)}
            className={`btn btn-sm d-flex align-items-center gap-1 border shadow-sm ${showSourceConfig ? 'btn-maroon text-gold fw-bold' : 'btn-white bg-white text-maroon border-beige'}`}
          >
            <Sliders size={15} /> Source: <strong>{analytics?.source_type || 'TEST_VIDEO'}</strong>
          </button>

          <button 
            onClick={() => navigate('/simulation')} 
            className="btn btn-warning text-dark fw-bold btn-sm d-flex align-items-center gap-1 shadow-sm"
          >
            <PlayCircle size={15} /> Open Simulation
          </button>

          <button onClick={fetchCCTVData} className="btn btn-outline-secondary btn-sm p-2 shadow-sm" title="Refresh Telemetry">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Video Source Configuration Panel (Collapsible / Dynamic) */}
      {showSourceConfig && (
        <div className="temple-card p-3 mb-3 gold-glow">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2 pb-2 border-bottom border-beige">
            <h6 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
              <Sliders size={17} className="text-gold" /> Camera Video Source Configuration ({selectedCamId})
            </h6>
            <button 
              className="btn btn-sm btn-close" 
              onClick={() => setShowSourceConfig(false)}
              aria-label="Close"
            ></button>
          </div>

          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <label className="form-label small fw-bold text-dark-brown mb-1">Select Feed Input Source:</label>
              <select
                className="form-select form-select-sm fw-bold text-maroon border-beige"
                value={analytics?.source_type || 'TEST_VIDEO'}
                onChange={e => handleSourceChange(e.target.value)}
                disabled={changingSource}
              >
                <option value="TEST_VIDEO">🎮 TEST VIDEO (Simulated Temple Corridor)</option>
                <option value="YOUTUBE">🔴 YOUTUBE LIVE STREAM (HLS / m3u8)</option>
                <option value="WEBCAM">📷 LOCAL WEBCAM (OpenCV Index 0)</option>
                <option value="LIVE_CCTV">📹 RTSP / IP CCTV NETWORK CAMERA</option>
              </select>
            </div>

            <div className="col-md-8">
              <form onSubmit={handleConnectYouTube} className="d-flex flex-column gap-1">
                <label className="form-label small fw-bold text-dark-brown mb-0">
                  YouTube Live Stream URL (Auto-resolved via yt-dlp):
                </label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light text-danger border-beige">
                    <Youtube size={16} />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={e => setYoutubeUrl(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-maroon text-gold fw-bold px-3"
                    disabled={changingSource || isConnectingYt}
                  >
                    {isConnectingYt ? 'Connecting...' : 'Connect Feed'}
                  </button>
                </div>
                <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
                  <small className="text-muted" style={{ fontSize: '0.72rem' }}>Quick Presets:</small>
                  <button 
                    type="button" 
                    className="btn btn-link p-0 text-maroon text-decoration-none small"
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => {
                      setYoutubeUrl('https://www.youtube.com/watch?v=1ut9hXFbvaw');
                      handleSourceChange('YOUTUBE', 'https://www.youtube.com/watch?v=1ut9hXFbvaw');
                    }}
                  >
                    • Birla Mandir Queue Crowd
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-link p-0 text-secondary text-decoration-none small"
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => handleSourceChange('TEST_VIDEO')}
                  >
                    • Reset to Synthetic Corridor
                  </button>
                </div>
              </form>
            </div>
          </div>

          {ytSuccessMsg && (
            <div className="alert alert-success alert-dismissible fade show mt-2 mb-0 py-2 small" role="alert">
              <CheckCircle size={15} className="me-1" /> {ytSuccessMsg}
            </div>
          )}
        </div>
      )}

      {/* Camera Navigation Strip */}
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <span className="small text-muted fw-bold me-1">ACTIVE CORRIDORS:</span>
        {cameras.map(cam => (
          <button
            key={cam.camera_id}
            onClick={() => handleCameraSelect(cam.camera_id)}
            className={`btn btn-sm d-flex align-items-center gap-2 py-1 px-3 ${selectedCamId === cam.camera_id ? 'btn-maroon text-gold fw-bold shadow-sm' : 'btn-outline-secondary bg-white'}`}
            style={{ fontSize: '0.8rem' }}
          >
            <Camera size={14} />
            <span>{cam.camera_id}: {cam.name}</span>
            <span className={`badge ${cam.risk_level === 'CRITICAL' ? 'bg-danger' : cam.risk_level === 'HIGH' ? 'bg-warning text-dark' : 'bg-success'}`} style={{ fontSize: '0.65rem' }}>
              {cam.person_count} in frame
            </span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 4-FRAME CROWD INTELLIGENCE DISPLAY MATRIX                                 */}
      {/* ========================================================================= */}
      <div className="row g-3 mb-4">
        {/* ===================================================================== */}
        {/* FRAME 1: LIVE VIDEO (RAW UNPROCESSED FEED)                            */}
        {/* ===================================================================== */}
        {(viewMode === 'quad' || viewMode === 'dual' || viewMode === 'raw') && (
          <div className={viewMode === 'raw' ? 'col-12' : 'col-lg-6 col-12'}>
            <div className="temple-card p-3 h-100 shadow-sm border border-secondary border-opacity-25">
              {/* Frame 1 Header */}
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-beige">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-danger text-light fw-bold d-flex align-items-center gap-1 shadow-sm" style={{ fontSize: '0.72rem' }}>
                    <span className="spinner-grow spinner-grow-sm" role="status" style={{ width: '6px', height: '6px' }}></span>
                    FRAME 01 • LIVE VIDEO (RAW)
                  </span>
                  <span className="badge bg-maroon text-gold">{selectedCamId}</span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-ivory text-muted border border-beige" style={{ fontSize: '0.7rem' }}>
                    Clean Sensor Output • Zero HUD
                  </span>
                  <button 
                    className="btn btn-outline-secondary btn-sm p-1" 
                    title="Capture Snapshot"
                    onClick={() => handleTakeSnapshot('raw')}
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>

              {/* Frame 1 Video Player */}
              <div 
                className="position-relative rounded overflow-hidden shadow-inner bg-dark d-flex align-items-center justify-content-center"
                style={{ 
                  minHeight: viewMode === 'raw' ? '480px' : '340px', 
                  maxHeight: viewMode === 'raw' ? '580px' : '390px', 
                  border: '2px solid #2C1810' 
                }}
              >
                <img 
                  ref={rawImgRef}
                  src={rawStreamUrl} 
                  alt="Live Camera Video Raw Feed"
                  className="img-fluid w-100 h-100 object-fit-contain"
                  style={{ minHeight: viewMode === 'raw' ? '480px' : '340px', maxHeight: viewMode === 'raw' ? '580px' : '390px' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='400' fill='%23111827'><rect width='100%' height='100%' fill='%231E293B'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%2394A3B8' font-size='15'>Live Raw Video Feed Ingesting...</text></svg>";
                  }}
                />

                {/* Top overlay badge */}
                <div className="position-absolute top-0 start-0 m-2 px-2 py-1 bg-dark bg-opacity-75 text-light rounded small fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.68rem', backdropFilter: 'blur(4px)' }}>
                  <Radio size={12} className="text-danger" /> RAW CORRIDOR SENSOR
                </div>

                {/* Bottom Source overlay tag */}
                <div className="position-absolute bottom-0 start-0 m-2 px-2 py-1 bg-dark bg-opacity-75 text-light rounded small d-flex align-items-center gap-1" style={{ fontSize: '0.68rem', backdropFilter: 'blur(4px)' }}>
                  <span>Sensor: <strong>{analytics?.name || selectedCamId}</strong></span>
                </div>
              </div>

              {/* Frame 1 Footer Metadata */}
              <div className="d-flex justify-content-between align-items-center mt-2 text-muted small" style={{ fontSize: '0.75rem' }}>
                <span className="d-flex align-items-center gap-1">
                  <CheckCircle size={13} className="text-success" /> Untouched optical capture stream
                </span>
                <span>Transmission: <strong>~20 FPS MJPEG</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* FRAME 2: LIVE VIDEO WITH PEOPLE COUNT (YOLOv8 DETECTION & HUD)        */}
        {/* ===================================================================== */}
        {(viewMode === 'quad' || viewMode === 'dual' || viewMode === 'detection') && (
          <div className={viewMode === 'detection' ? 'col-12' : 'col-lg-6 col-12'}>
            <div className="temple-card p-3 h-100 gold-glow">
              {/* Frame 2 Header */}
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-beige">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-success text-light fw-bold d-flex align-items-center gap-1 shadow-sm" style={{ fontSize: '0.72rem' }}>
                    <span className="spinner-grow spinner-grow-sm" role="status" style={{ width: '6px', height: '6px' }}></span>
                    FRAME 02 • LIVE VIDEO WITH PEOPLE COUNT
                  </span>
                  <span className="badge bg-maroon text-gold">{selectedCamId}</span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-ivory text-maroon border border-gold fw-bold" style={{ fontSize: '0.7rem' }}>
                    YOLOv8 Nano • Centroid Tracking
                  </span>
                  <button 
                    className="btn btn-outline-secondary btn-sm p-1" 
                    title="Capture AI Detection Snapshot"
                    onClick={() => handleTakeSnapshot('detection')}
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>

              {/* Frame 2 Video Player */}
              <div 
                className="position-relative rounded overflow-hidden shadow-inner bg-dark d-flex align-items-center justify-content-center"
                style={{ 
                  minHeight: viewMode === 'detection' ? '480px' : '340px', 
                  maxHeight: viewMode === 'detection' ? '580px' : '390px', 
                  border: '2px solid #C59B27' 
                }}
              >
                <img 
                  ref={detectionImgRef}
                  src={detectionStreamUrl} 
                  alt="Live Video with People Count Detection"
                  className="img-fluid w-100 h-100 object-fit-contain"
                  style={{ minHeight: viewMode === 'detection' ? '480px' : '340px', maxHeight: viewMode === 'detection' ? '580px' : '390px' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='400' fill='%23111827'><rect width='100%' height='100%' fill='%231E293B'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23C59B27' font-size='15'>YOLOv8 Real-Time Crowd Telemetry Ingesting...</text></svg>";
                  }}
                />

                {/* Top overlay badge */}
                <div className="position-absolute top-0 start-0 m-2 px-2 py-1 bg-dark bg-opacity-75 text-light rounded small fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.68rem', backdropFilter: 'blur(4px)' }}>
                  <Eye size={12} className="text-success" /> AI CROWD HUD • YOLOv8n
                </div>

                {/* Live Count overlay pill */}
                <div 
                  className={`position-absolute bottom-0 end-0 m-2 px-3 py-1 rounded shadow-sm fw-bold d-flex align-items-center gap-1 ${isCongested ? 'bg-danger text-light' : isModerate ? 'bg-warning text-dark' : 'bg-success text-light'}`}
                  style={{ fontSize: '0.78rem', backdropFilter: 'blur(4px)' }}
                >
                  <Users size={14} />
                  <span>COUNT: {currentDevotees} DEVOTEES</span>
                </div>
              </div>

              {/* Frame 2 Footer Metadata */}
              <div className="d-flex justify-content-between align-items-center mt-2 text-muted small" style={{ fontSize: '0.75rem' }}>
                <span className="d-flex align-items-center gap-1">
                  <Sparkles size={13} className="text-gold" /> Bounding Boxes & Centroid Inflow/Outflow Overlay
                </span>
                <span>FPS: <strong>{analytics?.fps || 15}</strong> • Latency: <strong>&lt; 50ms</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* FRAME 03: LIVE DEVOTEES MULTI-CHANNEL (CROWDS & QUEUES)              */}
        {/* ===================================================================== */}
        {(viewMode === 'quad' || viewMode === 'temple_yolo' || viewMode === 'youtube') && (
          <div className={viewMode === 'youtube' ? 'col-12' : 'col-lg-6 col-12'}>
            <div className="temple-card p-3 h-100 shadow-sm border border-danger border-opacity-25" style={{ background: '#FFFDF9' }}>
              {/* Frame 3 Header */}
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-beige flex-wrap gap-1">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-danger text-light fw-bold d-flex align-items-center gap-1 shadow-sm" style={{ fontSize: '0.72rem' }}>
                    <Youtube size={14} />
                    FRAME 03 • REAL DEVOTEES CROWD VIDEO FEED
                  </span>
                  <span className="badge bg-maroon text-gold">{selectedChannel.badge}</span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button 
                    onClick={handleLinkFrame3ToFrame4}
                    disabled={frame4Loading}
                    className="btn btn-warning text-dark fw-bold btn-sm py-1 px-2 d-flex align-items-center gap-1 shadow-sm"
                    style={{ fontSize: '0.7rem' }}
                    title="Route this live devotee video directly into Frame 4's YOLOv8 person counter"
                  >
                    <Zap size={13} className="text-danger" /> Route to Frame 4
                  </button>
                  <a 
                    href={frame3YtUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-outline-secondary btn-sm p-1" 
                    title="Open stream in YouTube"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              {/* Frame 3 YouTube Video Player Embed */}
              <div 
                className="position-relative rounded overflow-hidden shadow-inner bg-dark d-flex align-items-center justify-content-center"
                style={{ 
                  minHeight: viewMode === 'youtube' ? '480px' : '340px', 
                  maxHeight: viewMode === 'youtube' ? '580px' : '390px', 
                  border: '2px solid #B91C1C' 
                }}
              >
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(frame3YtUrl)}?autoplay=1&mute=1&enablejsapi=1&rel=0&playsinline=1`}
                  title="Real Temple Devotees Crowd CCTV Video"
                  className="w-100 h-100 border-0"
                  style={{ 
                    minHeight: viewMode === 'youtube' ? '480px' : '340px', 
                    maxHeight: viewMode === 'youtube' ? '580px' : '390px',
                    width: '100%'
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>

                {/* Top overlay badge */}
                <div className="position-absolute top-0 start-0 m-2 px-2 py-1 bg-dark bg-opacity-75 text-light rounded small fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.68rem', backdropFilter: 'blur(4px)', pointerEvents: 'none' }}>
                  <Radio size={12} className="text-danger" /> REAL DEVOTEES CROWD FEED
                </div>

                {/* Bottom Source overlay tag */}
                <div className="position-absolute bottom-0 start-0 m-2 px-2 py-1 bg-dark bg-opacity-75 text-light rounded small d-flex align-items-center gap-1" style={{ fontSize: '0.68rem', backdropFilter: 'blur(4px)', pointerEvents: 'none' }}>
                  <span>Channel: <strong>{selectedChannel.name}</strong></span>
                </div>
              </div>

              {/* Multi-Channel Real Devotee Switcher */}
              <div className="mt-2 pt-1">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <small className="text-muted fw-bold" style={{ fontSize: '0.72rem' }}>
                    SELECT DEVOTEE CROWD CHANNEL:
                  </small>
                  <small className="text-success fw-semibold" style={{ fontSize: '0.68rem' }}>
                    {REAL_DEVOTEES_CHANNELS.length} Active Channels
                  </small>
                </div>

                {/* Channels Grid Pills */}
                <div className="d-flex align-items-center gap-1 flex-wrap mb-2">
                  {REAL_DEVOTEES_CHANNELS.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      className={`btn btn-sm py-1 px-2 text-start ${selectedChannel.id === ch.id ? 'btn-maroon text-gold fw-bold shadow-sm' : 'btn-light border border-beige text-dark'}`}
                      style={{ fontSize: '0.7rem' }}
                      onClick={() => handleChannelSelect(ch)}
                      title={ch.desc}
                    >
                      {ch.name}
                    </button>
                  ))}
                </div>

                {/* Custom URL Input Bar */}
                <form onSubmit={handleFrame3Submit} className="input-group input-group-sm mb-1">
                  <span className="input-group-text bg-light border-beige text-danger">
                    <Youtube size={15} />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Paste any YouTube video URL or Channel with devotee crowds..."
                    value={frame3InputUrl}
                    onChange={(e) => setFrame3InputUrl(e.target.value)}
                  />
                  <button type="submit" className="btn btn-maroon text-gold fw-bold px-3">
                    Load URL
                  </button>
                </form>

                {frame3StatusMsg && (
                  <div className="text-success small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                    <CheckCircle size={12} /> {frame3StatusMsg}
                  </div>
                )}
              </div>

              {/* Frame 3 Footer Metadata */}
              <div className="d-flex justify-content-between align-items-center mt-2 text-muted small pt-1 border-top border-beige" style={{ fontSize: '0.75rem' }}>
                <span className="d-flex align-items-center gap-1 text-danger">
                  <CheckCircle size={13} className="text-danger" /> Real Devotees & Queue Footage
                </span>
                <span>Active: <strong>{selectedChannel.desc}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* FRAME 04: YOLO + OPENCV REAL-TIME PEOPLE COUNTER                      */}
        {/* ===================================================================== */}
        {(viewMode === 'quad' || viewMode === 'temple_yolo' || viewMode === 'yolo_opencv') && (
          <div className={viewMode === 'yolo_opencv' ? 'col-12' : 'col-lg-6 col-12'}>
            <div className="temple-card p-3 h-100 gold-glow border border-warning" style={{ background: '#FAF8F2' }}>
              {/* Frame 4 Header */}
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-beige flex-wrap gap-1">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary text-light fw-bold d-flex align-items-center gap-1 shadow-sm" style={{ fontSize: '0.72rem' }}>
                    <Cpu size={14} />
                    FRAME 04 • YOLO + OPENCV REAL DEVOTEE COUNTER
                  </span>
                  <span className="badge bg-maroon text-gold">YOLOv8n Active</span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-ivory text-primary border border-primary fw-bold" style={{ fontSize: '0.7rem' }}>
                    OpenCV cv2 DNN • Centroid Tracking
                  </span>
                  <button 
                    className="btn btn-outline-secondary btn-sm p-1" 
                    title="Capture YOLO+OpenCV Detection Snapshot"
                    onClick={() => handleTakeSnapshot('frame4')}
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>

              {/* Frame 4 Video Player */}
              <div 
                className="position-relative rounded overflow-hidden shadow-inner bg-dark d-flex align-items-center justify-content-center"
                style={{ 
                  minHeight: viewMode === 'yolo_opencv' ? '480px' : '340px', 
                  maxHeight: viewMode === 'yolo_opencv' ? '580px' : '390px', 
                  border: '2px solid #0284C7' 
                }}
              >
                <img 
                  ref={frame4ImgRef}
                  src={yoloOpencvStreamUrl} 
                  alt="YOLOv8 + OpenCV Real Devotee People Counter Live Stream"
                  className="img-fluid w-100 h-100 object-fit-contain"
                  style={{ minHeight: viewMode === 'yolo_opencv' ? '480px' : '340px', maxHeight: viewMode === 'yolo_opencv' ? '580px' : '390px' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='400' fill='%23111827'><rect width='100%' height='100%' fill='%230F172A'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%2338BDF8' font-size='15'>YOLOv8 + OpenCV Devotee Counter Ingesting...</text></svg>";
                  }}
                />

                {/* Top overlay badge */}
                <div className="position-absolute top-0 start-0 m-2 px-2 py-1 bg-dark bg-opacity-75 text-light rounded small fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.68rem', backdropFilter: 'blur(4px)' }}>
                  <Cpu size={12} className="text-info" /> YOLOv8n + OPENCV REAL-TIME HUD
                </div>

                {/* Bottom Source overlay tag */}
                <div className="position-absolute bottom-0 start-0 m-2 px-2 py-1 bg-dark bg-opacity-75 text-light rounded small d-flex align-items-center gap-1" style={{ fontSize: '0.68rem', backdropFilter: 'blur(4px)' }}>
                  <span>Devotee Pipeline: <strong>{frame4Source.replace(/_/g, ' ')}</strong></span>
                </div>

                {/* Live Count overlay pill */}
                <div 
                  className={`position-absolute bottom-0 end-0 m-2 px-3 py-1 rounded shadow-sm fw-bold d-flex align-items-center gap-1 ${isF4Congested ? 'bg-danger text-light' : isF4Moderate ? 'bg-warning text-dark' : 'bg-success text-light'}`}
                  style={{ fontSize: '0.78rem', backdropFilter: 'blur(4px)' }}
                >
                  <Users size={14} />
                  <span>COUNT: {f4Devotees} REAL DEVOTEES</span>
                </div>
              </div>

              {/* Frame 4 Source Control Bar */}
              <div className="mt-2 pt-1">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <small className="text-muted fw-bold" style={{ fontSize: '0.72rem' }}>
                    YOLO DETECTION INPUT FEED:
                  </small>
                  {frame4SuccessMsg && (
                    <span className="text-success small fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                      <CheckCircle size={12} /> {frame4SuccessMsg}
                    </span>
                  )}
                </div>

                <div className="btn-group btn-group-sm w-100 flex-wrap" role="group">
                  <button 
                    type="button" 
                    className={`btn btn-sm py-1 px-2 ${frame4Source === 'DEVOTEES_QUEUE' ? 'btn-maroon text-gold fw-bold' : 'btn-outline-secondary bg-white'}`}
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => handleFrame4SourceChange('DEVOTEES_QUEUE')}
                  >
                    👥 Queue Complex (17-25 Devotees)
                  </button>
                  <button 
                    type="button" 
                    className={`btn btn-sm py-1 px-2 ${frame4Source === 'TEMPLE_ENTRANCE' ? 'btn-maroon text-gold fw-bold' : 'btn-outline-secondary bg-white'}`}
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => handleFrame4SourceChange('TEMPLE_ENTRANCE')}
                  >
                    🛕 Temple Entrance Rush
                  </button>
                  <button 
                    type="button" 
                    className={`btn btn-sm py-1 px-2 ${frame4Source === 'GATE_RUSH' ? 'btn-maroon text-gold fw-bold' : 'btn-outline-secondary bg-white'}`}
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => handleFrame4SourceChange('GATE_RUSH')}
                  >
                    🚶 Gate Waiting Lines
                  </button>
                  <button 
                    type="button" 
                    className={`btn btn-sm py-1 px-2 ${frame4Source === 'YOUTUBE' ? 'btn-maroon text-gold fw-bold' : 'btn-outline-secondary bg-white'}`}
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => handleFrame4SourceChange('YOUTUBE')}
                  >
                    🔴 Frame 3 YouTube Link
                  </button>
                  <button 
                    type="button" 
                    className={`btn btn-sm py-1 px-2 ${frame4Source === 'CAMERA' ? 'btn-maroon text-gold fw-bold' : 'btn-outline-secondary bg-white'}`}
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => handleFrame4SourceChange('CAMERA')}
                  >
                    📹 Corridor ({selectedCamId})
                  </button>
                </div>
              </div>

              {/* Frame 4 Footer Metadata */}
              <div className="d-flex justify-content-between align-items-center mt-2 text-muted small pt-1 border-top border-beige" style={{ fontSize: '0.75rem' }}>
                <span className="d-flex align-items-center gap-1 text-primary">
                  <Sparkles size={13} className="text-gold" /> OpenCV Corner Brackets & Centroid Tripwires
                </span>
                <span>Latency: <strong>{frame4Analytics?.latency_ms || 13.8}ms</strong> • FPS: <strong>{frame4Analytics?.fps || 22.0}</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* REAL-TIME COMPARATIVE TELEMETRY & MULTI-HORIZON PREDICTIONS ROW          */}
      {/* ========================================================================= */}
      <div className="row g-3 mb-4">
        {/* Left: Real-Time Telemetry Stats Cards */}
        <div className="col-lg-7">
          <div className="temple-card p-3 h-100">
            <h6 className="fw-bold text-maroon mb-3 d-flex align-items-center gap-2">
              <Activity size={17} className="text-gold" /> Real-Time Telemetry Analytics ({selectedCamId})
            </h6>

            <div className="row g-2 text-center mb-3">
              <div className="col-3">
                <div className="p-2 rounded bg-ivory border border-beige">
                  <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>PEOPLE IN FRAME</small>
                  <h3 className={`fw-bold m-0 ${isCongested ? 'text-danger' : isModerate ? 'text-warning' : 'text-maroon'}`}>
                    {analytics?.person_count || 0}
                  </h3>
                  <small className="text-muted" style={{ fontSize: '0.65rem' }}>/ {analytics?.capacity} cap</small>
                </div>
              </div>

              <div className="col-3">
                <div className="p-2 rounded bg-ivory border border-beige">
                  <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>ENTRY FLOW</small>
                  <h3 className="fw-bold text-primary m-0">{analytics?.entry_rate || 0}</h3>
                  <small className="text-muted" style={{ fontSize: '0.65rem' }}>devotees/min</small>
                </div>
              </div>

              <div className="col-3">
                <div className="p-2 rounded bg-ivory border border-beige">
                  <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>EXIT FLOW</small>
                  <h3 className="fw-bold text-warning m-0">{analytics?.exit_rate || 0}</h3>
                  <small className="text-muted" style={{ fontSize: '0.65rem' }}>devotees/min</small>
                </div>
              </div>

              <div className="col-3">
                <div className="p-2 rounded bg-ivory border border-beige">
                  <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>RISK LEVEL</small>
                  <h3 className={`fw-bold m-0 ${analytics?.risk_level === 'CRITICAL' ? 'text-danger' : analytics?.risk_level === 'HIGH' ? 'text-warning' : 'text-success'}`}>
                    {analytics?.risk_level || 'LOW'}
                  </h3>
                  <small className="text-muted" style={{ fontSize: '0.65rem' }}>{analytics?.density_percent}% load</small>
                </div>
              </div>
            </div>

            {/* Density Meter */}
            <div className="mb-2">
              <div className="d-flex justify-content-between small mb-1">
                <span className="text-muted">Zone Capacity Saturation</span>
                <strong className={analytics?.density_percent > 80 ? 'text-danger' : analytics?.density_percent > 65 ? 'text-warning' : 'text-success'}>
                  {analytics?.density_percent}% ({analytics?.risk_level})
                </strong>
              </div>
              <div className="progress" style={{ height: '10px' }}>
                <div 
                  className={`progress-bar ${analytics?.density_percent > 80 ? 'bg-danger' : analytics?.density_percent > 65 ? 'bg-warning' : 'bg-success'}`}
                  style={{ width: `${analytics?.density_percent}%` }}
                ></div>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center pt-2 border-top border-beige text-muted small" style={{ fontSize: '0.75rem' }}>
              <span>Zone: <strong>{analytics?.zone_code}</strong></span>
              <span>Corridor: <strong>{analytics?.name}</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Multi-Horizon ML Predictions */}
        <div className="col-lg-5">
          <div className="temple-card p-3 gold-glow h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold text-maroon m-0 d-flex align-items-center gap-1">
                  <Sparkles size={16} className="text-gold" /> AI Multi-Horizon Crowd Forecasts
                </h6>
                <span className="badge bg-ivory border border-gold text-maroon" style={{ fontSize: '0.68rem' }}>
                  +15m • +30m • +60m
                </span>
              </div>

              <div className="row g-2 mb-2">
                {(predictions?.horizons || [
                  { horizon_label: '+15 min', predicted_crowd: 310, predicted_risk: 'LOW', estimated_wait_min: 14.5 },
                  { horizon_label: '+30 min', predicted_crowd: 390, predicted_risk: 'MODERATE', estimated_wait_min: 22.0 },
                  { horizon_label: '+60 min', predicted_crowd: 520, predicted_risk: 'HIGH', estimated_wait_min: 36.5 }
                ]).map((h, i) => (
                  <div className="col-4" key={i}>
                    <div className="p-2 rounded bg-ivory border border-beige text-center">
                      <span className="badge bg-maroon text-gold mb-1" style={{ fontSize: '0.65rem' }}>{h.horizon_label}</span>
                      <h5 className="fw-bold text-dark-brown m-0">{h.predicted_crowd}</h5>
                      <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>{h.estimated_wait_min}m wait</small>
                      <span className={`badge mt-1 ${h.predicted_risk === 'CRITICAL' ? 'bg-danger' : h.predicted_risk === 'HIGH' ? 'bg-warning text-dark' : 'bg-success'}`} style={{ fontSize: '0.62rem' }}>
                        {h.predicted_risk}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 rounded bg-white border border-beige small text-dark-brown fst-italic mb-2">
                "{predictions?.ai_recommendation || 'Continuous YOLO detection active across corridors. Maintain current gate throughput.'}"
              </div>
            </div>

            <button 
              onClick={() => navigate('/simulation')} 
              className="btn btn-maroon text-gold btn-sm fw-bold w-100 py-2 d-flex align-items-center justify-content-center gap-1 shadow-sm"
            >
              <PlayCircle size={15} /> Open Simulation with Live Telemetry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrowdMonitoring;
