/**
 * Route Diversion Alert Component
 * Shows alert when bus deviates from official route
 */

import { useState, useEffect } from 'react';
import { getDiversionForBus } from '../services/routeDiversionService';

function DiversionAlert({ busId, diversion }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (diversion) {
      setVisible(true);
    } else {
      // Delay hiding for smooth transition
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [diversion]);

  if (!visible && !diversion) return null;

  return (
    <div className={`diversion-alert ${diversion ? 'active' : 'clearing'}`}>
      <div className="diversion-alert-icon">⚠️</div>
      <div className="diversion-alert-content">
        <div className="diversion-alert-title">Route Diversion Detected</div>
        <div className="diversion-alert-message">
          {diversion?.message || 'Bus has returned to the official route.'}
        </div>
        {diversion && (
          <div className="diversion-alert-details">
            <span className="diversion-distance">
              📍 {diversion.deviationDistance}m off route
            </span>
            <span className="diversion-segment">
              Expected: {diversion.expectedSegment}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiversionAlert;
