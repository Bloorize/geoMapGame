import { useState } from 'react'
import { supabase } from '../utils/supabase'
import { LogIn, UserPlus, Mail, Lock, User } from 'lucide-react'

interface AuthProps {
    onSession: (user: any) => void
}

export default function Auth({ onSession }: AuthProps) {
    const [loading, setLoading] = useState(false)
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
                onSession(data.user)
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { username }
                    }
                })
                if (error) throw error
                onSession(data.user)
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-overlay fade-in">
            <div className="glass auth-card">
                <h2>{isLogin ? 'Welcome Back' : 'Join the Quest'}</h2>
                <p className="subtitle">{isLogin ? 'Login to track your discoveries' : 'Create an account to join the leaderboard'}</p>

                <form onSubmit={handleAuth} className="auth-form">
                    {!isLogin && (
                        <div className="input-group">
                            <User size={18} />
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <div className="input-group">
                        <Mail size={18} />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <Lock size={18} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="error-text">{error}</p>}

                    <button className="btn btn-primary" disabled={loading}>
                        {loading ? <RefreshCw size={20} className="spin" /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
                        {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>

                <p className="toggle-auth">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    )
}

import { RefreshCw } from 'lucide-react'
