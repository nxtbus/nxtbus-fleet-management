/**
 * NxtBus Driver App - Entry Point
 * This is the dedicated entry point for the Driver APK
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import DriverApp from './driver/DriverApp'
import './i18n'
import './index.css'

// Set app type for any conditional logic
window.NXTBUS_APP_TYPE = 'driver';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DriverApp />
  </React.StrictMode>
)
