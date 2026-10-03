import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SidebarContext } from '../context/SidebarContext';
import { Menu, Bell, Radio, UserCheck, Clock, Building, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const Topbar = () => {
  const { user } = useContext(AuthContext);
  const { isCollapsed, toggleSidebar } = useContext(SidebarContext);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const templeName = user?.temple_name || 'Sri Somnath Jyotirlinga Temple';
  const templeId = user?.temple_id || 'TEMPLE-001';

  return (
    <header className="navbar px-3 px-md-4 py-2 border-bottom border-beige d-flex justify-content-between align-items-center sticky-top" style={{ backgroundColor: '#FFFFFF', zIndex: 1020 }}>
      {/* Left: Sidebar Open/Close Toggle & Active Temple */}
      <div className="d-flex align-items-center gap-2 gap-md-3">
        {/* Open / Close Sidebar Toggle Button */}
        <button 
          onClick={toggleSidebar}
          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 border-beige text-dark-brown shadow-sm"
          title={isCollapsed ? "Expand sidebar (Open)" : "Collapse sidebar (Close)"}
          style={{ backgroundColor: '#FDFBF7' }}
        >
          {isCollapsed ? (
            <PanelLeftOpen size={18} className="text-maroon" />
          ) : (
            <PanelLeftClose size={18} className="text-maroon" />
          )}
          <span className="d-none d-sm-inline fw-semibold text-maroon" style={{ fontSize: '0.82rem' }}>
            {isCollapsed ? 'Open Sidebar' : 'Close Sidebar'}
          </span>
        </button>

        <div className="d-flex align-items-center gap-2 ps-2 border-start border-beige">
          <Building size={19} className="text-maroon flex-shrink-0" />
          <div className="text-truncate" style={{ maxWidth: '240px' }}>
            <div className="fw-bold text-maroon text-truncate" style={{ fontSize: '0.90rem' }}>
              {templeName}
            </div>
            <div className="text-gold" style={{ fontSize: '0.72rem' }}>
              Temple ID: <span className="fw-bold text-dark-brown">{templeId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Notifications, System Status, User Avatar */}
      <div className="d-flex align-items-center gap-2 gap-md-3">
        {/* System Online Status */}
        <div className="badge bg-success bg-opacity-10 text-success border border-success px-2 px-md-3 py-1 d-flex align-items-center gap-1 fw-bold">
          <Radio size={13} className="text-success" />
          <span className="d-none d-sm-inline">System Online</span>
          <span className="d-sm-none">Online</span>
        </div>

        {/* Notifications */}
        <button className="btn btn-outline-secondary btn-sm position-relative text-maroon border-beige p-2" title="Alerts & Notifications">
          <Bell size={17} />
          <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
            <span className="visually-hidden">New alerts</span>
          </span>
        </button>

        {/* Live Clock */}
        <div className="d-none d-lg-flex align-items-center gap-2 text-maroon fw-mono ms-1">
          <Clock size={15} />
          <span className="fw-bold" style={{ fontSize: '0.85rem' }}>{timeStr}</span>
        </div>

        {/* User Profile */}
        <div className="d-flex align-items-center gap-2 ps-2 ps-md-3 border-start border-beige">
          <div className="p-2 bg-maroon rounded-circle text-gold border border-gold d-flex align-items-center justify-content-center" style={{ width: '34px', height: '34px' }}>
            <UserCheck size={17} />
          </div>
          <div className="d-none d-md-block text-end">
            <div className="fw-bold text-dark-brown text-truncate" style={{ fontSize: '0.80rem', maxWidth: '120px' }}>
              {user?.full_name?.split(' ')[0] || 'Admin'}
            </div>
            <div className="text-gold fw-semibold" style={{ fontSize: '0.68rem' }}>{user?.role || 'ADMIN'}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
