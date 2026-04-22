import React, { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './Dashboard';
import './App.css';

function GuestView() {
  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle, recording, analyzing, complete, error
  const [result, setResult] = useState(null);
  const [fallbackText, setFallbackText] = useState('');
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        await sendAudio(audioBlob);
      };

      mediaRecorder.current.start();
      setRecordingStatus('recording');

      // Stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
          mediaRecorder.current.stop();
          setRecordingStatus('analyzing');
        }
      }, 10000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      setRecordingStatus('error');
    }
  };

  const sendAudio = async (audioBlob) => {
    const formData = new FormData();
    // Some backends might need a specific filename/extension
    formData.append('file', audioBlob, 'recording.webm');

    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      setResult(data);
      setRecordingStatus('complete');
    } catch (error) {
      console.error("Error analyzing audio:", error);
      setRecordingStatus('error');
    }
  };

  const sendFallbackText = async () => {
    if (!fallbackText.trim()) return;
    setResult(null);
    setRecordingStatus('analyzing');
    
    try {
      const response = await fetch('http://localhost:8000/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fallbackText }),
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      setResult(data);
      setRecordingStatus('complete');
      setFallbackText('');
    } catch (error) {
      console.error("Error analyzing text:", error);
      setRecordingStatus('error');
    }
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
    <div className="content-wrapper">
      <h1 className="title">CalmAI</h1>
      <p className="subtitle">Voice-First Emergency Response</p>
      
      <div className="button-container">
        <button 
          className={`panic-button ${recordingStatus}`}
          onClick={(recordingStatus === 'idle' || recordingStatus === 'complete' || recordingStatus === 'error') ? startRecording : undefined}
          disabled={recordingStatus === 'recording' || recordingStatus === 'analyzing'}
        >
          <div className="button-content">
            {recordingStatus === 'idle' && 'HELP'}
            {recordingStatus === 'recording' && 'RECORDING...'}
            {recordingStatus === 'analyzing' && 'ANALYZING...'}
            {recordingStatus === 'complete' && 'HELP'}
            {recordingStatus === 'error' && 'ERROR'}
          </div>
        </button>
      </div>

      <div className="qr-section">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=Room101" alt="Room QR Code" className="qr-image" />
        <p className="qr-text">Scan at your room</p>
      </div>

      <div className="fallback-container">
        <p className="fallback-title">Or describe the crisis manually:</p>
        <div className="fallback-input-group">
          <input 
            type="text" 
            value={fallbackText}
            onChange={(e) => setFallbackText(e.target.value)}
            placeholder="E.g. Medical emergency in the lobby!" 
            disabled={recordingStatus === 'recording' || recordingStatus === 'analyzing'}
            className="fallback-input"
          />
          <button 
            onClick={sendFallbackText} 
            disabled={!fallbackText.trim() || recordingStatus === 'recording' || recordingStatus === 'analyzing'}
            className="fallback-button"
          >
            Send Alert
          </button>
        </div>
      </div>

      {recordingStatus === 'recording' && (
        <div className="status-indicator fade-in">
          <span className="pulse-dot"></span>
          Listening for 10 seconds...
        </div>
      )}

      {recordingStatus === 'error' && (
        <div className="error-message fade-in">
          Failed to process request. Please try again.
        </div>
      )}

      {result && recordingStatus === 'complete' && (
        <div className="results-card fade-in">
          <h2 className="results-title">Analysis Complete</h2>
          
          <div className="results-grid">
            <div className="result-item">
              <span className="label">Crisis Type</span>
              <span className="value capitalize">{result.analysis?.crisis_type || 'Unknown'}</span>
            </div>
            
            <div className="result-item">
              <span className="label">Severity</span>
              <span 
                className="value badge capitalize"
                style={{ backgroundColor: getSeverityColor(result.analysis?.severity) }}
              >
                {result.analysis?.severity || 'Unknown'}
              </span>
            </div>
            
            <div className="result-item">
              <span className="label">Location</span>
              <span className="value">{result.analysis?.location || 'Not Specified'}</span>
            </div>
          </div>
          
          <div className="result-section">
            <span className="label">Summary</span>
            <p className="text-content">{result.analysis?.summary || 'No summary available.'}</p>
          </div>
          
          <div className="result-section">
            <span className="label">Transcribed Text</span>
            <p className="text-content italic">"{result.transcription}"</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="top-nav">
      <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Guest App</Link>
      <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>Staff Dashboard</Link>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navigation />
        <Routes>
          <Route path="/" element={<GuestView />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
