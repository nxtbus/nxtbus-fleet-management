/**
 * Call Monitor Service for Driver App
 * Monitors phone call activity during active trips
 * 
 * Note: In a real mobile app (Capacitor/Cordova), this would use native plugins
 * to detect actual phone calls. For web demo, we provide manual reporting.
 */

import { reportCallEvent, updateCallStatus } from '../../services/callDetectionService';

class CallMonitor {
  constructor() {
    this.isMonitoring = false;
    this.currentTrip = null;
    this.currentCallAlert = null;
    this.listeners = new Set();
  }

  /**
   * Start monitoring calls for a trip
   */
  startMonitoring(tripData) {
    this.isMonitoring = true;
    this.currentTrip = tripData;
    console.log('Call monitoring started for trip:', tripData.tripId);
    this.notifyListeners({ type: 'monitoring_started' });
  }

  /**
   * Stop monitoring calls
   */
  stopMonitoring() {
    this.isMonitoring = false;
    this.currentTrip = null;
    this.currentCallAlert = null;
    console.log('Call monitoring stopped');
    this.notifyListeners({ type: 'monitoring_stopped' });
  }

  /**
   * Report an incoming call (manual trigger for demo)
   */
  async reportIncomingCall() {
    if (!this.isMonitoring || !this.currentTrip) {
      console.log('Not monitoring - cannot report call');
      return null;
    }

    try {
      const alert = await reportCallEvent({
        ...this.currentTrip,
        callType: 'incoming',
        callStatus: 'ringing'
      });
      
      this.currentCallAlert = alert;
      this.notifyListeners({ type: 'call_reported', alert });
      return alert;
    } catch (error) {
      console.error('Failed to report call:', error);
      throw error;
    }
  }

  /**
   * Report an outgoing call (manual trigger for demo)
   */
  async reportOutgoingCall() {
    if (!this.isMonitoring || !this.currentTrip) {
      console.log('Not monitoring - cannot report call');
      return null;
    }

    try {
      const alert = await reportCallEvent({
        ...this.currentTrip,
        callType: 'outgoing',
        callStatus: 'answered'
      });
      
      this.currentCallAlert = alert;
      this.notifyListeners({ type: 'call_reported', alert });
      return alert;
    } catch (error) {
      console.error('Failed to report call:', error);
      throw error;
    }
  }

  /**
   * Update call status (answered, ended)
   */
  async updateCallStatus(status) {
    if (!this.currentCallAlert) {
      return null;
    }

    try {
      const updated = await updateCallStatus(this.currentCallAlert.id, status);
      
      if (status === 'ended') {
        this.currentCallAlert = null;
      } else {
        this.currentCallAlert = updated;
      }
      
      this.notifyListeners({ type: 'call_status_updated', status, alert: updated });
      return updated;
    } catch (error) {
      console.error('Failed to update call status:', error);
      throw error;
    }
  }

  /**
   * Check if currently on a call
   */
  isOnCall() {
    return this.currentCallAlert && 
           (this.currentCallAlert.callStatus === 'ringing' || 
            this.currentCallAlert.callStatus === 'answered');
  }

  /**
   * Subscribe to call monitor events
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event) {
    this.listeners.forEach(callback => callback(event));
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      currentTrip: this.currentTrip,
      isOnCall: this.isOnCall(),
      currentCallAlert: this.currentCallAlert
    };
  }
}

// Singleton instance
export const callMonitor = new CallMonitor();
