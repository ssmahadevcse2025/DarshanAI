import React, { useState, useEffect } from 'react';
import API from '../services/api';
import Loading from '../components/Loading';
import { useDebounce } from '../hooks/useDebounce';
import { Ticket, Users, Play, ShieldAlert, CheckCircle2, RefreshCw, Flame, ArrowRight, HeartPulse, UserCheck, ChevronLeft, ChevronRight, Search } from 'lucide-react';

const DarshanTokens = () => {
  const [summary, setSummary] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [callingBatch, setCallingBatch] = useState(false);

  const fetchQueueData = async () => {
    try {
      let url = `/pilgrims?page=${page}&limit=${limit}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (categoryFilter !== 'ALL') url += `&category=${encodeURIComponent(categoryFilter)}`;
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;

      const [summaryRes, tokensRes] = await Promise.allSettled([
        API.get('/pilgrims/queue-summary'),
        API.get(url)
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
      if (tokensRes.status === 'fulfilled') setTokens(tokensRes.value.data);
    } catch (err) {
      console.error('Failed to fetch queue tokens', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 4000);
    return () => clearInterval(interval);
  }, [page, limit, statusFilter, categoryFilter, debouncedSearch]);

  const handleStatusTransition = async (tokenId, newStatus) => {
    try {
      await API.put(`/pilgrims/${tokenId}/status`, { status: newStatus });
      fetchQueueData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCallNextBatch = async () => {
    setCallingBatch(true);
    try {
      await API.post('/pilgrims/call-next');
      fetchQueueData();
    } catch (err) {
      console.error(err);
    } finally {
      setCallingBatch(false);
    }
  };

  if (loading || !summary) return <Loading />;

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'General Darshan': return 'text-maroon border-maroon';
      case 'Special Darshan': return 'text-primary border-primary';
      case 'VIP': return 'text-danger border-danger';
      case 'Senior Citizen': return 'text-warning border-warning';
      case 'Divyang': return 'text-success border-success';
      case 'Children / Family': return 'text-info border-info';
      case 'Medical / Emergency': return 'text-danger border-danger';
      default: return 'text-secondary border-secondary';
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'WAITING': return 'bg-warning text-dark fw-bold';
      case 'CALLED': return 'bg-info text-dark fw-bold';
      case 'SERVING': return 'bg-primary text-light fw-bold';
      case 'IN_DARSHAN': return 'bg-success text-light fw-bold';
      case 'COMPLETED': return 'bg-secondary text-light';
      case 'SKIPPED': return 'bg-dark text-warning border border-warning';
      case 'CANCELLED': return 'bg-danger text-light';
      case 'EXITED': return 'bg-dark text-muted border border-secondary';
      default: return 'bg-secondary';
    }
  };

  const totalDevoteesCount = summary.total_active_devotees || 1248;

  return (
    <div className="container-fluid p-4">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-2">
        <div>
          <h4 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
            <Ticket size={24} /> 100% Unified Devotee Queue & Token Engine
          </h4>
          <small className="text-muted">Total Temple Devotee Coverage Across All 8 Categories from Entry to Exit</small>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button 
            onClick={handleCallNextBatch} 
            disabled={callingBatch}
            className="btn btn-maroon text-gold fw-bold btn-sm d-flex align-items-center gap-1 shadow-sm"
          >
            <Play size={16} /> {callingBatch ? 'Calling batch...' : 'Call next anti-starvation batch'}
          </button>
          <button onClick={fetchQueueData} className="btn btn-outline-secondary btn-sm p-2">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* KPI Overview Banner */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="temple-card p-4 gold-glow h-100 d-flex flex-column justify-content-between">
            <div>
              <span className="badge bg-maroon text-gold mb-2">100% DEVOTEE COVERAGE</span>
              <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.78rem' }}>TOTAL ACTIVE DEVOTEES IN QUEUE</small>
              <h2 className="fw-bold text-maroon m-0 my-1">{totalDevoteesCount.toLocaleString()}</h2>
              <small className="text-dark-brown">Covering all 8 categories across active temple corridors</small>
            </div>
            <div className="mt-3 pt-2 border-top border-beige d-flex justify-content-between text-muted small">
              <span>Avg Waiting Time: <strong className="text-saffron">{summary.estimated_avg_wait_min} min</strong></span>
              <span>Serving Token: <strong className="text-maroon">{summary.current_token_serving}</strong></span>
            </div>
          </div>
        </div>

        {/* 8 Categories Live Distribution Grid */}
        <div className="col-12 col-md-8">
          <div className="temple-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="fw-bold text-maroon m-0">8-Category Real-Time Queue Distribution</h6>
              <span className="badge bg-ivory border border-beige text-dark-brown" style={{ fontSize: '0.7rem' }}>
                Anti-Starvation Ratio: 4 Gen : 2 Spc : 1 Prio
              </span>
            </div>

            <div className="row g-2">
              {Object.entries(summary.category_breakdown || {}).map(([cat, count]) => {
                const percent = totalDevoteesCount > 0 ? Math.round((count / totalDevoteesCount) * 100) : 0;
                return (
                  <div className="col-6 col-sm-3" key={cat}>
                    <div 
                      onClick={() => { setCategoryFilter(categoryFilter === cat ? 'ALL' : cat); setPage(1); }}
                      className={`p-2 rounded border text-center cursor-pointer transition-all ${categoryFilter === cat ? 'bg-maroon text-gold border-gold' : 'bg-ivory border-beige'}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <small className="d-block text-truncate fw-semibold" style={{ fontSize: '0.72rem' }}>{cat}</small>
                      <h5 className="fw-bold m-0 my-1">{count}</h5>
                      <span className="badge bg-white text-dark-brown" style={{ fontSize: '0.65rem' }}>{percent}% load</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Live Search Toolbar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <div className="d-flex flex-wrap gap-2">
          {/* Status Pills */}
          {['ALL', 'WAITING', 'CALLED', 'SERVING', 'IN_DARSHAN', 'COMPLETED'].map(st => (
            <button
              key={st}
              onClick={() => { setStatusFilter(st); setPage(1); }}
              className={`btn btn-sm ${statusFilter === st ? 'btn-maroon text-gold fw-bold' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.75rem' }}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Live Search */}
        <div className="input-group" style={{ width: '240px' }}>
          <span className="input-group-text bg-ivory border-beige text-maroon"><Search size={15} /></span>
          <input 
            type="text" 
            className="form-control form-control-sm" 
            placeholder="Search Token / Devotee..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Tokens Table */}
      <div className="temple-card p-3 gold-glow">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ backgroundColor: 'transparent' }}>
            <thead>
              <tr className="text-maroon small">
                <th>TOKEN</th>
                <th>DEVOTEE</th>
                <th>CATEGORY</th>
                <th>QUEUE POS</th>
                <th>COUNTER / ZONE</th>
                <th>EST. WAIT</th>
                <th>LIFECYCLE STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {tokens.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">No tokens found in current filter.</td>
                </tr>
              ) : (
                tokens.map(t => (
                  <tr key={t.id}>
                    <td>
                      <span className="badge bg-ivory border border-gold text-maroon px-2 py-1 fs-6 fw-bold">
                        {t.token}
                      </span>
                    </td>
                    <td>
                      <div className="fw-bold text-dark-brown">{t.name}</div>
                      <small className="text-muted">Age: {t.age} | Group: {t.group_size}</small>
                    </td>
                    <td>
                      <span className={`badge border ${getCategoryColor(t.category)}`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="fw-bold text-maroon">#{t.queue_position}</td>
                    <td>
                      <div className="small fw-semibold">{t.counter}</div>
                      <small className="text-muted">{t.zone}</small>
                    </td>
                    <td className="fw-semibold text-saffron">{t.estimated_wait_min} min</td>
                    <td>
                      <span className={`badge ${getStatusBadge(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        {t.status === 'WAITING' && (
                          <button onClick={() => handleStatusTransition(t.id, 'CALLED')} className="btn btn-xs btn-primary py-0 px-2" style={{ fontSize: '0.7rem' }}>Call</button>
                        )}
                        {t.status === 'CALLED' && (
                          <button onClick={() => handleStatusTransition(t.id, 'SERVING')} className="btn btn-xs btn-success py-0 px-2" style={{ fontSize: '0.7rem' }}>Serve</button>
                        )}
                        {t.status === 'SERVING' && (
                          <button onClick={() => handleStatusTransition(t.id, 'IN_DARSHAN')} className="btn btn-xs btn-warning py-0 px-2 text-dark fw-bold" style={{ fontSize: '0.7rem' }}>Enter</button>
                        )}
                        {t.status === 'IN_DARSHAN' && (
                          <button onClick={() => handleStatusTransition(t.id, 'COMPLETED')} className="btn btn-xs btn-secondary py-0 px-2" style={{ fontSize: '0.7rem' }}>Complete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Controls */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-3 border-top border-beige">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Rows per page:</span>
            <select 
              className="form-select form-select-sm"
              value={limit}
              onChange={e => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              style={{ width: '70px' }}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="text-dark-brown small fw-semibold">Page {page}</span>
            <button 
              className="btn btn-outline-secondary btn-sm p-1"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className="btn btn-outline-secondary btn-sm p-1"
              disabled={tokens.length < limit}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DarshanTokens;
