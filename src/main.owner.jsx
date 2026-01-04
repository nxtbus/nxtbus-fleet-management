/**
 * NxtBus Owner App - Entry Point
 * This is the dedicated entry point for the Owner APK
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import OwnerApp from './owner/OwnerApp'
import './i18n'
import './index.css'

// Set app type for any conditional logic
window.NXTBUS_APP_TYPE = 'owner';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <OwnerApp />
  </React.StrictMode>
)
