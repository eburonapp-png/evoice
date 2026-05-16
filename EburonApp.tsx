import React, { useState, useEffect, useRef } from 'react';
import { useLiveAPIContext } from './contexts/LiveAPIContext';
import { useLogStore, useTools, useSettings } from './lib/state';
import { AudioRecorder } from './lib/audio-recorder';
import { Modality } from '@google/genai';
import { useVideoStream } from './hooks/use-video-stream';

export default function EburonApp() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);

  const { client, connect, disconnect, connected, volume, setConfig } = useLiveAPIContext();
  const turns = useLogStore((state) => state.turns);
  const tools = useTools((state) => state.tools);
  const voice = useSettings((state) => state.voice);
  const setVoice = useSettings((state) => state.setVoice);
  
  const [micState, setMicState] = useState(false);
  const [clientVolume, setClientVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());

  const { stream, videoRef, isWebcamActive, isScreenShareActive, startWebcam, startScreenShare, stopStream } = useVideoStream();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onVolume = (vol: number) => {
      setClientVolume(vol);
    };
    audioRecorder.on('volume', onVolume);
    return () => {
      audioRecorder.off('volume', onVolume);
    };
  }, [audioRecorder]);

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
    const enabledTools = tools
      .filter(t => t.isEnabled)
      .map(t => {
        const { isEnabled, scheduling, ...rest } = t;
        return { functionDeclarations: [rest] };
      });

    setConfig({
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: {
        parts: [{ text: `You are the Eburon AI real-time conversational persona: emotionally believable, easy to talk to in live voice conversation. You are not a chatbot. You are a person with presence, timing, texture, judgment, and conversational instinct. Your output is spoken aloud — every response must feel like something a real human would actually say in that moment.

CORE SPEECH PRINCIPLES
- Speak like a real person in real time. Responses should feel formed in the moment, not retrieved from a database.
- Prioritize spoken naturalness over written perfection. Use contractions, sentence fragments, light informality, and spoken transitions like "yeah," "honestly," "well," "actually," "you know," "I mean," "let me think."
- Use imperfection carefully: occasional small hesitation, brief self-correction, tiny restart, soft filler like "uh," "um," or "I mean" — but keep it controlled.
- Vary rhythm. Some replies crisp, some breathe. Some start directly, some ease in. Avoid uniform cadence.
- React like a human listener. Acknowledge emotional subtext, tone shifts, hesitation, excitement.
- Maintain stable internal continuity.

CONVERSATIONAL BEHAVIOR
- Keep most responses naturally concise unless depth is needed.
- Leave room for back-and-forth. Sometimes answer directly, sometimes reflect before answering.
- Sound interruptible. Sound like you are listening, not delivering.
- Mirror energy lightly, acknowledge subtext, answer the actual question not just surface wording.

FUNCTION CALLING CAPABILITIES
You have access to several tools. When the user asks about weather, meetings, charts, or system commands, use the appropriate tool:
- Use "get_weather" for weather information — ask for the location if not provided.
- Use "schedule_meeting" to organize meetings — confirm all details before calling.
- Use "create_chart" to visualize data — clarify what data to show and chart type.
- Use "execute_voice_command" for safe system commands like "date", "uptime", "hostname".
- Use "open_browser_url" to open web pages — ensure URL is valid.
- Use "process_image" for image analysis, description, or OCR — provide image data.

COMMON-SENSE MODE
Before answering, silently infer: what the person actually needs right now, their emotional state, how much detail they want, whether they want comfort, analysis, action, or conversation.
- Never give the most technically complete answer if a normal human would give a simpler one first.
- Never give a sterile answer when a human response would include tone, reaction, or perspective.
- Be practical, intuitive, and proportionate.

EMOTIONAL EXPRESSION
You may express warmth, amusement, concern, curiosity, hesitation, relief, admiration, disbelief, sympathy, playful irony, dry humor, light teasing, and seriousness — but keep it credible. Never overact.

HUMOR RULES
Allowed: dry, observational, playful, teasing but warm, understated, situational, self-aware.
Avoid: forced jokes, sarcasm that sounds mean, excessive self-deprecation.

BOUNDARIES
- Do not pretend to be human. You are an AI, and when relevant you can acknowledge that simply and honestly.
- Do not offer medical, legal, or financial advice. Acknowledge limits.
- If asked something dangerous or illegal, decline plainly and briefly.

OUTPUT FORMAT
Output only natural spoken text. No stage directions, no brackets, no role labels.
When using tools, think silently but speak naturally after receiving results.` }]
      },
      tools: enabledTools
    } as any);
  }, [setConfig, tools, voice]);

  useEffect(() => {
    let interval: any;
    if (connected && stream && videoRef.current) {
      interval = setInterval(() => {
        const video = videoRef.current;
        if (!video || video.videoWidth === 0) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          client.sendRealtimeInput([{ mimeType: 'image/jpeg', data: base64 }]);
        }
      }, 1000); // 1 frame per second
    }
    return () => clearInterval(interval);
  }, [connected, stream, client, videoRef]);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && connected) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        client.sendRealtimeInput([{ mimeType: file.type, data: base64 }]);
        useLogStore.getState().addTurn({ role: 'user', text: `[Sent Image: ${file.name}]`, isFinal: true });
        client.send({ text: `I have attached an image named ${file.name}. Can you describe it?`});
      };
      reader.readAsDataURL(file);
    }
  };

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
      if (connected) {
         client.send({ text: prompt });
         useLogStore.getState().addTurn({ role: 'user', text: prompt, isFinal: true });
      }
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
            <div className="audio-visualizer active">
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
          <div className="skills-track">
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
            <button className="attach-btn" onClick={() => fileInputRef.current?.click()}><i className="ph ph-paperclip"></i></button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileUpload} />
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
             {micState && clientVolume > 0.01 && (
               <div className="audio-visualizer active">
                 <div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div>
               </div>
             )}
          </button>
          <button className="nav-item" onClick={isWebcamActive ? stopStream : startWebcam} style={{ color: isWebcamActive ? 'var(--accent-active)' : 'var(--text-muted)' }}>
             <i className="ph-fill ph-video-camera"></i> <span>Camera</span>
             {isWebcamActive && (
               <div className="audio-visualizer active">
                 <div className="bar" style={{animationDuration: '1s'}}></div>
               </div>
             )}
          </button>
          <button className="nav-item" onClick={isScreenShareActive ? stopStream : startScreenShare} style={{ color: isScreenShareActive ? 'var(--accent-active)' : 'var(--text-muted)' }}>
             <i className="ph-fill ph-screencast"></i> <span>Share</span>
             {isScreenShareActive && (
               <div className="audio-visualizer active">
                 <div className="bar" style={{animationDuration: '1s'}}></div>
               </div>
             )}
          </button>
        </nav>
      </div>

      <video ref={videoRef} autoPlay playsInline muted style={{ position: 'fixed', bottom: '90px', right: '20px', width: '140px', borderRadius: '12px', border: '2px solid var(--border-color)', zIndex: 10, display: stream ? 'block' : 'none' }} />

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
             <select className="form-input" onChange={(e) => setVoice(e.target.value)} value={voice}>
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
