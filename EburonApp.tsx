import React, { useState, useEffect, useRef } from 'react';
import { useLiveAPIContext } from './contexts/LiveAPIContext';
import { useLogStore } from './lib/state';
import { AudioRecorder } from './lib/audio-recorder';

export default function EburonApp() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);

  const { client, connect, disconnect, connected, volume, setConfig } = useLiveAPIContext();
  const turns = useLogStore((state) => state.turns);
  
  const [micState, setMicState] = useState(false);
  const [audioRecorder] = useState(() => new AudioRecorder());

  const [message, setMessage] = useState('');
  const chatAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('eburon_auth');
    if (!isLoggedIn) {
      setIsAuthOpen(true);
      setIsSignupMode(true);
    }
  }, []);

  useEffect(() => {
    setConfig({
      generationConfig: {
        responseModalities: ['audio'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
      },
      systemInstruction: {
        parts: [{ text: "You are Beatrice, an AI executive assistant. When connected, greet the user warmly and concisely. Be ready to perform actions and write short responses." }]
      }
    });
  }, [setConfig]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([{ mimeType: 'audio/pcm;rate=16000', data: base64 }]);
    };
    if (connected && micState) {
      audioRecorder.on('data', onData).start();
    } else {
      audioRecorder.stop();
    }
    return () => { audioRecorder.off('data', onData); };
  }, [connected, micState, client, audioRecorder]);

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTo({ top: chatAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [turns]);

  const handleConnectToggle = async () => {
    if (connected) disconnect();
    else await connect();
  };

  const simulateLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('eburon_auth', 'true');
    setIsAuthOpen(false);
    setActiveOverlay('settings');
  };

  const handleSend = () => {
    if (!message.trim()) return;
    client.send({ text: message });
    useLogStore.getState().addTurn({ role: 'user', text: message, isFinal: true });
    setMessage('');
  };

  const handleToolAction = (toolId: string) => {
    if (['history', 'tools', 'profile', 'settings'].includes(toolId)) {
      setActiveOverlay(toolId);
    } else {
      const prompts: Record<string, string> = {
        'tasks': 'Can you show my pending tasks?',
        'calendar': 'What does my schedule look like today?',
        'drive': 'Find the latest project files in my Google Drive.',
        'google': 'Run a quick Google search on recent tech news.',
        'signature': 'Prepare a non-disclosure agreement for signature.',
        'company': 'Look up the company registration details for Acme Corp.',
        'proposal': 'Draft a business proposal for a new client.',
        'gmail': 'Check my inbox for unread emails from the team.',
        'sheets': 'Create a new expense tracking spreadsheet.',
        'slides': 'Generate a presentation template for the Q3 review.'
      };
      const prompt = prompts[toolId] || `Execute action: ${toolId}`;
      if (connected) client.send({ text: prompt });
      else {
        useLogStore.getState().addTurn({ role: 'user', text: prompt, isFinal: true });
        setTimeout(() => useLogStore.getState().addTurn({ role: 'agent', text: "I'm disconnected.", isFinal: true }), 800);
      }
    }
  };

  return (
    <div id="app" className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="ai-name">Eburon AI</span>
          {volume > 0.01 && connected && (
            <div id="audio-visualizer" className="active">
              <div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div>
            </div>
          )}
        </div>
        <div className="header-right">
          <button 
             onClick={handleConnectToggle} 
             className="connect-btn"
             style={{ backgroundColor: connected ? 'var(--accent-active)' : 'var(--accent-primary)' }}
          >
            <i className="ph-bold ph-plug"></i> <span>{connected ? 'Connected' : 'Connect'}</span>
          </button>
        </div>
      </header>

      {/* Skills Rail */}
      <div id="skills-rail">
        <div className="skills-row" data-row="1">
          <div className="skills-track" ref={trackRef}>
            <div className="skill-chip" onClick={() => handleToolAction('profile')}><div className="skill-glyph bg-profile"><i className="ph-duotone ph-user"></i></div><span className="skill-label">Profile</span></div>
            <div className="skill-chip" onClick={() => handleToolAction('tasks')}><div className="skill-glyph bg-tasks"><i className="ph-duotone ph-list-checks"></i></div><span className="skill-label">Tasks</span></div>
            <div className="skill-chip" onClick={() => handleToolAction('calendar')}><div className="skill-glyph bg-calendar"><i className="ph-duotone ph-calendar-dots"></i></div><span className="skill-label">Calendar</span></div>
            <div className="skill-chip" onClick={() => handleToolAction('drive')}><div className="skill-glyph bg-drive"><i className="ph-duotone ph-folder-open"></i></div><span className="skill-label">Drive</span></div>
            <div className="skill-chip" onClick={() => handleToolAction('google')}><div className="skill-glyph bg-google"><i className="ph-fill ph-google-logo"></i></div><span className="skill-label">Google</span></div>
            <div className="skill-chip" onClick={() => handleToolAction('signature')}><div className="skill-glyph bg-signature"><i className="ph-duotone ph-signature"></i></div><span className="skill-label">Sign</span></div>
            <div className="skill-chip" onClick={() => handleToolAction('company')}><div className="skill-glyph bg-company"><i className="ph-duotone ph-buildings"></i></div><span className="skill-label">Company</span></div>
          </div>
        </div>
        <div className="skills-row" data-row="2">
          <div className="skills-track">
            <div className="skill-chip" onClick={() => handleToolAction('settings')}><div className="skill-glyph bg-settings"><i className="ph-duotone ph-gear"></i></div><span className="skill-label">Settings</span></div>
            <div className="skill-chip" onClick={() => handleToolAction('tools')}><div className="skill-glyph bg-tools"><i className="ph-duotone ph-wrench"></i></div><span className="skill-label">Tools</span></div>
            <div className="skill-chip" onClick={() => handleToolAction('history')}><div className="skill-glyph bg-history"><i className="ph-duotone ph-clock-counter-clockwise"></i></div><span className="skill-label">History</span></div>
            <div className="skill-chip" onClick={() => handleToolAction('proposal')}><div className="skill-glyph bg-proposal"><i className="ph-duotone ph-presentation-chart"></i></div><span className="skill-label">Proposal</span></div>
            <div className="skill-chip" onClick={() => handleToolAction('gmail')}><div className="skill-glyph bg-gmail"><i className="ph-duotone ph-envelope-simple"></i></div><span className="skill-label">Mail</span></div>
            <div className="skill-chip" onClick={() => handleToolAction('sheets')}><div className="skill-glyph bg-sheets"><i className="ph-duotone ph-table"></i></div><span className="skill-label">Sheets</span></div>
            <div className="skill-chip" onClick={() => handleToolAction('slides')}><div className="skill-glyph bg-slides"><i className="ph-duotone ph-presentation-chart"></i></div><span className="skill-label">Slides</span></div>
          </div>
        </div>
      </div>

      {/* Chat Stream */}
      <main id="text-streaming-area" ref={chatAreaRef}>
        <div id="conversation-container">
          <div className="conversation-message ai">Hey Boss! I'm Beatrice. Connect your session!</div>
          {turns.filter(turn => turn.role !== 'system').map((turn, i) => (
             <div key={i} className={`conversation-message ${turn.role === 'user' ? 'user' : 'ai'}`}>
                {turn.text}
             </div>
          ))}
        </div>
      </main>

      {/* Bottom Dock */}
      <div className="bottom-dock">
        <div className="input-wrapper">
          <div className="input-bar">
            <button className="attach-btn"><i className="ph ph-paperclip"></i></button>
            <input 
               type="text" 
               id="message-input" 
               placeholder="Message or ask Beatrice..." 
               value={message}
               onChange={(e) => setMessage(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
               autoComplete="off" />
            <button id="send-button" className="send-btn" onClick={handleSend}><i className="ph-bold ph-paper-plane-right"></i></button>
          </div>
        </div>
        <nav className="nav-controls">
          <button className="nav-item" onClick={() => setMicState(!micState)} style={{ color: micState ? 'var(--accent-active)' : 'var(--text-muted)' }}>
             <i className="ph-fill ph-microphone"></i> <span>Mic</span>
          </button>
          <button className="nav-item"><i className="ph ph-video-camera"></i> <span>Camera</span></button>
          <button className="nav-item"><i className="ph ph-screencast"></i> <span>Share</span></button>
        </nav>
      </div>

      {/* Profile Overlay */}
      <div id="overlay-profile" className={`full-page-overlay ${activeOverlay === 'profile' ? 'active' : ''}`}>
        <div className="overlay-header">
          <div className="overlay-title">User Profile</div>
          <button className="close-overlay-btn" onClick={() => setActiveOverlay(null)}><i className="ph-bold ph-x"></i></button>
        </div>
        <div className="overlay-content">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src="https://ui-avatars.com/api/?name=Boss&background=cbfb45&color=000&size=100" style={{ borderRadius: '50%', marginBottom: '12px' }} alt="Profile" />
            <h2 style={{ fontSize: '20px' }}>Chief Executive</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>admin@eburon.ai</p>
          </div>
          
          <div className="form-group">
            <label>Persona Background</label>
            <textarea className="form-input" rows={5} placeholder="Tell Beatrice about your business context, communication style..."></textarea>
          </div>

          <button className="save-now-btn" onClick={(e) => {
             const btn = e.currentTarget;
             btn.textContent = 'Saved!';
             setTimeout(() => { btn.textContent = 'Save Now'; setActiveOverlay(null); }, 1500)
          }}>Save Now</button>

          <div className="danger-action" onClick={() => { localStorage.removeItem('eburon_auth'); window.location.reload(); }}>
            Log Out
          </div>
        </div>
      </div>

      {/* Settings Overlay */}
      <div id="overlay-settings" className={`full-page-overlay ${activeOverlay === 'settings' ? 'active' : ''}`}>
        <div className="overlay-header">
          <div className="overlay-title">App Settings</div>
          <button className="close-overlay-btn" onClick={() => setActiveOverlay(null)}><i className="ph-bold ph-x"></i></button>
        </div>
        <div className="overlay-content">
          <div className="form-group">
            <label>Persona Name</label>
            <input type="text" className="form-input" defaultValue="Beatrice" />
          </div>
          <div className="form-group">
            <label>How to call you</label>
            <input type="text" className="form-input" defaultValue="Boss" />
          </div>
          <div className="form-group">
             <label>Voice Persona</label>
             <select className="form-input" onChange={(e) => {
                setConfig({
                   generationConfig: { responseModalities: ['audio'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: e.target.value } } } }
                });
             }}>
                <option value="Aoede">Aoede</option>
                <option value="Charon">Charon</option>
                <option value="Fenrir">Fenrir</option>
                <option value="Kore">Kore</option>
                <option value="Puck">Puck</option>
             </select>
          </div>
          <button className="save-now-btn" onClick={() => setActiveOverlay(null)}>Save Settings</button>
        </div>
      </div>

      {/* History Overlay */}
      <div id="overlay-history" className={`full-page-overlay ${activeOverlay === 'history' ? 'active' : ''}`}>
        <div className="overlay-header">
          <div className="overlay-title">Activity History</div>
          <button className="close-overlay-btn" onClick={() => setActiveOverlay(null)}><i className="ph-bold ph-x"></i></button>
        </div>
        <div className="overlay-content"><p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>No recent history.</p></div>
      </div>

      {/* Tools Overlay */}
      <div id="overlay-tools" className={`full-page-overlay ${activeOverlay === 'tools' ? 'active' : ''}`}>
        <div className="overlay-header">
          <div className="overlay-title">Integrations</div>
          <button className="close-overlay-btn" onClick={() => setActiveOverlay(null)}><i className="ph-bold ph-x"></i></button>
        </div>
        <div className="overlay-content"><p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>All tools active.</p></div>
      </div>

      {/* Auth Screen */}
      <div id="auth-screen" className={`full-page-overlay ${isAuthOpen ? 'active' : ''}`}>
        <div className="auth-glow"></div>
        <div className="auth-card" id="auth-card-inner">
          <div className="auth-logo-box">
            <svg viewBox="0 0 24 24" style={{ width: '44px', height: '44px', stroke: '#fff', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'}}>
              <path d="M12 3a5.5 5.5 0 0 0-4.76 8.24L12 21l4.76-9.76A5.5 5.5 0 0 0 12 3z"/>
              <path d="M12 3l-4.76 9.76A5.5 5.5 0 0 0 12 21a5.5 5.5 0 0 0 4.76-8.24L12 3z"/>
            </svg>
          </div>

          <h2>{isSignupMode ? 'Register' : 'Login'}</h2>
          <p className="subtitle">{isSignupMode ? 'Create your new account' : 'Welcome back to Eburon'}</p>

          <form className="auth-form" onSubmit={simulateLogin}>
            {isSignupMode && (
               <div className="auth-input-wrapper">
                 <i className="ph ph-user auth-icon-left"></i>
                 <input type="text" placeholder="Full name" />
               </div>
            )}
            <div className="auth-input-wrapper">
              <i className="ph ph-envelope auth-icon-left"></i>
              <input type="email" placeholder="Email" required />
            </div>
            <div className="auth-input-wrapper">
              <i className="ph ph-lock auth-icon-left"></i>
              <input type="password" placeholder="Password" required />
            </div>
            {isSignupMode && (
                <div className="auth-input-wrapper">
                   <i className="ph ph-lock auth-icon-left"></i>
                   <input type="password" placeholder="Confirm password" />
                </div>
            )}
            <button type="submit" className="auth-submit-btn">{isSignupMode ? 'Sign up' : 'Sign in'}</button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <button className="btn-google" onClick={(e) => simulateLogin(e as any)}>
            <div className="g-icon-circle">G</div>
            Continue with Google
          </button>

          <div className="permissions-note">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><i className="ph-fill ph-shield-check" style={{color: 'var(--accent-active)'}}></i> Google Workspace Sync</span>
            <span>Requires Read/Write permissions for Gmail, Drive, Calendar, and Tasks to enable full automation.</span>
          </div>

          <div className="auth-toggle">
            {isSignupMode ? 'Back to ' : 'Don\'t have an account? '}
            <span onClick={() => setIsSignupMode(!isSignupMode)}>
              {isSignupMode ? 'Sign in' : 'Sign up'}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
