# Design Document: Stop ETA from Route Start

## Overview

This feature adds the display of estimated travel time from a route's starting point to the scanned/selected bus stop. When passengers scan a QR code or search for buses, they will see not only the bus's ETA to their location but also how long the journey takes from the route origin to that stop. This provides better context for understanding the bus schedule and route timing.

## Architecture

The feature integrates into the existing ETA calculation and display system:

```
┌─────────────────────────────────────────────────────────────┐
│                    STOP ETA FROM START                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. DATA SOURCE                                              │
│     - Route stops have `estimatedTime` field (minutes)       │
│     - If missing, calculate from stop position + route speed │
│                                                              │
│  2. CALCULATION                                              │
│     If stop.estimatedTime exists:                            │
│       timeFromStart = stop.estimatedTime                     │
│     Else:                                                    │
│       progress = stopOrder / totalStops                      │
│       timeFromStart = progress × route.estimatedDuration     │
│                                                              │
│  3. DISPLAY                                                  │
│     QR Scanner: "📍 Stop Name (Stop #2)"                     │
│                 "⏱️ 15 min from route start"                 │
│     Route Search: Same info in bus result cards              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. New Utility Function: `calculateTimeFromStart`

Location: `src/utils/etaCalculator.js`

```javascript
/**
 * Calculate estimated time from route start to a stop
 * @param {Object} stop - Stop object with estimatedTime or order
 * @param {Object} route - Route object with stops and estimatedDuration
 * @returns {Object} Time from start details
 */
function calculateTimeFromStart(stop, route) {
  // Returns: { minutes, isStartingPoint, formatted }
}
```

### 2. Updated QRScanner Component

Location: `src/components/QRScanner.jsx`

Changes:
- Find the scanned stop in route data to get its `estimatedTime`
- Display time from start in the stop header section
- Show stop order (e.g., "Stop #3 of 5")

### 3. Updated RouteSearch Component

Location: `src/components/RouteSearch.jsx`

Changes:
- Calculate time from start for the selected pickup location
- Display in bus result cards alongside ETA

### 4. Enhanced Stop Data in QR

The QR code data can optionally include:
- `stopOrder` - Position in route
- `estimatedTime` - Pre-calculated time from start

## Data Models

### Stop Object (existing, with relevant fields)
```javascript
{
  id: "S1",
  name: "MG Road",
  lat: 13.0100,
  lon: 77.6000,
  order: 2,              // Position in route (1-based)
  estimatedTime: 15      // Minutes from route start (optional)
}
```

### Route Object (existing, with relevant fields)
```javascript
{
  id: "ROUTE001",
  name: "Central Station → Airport",
  estimatedDuration: 90,  // Total route duration in minutes
  stops: [...]            // Array of Stop objects
}
```

### TimeFromStart Result (new)
```javascript
{
  minutes: 15,
  isStartingPoint: false,
  formatted: "15 min from start",
  stopOrder: 2,
  totalStops: 5
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Predefined time is used when available
*For any* stop that has an `estimatedTime` field defined, the `calculateTimeFromStart` function should return that exact value as the minutes from start.
**Validates: Requirements 3.2**

### Property 2: Calculated time is proportional to stop position
*For any* stop without a predefined `estimatedTime`, the calculated time from start should be proportional to the stop's position in the route (stopOrder / totalStops × routeDuration).
**Validates: Requirements 1.2, 3.1, 3.3**

### Property 3: First stop returns zero or starting point indicator
*For any* stop with order=1 or estimatedTime=0, the function should return `isStartingPoint: true` and `minutes: 0`.
**Validates: Requirements 1.3, 2.3**

### Property 4: Time from start is always non-negative and bounded
*For any* stop and route combination, the calculated time from start should be >= 0 and <= route.estimatedDuration.
**Validates: Requirements 3.1**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Stop not found in route | Calculate based on GPS distance from route start |
| Missing estimatedTime | Calculate from stop order and route duration |
| Missing route duration | Use default 60 minutes |
| Invalid stop order | Default to middle of route (50% of duration) |

## Testing Strategy

### Unit Tests
- Test `calculateTimeFromStart` with various stop/route combinations
- Test edge cases: first stop, last stop, missing data

### Property-Based Tests
Using a property-based testing library (e.g., fast-check):

1. **Property 1 Test**: Generate random stops with estimatedTime, verify function returns that value
2. **Property 2 Test**: Generate stops without estimatedTime, verify proportional calculation
3. **Property 3 Test**: Generate first stops, verify isStartingPoint is true
4. **Property 4 Test**: Generate random stops/routes, verify bounds

### Integration Tests
- Verify QR scanner displays time from start
- Verify route search displays time from start
- Test with real route data from server
