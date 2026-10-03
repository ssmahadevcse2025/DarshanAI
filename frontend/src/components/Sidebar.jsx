import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SidebarContext } from '../context/SidebarContext';
import DarshanLogo from './DarshanLogo';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  ShieldAlert, 
  Activity, 
  PlayCircle, 
  Map, 
  Cpu, 
  UserCheck, 
  Building2, 
  Settings,
  Ticket,
  UserCog,
  FileSpreadsheet,
  LogOut,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const { isCollapsed, isMobileOpen, toggleSidebar, closeMobileSidebar } = useContext(SidebarContext);
  const role = user?.role || 'VOLUNTEER';

  const templeName = user?.temple_name || 'Sri Somnath Jyotirlinga Temple';
  const templeCity = user?.temple_id === 'TEMPLE-001' ? 'Somnath, GJ' : 'Chennai, TN';

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'SECURITY', 'MEDICAL', 'RECEPTIONIST', 'VOLUNTEER'] },
    { path: '/devotee-registration', label: 'Devotee registration', icon: UserPlus, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'RECEPTIONIST'] },
    { path: '/queue-management', label: 'Queue management', icon: Ticket, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'RECEPTIONIST'] },
    { path: '/crowd-monitoring', label: 'Crowd monitoring', icon: Activity, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'SECURITY', 'VOLUNTEER'] },
    { path: '/predictions', label: 'AI predictions', icon: TrendingUp, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER'] },
    { path: '/risk-analysis', label: 'Risk analysis', icon: ShieldAlert, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'SECURITY', 'MEDICAL'] },
    { path: '/temple-map', label: 'Temple map', icon: Map, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'SECURITY', 'MEDICAL', 'VOLUNTEER'] },
    { path: '/simulation', label: 'Live simulation', icon: PlayCircle, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER'] },
    { path: '/model-performance', label: 'ML analytics', icon: Cpu, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER'] },
    { path: '/pilgrims', label: 'Devotee directory', icon: UserCheck, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'RECEPTIONIST'] },
    { path: '/staff', label: 'Staff & volunteers', icon: UserCog, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER'] },
    { path: '/alerts', label: 'Alerts', icon: ShieldAlert, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'SECURITY'] },
    { path: '/reports', label: 'Reports', icon: FileSpreadsheet, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER'] },
    { path: '/users', label: 'User directory', icon: Users, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN'] },
    { path: '/temples-management', label: 'Temple platform', icon: Building2, roles: ['SUPER_ADMIN'] },
    { path: '/settings', label: 'Temple settings', icon: Settings, roles: ['SUPER_ADMIN', 'TEMPLE_ADMIN'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(role));

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-md-none" 
          style={{ zIndex: 1040 }}
          onClick={closeMobileSidebar}
        />
      )}

      {/* Main Sidebar Container */}
      <aside 
        className={`d-flex flex-column flex-shrink-0 border-end transition-sidebar ${
          isMobileOpen ? 'mobile-sidebar-open' : 'mobile-sidebar-closed'
        }`} 
        style={{ 
          width: isCollapsed ? '76px' : '265px', 
          minHeight: '100vh', 
          height: '100vh',
          backgroundColor: '#FFFFFF', 
          borderColor: '#E0D5C7',
          position: 'sticky',
          top: 0,
          zIndex: 1045,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Brand Header with Open/Close Toggle */}
        <div className={`d-flex align-items-center justify-content-between p-3 border-bottom border-beige ${isCollapsed ? 'px-2 justify-content-center flex-column gap-2' : ''}`}>
          <div className="d-flex align-items-center overflow-hidden text-decoration-none">
            <DarshanLogo size={isCollapsed ? 32 : 36} className={isCollapsed ? '' : 'me-2 flex-shrink-0'} />
            {!isCollapsed && (
              <div className="text-truncate">
                <h5 className="m-0 fw-bold text-maroon" style={{ letterSpacing: '0.3px', fontFamily: 'Segoe UI, sans-serif' }}>DarshanAI</h5>
                <small className="text-saffron fw-semibold" style={{ fontSize: '0.70rem', letterSpacing: '0.5px' }}>Temple Intelligence</small>
              </div>
            )}
          </div>

          {/* Desktop & Mobile Collapse / Close Toggle Button */}
          <div className="d-flex align-items-center">
            {/* Mobile Close X Button */}
            <button 
              onClick={closeMobileSidebar}
              className="btn btn-outline-secondary btn-sm p-1 border-0 d-md-none text-maroon"
              title="Close menu"
            >
              <X size={20} />
            </button>

            {/* Desktop Collapse / Expand Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="btn btn-outline-secondary btn-sm p-1 rounded-circle border-beige d-none d-md-flex align-items-center justify-content-center"
              style={{ width: '28px', height: '28px', backgroundColor: '#F9F6F0' }}
              title={isCollapsed ? "Expand sidebar (Open)" : "Collapse sidebar (Close)"}
            >
              {isCollapsed ? (
                <ChevronRight size={16} className="text-maroon" />
              ) : (
                <ChevronLeft size={16} className="text-maroon" />
              )}
            </button>
          </div>
        </div>

        {/* Temple Tenant Info Badge (Hidden when Collapsed) */}
        {!isCollapsed ? (
          <div className="p-2 mx-3 mt-3 rounded bg-ivory border border-beige">
            <div className="fw-bold text-dark-brown text-truncate" style={{ fontSize: '0.82rem' }}>{templeName}</div>
            <div className="text-gold small d-flex justify-content-between mt-1" style={{ fontSize: '0.72rem' }}>
              <span className="text-muted">{templeCity}</span>
              <span className="fw-bold text-maroon">ID: {user?.temple_id || 'TEMPLE-001'}</span>
            </div>
          </div>
        ) : (
          <div className="text-center my-2">
            <span className="badge bg-ivory border border-beige text-maroon fw-bold" style={{ fontSize: '0.62rem' }}>
              {user?.temple_id ? user.temple_id.replace('TEMPLE-', 'T-') : 'T-001'}
            </span>
          </div>
        )}

        {/* Navigation List */}
        <ul 
          className="nav nav-pills flex-column mb-auto mt-2 overflow-auto px-2 pe-1 flex-grow-1" 
          style={{ scrollbarWidth: 'thin' }}
        >
          {filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <li className="nav-item mb-1" key={item.path}>
                <NavLink 
                  to={item.path} 
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      closeMobileSidebar();
                    }
                  }}
                  className={({ isActive }) => `nav-link d-flex align-items-center rounded ${
                    isCollapsed ? 'justify-content-center p-2' : 'gap-3 py-2 px-3'
                  } ${isActive ? 'bg-maroon text-gold fw-bold shadow-sm' : 'text-dark-brown hover-overlay'}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={19} className={isCollapsed ? 'text-gold' : 'text-gold flex-shrink-0'} />
                  {!isCollapsed && (
                    <span className="text-truncate" style={{ fontSize: '0.86rem' }}>{item.label}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>

        <hr className="border-beige my-2 mx-2" />

        {/* Profile & Logout Footer */}
        <div className={`p-2 border-top border-beige d-flex align-items-center ${isCollapsed ? 'justify-content-center flex-column gap-2' : 'justify-content-between px-3'}`}>
          {!isCollapsed ? (
            <div className="text-truncate" style={{ maxWidth: '170px' }}>
              <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>LOGGED IN AS</small>
              <span className="fw-bold text-maroon text-truncate d-inline-block" style={{ fontSize: '0.80rem', maxWidth: '110px' }}>
                {user?.full_name?.split(' ')[0] || 'Admin'}
              </span>
              <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.62rem' }}>{role}</span>
            </div>
          ) : (
            <div 
              className="badge bg-warning text-dark p-1" 
              style={{ fontSize: '0.60rem' }}
              title={`Logged in as ${user?.full_name || 'Admin'} (${role})`}
            >
              {role.substring(0, 3)}
            </div>
          )}

          <button 
            onClick={logout} 
            className="btn btn-outline-danger btn-sm p-1 px-2 d-flex align-items-center justify-content-center" 
            title="Log Out"
            style={{ minWidth: '32px', height: '32px' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
