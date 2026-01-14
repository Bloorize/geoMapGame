import { useState, useRef, useEffect } from 'react'
import './App.css'
import { MapPin, Send, HelpCircle, Trophy, RefreshCw, AlertCircle, LogOut, User as UserIcon } from 'lucide-react'
import { loadGoogleMaps, getRandomLocation } from './utils/maps'
import { getAIHint } from './services/ai'
import { supabase } from './utils/supabase'
import Auth from './components/Auth'
import Leaderboard from './components/Leaderboard'

interface Message {
  role: 'ai' | 'user'
  text: string
}

const REGIONS = [
  { id: 'global', name: 'Global', icon: '🌍' },
  { id: 'europe', name: 'Europe', icon: '🇪🇺' },
  { id: 'north-america', name: 'N. America', icon: '🏔️' },
  { id: 'south-america', name: 'S. America', icon: '🌴' },
  { id: 'US', name: 'United States', icon: '🇺🇸' },
];

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

function App() {
  const [session, setSession] = useState<any>(null)
  const [gameState, setGameState] = useState<'start' | 'playing' | 'result'>('start')
  const [gameResult, setGameResult] = useState<'win' | 'loss' | null>(null)
  const [score, setScore] = useState(0)
  const [turns, setTurns] = useState(3)
  const [messages, setMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState('')
  const [location, setLocation] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('global')

  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const saveScore = async (finalScore: number, locationName?: string) => {
    if (!session?.user) {
      console.warn('saveScore called but no user session found')
      return
    }

    try {
      console.log(`Checking current high score for user: ${session.user.id}`)

      // 1. Record the individual game result
      if (locationName) {
        const { error: gameError } = await supabase
          .from('games')
          .insert({
            user_id: session.user.id,
            score: finalScore,
            location_name: locationName,
            created_at: new Date().toISOString()
          })

        if (gameError) console.error('Error saving individual game result:', gameError)
        else console.log('Individual game result saved successfully')
      }

      // 2. Update the high score profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, high_score')
        .eq('id', session.user.id)
        .maybeSingle()

      if (fetchError) {
        console.error('Error fetching profile in saveScore:', fetchError)
        return
      }

      const currentHighScore = profile?.high_score || 0

      if (!profile || finalScore > currentHighScore) {
        console.log(`Saving new high score: ${finalScore} (current top: ${currentHighScore})`)
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            username: session.user.user_metadata?.username || session.user.email,
            high_score: Math.max(finalScore, currentHighScore),
            updated_at: new Date().toISOString()
          })

        if (upsertError) {
          console.error('Error upserting profile score:', upsertError)
        } else {
          console.log('Score saved successfully via upsert')
        }
      }
    } catch (err) {
      console.error('Caught exception in saveScore:', err)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  const startGame = async (region: string = selectedRegion) => {
    const mapsKey = import.meta.env.VITE_MAPS_API_KEY
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY

    if (!mapsKey || mapsKey.includes('YOUR_') || !geminiKey || geminiKey.includes('YOUR_')) {
      setIsError(true)
      return
    }

    setIsLoading(true)
    setScore(0)
    setGameResult(null)
    setGameState('playing')
    setTurns(3)

    const isStateGame = region !== 'global' && !['europe', 'south-america', 'north-america', 'US'].includes(region)
    const initialMsg = isStateGame
      ? `Welcome to ${region}! Can you find which city we're in?`
      : 'Hello Explorer! Ask me anything about this location to narrow down your guess.'

    setMessages([{ role: 'ai', text: initialMsg }])

    try {
      await loadGoogleMaps(mapsKey)
      const svService = new google.maps.StreetViewService()
      const loc = await getRandomLocation(svService, region === 'US' ? 'north-america' : region)
      setLocation(loc)

      const panorama = new google.maps.StreetViewPanorama(
        document.getElementById('street-view-container') as HTMLElement,
        {
          position: { lat: loc.lat, lng: loc.lng },
          pov: { heading: 165, pitch: 0 },
          zoom: 1,
          addressControl: false,
          showRoadLabels: false,
          motionTracking: false,
          motionTrackingControl: false
        }
      )

      panorama.addListener('status_changed', () => {
        if (panorama.getStatus() !== 'OK') console.error('Street View Status Error:', panorama.getStatus());
      });

      panoramaRef.current = panorama
    } catch (err) {
      console.error('Detailed Game Error:', err)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async (type: 'question' | 'guess', customInput?: string) => {
    if (turns <= 0) return
    const input = customInput || userInput
    if (!input.trim()) return

    if (type === 'question') {
      const nextTurns = turns - 1
      setTurns(nextTurns)
      setMessages(prev => [...prev, { role: 'user', text: input }])
      setUserInput('')

      const city = location?.panoramaData?.location?.description?.split(',')[0]?.trim() || 'Unknown'
      const country = location?.panoramaData?.location?.description?.split(',').pop()?.trim() || 'Unknown'

      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY
      const response = await getAIHint(geminiKey, input, { city, country })
      setMessages(prev => [...prev, { role: 'ai', text: response }])

      if (nextTurns <= 0) {
        setGameResult('loss')
        setScore(0)
        await saveScore(0, location?.panoramaData?.location?.description)
        setGameState('result')
      }
    } else {
      // Tiered Guess Logic
      const address = location?.panoramaData?.location?.description || ''
      const addressParts = address.split(',').map((p: string) => p.trim())
      const guess = input.trim().toLowerCase()

      // Extraction (order usually: City, State/Region, Country)
      const country = addressParts.length > 0 ? addressParts[addressParts.length - 1] : ''
      const state = addressParts.length > 1 ? addressParts[addressParts.length - 2] : ''
      const city = addressParts.length > 2 ? addressParts[addressParts.length - 3] : ''

      const matchCity = city && (guess.includes(city.toLowerCase()) || city.toLowerCase().includes(guess) && guess.length > 3)
      const matchState = state && (guess.includes(state.toLowerCase()) || state.toLowerCase().includes(guess) && guess.length > 3)
      const matchCountry = country && (guess.includes(country.toLowerCase()) || country.toLowerCase().includes(guess) && guess.length > 3)

      let matchCount = 0
      if (matchCity) matchCount++
      if (matchState) matchCount++
      if (matchCountry) matchCount++

      // US Country-Only Exception
      const isUSGame = selectedRegion === 'US' || US_STATES.includes(selectedRegion)
      if (isUSGame && matchCount === 1 && matchCountry) {
        matchCount = 0 // Country-only in US doesn't count
      }

      if (matchCount > 0) {
        // Tiered points
        const basePoints = selectedRegion === 'global' ? 1000 : (['europe', 'south-america', 'north-america', 'US'].includes(selectedRegion) ? 500 : 250)
        const turnMultiplier = [1, 0.5, 0.25][3 - turns] || 0.25

        // Multiplier: 3 parts (100%), 2 parts (60%), 1 part (30%)
        const completenessMultiplier = matchCount === 3 ? 1 : (matchCount === 2 ? 0.6 : 0.3)

        const finalPoints = Math.round(basePoints * turnMultiplier * completenessMultiplier)

        setScore(finalPoints)
        setGameResult('win')
        await saveScore(finalPoints, address)
        setGameState('result')
      } else {
        const nextTurns = turns - 1
        setTurns(nextTurns)
        setMessages(prev => [...prev, { role: 'user', text: `My guess: ${input}` }])
        setMessages(prev => [...prev, { role: 'ai', text: `Not quite! That doesn't look like ${input} to me.` }])
        setUserInput('')

        if (nextTurns <= 0) {
          setGameResult('loss')
          setScore(0)
          await saveScore(0, address)
          setGameState('result')
        }
      }
    }
  }

  if (!session) {
    return <Auth onSession={(user) => setSession({ user })} />
  }

  return (
    <div className="game-container">
      <div className="user-badge">
        <UserIcon size={16} />
        <span>{session.user.user_metadata?.username || session.user.email}</span>
        <button className="logout-btn" onClick={handleLogout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>

      {isError && (
        <div className="glass error-overlay fade-in">
          <AlertCircle color="var(--danger)" size={48} />
          <h2>API Keys Required</h2>
          <p>Please provide valid Google Maps and Gemini API keys in the <code>.env</code> file.</p>
          <button className="btn btn-secondary" onClick={() => setIsError(false)}>Close</button>
        </div>
      )}

      {gameState === 'start' && (
        <div className="start-screen fade-in">
          <div className="glass hero-card region-selector">
            <div className="logo-icon"><MapPin size={48} /></div>
            <h1>GeoQuest AI</h1>
            <p className="subtitle">Choose your discovery mission</p>

            <div className="region-grid">
              {REGIONS.map(r => (
                <button
                  key={r.id}
                  className={`region-btn ${selectedRegion === r.id ? 'active' : ''}`}
                  onClick={() => setSelectedRegion(r.id)}
                >
                  <span className="icon">{r.icon}</span>
                  <span className="name">{r.name}</span>
                </button>
              ))}
            </div>

            <div className="state-select-container">
              <label>Or pick a specific US State:</label>
              <select
                className="glass-select"
                value={US_STATES.includes(selectedRegion) ? selectedRegion : ''}
                onChange={(e) => setSelectedRegion(e.target.value)}
              >
                <option value="">Select a State...</option>
                {US_STATES.map(state => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>

            <button className="btn btn-primary start-btn" onClick={() => startGame()}>
              Start Discovery
            </button>

            <Leaderboard />
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="game-screen">
          <div id="street-view-container">
            {isLoading && (
              <div className="map-placeholder">
                <RefreshCw size={32} className="spin" />
                <p>Initializing World Discovery...</p>
              </div>
            )}
          </div>

          {!isLoading && (
            <div className="glass interaction-panel fade-in">
              <div className="stats-header">
                <div className="stat">
                  <span className="label">TURNS</span>
                  <span className="value">{turns}</span>
                </div>
                <div className="stat">
                  <span className="label">SCORE</span>
                  <span className="value">{score}</span>
                </div>
              </div>

              <div className="ai-chat">
                {messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.role}`}>
                    {msg.text}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="input-group">
                <input
                  type="text"
                  placeholder="Ask a question or type your guess..."
                  className="glass-input"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAction('question')}
                />
                <button
                  className="btn btn-primary btn-icon"
                  onClick={() => handleAction('question')}
                  disabled={!userInput.trim() || turns <= 0}
                  title="Ask about this location"
                >
                  <Send size={18} />
                  <span className="btn-label-inline">Ask</span>
                </button>
              </div>

              <div className="action-buttons">
                {selectedRegion !== 'global' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleAction('question', 'Get Hint')}>
                    <HelpCircle size={16} /> Hint
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => handleAction('guess')} disabled={!userInput.trim()}>
                  <Trophy size={16} /> Submit Guess
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {gameState === 'result' && (
        <div className="start-screen fade-in">
          <div className="glass hero-card result-card">
            <div className={`result-icon ${gameResult}`}>
              {gameResult === 'win' ? <Trophy size={48} /> : <AlertCircle size={48} />}
            </div>
            <h2>{gameResult === 'win' ? 'Discovery Successful!' : 'Discovery Failed'}</h2>
            <p className="location-reveal">The location was: <strong>{location?.panoramaData.location.description}</strong></p>

            <div className="score-display">
              <span className="label">Points Earned</span>
              <span className="value">{score}</span>
            </div>

            <div className="result-actions">
              <button className="btn btn-primary" onClick={() => startGame()}>
                <RefreshCw size={20} /> Play Again
              </button>
              <button className="btn btn-secondary" onClick={() => setGameState('start')}>
                Back to Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
