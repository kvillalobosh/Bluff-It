import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

function App() {
  const [route, setRoute] = useState(() => window.location.pathname)

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(window.location.pathname)
    }

    window.addEventListener('popstate', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setRoute(path)
  }

  if (route === '/play') {
    return <JoinScreen />
  }

  if (route === '/host') {
    return <HostScreen />
  }

  return <LandingScreen onNavigate={navigate} />
}

function LandingScreen({
  onNavigate,
}: {
  onNavigate: (path: string) => void
}) {
  return (
    <main className="landing-screen">
      <div className="landing-card">
        <div className="brand-pill">Kahoot!</div>
        <h1>Ready to play?</h1>
        <p className="landing-subtitle">Choose how you want to get started.</p>

        <div className="choice-stack">
          <button className="choice-button host" onClick={() => onNavigate('/host')}>
            Host a game
          </button>
          <button className="choice-button join" onClick={() => onNavigate('/play')}>
            Join a game
          </button>
        </div>
      </div>
    </main>
  )
}

function JoinScreen() {
  const [joinCode, setJoinCode] = useState('')
  const [nickname, setNickname] = useState('')

  const isValid = joinCode.trim().length >= 5 && nickname.trim().length >= 2

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isValid) {
      return
    }

    console.log('Joining game:', { joinCode, nickname })
  }

  return (
    <main className="join-screen">
      <div className="join-card">
        <div className="brand-pill">Kahoot!</div>
        <h1>Enter the game</h1>

        <form className="join-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Game PIN</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={joinCode}
              onChange={(event) =>
                setJoinCode(event.target.value.replace(/\D/g, '').slice(0, 8))
              }
              placeholder="123456"
              aria-label="Game code"
            />
          </label>

          <label className="field">
            <span>Nickname</span>
            <input
              type="text"
              maxLength={20}
              value={nickname}
              onChange={(event) => setNickname(event.target.value.trimStart())}
              placeholder="Player 1"
              aria-label="Nickname"
            />
          </label>

          <button type="submit" className="join-button" disabled={!isValid}>
            Join game
          </button>
        </form>
      </div>
    </main>
  )
}

function HostScreen() {
  return (
    <main className="host-screen">
      <div className="host-card">
        <div className="brand-pill">Kahoot!</div>
        <h1>Host a game</h1>
        <p className="host-subtitle">Create a lobby and start a new quiz session.</p>

        <button className="host-primary-button" type="button">
          Create lobby
        </button>
      </div>
    </main>
  )
}

export default App
