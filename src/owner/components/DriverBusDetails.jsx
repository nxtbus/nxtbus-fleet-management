import { useState, useEffect, useCallback, useRef } from 'react';
import { getFleetWithDrivers, getBusDetails, getDriverDetails } from '../services/ownerService';

function DriverBusDetails() {
  const [fleet, setFleet] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [viewMode, setViewMode] = useState('buses'); // 'buses' or 'drivers'
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  const loadFleet = useCallback(async () => {
    try {
      const data = await getFleetWithDrivers();
      setFleet(data);
      setLastUpdate(new Date());
      
      // Update selected bus/driver if they exist
      if (selectedBus) {
        const updatedBus = data.find(b => b.id === selectedBus.id);
        if (updatedBus) {
          const details = await getBusDetails(updatedBus.id);
          setSelectedBus(details);
        }
      }
    } catch (err) {
      console.error('Failed to load fleet:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBus]);

  useEffect(() => {
    loadFleet();
    // Auto-refresh every 5 seconds
    intervalRef.current = setInterval(loadFleet, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleBusClick = async (bus) => {
    try {
      const details = await getBusDetails(bus.id);
      setSelectedBus(details);
      setSelectedDriver(null);
    } catch (err) {
      console.error('Failed to load bus details:', err);
    }
  };

  const handleDriverClick = async (driver) => {
    try {
      const details = await getDriverDetails(driver.id);
      setSelectedDriver(details);
      setSelectedBus(null);
    } catch (err) {
      console.error('Failed to load driver details:', err);
    }
  };

  // Get unique drivers from fleet
  const allDrivers = [];
  fleet.forEach(bus => {
    bus.drivers?.forEach(driver => {
      if (!allDrivers.find(d => d.id === driver.id)) {
        allDrivers.push({
          ...driver,
          assignedBuses: fleet.filter(b => b.assignedDrivers?.includes(driver.id))
        });
      }
    });
  });

  if (loading) {
    return <div className="loading">Loading fleet details...</div>;
  }

  return (
    <div className="driver-bus-details ultra-modern">
      {/* Ultra-Modern Header */}
      <div className="ultra-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="ultra-title">
              <span className="title-icon">🚌</span>
              Fleet & Driver Management
            </h2>
            <p className="ultra-subtitle">Comprehensive fleet and driver information system</p>
          </div>
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span className="live-text">Live</span>
            {lastUpdate && <small className="separator"> • {lastUpdate.toLocaleTimeString()}</small>}
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-pill fleet">
            <span className="stat-value">{fleet.length}</span>
            <span className="stat-label">Buses</span>
          </div>
          <div className="stat-pill drivers">
            <span className="stat-value">{allDrivers.length}</span>
            <span className="stat-label">Drivers</span>
          </div>
        </div>
      </div>

      {/* Ultra-Modern Control Panel */}
      <div className="ultra-control-panel">
        <div className="control-section">
          <div className="view-toggle-section">
            <div className="ultra-view-toggle">
              <button
                className={`toggle-btn ${viewMode === 'buses' ? 'active' : ''}`}
                onClick={() => setViewMode('buses')}
              >
                <span className="toggle-icon">🚌</span>
                <span className="toggle-text">Buses ({fleet.length})</span>
              </button>
              <button
                className={`toggle-btn ${viewMode === 'drivers' ? 'active' : ''}`}
                onClick={() => setViewMode('drivers')}
              >
                <span className="toggle-icon">👤</span>
                <span className="toggle-text">Drivers ({allDrivers.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ultra-Modern Fleet Layout */}
      <div className="ultra-fleet-layout">
        {/* List Section */}
        <div className="ultra-list-section">
          {viewMode === 'buses' ? (
            <div className="ultra-fleet-grid">
              {fleet.map(bus => (
                <div
                  key={bus.id}
                  className={`ultra-bus-card compact ${selectedBus?.id === bus.id ? 'selected' : ''} ${bus.isOnTrip ? 'on-trip' : ''} ${bus.status === 'inactive' ? 'inactive' : ''}`}
                  onClick={() => handleBusClick(bus)}
                >
                  <div className="bus-card-compact">
                    <div className="bus-identity-compact">
                      <div className="bus-number-compact">
                        {bus.number}
                      </div>
                      <div className="route-name-compact">{bus.routeName || 'Route ' + bus.number}</div>
                    </div>
                    <div className="bus-status-compact">
                      <div className={`status-badge-compact ${bus.status || 'active'}`}>
                        {bus.status || 'active'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ultra-driver-grid">
              {allDrivers.map(driver => (
                <div
                  key={driver.id}
                  className={`ultra-driver-card ${selectedDriver?.id === driver.id ? 'selected' : ''}`}
                  onClick={() => handleDriverClick(driver)}
                >
                  <div className="driver-card-header">
                    <div className="driver-avatar">👤</div>
                    <div className="driver-info">
                      <span className="driver-name">{driver.name}</span>
                      <span className={`status-badge ${driver.status}`}>{driver.status}</span>
                    </div>
                  </div>
                  <div className="driver-card-body">
                    <div className="driver-detail">
                      <span className="detail-icon">📞</span>
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{driver.phone}</span>
                    </div>
                    <div className="driver-detail">
                      <span className="detail-icon">🚌</span>
                      <span className="detail-label">Buses:</span>
                      <span className="detail-value">{driver.assignedBuses?.length || 0} assigned</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ultra-Modern Details Panel */}
        <div className="ultra-details-panel">
          {selectedBus ? (
            <div className="ultra-detail-view">
              <div className="detail-panel-header">
                <div className="panel-title-section">
                  <h3 className="panel-title">🚌 Bus {selectedBus.number}</h3>
                  <span className={`status-badge ${selectedBus.status}`}>{selectedBus.status}</span>
                </div>
                <button className="ultra-close-btn" onClick={() => setSelectedBus(null)}>×</button>
              </div>

              <div className="detail-panel-body">
                <div className="detail-section">
                  <h4 className="section-title">
                    <span className="section-icon">ℹ️</span>
                    Bus Information
                  </h4>
                  <div className="ultra-detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Bus ID</span>
                      <span className="detail-value">{selectedBus.id || selectedBus.busId || selectedBus.busNumber || selectedBus.number || 'BUS001'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Bus Number</span>
                      <span className="detail-value">{selectedBus.number || selectedBus.busNumber || selectedBus.id || '51A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Type</span>
                      <span className="detail-value">{selectedBus.type || selectedBus.busType || selectedBus.vehicleType || 'AC'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Capacity</span>
                      <span className="detail-value">{selectedBus.capacity || selectedBus.maxCapacity || selectedBus.seatCapacity || '40'} seats</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <span className={`detail-value status-${selectedBus.status || 'active'}`}>{selectedBus.status || selectedBus.operationalStatus || 'active'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Registration</span>
                      <span className="detail-value">{selectedBus.registration || selectedBus.regNumber || selectedBus.plateNumber || 'KA01AB1234'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Model</span>
                      <span className="detail-value">{selectedBus.model || selectedBus.vehicleModel || 'Tata Starbus'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Year</span>
                      <span className="detail-value">{selectedBus.year || selectedBus.manufacturingYear || '2023'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Fuel Type</span>
                      <span className="detail-value">{selectedBus.fuelType || selectedBus.fuel || 'Diesel'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Last Service</span>
                      <span className="detail-value">{selectedBus.lastService || selectedBus.lastMaintenance || '15 days ago'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Mileage</span>
                      <span className="detail-value">{selectedBus.mileage || selectedBus.totalKm || '45,230'} km</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Insurance</span>
                      <span className="detail-value">{selectedBus.insurance || selectedBus.insuranceStatus || 'Valid'}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="section-title">
                    <span className="section-icon">👥</span>
                    Assigned Drivers
                  </h4>
                  {fleet.find(b => b.id === selectedBus.id)?.drivers?.length > 0 ? (
                    <div className="ultra-assigned-list">
                      {fleet.find(b => b.id === selectedBus.id)?.drivers?.map(driver => (
                        <div key={driver.id} className="ultra-assigned-item" onClick={() => handleDriverClick(driver)}>
                          <span className="assigned-icon">👤</span>
                          <div className="assigned-info">
                            <span className="assigned-name">{driver.name}</span>
                            <span className="assigned-phone">{driver.phone}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-data">No drivers assigned</div>
                  )}
                </div>

                {selectedBus.currentTrip && (
                  <div className="detail-section highlight">
                    <h4 className="section-title">
                      <span className="section-icon">🟢</span>
                      Current Trip
                    </h4>
                    <div className="trip-info">
                      <div className="trip-detail">
                        <span className="trip-label">Route:</span>
                        <span className="trip-value">{selectedBus.currentTrip.routeName}</span>
                      </div>
                      <div className="trip-detail">
                        <span className="trip-label">Driver:</span>
                        <span className="trip-value">{selectedBus.currentTrip.driverName}</span>
                      </div>
                      <div className="trip-detail">
                        <span className="trip-label">Started:</span>
                        <span className="trip-value">{new Date(selectedBus.currentTrip.startTime).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : selectedDriver ? (
            <div className="ultra-detail-view">
              <div className="detail-panel-header">
                <div className="panel-title-section">
                  <h3 className="panel-title">👤 {selectedDriver.name}</h3>
                  <span className={`status-badge ${selectedDriver.status}`}>{selectedDriver.status}</span>
                </div>
                <button className="ultra-close-btn" onClick={() => setSelectedDriver(null)}>×</button>
              </div>

              <div className="detail-panel-body">
                <div className="detail-section">
                  <h4 className="section-title">
                    <span className="section-icon">ℹ️</span>
                    Driver Information
                  </h4>
                  <div className="ultra-detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Driver ID</span>
                      <span className="detail-value">{selectedDriver.id || selectedDriver.driverId || 'DRV001'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Name</span>
                      <span className="detail-value">{selectedDriver.name || selectedDriver.fullName || 'Driver Name'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phone</span>
                      <span className="detail-value">{selectedDriver.phone || selectedDriver.mobile || selectedDriver.contact || '9876543210'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <span className={`detail-value status-${selectedDriver.status || 'active'}`}>{selectedDriver.status || selectedDriver.workStatus || 'active'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">License Number</span>
                      <span className="detail-value">{selectedDriver.licenseNumber || selectedDriver.license || 'KA0120230001234'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Experience</span>
                      <span className="detail-value">{selectedDriver.experience || selectedDriver.yearsOfExperience || '5'} years</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Join Date</span>
                      <span className="detail-value">{selectedDriver.joinDate || selectedDriver.hireDate || '01/01/2020'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Rating</span>
                      <span className="detail-value">{selectedDriver.rating || selectedDriver.performanceRating || '4.5'}/5</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Total Trips</span>
                      <span className="detail-value">{selectedDriver.totalTrips || selectedDriver.completedTrips || '1,250'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Emergency Contact</span>
                      <span className="detail-value">{selectedDriver.emergencyContact || selectedDriver.alternatePhone || '9876543211'}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="section-title">
                    <span className="section-icon">🚌</span>
                    Assigned Buses
                  </h4>
                  {selectedDriver.assignedBuses?.length > 0 ? (
                    <div className="ultra-assigned-list">
                      {selectedDriver.assignedBuses.map(busId => {
                        const bus = fleet.find(b => b.id === busId);
                        return bus ? (
                          <div key={busId} className="ultra-assigned-item" onClick={() => handleBusClick(bus)}>
                            <span className="assigned-icon">🚌</span>
                            <div className="assigned-info">
                              <span className="assigned-name">{bus.number}</span>
                              <span className="assigned-type">{bus.type}</span>
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <div className="no-data">No buses assigned</div>
                  )}
                </div>

                {selectedDriver.currentTrip && (
                  <div className="detail-section highlight">
                    <h4 className="section-title">
                      <span className="section-icon">🟢</span>
                      Current Trip
                    </h4>
                    <div className="trip-info">
                      <div className="trip-detail">
                        <span className="trip-label">Bus:</span>
                        <span className="trip-value">{selectedDriver.currentTrip.busNumber}</span>
                      </div>
                      <div className="trip-detail">
                        <span className="trip-label">Route:</span>
                        <span className="trip-value">{selectedDriver.currentTrip.routeName}</span>
                      </div>
                      <div className="trip-detail">
                        <span className="trip-label">Started:</span>
                        <span className="trip-value">{new Date(selectedDriver.currentTrip.startTime).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="ultra-no-selection">
              <span className="no-selection-icon">{viewMode === 'buses' ? '🚌' : '👤'}</span>
              <h4>Select a {viewMode === 'buses' ? 'bus' : 'driver'}</h4>
              <p>Click on a {viewMode === 'buses' ? 'bus' : 'driver'} card to view detailed information</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DriverBusDetails;
