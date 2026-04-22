import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';

function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [showPopup, setShowPopup] = useState(false);
  const [currentEmergency, setCurrentEmergency] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState(new Set());
  const ws = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.log("Audio play error", e);
    }
  };

  useEffect(() => {
  if (ws.current && ws.current.readyState === 1) return;

  const socket = new WebSocket("ws://localhost:8000/ws/dashboard");
  ws.current = socket;

  socket.onopen = () => {
    console.log("✅ Connected");
    setIsConnected(true);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // ignore ping or invalid messages
      if (!data || !data.analysis) return;

      setAlerts((prev) => {
        const exists = prev.some(
          (a) => a.summary === data.analysis.summary
        );
        if (exists) return prev;

        const newAlert = {
          id: Date.now(),
          ...data.analysis,
          time: new Date().toLocaleTimeString(),
          transcription: data.transcription,
        };

        // Show popup for new emergency
        setCurrentEmergency(newAlert);
        setShowPopup(true);
        playBeep();

        return [newAlert, ...prev];
      });

    } catch (e) {
      console.log("WS parse error", e);
    }
  };

  socket.onclose = () => {
    console.log("❌ Disconnected");
    setIsConnected(false);
  };

  socket.onerror = (err) => {
    console.log("WS error", err);
  };

  return () => {
    socket.close();
    ws.current = null;
  };
}, []);

  const dismissAlert = (id) => {
    setAlerts((prevAlerts) => prevAlerts.filter(alert => alert.id !== id));
  };

  const closePopup = () => {
    setShowPopup(false);
    setShowResponseModal(true);
  };

  const handleAcknowledgeResponse = () => {
    if (currentEmergency) {
      // Mark alert as acknowledged
      setAcknowledgedAlerts(prev => new Set([...prev, currentEmergency.id]));
      
      // Update alert with response info
      setAlerts(prev => prev.map(alert => 
        alert.id === currentEmergency.id 
          ? {
              ...alert,
              acknowledged: true,
              acknowledgedBy: selectedStaff || 'Unassigned',
              acknowledgedAt: new Date().toLocaleTimeString(),
              responseNotes: responseNotes
            }
          : alert
      ));
    }
    
    // Reset and close modals
    setShowResponseModal(false);
    setCurrentEmergency(null);
    setSelectedStaff('');
    setResponseNotes('');
  };

  const cancelResponse = () => {
    setShowResponseModal(false);
    setCurrentEmergency(null);
    setSelectedStaff('');
    setResponseNotes('');
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'low': return '#20c997'; // green
      case 'medium': return '#fd7e14'; // orange
      case 'high': return '#dc3545'; // red
      case 'critical': return '#8b0000'; // darkred
      default: return '#6c757d'; // gray
    }
  };

  return (
    <div className="dashboard-container fade-in">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-titles">
            <h1>Staff Alert Dashboard</h1>
            <span className="hotel-name">AIT Grand Hotel</span>
          </div>
          <div className="status-container">
            <div className="live-clock">{currentTime}</div>
            <span className="alert-count">Active Alerts: {alerts.length}</span>
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h2>All Clear</h2>
            <p>No active crisis alerts at this time.</p>
          </div>
        ) : (
          <div className="alerts-grid">
            {alerts.map((alert) => (
              <div key={alert.id} className="alert-card fade-in">
                <div className="alert-header">
                  <span 
                    className="severity-badge"
                    style={{ backgroundColor: getSeverityColor(alert.severity) }}
                  >
                    {alert.severity || 'UNKNOWN'}
                  </span>
                  <span className="alert-time">{alert.time}</span>
                </div>
                
                <h3 className="alert-type">{alert.crisis_type || 'Unspecified Crisis'}</h3>
                
                <div className="alert-details">
                  <div className="detail-row">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{alert.location || 'Not specified'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Summary:</span>
                    <p className="detail-text">{alert.summary || 'No details provided.'}</p>
                  </div>
                </div>
                
                <div className="alert-actions">
                  <button 
                    className="dismiss-btn"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    Dismiss Alert
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Emergency Pop-up Modal */}
      {showPopup && currentEmergency && (
        <div className="popup-overlay fade-in">
          <div className="popup-modal slide-up">
            <div className="popup-header" style={{ backgroundColor: getSeverityColor(currentEmergency.severity) }}>
              <div className="popup-icon"> emergency</div>
              <div className="popup-title">
                <h2>NEW EMERGENCY ALERT</h2>
                <p className="popup-time">{currentEmergency.time}</p>
              </div>
            </div>
            
            <div className="popup-content">
              <div className="emergency-details">
                <div className="emergency-type">
                  <span className="type-label">Crisis Type:</span>
                  <span className="type-value">{currentEmergency.crisis_type || 'Unknown'}</span>
                </div>
                
                <div className="emergency-location">
                  <span className="location-label">Location:</span>
                  <span className="location-value">{currentEmergency.location || 'Unknown'}</span>
                </div>
                
                <div className="emergency-severity">
                  <span className="severity-label">Severity:</span>
                  <span 
                    className="severity-badge-popup"
                    style={{ backgroundColor: getSeverityColor(currentEmergency.severity) }}
                  >
                    {currentEmergency.severity || 'Unknown'}
                  </span>
                </div>
                
                {currentEmergency.transcription && (
                  <div className="emergency-transcription">
                    <span className="transcription-label">Voice Message:</span>
                    <p className="transcription-text">"{currentEmergency.transcription}"</p>
                  </div>
                )}
                
                <div className="emergency-summary">
                  <span className="summary-label">Summary:</span>
                  <p className="summary-text">{currentEmergency.summary || 'No details available'}</p>
                </div>
              </div>
              
              <div className="popup-actions">
                <button 
                  className="popup-acknowledge-btn"
                  onClick={closePopup}
                >
                  Acknowledge & Respond
                </button>
                <button 
                  className="popup-dismiss-btn"
                  onClick={() => {
                    dismissAlert(currentEmergency.id);
                    closePopup();
                  }}
                >
                  Dismiss Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && currentEmergency && (
        <div className="response-overlay fade-in">
          <div className="response-modal slide-up">
            <div className="response-header">
              <h2>Emergency Response</h2>
              <p>Assign staff and add response notes</p>
            </div>
            
            <div className="response-content">
              <div className="emergency-summary">
                <div className="summary-row">
                  <span className="summary-label">Emergency:</span>
                  <span className="summary-value">{currentEmergency.crisis_type}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Location:</span>
                  <span className="summary-value">{currentEmergency.location}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Severity:</span>
                  <span 
                    className="severity-badge-response"
                    style={{ backgroundColor: getSeverityColor(currentEmergency.severity) }}
                  >
                    {currentEmergency.severity}
                  </span>
                </div>
              </div>
              
              <div className="response-form">
                <div className="form-group">
                  <label htmlFor="staff-select">Assign Staff Member:</label>
                  <select 
                    id="staff-select"
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="staff-select"
                  >
                    <option value="">Select staff member...</option>
                    <option value="John Smith">John Smith - Security</option>
                    <option value="Sarah Johnson">Sarah Johnson - Medical</option>
                    <option value="Mike Davis">Mike Davis - Maintenance</option>
                    <option value="Emily Wilson">Emily Wilson - Front Desk</option>
                    <option value="David Brown">David Brown - Manager</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="response-notes">Response Notes:</label>
                  <textarea 
                    id="response-notes"
                    value={responseNotes}
                    onChange={(e) => setResponseNotes(e.target.value)}
                    placeholder="Describe your response plan or current status..."
                    className="response-textarea"
                    rows="3"
                  />
                </div>
              </div>
              
              <div className="response-actions">
                <button 
                  className="response-submit-btn"
                  onClick={handleAcknowledgeResponse}
                  disabled={!selectedStaff}
                >
                  Submit Response
                </button>
                <button 
                  className="response-cancel-btn"
                  onClick={cancelResponse}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
