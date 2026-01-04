import { useNavigate } from 'react-router-dom';

function AppSwitcher() {
  const navigate = useNavigate();

  return (
    <div className="app-switcher">
      <div className="switcher-content">
        <div className="switcher-logo">🚌</div>
        <h1>NxtBus</h1>
        <p>Smart City Bus Tracking System</p>

        <div className="switcher-options">
          <button
            className="switcher-btn passenger"
            onClick={() => navigate('/passenger')}
          >
            <span className="btn-icon">👤</span>
            <span className="btn-label">Passenger App</span>
            <span className="btn-desc">Check bus ETAs, scan QR codes</span>
          </button>

          <button
            className="switcher-btn driver"
            onClick={() => navigate('/driver')}
          >
            <span className="btn-icon">🚌</span>
            <span className="btn-label">Driver App</span>
            <span className="btn-desc">Start trips, GPS tracking</span>
          </button>

          <button
            className="switcher-btn owner"
            onClick={() => navigate('/owner')}
          >
            <span className="btn-icon">📊</span>
            <span className="btn-label">Owner Portal</span>
            <span className="btn-desc">Fleet tracking, analytics, alerts</span>
          </button>

          <button
            className="switcher-btn admin"
            onClick={() => navigate('/admin')}
          >
            <span className="btn-icon">⚙️</span>
            <span className="btn-label">Admin Panel</span>
            <span className="btn-desc">Manage buses, routes, alerts</span>
          </button>
        </div>
      </div>

      <style>{`
        .app-switcher {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a73e8, #0d47a1);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .switcher-content {
          text-align: center;
          color: white;
          max-width: 400px;
          width: 100%;
        }

        .switcher-logo {
          font-size: 5rem;
          margin-bottom: 16px;
        }

        .switcher-content h1 {
          font-size: 2.5rem;
          margin-bottom: 8px;
        }

        .switcher-content p {
          opacity: 0.8;
          margin-bottom: 48px;
        }

        .switcher-options {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .switcher-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          text-align: center;
        }

        .switcher-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }

        .switcher-btn.passenger {
          background: white;
          color: #1a73e8;
        }

        .switcher-btn.driver {
          background: #1a1a2e;
          color: white;
        }

        .switcher-btn.owner {
          background: linear-gradient(135deg, #0d47a1, #1565c0);
          color: white;
        }

        .switcher-btn.admin {
          background: linear-gradient(135deg, #e94560, #c23a51);
          color: white;
        }

        .btn-icon {
          font-size: 2.5rem;
          margin-bottom: 12px;
        }

        .btn-label {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .btn-desc {
          font-size: 0.85rem;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}

export default AppSwitcher;
