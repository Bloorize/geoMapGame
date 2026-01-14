import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { Trophy, Medal, User, History, MapPin } from 'lucide-react'

export default function Leaderboard() {
    const [leaders, setLeaders] = useState<any[]>([])
    const [personalBests, setPersonalBests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()

            // 1. Fetch Global Leaders
            const { data: leaderData, error: leaderError } = await supabase
                .from('profiles')
                .select('*')
                .order('high_score', { ascending: false })
                .limit(5)

            if (leaderError) throw leaderError
            setLeaders(leaderData || [])

            // 2. Fetch Personal Top 3
            if (session?.user) {
                const { data: personalData, error: personalError } = await supabase
                    .from('games')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('score', { ascending: false })
                    .limit(3)

                if (personalError) {
                    console.error('Error fetching personal scores (table might not exist yet):', personalError)
                } else {
                    setPersonalBests(personalData || [])
                }
            }
        } catch (err) {
            console.error('Error fetching leaderboard data:', err)
        } finally {
            setLoading(false)
        }
    }

    const getMedalIcon = (index: number) => {
        switch (index) {
            case 0: return <Medal color="#ffd700" size={18} /> // Gold
            case 1: return <Medal color="#c0c0c0" size={18} /> // Silver
            case 2: return <Medal color="#cd7f32" size={18} /> // Bronze
            default: return <User color="#64748b" size={18} />
        }
    }

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-grid">
                <section>
                    <h3><Trophy size={20} color="#ffd700" /> Global Legends</h3>
                    <div className="leader-list">
                        {loading ? (
                            <p className="loading-text">Loading legends...</p>
                        ) : leaders.length > 0 ? (
                            leaders.map((leader, i) => (
                                <div key={leader.id} className="leader-item">
                                    <div className="leader-info">
                                        <span className="rank">{getMedalIcon(i)}</span>
                                        <span className="username">{leader.username || 'Anonymous'}</span>
                                    </div>
                                    <span className="score">{leader.high_score.toLocaleString()}</span>
                                </div>
                            ))
                        ) : (
                            <p className="empty-text">No legends yet.</p>
                        )}
                    </div>
                </section>

                <section>
                    <h3><History size={20} color="var(--primary)" /> My Best Discoveries</h3>
                    <div className="leader-list">
                        {loading ? (
                            <p className="loading-text">Loading your history...</p>
                        ) : personalBests.length > 0 ? (
                            personalBests.map((game, i) => (
                                <div key={game.id} className="leader-item history-item">
                                    <div className="leader-info">
                                        <span className="rank">{i + 1}</span>
                                        <div className="history-details">
                                            <span className="username">{game.score} pts</span>
                                            <span className="location-name"><MapPin size={10} /> {game.location_name}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="empty-text">Play a game to see your history!</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
