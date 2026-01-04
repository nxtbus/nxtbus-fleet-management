# NxtBus - GPS-Based Bus ETA System

Smart City compliant bus tracking system with Passenger and Driver apps.

## App Structure

```
/              → App Switcher (choose Passenger or Driver)
/passenger     → Passenger App (QR scan, ETA, feedback)
/driver        → Driver App (GPS tracking, trip control)
```

## System Architecture

### Data Available (Per Constraints)
- Route start/end GPS coordinates
- Trip start/end times
- Live GPS from driver mobile app
- QR codes at stops (contain stop lat/lon)

### ETA Calculation Logic

```
┌─────────────────────────────────────────────────────────────┐
│                    ETA CALCULATION FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. DISTANCE CALCULATION (Haversine Formula)                │
│     distance = haversine(busGPS, stopGPS)                   │
│                                                              │
│  2. SPEED CALCULATION                                        │
│     avgSpeed = totalRouteDistance / totalTripDuration       │
│     liveSpeed = distanceMoved / timeDelta (from GPS)        │
│                                                              │
│  3. SPEED BLENDING                                           │
│     finalSpeed = (0.7 × liveSpeed) + (0.3 × avgSpeed)       │
│     If liveSpeed unavailable → fallback to avgSpeed         │
│                                                              │
│  4. ETA CALCULATION                                          │
│     ETA = distance / finalSpeed                              │
│     arrivalTime = now + ETA                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### QR Scan Decision Flow

```
┌──────────────────┐
│  User Scans QR   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Parse QR Data   │──── Invalid ────► Error Message
│  (stopId, GPS)   │
└────────┬─────────┘
         │ Valid
         ▼
┌──────────────────┐
│ Fetch Active     │──── None ────► "No active buses"
│ Buses for Route  │
└────────┬─────────┘
         │ Found
         ▼
┌──────────────────┐
│ Check Bus Status │
└────────┬─────────┘
         │
    ┌────┴────┬──────────────┐
    ▼         ▼              ▼
┌────────┐ ┌────────┐  ┌──────────┐
│Not     │ │Bus     │  │Bus       │
│Started │ │Passed  │  │Approaching│
└────────┘ └────────┘  └────┬─────┘
    │          │            │
    ▼          ▼            ▼
"Bus not   "Already    Calculate ETA
started"   passed"     Display: distance,
                       ETA, arrival time
```

### Bus Position Detection

```javascript
// Check if bus passed stop
hasBusPassedStop(busGPS, stopGPS, routeEndGPS) {
  busToEnd = distance(bus, routeEnd)
  stopToEnd = distance(stop, routeEnd)
  
  // Bus passed if closer to end than stop is
  return busToEnd < stopToEnd && busToStop > 150m
}
```

## File Structure

```
src/
├── utils/
│   ├── geoUtils.js        # Haversine distance, bearing, pass detection
│   ├── etaCalculator.js   # Speed blending, ETA computation
│   └── qrScanHandler.js   # QR parsing, scan decision flow
├── hooks/
│   └── useBusTracking.js  # Real-time tracking with 15s refresh
├── services/
│   └── busService.js      # API layer (mock for demo)
├── components/
│   ├── QRScanner.jsx      # QR scan + ETA display
│   ├── RouteSearch.jsx    # From/To search
│   ├── Feedback.jsx       # User feedback form
│   └── Alerts.jsx         # Traffic/diversion alerts
└── i18n.js                # Multi-language (EN/ES/HI)
```

## Example Scenario

**Setup:**
- Route: Central Station → Airport (25km)
- Trip Duration: 90 minutes
- Average Speed: 25km ÷ 1.5hr = 16.67 km/h

**User scans QR at MG Road (8km from start):**

1. Bus current GPS: 5km from start
2. Distance to stop: 3km
3. Live speed (from GPS delta): 20 km/h
4. Blended speed: (0.7 × 20) + (0.3 × 16.67) = 19 km/h
5. ETA: 3km ÷ 19km/h = 9.5 minutes
6. Display: "🚌 101A - 10 min - Arrives 2:45 PM"

## Scalability Considerations

| Aspect | Implementation |
|--------|----------------|
| GPS Updates | 15-second intervals (configurable) |
| Offline Support | Cache last known positions |
| Multi-city | Route/stop data per city namespace |
| Load Balancing | Stateless ETA calculation |
| Real-time | WebSocket for live updates (production) |

## Run Locally

```bash
# Install dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Start the backend server (in one terminal)
cd server && node index.js

# Start the frontend (in another terminal)
npm run dev
```

The backend server runs on `http://localhost:3001` and stores data in `server/data/*.json` files.
The frontend runs on `http://localhost:5173`.

### Data Storage

All data is stored in JSON files in the `server/data/` directory:
- `buses.json` - Bus fleet data
- `routes.json` - Route definitions with stops
- `drivers.json` - Driver accounts
- `schedules.json` - Bus-route schedules
- `activeTrips.json` - Currently running trips
- `delays.json` - Reported delays
- `notifications.json` - System notifications
- `feedbacks.json` - User feedback

---

## Driver App Features

### 1. Background GPS Tracking
- Continuous tracking even when screen locked/app minimized
- Transmits to server every 15 seconds
- Offline queue for failed transmissions

### 2. Automatic Tracking on Login
- GPS starts immediately after authentication
- No manual intervention required
- Verifies: driver identity, assigned bus, scheduled route

### 3. Start/End Trip Controls
- Simple Start Trip / End Trip buttons
- Marks bus as active for passenger visibility
- Generates trip metrics on completion

### 4. Bus Selection Before Trip
- Driver selects from assigned buses only
- Links driver profile → bus → route
- Ensures correct vehicle tracking

### Driver App Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   LOGIN     │ ──► │ SELECT BUS  │ ──► │ TRIP        │
│  (Phone+PIN)│     │ & ROUTE     │     │ CONTROL     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
  Auto-start GPS     Verify assignment    Start/End Trip
  Save session       Load routes          Live metrics
                                          Trip summary
```

### Trip Lifecycle

```javascript
// Start Trip
tripService.startTrip({ driverId, busId, routeId, route })
  → Initialize GPS tracker
  → Mark bus as active
  → Begin position logging

// During Trip
gpsTracker transmits every 15 seconds
  → Server receives: { tripId, busId, position, timestamp }
  → Passengers see live ETA updates

// End Trip
tripService.endTrip()
  → Stop GPS tracking
  → Calculate: duration, distance, avg speed
  → Generate trip summary
  → Store in history
```

### Driver App Files

```
src/driver/
├── DriverApp.jsx              # Main driver app component
├── driver.css                 # Driver app styles
├── services/
│   ├── gpsTracker.js          # Background GPS tracking service
│   ├── tripService.js         # Trip lifecycle management
│   └── authService.js         # Driver authentication
└── components/
    ├── DriverLogin.jsx        # Phone + PIN login
    ├── BusSelection.jsx       # Bus & route selection
    └── TripControl.jsx        # Start/end trip, live metrics
```


## Production Deployment

Replace mock service with real APIs:
- `fetchBusGps(busId)` → Driver app GPS endpoint
- `fetchActiveBuses()` → Fleet management API
- `submitFeedback()` → Feedback service
- `fetchAlerts()` → Alert management system
