import React, { useState, useEffect } from 'react';
import API from '../services/api';
import Loading from '../components/Loading';
import { Ticket, Play, Pause, RefreshCw, Shuffle, Users, CheckCircle, ArrowRight, UserCheck, ShieldAlert } from 'lucide-react';

const QueueManagement = () => {
  const [summary, setSummary] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [redirectSource, setRedirectSource] = useState('Main Queue');
  const [redirectTarget, setRedirectTarget] = useState('North Queue');

  const [counters, setCounters] = useState([
    { id: 1, name: 'Counter 1', staff: 'Suresh Patel', current: 'TKN-GEN-0104', queueLength: 450, status: 'ACTIVE' },
    { id: 2, name: 'Counter 2', staff: 'Amit Verma', current: 'TKN-GEN-0105', queueLength: 360, status: 'ACTIVE' },
    { id: 3, name: 'Counter 3', staff: 'Rajesh Kumar', current: 'TKN-SPC-0102', queueLength: 180, status: 'ACTIVE' },
    { id: 4, name: 'Counter 4', staff: 'Dr. Ananya Sharma', current: 'TKN-DIV-0005', queueLength: 40, status: 'ACTIVE' },
    { id: 5, name: 'Counter 5', staff: 'Vikram Singh', current: 'TKN-SNR-0018', queueLength: 75, status: 'ACTIVE' },
    { id: 6, name: 'Counter 6 (VIP)', staff: 'Temple Admin Lead', current: 'TKN-VIP-0012', queueLength: 15, status: 'ACTIVE' }
  ]);

  const fetchQueueData = async () => {
    try {
      const [sumRes, listRes] = await Promise.allSettled([
        API.get('/pilgrims/queue-summary'),
        API.get('/pilgrims')
      ]);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
      if (listRes.status === 'fulfilled') setTokens(listRes.value.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleCounterStatus = (id) => {
    setCounters(counters.map(c => {
      if (c.id === id) {
        return { ...c, status: c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' };
      }
      return c;
    }));
  };

  const handleCallNext = async (counterName) => {
    try {
      await API.post('/pilgrims/call-next');
      fetchQueueData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRedirectSubmit = (e) => {
    e.preventDefault();
    setShowRedirectModal(false);
    fetchQueueData();
  };

  if (loading || !summary) return <Loading />;

  const activeDevoteesCount = summary.total_active_devotees || 1248;

  return (
    <div className="container-fluid p-4">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-2">
        <div>
          <h4 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
            <Ticket size={24} /> Queue management
          </h4>
          <small className="text-muted">Unified Queue Engine covering 100% of temple devotees with counter management & queue redirection</small>
        </div>

        <div className="d-flex gap-2">
          <button onClick={() => setShowRedirectModal(true)} className="btn btn-warning text-dark fw-bold btn-sm d-flex align-items-center gap-1">
            <Shuffle size={16} /> Redirect queue flow
          </button>
          <button onClick={fetchQueueData} className="btn btn-outline-secondary btn-sm p-2">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Devotee Consistency Flow Bar */}
      <div className="row g-3 mb-4 text-center">
        <div className="col-6 col-md-2">
          <div className="temple-card p-3">
            <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.72rem' }}>REGISTERED TODAY</small>
            <h4 className="fw-bold text-maroon m-0">12,450</h4>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="temple-card p-3">
            <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.72rem' }}>CURRENTLY INSIDE</small>
            <h4 className="fw-bold text-primary m-0">4,820</h4>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="temple-card p-3 gold-glow">
            <small className="text-maroon d-block fw-bold" style={{ fontSize: '0.72rem' }}>CURRENTLY WAITING</small>
            <h4 className="fw-bold text-maroon m-0">{activeDevoteesCount.toLocaleString()}</h4>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="temple-card p-3">
            <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.72rem' }}>IN DARSHAN</small>
            <h4 className="fw-bold text-warning m-0">820</h4>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="temple-card p-3">
            <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.72rem' }}>DARSHAN COMPLETED</small>
            <h4 className="fw-bold text-success m-0">6,740</h4>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="temple-card p-3">
            <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.72rem' }}>EXITED</small>
            <h4 className="fw-bold text-muted m-0">5,980</h4>
          </div>
        </div>
      </div>

      {/* Counter Management Grid */}
      <h6 className="fw-bold text-maroon mb-3">Counter Allocation & Control Panel</h6>
      <div className="row g-3 mb-4">
        {counters.map(c => (
          <div className="col-md-6 col-lg-4" key={c.id}>
            <div className="temple-card p-3 gold-glow">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-maroon">{c.name}</span>
                <span className={`badge ${c.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                  {c.status}
                </span>
              </div>

              <div className="p-2 rounded bg-ivory border border-beige mb-2" style={{ fontSize: '0.8rem' }}>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Staff:</span>
                  <span className="fw-semibold text-dark-brown">{c.staff}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Serving:</span>
                  <span className="fw-bold text-maroon">{c.current}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Queue Load:</span>
                  <span className="fw-bold text-saffron">{c.queueLength} devotees</span>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button 
                  onClick={() => toggleCounterStatus(c.id)} 
                  className={`btn btn-xs ${c.status === 'ACTIVE' ? 'btn-outline-secondary' : 'btn-success'}`}
                  style={{ fontSize: '0.75rem' }}
                >
                  {c.status === 'ACTIVE' ? 'Pause counter' : 'Open counter'}
                </button>
                <button 
                  onClick={() => handleCallNext(c.name)} 
                  className="btn btn-xs btn-maroon text-gold fw-bold"
                  style={{ fontSize: '0.75rem' }}
                >
                  Call next token
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Unified Queue Stream Table */}
      <div className="temple-card p-4">
        <h6 className="fw-bold text-maroon mb-3">Active Devotee Queue Stream</h6>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ backgroundColor: 'transparent' }}>
            <thead>
              <tr className="text-maroon small">
                <th>TOKEN NO</th>
                <th>DEVOTEE NAME</th>
                <th>CATEGORY</th>
                <th>POS</th>
                <th>ASSIGNED COUNTER</th>
                <th>EST. WAIT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map(t => (
                <tr key={t.id}>
                  <td><span className="badge bg-ivory border border-gold text-maroon px-2 py-1 fs-6 fw-bold">{t.token}</span></td>
                  <td className="fw-semibold text-dark-brown">{t.name}</td>
                  <td><span className="badge bg-maroon text-gold">{t.category}</span></td>
                  <td className="fw-bold text-maroon">#{t.queue_position}</td>
                  <td>{t.counter}</td>
                  <td className="fw-semibold text-saffron">{t.estimated_wait_min} min</td>
                  <td><span className="badge bg-success">{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Queue Redirection Modal */}
      {showRedirectModal && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content temple-card border-gold">
              <div className="modal-header border-beige">
                <h5 className="modal-title text-maroon fw-bold">Queue Redirection Control</h5>
                <button type="button" className="btn-close" onClick={() => setShowRedirectModal(false)}></button>
              </div>
              <form onSubmit={handleRedirectSubmit}>
                <div className="modal-body">
                  <p className="text-muted small mb-3">
                    Redirect devotee flow dynamically between temple corridors and counters to reduce bottleneck risk.
                  </p>

                  <div className="mb-3">
                    <label className="form-label text-dark-brown small fw-bold">Source Queue / Counter</label>
                    <select className="form-select" value={redirectSource} onChange={e => setRedirectSource(e.target.value)}>
                      <option value="Main Queue">Main Queue Complex</option>
                      <option value="Counter 1">Counter 1 (Overflow)</option>
                      <option value="Counter 2">Counter 2 (Overflow)</option>
                      <option value="South Corridor">South Corridor</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-dark-brown small fw-bold">Target Redirect Queue / Counter</label>
                    <select className="form-select" value={redirectTarget} onChange={e => setRedirectTarget(e.target.value)}>
                      <option value="North Queue">North Queue Complex</option>
                      <option value="Counter 3">Counter 3 (Special Queue)</option>
                      <option value="Counter 5">Counter 5 (Backup Counter)</option>
                      <option value="Express Corridor">Express Corridor</option>
                    </select>
                  </div>

                  <div className="p-3 rounded bg-ivory border border-gold">
                    <small className="text-muted d-block">ESTIMATED IMPACT</small>
                    <div className="fw-bold text-success">Expected Waiting Time: 52 min → 34 min (-34% reduction)</div>
                  </div>
                </div>
                <div className="modal-footer border-beige">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowRedirectModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-warning text-dark fw-bold">Confirm Queue Redirection</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueManagement;
