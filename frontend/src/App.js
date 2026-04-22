import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './Dashboard';
import './App.css';

function GuestView() {
  // Load state from localStorage on component mount, but reset recording status to idle
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [result, setResult] = useState(() => {
    const savedResult = localStorage.getItem('guestResult');
    return savedResult ? JSON.parse(savedResult) : null;
  });
  const [fallbackText, setFallbackText] = useState(() => {
    return localStorage.getItem('guestFallbackText') || '';
  });
  const recognition = useRef(null);
  const transcript = useRef('');

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('guestRecordingStatus', recordingStatus);
  }, [recordingStatus]);

  useEffect(() => {
    if (result) {
      localStorage.setItem('guestResult', JSON.stringify(result));
    } else {
      localStorage.removeItem('guestResult');
    }
  }, [result]);

  useEffect(() => {
    localStorage.setItem('guestFallbackText', fallbackText);
  }, [fallbackText]);

  const clearGuestState = () => {
    setRecordingStatus('idle');
    setResult(null);
    setFallbackText('');
    transcript.current = '';
    localStorage.removeItem('guestRecordingStatus');
    localStorage.removeItem('guestResult');
    localStorage.removeItem('guestFallbackText');
  };

  const startRecording = () => {
    // Clear previous state but keep fallback text
    setResult(null);
    transcript.current = '';
    
    // Check if browser supports Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setRecordingStatus('error');
      alert('Your browser does not support speech recognition. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition.current = new SpeechRecognition();
    
    recognition.current.continuous = false;
    recognition.current.interimResults = true;
    recognition.current.lang = 'en-US';
    recognition.current.maxDuration = 10000; // 10 seconds max

    recognition.current.onstart = () => {
      setRecordingStatus('recording');
      transcript.current = '';
    };

    recognition.current.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      transcript.current = finalTranscript + interimTranscript;
      console.log('Interim transcript:', transcript.current);
    };

    recognition.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        transcript.current = 'no speech detected';
      } else {
        setRecordingStatus('error');
        return;
      }
    };

    recognition.current.onend = () => {
      setRecordingStatus('analyzing');
      
      // Send the final transcript to backend for analysis
      const finalText = transcript.current.trim() || 'no speech detected';
      console.log('Final transcript:', finalText);
      
      sendTranscriptToBackend(finalText);
    };

    recognition.current.start();
  };

  const stopRecording = () => {
    if (recognition.current && recordingStatus === 'recording') {
      recognition.current.stop();
    }
  };

  const playVoiceMessage = (message) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const sendTranscriptToBackend = async (text) => {
    try {
      const response = await fetch('http://localhost:8000/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      setResult(data);
      setRecordingStatus('complete');
      
      // Play voice confirmation when response is submitted
      if (data.emails_sent > 0) {
        const emergencyType = data.analysis?.crisis_type || 'emergency';
        const location = data.analysis?.location || 'unknown location';
        const staffRole = data.assigned_staff?.[0]?.role || 'respected department';
        
        const voiceMessage = `Thank you for reporting the ${emergencyType} emergency at ${location}. Your response has been submitted and ${staffRole} has been notified. Help is on the way. Please stay calm and remain safe.`;
        
        setTimeout(() => {
          playVoiceMessage(voiceMessage);
        }, 1000);
      }
    } catch (error) {
      console.error("Error analyzing text:", error);
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
      
      // Play voice confirmation when response is submitted
      if (data.emails_sent > 0) {
        const emergencyType = data.analysis?.crisis_type || 'emergency';
        const location = data.analysis?.location || 'unknown location';
        const staffRole = data.assigned_staff?.[0]?.role || 'respected department';
        
        const voiceMessage = `Thank you for reporting the ${emergencyType} emergency at ${location}. Your response has been submitted and ${staffRole} has been notified. Help is on the way. Please stay calm and remain safe.`;
        
        setTimeout(() => {
          playVoiceMessage(voiceMessage);
        }, 1000);
      }
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
          onClick={recordingStatus === 'recording' ? stopRecording : startRecording}
          disabled={recordingStatus === 'analyzing'}
        >
          <div className="button-content">
            {recordingStatus === 'idle' && 'HELP'}
            {recordingStatus === 'recording' && 'STOP'}
            {recordingStatus === 'analyzing' && 'ANALYZING...'}
            {recordingStatus === 'complete' && 'HELP'}
            {recordingStatus === 'error' && 'ERROR'}
          </div>
        </button>
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
          Listening... Click STOP when done speaking
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
          <button 
            onClick={clearGuestState}
            className="clear-button"
            style={{
              background: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '15px'
            }}
          >
            Clear Results
          </button>
          
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
