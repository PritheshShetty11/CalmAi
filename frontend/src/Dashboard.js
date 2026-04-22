import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';

function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
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

        return [
          {
            id: Date.now(),
            ...data.analysis,
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ];
      });

      playBeep();
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
    </div>
  );
}

export default Dashboard;
