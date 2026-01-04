import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import BusManagement from './components/BusManagement';
import RouteManagement from './components/RouteManagement';
import DriverManagement from './components/DriverManagement';
import BusAssignment from './components/BusAssignment';
import DelayManagement from './components/DelayManagement';
import NotificationCenter from './components/NotificationCenter';
import FeedbackManagement from './components/FeedbackManagement';
import DiversionHistory from './components/DiversionHistory';
import OwnerManagement from './components/OwnerManagement';
import CallAlerts from './components/CallAlerts';
import { loginAdmin, getCurrentAdmin, logoutAdmin } from './services/adminAuth';
import Logo from '../components/Logo';
import './admin.css';

const screens = {
  dashboard: Dashboard,
  owners: OwnerManagement,
  buses: BusManagement,
  routes: RouteManagement,
  drivers: DriverManagement,
  assignment: BusAssignment,
  delays: DelayManagement,
  diversions: DiversionHistory,
  callAlerts: CallAlerts,
  notifications: NotificationCenter,
  feedback: FeedbackManagement
};

function AdminApp() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentAdmin, setCurrentAdminState] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Apply admin theme class to body
  useEffect(() => {
    document.body.classList.add('admin-theme');
    return () => {
      document.body.classList.remove('admin-theme');
    };
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const savedAdmin = getCurrentAdmin();
    if (savedAdmin) {
      setCurrentAdminState(savedAdmin);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const result = await loginAdmin(username, password);
      if (result.success) {
        setCurrentAdminState(result.admin);
        setUsername('');
        setPassword('');
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
    logoutAdmin();
    setCurrentAdminState(null);
    setCurrentScreen('dashboard');
  };

  const CurrentComponent = screens[currentScreen];

  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'owners', icon: '👤', label: 'Owners' },
    { id: 'buses', icon: '🚌', label: 'Buses' },
    { id: 'routes', icon: '🛣️', label: 'Routes' },
    { id: 'drivers', icon: '🧑‍✈️', label: 'Drivers' },
    { id: 'assignment', icon: '🔗', label: 'Assign Bus' },
    { id: 'delays', icon: '⚠️', label: 'Delays' },
    { id: 'diversions', icon: '🔀', label: 'Diversions' },
    { id: 'callAlerts', icon: '📞', label: 'Call Alerts' },
    { id: 'notifications', icon: '📢', label: 'Notifications' },
    { id: 'feedback', icon: '💬', label: 'Feedback' }
  ];

  // Show loading state
  if (loading) {
    return (
      <div className="admin-app">
        <div className="admin-login-container">
          <div className="login-card">
            <div className="login-header">
              <Logo size="large" variant="login" />
              <span>Admin Panel</span>
            </div>
            <div className="login-loading">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  // Show login form if not logged in
  if (!currentAdmin) {
    return (
      <div className="admin-app">
        <div className="admin-login-container">
          <div className="login-card">
            <div className="login-header">
              <Logo size="large" variant="login" />
              <span>Admin Panel</span>
            </div>
            
            <form onSubmit={handleLogin} className="login-form">
              <h2>Admin Login</h2>
              
              {loginError && (
                <div className="login-error">{loginError}</div>
              )}
              
              <div className="input-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              
              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <button type="submit" className="login-btn" disabled={loginLoading}>
                {loginLoading ? '🔄 Logging in...' : '🔐 Login'}
              </button>
            </form>
            
            <div className="demo-credentials">
              <p><strong>Demo Credentials:</strong></p>
              <p>Username: admin | Password: admin123</p>
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
    <div className="admin-app">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <Logo size="medium" variant="sidebar" showText={sidebarOpen} />
          {sidebarOpen && (
            <div className="sidebar-title">
              <h1>NxtBus</h1>
              <span>Fleet Control</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentScreen === item.id ? 'active' : ''}`}
              onClick={() => setCurrentScreen(item.id)}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="sidebar-footer">
            <a href="/">← Back to App</a>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h2>{menuItems.find(m => m.id === currentScreen)?.label}</h2>
          <div className="header-actions">
            <span className="admin-user">👤 {currentAdmin.name}</span>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div className="admin-content">
          <CurrentComponent onNavigate={setCurrentScreen} />
        </div>
      </main>
    </div>
  );
}

export default AdminApp;