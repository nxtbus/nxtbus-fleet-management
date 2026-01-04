import { useState, useEffect } from 'react';
import OwnerDashboard from './components/OwnerDashboard';
import FleetTracking from './components/FleetTracking';
import DelayAlerts from './components/DelayAlerts';
import DriverBusDetails from './components/DriverBusDetails';
import SpeedMonitoring from './components/SpeedMonitoring';
import DepartureArrivalAlerts from './components/DepartureArrivalAlerts';
import StopAnalytics from './components/StopAnalytics';
import OwnerCallAlerts from './components/CallAlerts';
import { loginOwner, getCurrentOwner, logoutOwner } from './services/ownerAuth';
import Logo from '../components/Logo';
import './owner.css';

const screens = {
  dashboard: OwnerDashboard,
  tracking: FleetTracking,
  delays: DelayAlerts,
  callAlerts: OwnerCallAlerts,
  fleet: DriverBusDetails,
  speed: SpeedMonitoring,
  timing: DepartureArrivalAlerts,
  analytics: StopAnalytics
};

function OwnerApp() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentOwner, setCurrentOwnerState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login form state
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const savedOwner = getCurrentOwner();
    if (savedOwner) {
      setCurrentOwnerState(savedOwner);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const result = await loginOwner(phone, pin);
      if (result.success) {
        setCurrentOwnerState(result.owner);
        setPhone('');
        setPin('');
      } else {
        setLoginError(result.message);
      }
    } catch (err) {
      setLoginError('Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    logoutOwner();
    setCurrentOwnerState(null);
    setCurrentScreen('dashboard');
  };

  const CurrentComponent = screens[currentScreen];

  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'tracking', icon: '📍', label: 'Live Tracking' },
    { id: 'delays', icon: '⚠️', label: 'Delay Alerts' },
    { id: 'callAlerts', icon: '📞', label: 'Call Alerts' },
    { id: 'fleet', icon: '🚌', label: 'Fleet & Drivers' },
    { id: 'speed', icon: '⚡', label: 'Speed Monitor' },
    { id: 'timing', icon: '⏰', label: 'Timing Alerts' },
    { id: 'analytics', icon: '📈', label: 'Stop Analytics' }
  ];

  // Show loading state
  if (loading) {
    return (
      <div className="owner-app busway-owner">
        <div className="owner-login-container">
          <div className="login-card">
            <div className="login-header">
              <Logo size="large" variant="login" showText={false} />
              <span>Owner Portal</span>
            </div>
            <div className="login-loading">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  // Show login form if not logged in
  if (!currentOwner) {
    return (
      <div className="owner-app busway-owner">
        <div className="owner-login-container">
          <div className="login-card">
            <div className="login-header">
              <Logo size="large" variant="login" showText={false} />
              <span>Owner Portal</span>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <h2>Owner Login</h2>

              {loginError && (
                <div className="login-error">{loginError}</div>
              )}

              <div className="input-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                  required
                />
              </div>

              <div className="input-group">
                <label>PIN</label>
                <input
                  type="password"
                  placeholder="Enter 4-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={4}
                  required
                />
              </div>

              <button type="submit" className="login-btn" disabled={loginLoading}>
                {loginLoading ? '🔄 Logging in...' : '🔐 Login'}
              </button>
            </form>

            <div className="demo-credentials">
              <p><strong>Demo Credentials:</strong></p>
              <p>Phone: 9876500001 | PIN: 1234</p>
            </div>

            <div className="login-footer">
              <a href="/">← Back to App</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-app busway-owner">
      <aside className={`owner-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            <span>Owner Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentScreen === item.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentScreen(item.id);
                // Close sidebar on mobile after selection
                if (window.innerWidth <= 768) {
                  setSidebarOpen(false);
                }
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a href="/">← Back to App</a>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="owner-main">
        <header className="owner-header">
          <div className="header-left">
            <button 
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <h2>{menuItems.find(m => m.id === currentScreen)?.label}</h2>
          </div>

          <div className="header-center">
            <Logo size="small" variant="header" showText={false} />
          </div>

          <div className="header-right">
            <div className="owner-profile">
              <span className="profile-icon">👤</span>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </header>

        <div className="owner-content">
          <CurrentComponent onNavigate={setCurrentScreen} ownerId={currentOwner.id} />
        </div>
      </main>
    </div>
  );
}

export default OwnerApp;
