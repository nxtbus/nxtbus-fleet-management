import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchActiveBuses, getLocations, fetchRoutes } from '../services/busService'
import { dataStore } from '../services/sharedDataService'
import { computeStopETA } from '../utils/etaCalculator'
import { formatDistance, calculateDistance, hasBusPassedStop } from '../utils/geoUtils'
import { ScanStatus } from '../utils/qrScanHandler'
import { getTrafficAlertsForBus, getSeverityColor, getSeverityIcon } from '../services/trafficService'
import { getDiversionForBus } from '../services/routeDiversionService'
import { getDelaysForBus } from '../services/delayDetectionService'
import BusMap from './BusMap'
import TrafficAlert, { TrafficAlertBanner } from './TrafficAlert'
import DiversionAlert from './DiversionAlert'
import { DelayBadge, DelayAlertBanner } from './DelayNotification'
import AutocompleteInput from './AutocompleteInput'

function RouteSearch() {
  const { t } = useTranslation()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [locations, setLocations] = useState([])
  const [results, setResults] = useState(null)
  const [connectingRoutes, setConnectingRoutes] = useState(null) // For multi-route journeys
  const [allBuses, setAllBuses] = useState([])
  const [routeStops, setRouteStops] = useState([])
  const [showMap, setShowMap] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [expandedBus, setExpandedBus] = useState(null)
  const [expandedConnection, setExpandedConnection] = useState(null)
  const [trafficAlerts, setTrafficAlerts] = useState({})
  const [diversionAlerts, setDiversionAlerts] = useState({})
  const [delayAlerts, setDelayAlerts] = useState({})
  const intervalRef = useRef(null)
  const initialSearchDone = useRef(false)

  // Update URL with search parameters
  const updateUrlParams = (fromValue, toValue) => {
    const url = new URL(window.location.href)
    if (fromValue) {
      url.searchParams.set('from', fromValue)
    } else {
      url.searchParams.delete('from')
    }
    if (toValue) {
      url.searchParams.set('to', toValue)
    } else {
      url.searchParams.delete('to')
    }
    window.history.replaceState({}, '', url.toString())
  }

  // Read URL parameters on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const fromParam = urlParams.get('from')
    const toParam = urlParams.get('to')
    
    if (fromParam) setFrom(decodeURIComponent(fromParam))
    if (toParam) setTo(decodeURIComponent(toParam))
  }, [])

  // Load locations from shared store
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locs = await getLocations()
        setLocations(locs)
        
        // Auto-search if URL has parameters and locations are loaded
        if (!initialSearchDone.current && locs.length > 0) {
          const urlParams = new URLSearchParams(window.location.search)
          const fromParam = urlParams.get('from')
          const toParam = urlParams.get('to')
          
          if (fromParam && toParam) {
            initialSearchDone.current = true
            // Trigger search after a short delay to ensure state is set
            setTimeout(() => {
              const searchBtn = document.querySelector('form button[type="submit"]')
              if (searchBtn) searchBtn.click()
            }, 100)
          }
        }
      } catch (err) {
        console.error('Failed to load locations:', err)
      }
    }
    loadLocations()
    
    const handleUpdate = () => loadLocations()
    window.addEventListener('nxtbus-data-update', handleUpdate)
    
    return () => {
      window.removeEventListener('nxtbus-data-update', handleUpdate)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Helper function for case-insensitive comparison
  const normalizeLocationName = (name) => name?.toLowerCase().trim()
  
  // Check if a location is on a route (start, end, or stop) - case insensitive
  const isLocationOnRoute = (route, locationName) => {
    if (!route || !locationName) return false
    const normalizedName = normalizeLocationName(locationName)
    if (normalizeLocationName(route.startPoint) === normalizedName || 
        normalizeLocationName(route.endPoint) === normalizedName) return true
    return (route.stops || []).some(s => normalizeLocationName(s.name) === normalizedName)
  }

  // Get the order/position of a location on a route - case insensitive
  const getLocationOrder = (route, locationName) => {
    const normalizedName = normalizeLocationName(locationName)
    if (normalizeLocationName(route.startPoint) === normalizedName) return 0
    const stop = (route.stops || []).find(s => normalizeLocationName(s.name) === normalizedName)
    if (stop) return stop.order || (route.stops.indexOf(stop) + 1)
    if (normalizeLocationName(route.endPoint) === normalizedName) return (route.stops?.length || 0) + 1
    return -1
  }

  // Check if a schedule is current or upcoming (not past)
  const isScheduleCurrentOrUpcoming = (schedule) => {
    const now = new Date()
    const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()]
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    
    // Check if schedule runs today
    if (!schedule.days?.includes(currentDay)) return false
    
    // Parse end time
    const endTime = schedule.endTime
    
    // Handle overnight schedules (e.g., 23:00 - 01:00)
    if (schedule.endTime < schedule.startTime) {
      // Overnight schedule - always show if it runs today
      return true
    }
    
    // Normal schedule - check if end time hasn't passed
    return currentTime <= endTime
  }

  // Calculate time in minutes from HH:MM string
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  // Add minutes to time string and return new time string
  const addMinutesToTime = (timeStr, minutes) => {
    const totalMinutes = timeToMinutes(timeStr) + minutes
    const hours = Math.floor(totalMinutes / 60) % 24
    const mins = totalMinutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // Get estimated time from origin to a stop on a route
  const getTimeToStop = (route, fromName, toName) => {
    const normalizedFrom = normalizeLocationName(fromName)
    const normalizedTo = normalizeLocationName(toName)
    
    let fromTime = 0
    let toTime = 0
    
    // Check start point
    if (normalizeLocationName(route.startPoint) === normalizedFrom) fromTime = 0
    if (normalizeLocationName(route.startPoint) === normalizedTo) toTime = 0
    
    // Check stops
    for (const stop of (route.stops || [])) {
      if (normalizeLocationName(stop.name) === normalizedFrom) fromTime = stop.estimatedTime || 0
      if (normalizeLocationName(stop.name) === normalizedTo) toTime = stop.estimatedTime || 0
    }
    
    // Check end point
    if (normalizeLocationName(route.endPoint) === normalizedFrom) fromTime = route.estimatedDuration || 60
    if (normalizeLocationName(route.endPoint) === normalizedTo) toTime = route.estimatedDuration || 60
    
    return toTime - fromTime
  }

  // Find connecting routes between two locations
  const findConnectingRoutes = async (fromName, toName) => {
    const routes = await fetchRoutes()
    const allBuses = await fetchActiveBuses()
    const schedules = await dataStore.getSchedules()
    
    const normalizedFrom = normalizeLocationName(fromName)
    const normalizedTo = normalizeLocationName(toName)
    
    // Get all unique stops/locations from all routes (normalized for comparison)
    const allStopsMap = new Map() // normalized name -> original name
    routes.forEach(route => {
      const addStop = (name) => {
        const normalized = normalizeLocationName(name)
        if (!allStopsMap.has(normalized)) {
          allStopsMap.set(normalized, name)
        }
      }
      addStop(route.startPoint)
      addStop(route.endPoint)
      ;(route.stops || []).forEach(s => addStop(s.name))
    })
    
    const connections = []
    
    // For each potential transfer point
    for (const [normalizedTransfer, transferPoint] of allStopsMap) {
      if (normalizedTransfer === normalizedFrom || normalizedTransfer === normalizedTo) continue
      
      // Find routes from origin to transfer point
      const firstLegRoutes = routes.filter(route => {
        const hasFrom = isLocationOnRoute(route, fromName)
        const hasTransfer = isLocationOnRoute(route, transferPoint)
        if (!hasFrom || !hasTransfer) return false
        // Ensure from comes before transfer on this route
        return getLocationOrder(route, fromName) < getLocationOrder(route, transferPoint)
      })
      
      // Find routes from transfer point to destination
      const secondLegRoutes = routes.filter(route => {
        const hasTransfer = isLocationOnRoute(route, transferPoint)
        const hasTo = isLocationOnRoute(route, toName)
        if (!hasTransfer || !hasTo) return false
        // Ensure transfer comes before destination on this route
        return getLocationOrder(route, transferPoint) < getLocationOrder(route, toName)
      })
      
      // If we found valid routes for both legs
      if (firstLegRoutes.length > 0 && secondLegRoutes.length > 0) {
        // Find buses for first leg
        const firstLegBuses = allBuses.filter(bus => 
          firstLegRoutes.some(r => r.id === bus.routeId)
        )
        
        // Find buses for second leg
        const secondLegBuses = allBuses.filter(bus => 
          secondLegRoutes.some(r => r.id === bus.routeId)
        )
        
        // Get schedules for first leg routes - only current/upcoming
        const firstLegSchedules = schedules.filter(s => 
          firstLegRoutes.some(r => r.id === s.routeId) && 
          s.status === 'active' &&
          isScheduleCurrentOrUpcoming(s)
        ).sort((a, b) => a.startTime.localeCompare(b.startTime))
        
        // Get schedules for second leg routes - only current/upcoming
        const allSecondLegSchedules = schedules.filter(s => 
          secondLegRoutes.some(r => r.id === s.routeId) && 
          s.status === 'active' &&
          isScheduleCurrentOrUpcoming(s)
        ).sort((a, b) => a.startTime.localeCompare(b.startTime))
        
        // Find feasible pairs - second bus must start after first bus arrives at transfer
        const feasiblePairs = []
        for (const firstSched of firstLegSchedules) {
          const firstRoute = firstLegRoutes.find(r => r.id === firstSched.routeId)
          if (!firstRoute) continue
          
          // Calculate arrival time at transfer point
          const travelTime = getTimeToStop(firstRoute, fromName, transferPoint)
          const arrivalAtTransfer = addMinutesToTime(firstSched.startTime, travelTime)
          const arrivalMinutes = timeToMinutes(arrivalAtTransfer)
          
          // Find second leg buses that depart after arrival (with 5 min buffer)
          const feasibleSecondSchedules = allSecondLegSchedules.filter(secondSched => {
            const departureMinutes = timeToMinutes(secondSched.startTime)
            return departureMinutes >= arrivalMinutes + 5 // 5 min buffer for transfer
          })
          
          if (feasibleSecondSchedules.length > 0) {
            feasiblePairs.push({
              firstSchedule: { ...firstSched, arrivalAtTransfer, travelTime },
              secondSchedules: feasibleSecondSchedules
            })
          }
        }
        
        // Only include connection if there are feasible pairs
        if (feasiblePairs.length > 0 || firstLegBuses.length > 0 || secondLegBuses.length > 0) {
          connections.push({
            transferPoint,
            firstLeg: {
              from: fromName,
              to: transferPoint,
              routes: firstLegRoutes,
              buses: firstLegBuses,
              schedules: firstLegSchedules
            },
            secondLeg: {
              from: transferPoint,
              to: toName,
              routes: secondLegRoutes,
              buses: secondLegBuses,
              schedules: allSecondLegSchedules
            },
            feasiblePairs
          })
        }
      }
    }
    
    // Sort by number of feasible pairs and available buses
    return connections.sort((a, b) => {
      const aScore = (a.feasiblePairs?.length || 0) * 10 + a.firstLeg.buses.length + a.secondLeg.buses.length
      const bScore = (b.feasiblePairs?.length || 0) * 10 + b.firstLeg.buses.length + b.secondLeg.buses.length
      return bScore - aScore
    })
  }

  const searchBuses = async (fromLoc, toLoc) => {
    const allBuses = await fetchActiveBuses()
    if (!allBuses || allBuses.length === 0) return []

    const busResults = allBuses
      .map(bus => {
        // Check if this bus's route serves both from and to locations
        const route = bus.route
        if (!route) return null
        
        const hasFrom = isLocationOnRoute(route, fromLoc.name)
        const hasTo = isLocationOnRoute(route, toLoc.name)
        
        // Skip buses that don't serve this route
        if (!hasFrom || !hasTo) return null
        
        // Ensure from comes before to on the route
        const fromOrder = getLocationOrder(route, fromLoc.name)
        const toOrder = getLocationOrder(route, toLoc.name)
        if (fromOrder >= toOrder) return null
        
        if (bus.isScheduled && !bus.currentGps) {
          if (bus.schedule) {
            if (bus.schedule.isActive) {
              return { bus, status: 'WAITING', message: 'Driver has not started trip yet', schedule: bus.schedule }
            } else if (bus.schedule.isUpcoming) {
              return { bus, status: 'UPCOMING', message: `Starts at ${formatTime(bus.schedule.startTime)}`, schedule: bus.schedule }
            }
          }
          return null
        }
        
        if (!bus.currentGps) {
          if (bus.schedule?.isUpcoming) {
            return { bus, status: 'UPCOMING', message: `Starts at ${formatTime(bus.schedule.startTime)}`, schedule: bus.schedule }
          }
          return null
        }

        const stopGps = { lat: fromLoc.lat, lon: fromLoc.lon }
        const routeEnd = { lat: bus.route.endLat, lon: bus.route.endLon }
        const distanceToPickup = calculateDistance(bus.currentGps.lat, bus.currentGps.lon, fromLoc.lat, fromLoc.lon)

        if (hasBusPassedStop(bus.currentGps, stopGps, routeEnd)) {
          return { bus, status: ScanStatus.BUS_PASSED, message: 'Already passed pickup' }
        }

        const eta = computeStopETA({ busCurrentGps: bus.currentGps, busPreviousGps: bus.previousGps, stopGps, route: bus.route })
        return { bus, status: ScanStatus.BUS_APPROACHING, eta, distance: distanceToPickup, schedule: bus.schedule }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.status === ScanStatus.BUS_APPROACHING && b.status !== ScanStatus.BUS_APPROACHING) return -1
        if (b.status === ScanStatus.BUS_APPROACHING && a.status !== ScanStatus.BUS_APPROACHING) return 1
        if (a.eta && b.eta) return a.eta.etaMinutes - b.eta.etaMinutes
        return 0
      })

    return busResults
  }

  const formatTime = (time) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  // Fetch traffic, diversion, and delay alerts for buses
  const fetchAlerts = async (buses) => {
    const traffic = {}
    const diversions = {}
    const delays = {}
    
    for (const bus of buses) {
      const busTrafficAlerts = getTrafficAlertsForBus(bus.id)
      if (busTrafficAlerts.length > 0) {
        traffic[bus.id] = busTrafficAlerts
      }
      const busDiversion = getDiversionForBus(bus.id)
      if (busDiversion) {
        diversions[bus.id] = busDiversion
      }
      // Fetch delay alerts
      try {
        const busDelays = await getDelaysForBus(bus.id)
        if (busDelays.length > 0) {
          delays[bus.id] = busDelays
        }
      } catch (err) {
        console.error('Error fetching delays:', err)
      }
    }
    
    setTrafficAlerts(traffic)
    setDiversionAlerts(diversions)
    setDelayAlerts(delays)
  }

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    if (!from || !to) return
    setLoading(true)
    setExpandedBus(null)
    setExpandedConnection(null)
    setConnectingRoutes(null)
    
    // Update URL with search parameters
    updateUrlParams(from, to)

    try {
      const fromLoc = locations.find(l => l.name === from)
      const toLoc = locations.find(l => l.name === to)
      if (!fromLoc || !toLoc) { setResults([]); return }

      // Search for direct buses first
      const busResults = await searchBuses(fromLoc, toLoc)
      setResults(busResults)
      setAllBuses(busResults.map(r => r.bus))
      fetchAlerts(busResults.map(r => r.bus))
      
      // If no direct buses found, search for connecting routes
      if (busResults.length === 0) {
        const connections = await findConnectingRoutes(from, to)
        setConnectingRoutes(connections)
        
        // Fetch alerts for all buses in connections
        const allConnectionBuses = connections.flatMap(c => [
          ...c.firstLeg.buses,
          ...c.secondLeg.buses
        ])
        fetchAlerts(allConnectionBuses)
      }
      
      if (busResults.length > 0 && busResults[0].bus.route?.stops) {
        setRouteStops(busResults[0].bus.route.stops)
      }
      setLastUpdate(new Date())

      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(async () => {
        const updated = await searchBuses(fromLoc, toLoc)
        setResults(updated)
        setAllBuses(updated.map(r => r.bus))
        fetchAlerts(updated.map(r => r.bus))
        
        // Also update connecting routes if no direct buses
        if (updated.length === 0) {
          const connections = await findConnectingRoutes(from, to)
          setConnectingRoutes(connections)
        } else {
          setConnectingRoutes(null)
        }
        
        setLastUpdate(new Date())
      }, 5000) // Update every 5 seconds for real-time tracking
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const toggleBusExpand = (busId) => {
    setExpandedBus(expandedBus === busId ? null : busId)
  }

  // Calculate stop status based on bus position
  const getStopStatus = (stop, bus, fromLocation) => {
    if (!bus.currentGps) return 'upcoming'
    
    const busProgress = calculateDistance(
      bus.route.startLat, bus.route.startLon,
      bus.currentGps.lat, bus.currentGps.lon
    )
    const stopProgress = calculateDistance(
      bus.route.startLat, bus.route.startLon,
      stop.lat, stop.lon
    )
    
    if (busProgress > stopProgress + 0.1) return 'passed'
    if (Math.abs(busProgress - stopProgress) < 0.2) return 'current'
    return 'upcoming'
  }

  // Build timeline with all stops
  const buildTimeline = (bus, fromName, toName) => {
    const route = bus.route
    if (!route) return []
    
    const timeline = []
    
    // Add start point
    timeline.push({
      name: route.startPoint,
      estimatedTime: 0,
      lat: route.startLat,
      lon: route.startLon,
      isStart: true
    })
    
    // Add intermediate stops
    const stops = [...(route.stops || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
    stops.forEach(stop => {
      timeline.push({
        name: stop.name,
        estimatedTime: stop.estimatedTime || 0,
        lat: stop.lat,
        lon: stop.lon
      })
    })
    
    // Add end point
    timeline.push({
      name: route.endPoint,
      estimatedTime: route.estimatedDuration || 60,
      lat: route.endLat,
      lon: route.endLon,
      isEnd: true
    })
    
    return timeline
  }

  return (
    <div className="dark-search-container">
      {/* Search Card */}
      <div className="dark-search-card">
        <h2 className="search-title">🚌 Where do you want to go?</h2>
        <form onSubmit={handleSearch}>
          <div className="dark-input-group">
            <div className="input-wrapper">
              <span className="input-icon">📍</span>
              <AutocompleteInput
                value={from}
                onChange={setFrom}
                options={locations}
                placeholder="Enter pickup location"
                required
                excludeValue={to}
              />
            </div>
          </div>
          
          <div className="route-connector">
            <span className="connector-icon">↓</span>
          </div>
          
          <div className="dark-input-group">
            <div className="input-wrapper">
              <span className="input-icon">🎯</span>
              <AutocompleteInput
                value={to}
                onChange={setTo}
                options={locations}
                placeholder="Enter destination"
                required
                excludeValue={from}
              />
            </div>
          </div>
          
          <button type="submit" className="dark-search-btn" disabled={loading || !from || !to}>
            {loading ? '⏳ Searching...' : '🔍 Find Buses'}
          </button>
        </form>
      </div>

      {results !== null && (
        <div className="dark-results">
          <div className="dark-section-header">
            <h3>🚌 Available Buses</h3>
            <span className="section-meta">{lastUpdate && `${lastUpdate.toLocaleTimeString()}`}</span>
          </div>

          {results.length > 0 ? (
            <>
              <div className="dark-results-badge">
                <span>✓</span> Direct Route Available
              </div>
              {results.map((data, idx) => {
                const isExpanded = expandedBus === data.bus.id
                const timeline = buildTimeline(data.bus, from, to)
                
                return (
                  <div key={idx} className={`dark-bus-card ${data.status === 'UPCOMING' || data.status === 'WAITING' ? 'upcoming' : ''} ${isExpanded ? 'expanded' : ''}`}>
                    <div className="card-header" onClick={() => toggleBusExpand(data.bus.id)}>
                      <div className="bus-image">🚌</div>
                      <div className="bus-info">
                        <div className="bus-name">{data.bus.route.name}</div>
                        <div className="bus-meta">
                          <span className="bus-number">{data.bus.busNumber}</span>
                          {data.bus.isLive && <span className="bus-status live">LIVE</span>}
                          {data.status === 'UPCOMING' && <span className="bus-status upcoming">UPCOMING</span>}
                          {data.status === 'WAITING' && <span className="bus-status upcoming">SCHEDULED</span>}
                        </div>
                      </div>
                      <div className="eta-badge">
                        {data.status === ScanStatus.BUS_APPROACHING && data.eta ? (
                          <>
                            <span className="eta-value">{data.eta.etaMinutes}</span>
                            <span className="eta-label">min</span>
                          </>
                        ) : data.status === 'WAITING' ? (
                          <>
                            <span className="eta-value">--</span>
                            <span className="eta-label">waiting</span>
                          </>
                        ) : data.status === 'UPCOMING' ? (
                          <>
                            <span className="eta-value">{formatTime(data.schedule?.startTime)}</span>
                            <span className="eta-label">starts</span>
                          </>
                        ) : (
                          <>
                            <span className="eta-value">--</span>
                            <span className="eta-label">status</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Route Timeline Preview */}
                    <div className="dark-route-preview">
                      <div className="route-preview">
                        <span className="route-stop highlight">{from}</span>
                        <div className="route-line"></div>
                        <span className="route-stop">{to}</span>
                      </div>
                    </div>
                    
                    <div className="card-footer">
                      <div className="footer-info">
                        {data.schedule?.driverName && <span>👤 {data.schedule.driverName}</span>}
                        {delayAlerts[data.bus.id]?.length > 0 && (
                          <DelayBadge 
                            delayMinutes={delayAlerts[data.bus.id][0].delayMinutes}
                            severity={delayAlerts[data.bus.id][0].delayMinutes >= 10 ? 'HIGH' : 'LOW'}
                          />
                        )}
                      </div>
                      <div className="card-arrow">{isExpanded ? '▲' : '▼'}</div>
                    </div>

                    {isExpanded && (
                      <div className="card-details">
                        {/* Timeline */}
                        <div className="dark-timeline">
                          <h4>🛣️ Route Timeline</h4>
                          {timeline.map((stop, i) => {
                            const status = getStopStatus(stop, data.bus, from)
                            const isPickup = stop.name === from
                            const isDestination = stop.name === to
                            
                            return (
                              <div key={i} className={`timeline-item ${status} ${isPickup ? 'pickup' : ''} ${isDestination ? 'destination' : ''}`}>
                                <div className="timeline-marker">
                                  <div className={`marker-dot ${status}`}>
                                    {status === 'passed' && '✓'}
                                    {status === 'current' && '🚌'}
                                  </div>
                                  {i < timeline.length - 1 && <div className={`marker-line ${status}`}></div>}
                                </div>
                                <div className="timeline-content">
                                  <div className="stop-name">
                                    {stop.isStart && '🏁 '}
                                    {stop.isEnd && '🎯 '}
                                    {isPickup && '📍 '}
                                    {isDestination && '🚩 '}
                                    {stop.name}
                                    {isPickup && <span className="pickup-label"> (Your pickup)</span>}
                                    {isDestination && <span className="destination-label"> (Your destination)</span>}
                                  </div>
                                  <div className="stop-time">~{stop.estimatedTime} min from start</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        
                        {/* Delay Alert */}
                        {delayAlerts[data.bus.id]?.length > 0 && (
                          <DelayAlertBanner 
                            busId={data.bus.id}
                            routeId={data.bus.route?.id}
                            busNumber={data.bus.busNumber}
                          />
                        )}
                        
                        {/* Route Diversion Alert */}
                        {diversionAlerts[data.bus.id] && (
                          <DiversionAlert 
                            busId={data.bus.id} 
                            diversion={diversionAlerts[data.bus.id]} 
                          />
                        )}
                        
                        {/* Traffic Alerts */}
                        {trafficAlerts[data.bus.id] && trafficAlerts[data.bus.id].length > 0 && (
                          <div className="traffic-alerts-section">
                            <h4>⚠️ Traffic Alerts</h4>
                            {trafficAlerts[data.bus.id].map(alert => (
                              <TrafficAlert key={alert.id} alert={alert} />
                            ))}
                          </div>
                        )}
                        
                        {/* Map */}
                        {data.bus.currentGps && (
                          <div className="bus-map-container">
                            <h4>🗺️ Live Location</h4>
                            <BusMap 
                              buses={[data.bus]}
                              stops={timeline}
                              userLocation={locations.find(l => l.name === from)}
                              busResults={[data]}
                              trafficAlerts={trafficAlerts[data.bus.id] || []}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          ) : connectingRoutes && connectingRoutes.length > 0 ? (
            <>
              <div className="dark-results-badge warning">
                <span>🔄</span> No direct bus - Transfer required
              </div>
              
              {connectingRoutes.map((connection, idx) => {
                const isExpanded = expandedConnection === idx
                
                return (
                  <div key={idx} className={`dark-connection-card ${isExpanded ? 'expanded' : ''}`}>
                    <div 
                      className="connection-header"
                      onClick={() => setExpandedConnection(isExpanded ? null : idx)}
                    >
                      <span className="transfer-badge">1 Transfer</span>
                      <span className="transfer-point">via {connection.transferPoint}</span>
                      <span className="card-arrow">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                    
                    {isExpanded && (
                      <div className="connection-details">
                        {/* Show Feasible Journey Options */}
                        {connection.feasiblePairs?.length > 0 ? (
                          <div className="dark-journey-options">
                            <h4>🎯 Recommended Journeys</h4>
                            {connection.feasiblePairs.slice(0, 3).map((pair, pairIdx) => (
                              <div key={pairIdx} className="journey-option">
                                {/* First Bus */}
                                <div className="leg">
                                  <div className="leg-header">
                                    <span className="leg-number">1</span>
                                    <span className="leg-route">{from} → {connection.transferPoint}</span>
                                  </div>
                                  <div className="leg-details">
                                    <span className="bus-badge">🚌 {pair.firstSchedule.busNumber}</span>
                                    <span className="time-info">{formatTime(pair.firstSchedule.startTime)} → {formatTime(pair.firstSchedule.arrivalAtTransfer)}</span>
                                  </div>
                                </div>
                                
                                {/* Transfer */}
                                <div className="transfer-indicator">
                                  <span>🔄 Change at {connection.transferPoint}</span>
                                </div>
                                
                                {/* Second Bus */}
                                <div className="leg">
                                  <div className="leg-header">
                                    <span className="leg-number">2</span>
                                    <span className="leg-route">{connection.transferPoint} → {to}</span>
                                  </div>
                                  <div className="leg-details">
                                    <span className="bus-badge">🚌 {pair.secondSchedules[0].busNumber}</span>
                                    <span className="time-info">Departs {formatTime(pair.secondSchedules[0].startTime)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="dark-no-results" style={{ padding: '20px' }}>
                            <p>No feasible connections right now</p>
                            <small>Check back later for upcoming schedules</small>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          ) : (
            <div className="dark-no-results">
              <div className="icon">🚌</div>
              <p>No buses found for this route</p>
              <small>No direct or connecting routes available. Try different locations.</small>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RouteSearch
