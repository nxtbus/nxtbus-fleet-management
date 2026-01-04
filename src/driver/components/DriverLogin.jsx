import { useState } from 'react';
import Logo from '../../components/Logo';
import { authService } from '../services/authService';
import { dataStore } from '../../services/sharedDataService';

function DriverLogin({ onLoginSuccess }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.login(phone, pin);

      if (result.success) {
        onLoginSuccess(result.driver);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = () => {
    if (confirm('Reset all data to defaults? This will fix login issues.')) {
      dataStore.resetAllData();
      setError('');
      alert('Data reset! Try logging in again.');
    }
  };

  return (
    <div className="driver-login">
      <div className="login-header">
        <Logo size="large" variant="login" showText={false} />
        <h1>NxtBus Driver</h1>
        <p>Login to start your trip</p>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        {error && (
          <div className="error-banner">
            {error}
            <button type="button" onClick={handleResetData} style={{
              display: 'block',
              margin: '8px auto 0',
              padding: '4px 12px',
              fontSize: '0.8rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer'
            }}>
              Reset Data
            </button>
          </div>
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

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '🔄 Logging in...' : '🔐 Login'}
        </button>
      </form>

      <div className="demo-credentials">
        <p><strong>Demo Credentials:</strong></p>
        <p>Phone: 9876543210 | PIN: 1234</p>
      </div>
    </div>
  );
}

export default DriverLogin;
