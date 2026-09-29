import './index.css'
import Survey from './components/Survey'
import Admin from './pages/Admin'

export default function App() {
  const path = window.location.pathname
  if (path.startsWith('/admin')) return <Admin />
  return <Survey />
}
