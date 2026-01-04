import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import DriverApp from './driver/DriverApp'
import AdminApp from './admin/AdminApp'
import OwnerApp from './owner/OwnerApp'
import AppSwitcher from './AppSwitcher'
import './i18n'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppSwitcher />} />
        <Route path="/passenger/*" element={<App />} />
        <Route path="/driver/*" element={<DriverApp />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/owner/*" element={<OwnerApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
