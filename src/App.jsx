import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import RouteSearch from './components/RouteSearch'
import Feedback from './components/Feedback'
import Alerts from './components/Alerts'
import nxtbusLogo from './Images/nxtbus.jpeg'

function App() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState('search')

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value)
  }

  return (
    <div className="app nxtbus-app">
      {/* Floating Header */}
      <header className="nxtbus-header">
        <div className="header-left">
          <div className="brand">
            <img src={nxtbusLogo} alt="NxtBus" className="brand-logo-img" />
          </div>
        </div>
        <div className="header-right">
          <select 
            className="lang-btn" 
            value={i18n.language} 
            onChange={changeLanguage}
            aria-label="Select language"
          >
            <option value="en">🌐 EN</option>
            <option value="kn">🌐 ಕನ್ನಡ</option>
            <option value="hi">🌐 हिंदी</option>
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main className="nxtbus-main">
        {activeTab === 'search' && <RouteSearch />}
        {activeTab === 'feedback' && <Feedback />}
        {activeTab === 'alerts' && <Alerts />}
      </main>

      {/* Compact Bottom Navigation */}
      <nav className="nxtbus-nav">
        <div className="nav-container">
          <button 
            className={`nav-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <span className="nav-icon">🔍</span>
            <span className="nav-text">{t('search')}</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <span className="nav-icon">🔔</span>
            <span className="nav-text">{t('alerts')}</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            <span className="nav-icon">💬</span>
            <span className="nav-text">{t('feedback')}</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default App
