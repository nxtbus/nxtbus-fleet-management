import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { submitFeedback } from '../services/busService'

function Feedback() {
  const { t } = useTranslation()
  const [rating, setRating] = useState(0)
  const [category, setCategory] = useState('')
  const [busNumber, setBusNumber] = useState('')
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const categories = [
    { value: 'cleanliness', label: 'Cleanliness' },
    { value: 'punctuality', label: 'Punctuality' },
    { value: 'driver', label: 'Driver Behavior' },
    { value: 'crowding', label: 'Overcrowding' },
    { value: 'facilities', label: 'Facilities' },
    { value: 'other', label: 'Other' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await submitFeedback({
        rating,
        category,
        busNumber,
        comment,
        timestamp: new Date().toISOString(),
        location: null
      })

      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        setRating(0)
        setCategory('')
        setBusNumber('')
        setComment('')
      }, 3000)
    } catch (err) {
      console.error('Feedback error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="dark-search-container">
        <div className="dark-success-msg">
          <div className="icon">✅</div>
          <h3>{t('thankYou')}</h3>
          <p>Your feedback helps improve bus services</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dark-search-container">
      <div className="dark-search-card">
        <h2 className="search-title">💬 Share Your Feedback</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="dark-input-group">
            <label>How was your experience?</label>
            <div className="dark-rating">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={rating >= num ? 'selected' : ''}
                  onClick={() => setRating(num)}
                  aria-label={`Rate ${num} stars`}
                >
                  {rating >= num ? '★' : '☆'}
                </button>
              ))}
            </div>
          </div>

          <div className="dark-input-group">
            <label>Category</label>
            <div className="input-wrapper">
              <span className="input-icon">📋</span>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="dark-input-group">
            <label>Bus Number (optional)</label>
            <div className="input-wrapper">
              <span className="input-icon">🚌</span>
              <input
                type="text"
                placeholder="e.g., 101A"
                value={busNumber}
                onChange={(e) => setBusNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="dark-input-group">
            <label>Your Feedback</label>
            <div className="input-wrapper" style={{ alignItems: 'flex-start' }}>
              <span className="input-icon" style={{ paddingTop: '14px' }}>✍️</span>
              <textarea
                placeholder="Tell us about your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="dark-search-btn" 
            disabled={!rating || submitting}
          >
            {submitting ? '🔄 Submitting...' : '📤 Submit Feedback'}
          </button>
        </form>
      </div>

      <div className="dark-info-card">
        <div className="info-header">
          <span className="info-icon">💡</span>
          <div className="info-content">
            <h4>Your voice matters</h4>
            <p>Help us improve public transport by sharing your honest experience. All feedback is reviewed by our team.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Feedback
