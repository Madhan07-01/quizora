import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import JoinQuiz from './pages/JoinQuiz'
import Quiz from './pages/Quiz'
import Results from './pages/Results'
import Profile from './pages/Profile'
import Leaderboard from './pages/Leaderboard'
import RoomLeaderboard from './pages/RoomLeaderboard'
import Admin from './pages/Admin'
import CreateQuiz from './pages/CreateQuiz'
import Login from './pages/Login'
import Signup from './pages/Signup'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/join" element={<JoinQuiz />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/quiz/:roomCode" element={<Quiz />} />
        <Route path="/results" element={<Results />} />
        <Route path="/results/:roomCode" element={<Results />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/leaderboard/:roomCode" element={<RoomLeaderboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/create" element={<CreateQuiz />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>
    </Routes>
  )
}

export default App
