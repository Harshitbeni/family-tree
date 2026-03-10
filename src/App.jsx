import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import NavBar from './components/NavBar'
import FamilyList from './views/FamilyList'
import PersonCard from './views/PersonCard'
import FamilyTimeline from './views/FamilyTimeline'
import FamilyDataTable from './views/FamilyDataTable'
import FamilyTree from './views/FamilyTree'

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg)' }}>
          <NavBar />
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<FamilyList />} />
              <Route path="/timeline" element={<FamilyTimeline />} />
              <Route path="/datatable" element={<FamilyDataTable />} />
              <Route path="/tree" element={<FamilyTree />} />
              <Route path="/person/:id" element={<PersonCard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </HashRouter>
    </ThemeProvider>
  )
}
