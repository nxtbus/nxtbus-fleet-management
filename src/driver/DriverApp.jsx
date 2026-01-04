import { useState, useEffect } from 'react';
import { authService } from './services/authService';
import { tripService } from './services/tripService';
import DriverLogin from './components/DriverLogin';
import BusSelection from './components/BusSelection';
import TripControl from './components/TripControl';
import Logo from '../components/Logo';
import './driver.css';

// App screens
const Screen = {
  LOGIN: 'login',
  BUS_SELECTION: 'bus_selection',
  TRIP_CONTROL: 'trip_control'
};

function DriverApp() {
  const [screen, setScreen] = useState(Screen.LOGIN);
  const [driver, setDriver] = useState(null);
  const [tripConfig, setTripConfig] = useState(null);

  // Restore session on mount
  useEffect(() => {
    const restoreState = async () => {
      const savedDriver = await authService.restoreSession();
      if (savedDriver) {
        setDriver(savedDriver);
        setScreen(Screen.BUS_SELECTION);

        // Check for active trip
        const activeTrip = await tripService.restoreTrip();
        if (activeTrip) {
          // Restore trip config from active trip
          setTripConfig({
            driver: savedDriver,
            bus: { id: activeTrip.busId, number: activeTrip.busId },
            route: activeTrip.route
          });
          setScreen(Screen.TRIP_CONTROL);
        }
      }
    };
    restoreState();
  }, []);

  const handleLoginSuccess = (loggedInDriver) => {
    setDriver(loggedInDriver);
    setScreen(Screen.BUS_SELECTION);
  };

  const handleBusSelected = (config) => {
    setTripConfig(config);
    setScreen(Screen.TRIP_CONTROL);
  };

  const handleTripEnd = () => {
    setTripConfig(null);
    setScreen(Screen.BUS_SELECTION);
  };

  const handleLogout = async () => {
    await authService.logout();
    setDriver(null);
    setTripConfig(null);
    setScreen(Screen.LOGIN);
  };

  const handleBackToBusSelection = () => {
    setTripConfig(null);
    setScreen(Screen.BUS_SELECTION);
  };

  return (
    <div className="driver-app busway-driver">
      {/* Header */}
      <header className="driver-header">
        <div className="header-brand">
          <Logo size="medium" variant="header" />
          <div className="brand-subtitle">
            <span className="brand-subtitle">for Drivers</span>
          </div>
        </div>
        {driver && (
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="driver-content">
        {screen === Screen.LOGIN && (
          <DriverLogin onLoginSuccess={handleLoginSuccess} />
        )}

        {screen === Screen.BUS_SELECTION && driver && (
          <BusSelection
            driver={driver}
            onBusSelected={handleBusSelected}
            onBack={handleLogout}
          />
        )}

        {screen === Screen.TRIP_CONTROL && tripConfig && (
          <TripControl
            tripConfig={tripConfig}
            onTripEnd={handleTripEnd}
            onBack={handleBackToBusSelection}
          />
        )}
      </main>
    </div>
  );
}

export default DriverApp;
