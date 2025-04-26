import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MapPage from './pages/MapPage';
import JournalPage from './pages/JournalPage';
import ViewWaypointsPage from './pages/ViewWaypointsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/journal/:id" element={<JournalPage />} />
        <Route path="/view-waypoints" element={<ViewWaypointsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
