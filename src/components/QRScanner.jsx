import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Html5Qrcode } from 'html5-qrcode'
import { fetchActiveBuses } from '../services/busService'
import { computeStopETA } from '../utils/etaCalculator'
import { formatDistance, calculateDistance, hasBusPassedStop } from '../utils/geoUtils'
import { ScanStatus } from '../utils/qrScanHandler'

function QRScanner() {
  const { t } = useTranslation()
  const [scanning, setScanning] = useState(false)
  const [stopData, setStopData] = useState(null)
  const [busResults, setBusResults] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)
  const scannerRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const calculateBusETAs = async (stop) => {
    const allBuses = await fetchActiveBuses()

    if (!allBuses || allBuses.length === 0) {
      return []
    }

    const stopGps = { lat: stop.lat, lon: stop.lon }

    const results = allBuses
      .filter(bus => bus.currentGps)
      .map(bus => {
        const routeEnd = { lat: bus.route.endLat, lon: bus.route.endLon }

        // Distance from bus to stop
        const distanceToStop = calculateDistance(
          bus.currentGps.lat, bus.currentGps.lon,
          stop.lat, stop.lon
        )

        // Check if bus at stop (< 100m)
        if (distanceToStop < 0.1) {
          return {
            bus,
            status: ScanStatus.BUS_AT_STOP,
            distance: distanceToStop
          }
        }

        // Check if bus passed stop
        if (hasBusPassedStop(bus.currentGps, stopGps, routeEnd)) {
          return {
            bus,
            status: ScanStatus.BUS_PASSED,
            distance: distanceToStop
          }
        }

        // Calculate ETA
        const eta = computeStopETA({
          busCurrentGps: bus.currentGps,
          busPreviousGps: bus.previousGps,
          stopGps,
          route: bus.route
        })

        return {
          bus,
          status: ScanStatus.BUS_APPROACHING,
          eta,
          distance: distanceToStop
        }
      })
      .filter(r => r.status !== ScanStatus.BUS_PASSED)
      .sort((a, b) => {
        if (a.status === ScanStatus.BUS_AT_STOP) return -1
        if (b.status === ScanStatus.BUS_AT_STOP) return 1
        return (a.eta?.etaMinutes || 999) - (b.eta?.etaMinutes || 999)
      })

    return results
  }

  const startScanner = async () => {
    setScanning(true)
    setError(null)
    const html5QrCode = new Html5Qrcode('qr-reader')
    scannerRef.current = html5QrCode

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScan(decodedText)
          html5QrCode.stop()
          setScanning(false)
        },
        () => {}
      )
    } catch (err) {
      console.error('Scanner error:', err)
      setScanning(false)
      // Demo: simulate a scan
      handleScan(JSON.stringify({
        stopId: 'STOP001',
        lat: 13.0500,
        lon: 77.6000,
        stopName: 'MG Road Junction'
      }))
    }
  }

  const handleScan = async (qrData) => {
    try {
      let stop
      try {
        stop = JSON.parse(qrData)
      } catch {
        // Try pipe-separated format
        const parts = qrData.split('|')
        stop = {
          stopId: parts[0],
          lat: parseFloat(parts[1]),
          lon: parseFloat(parts[2]),
          stopName: parts[3] || 'Unknown Stop'
        }
      }

      setStopData(stop)

      // Calculate initial ETAs
      const results = await calculateBusETAs(stop)
      setBusResults(results)
      setLastUpdate(new Date())

      // Set up auto-refresh
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      intervalRef.current = setInterval(async () => {
        const updated = await calculateBusETAs(stop)
        setBusResults(updated)
        setLastUpdate(new Date())
      }, 15000)

    } catch (err) {
      setError('Failed to process QR code')
      console.error(err)
    }
  }

  const resetScanner = () => {
    setStopData(null)
    setBusResults([])
    setError(null)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  // Results view
  if (stopData) {
    return (
      <div>
        <div className="card">
          <div className="stop-header">
            <div className="stop-name">📍 {stopData.stopName}</div>
            <div className="stop-id">ID: {stopData.stopId}</div>
            {lastUpdate && (
              <div className="last-update">
                Updated: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
          <button className="btn" onClick={resetScanner}>
            🔄 Scan Another Stop
          </button>
        </div>

        <h3 style={{ marginBottom: 12 }}>{t('nextBus')}</h3>

        {busResults.length > 0 ? (
          <>
            {busResults.map((data, idx) => (
              <div key={idx} className={`bus-card ${data.bus.isLive ? 'live' : ''}`}>
                <div className="bus-info">
                  <div className="bus-number">
                    🚌 {data.bus.busNumber}
                    {data.bus.isLive && <span className="live-badge">LIVE</span>}
                  </div>
                  <div className="bus-route">{data.bus.route.name}</div>
                  {data.status === ScanStatus.BUS_APPROACHING && data.eta && (
                    <div className="bus-details">
                      <span className="distance">📏 {formatDistance(data.distance)}</span>
                      <span className="speed">⚡ {data.eta.finalSpeedKmh.toFixed(0)} km/h</span>
                    </div>
                  )}
                </div>

                <div className="eta-section">
                  {data.status === ScanStatus.BUS_AT_STOP ? (
                    <div className="eta-badge arriving">Arriving!</div>
                  ) : data.status === ScanStatus.BUS_APPROACHING && data.eta ? (
                    <>
                      <div className="eta-badge">{data.eta.etaMinutes} {t('minutes')}</div>
                      <div className="arrival-time">{data.eta.formattedArrival}</div>
                    </>
                  ) : (
                    <div className="eta-badge passed">Passed</div>
                  )}
                </div>
              </div>
            ))}

            <div className="refresh-info">
              <small>Auto-refreshes every 15 seconds</small>
            </div>
          </>
        ) : (
          <div className="no-data">
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🚌</div>
            <p>No buses approaching this stop</p>
            <small>Check back in a few minutes</small>
          </div>
        )}
      </div>
    )
  }

  // Scanner view
  return (
    <div className="scanner-container">
      <div className="card">
        <h3>{t('scanQR')}</h3>
        <p className="scan-instruction">
          Point your camera at the QR code on the bus stop sign
        </p>
        <div id="qr-reader" className="scanner-box"></div>

        {error && <div className="error-msg">{error}</div>}

        {!scanning ? (
          <button className="btn" onClick={startScanner}>
            📷 {t('scan')}
          </button>
        ) : (
          <div className="scanning-indicator">
            <div className="spinner"></div>
            <p>Scanning...</p>
          </div>
        )}
      </div>

      <div className="card info-card">
        <h4>How it works</h4>
        <ul>
          <li>Each bus stop has a unique QR code</li>
          <li>QR contains stop GPS coordinates</li>
          <li>ETA calculated from live bus GPS</li>
          <li>Updates every 15 seconds</li>
        </ul>
      </div>
    </div>
  )
}

export default QRScanner
