import React, { useEffect, useState } from 'react';
import styles from './ViewWaypointsPage.module.css';
import { useNavigate } from 'react-router-dom';

interface Waypoint {
  _id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  image?: string;
  images?: string[];
}

const ViewWaypointsPage = () => {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const getFullImageUrl = (path: string) => {
    if (path.startsWith('http')) {
      return path;
    }
    return `${BACKEND_URL}${path}`;
  };

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/waypoints`)
      .then(res => res.json())
      .then(data => setWaypoints(data))
      .catch(err => console.error('Error fetching waypoints:', err));
  }, [BACKEND_URL]);  

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this waypoint?')) {
      fetch(`${BACKEND_URL}/api/waypoints/${id}`, {
        method: 'DELETE',
      })
        .then(() => {
          setWaypoints(prev => prev.filter(wp => wp._id !== id));
        })
        .catch(err => console.error('Error deleting waypoint:', err));
    }
  };

  return (
    <div className={styles['waypoints-container']}>
        {showInstructions && (
          <div className={styles.instructionsContainer}>
            <div className={styles.instructionBox}>
              <p>This is the View Waypoints Page:
                <br />
                <br />
                Here you can view a list of all the waypoints you have saved.
                <br />
                <br />
                Click on any waypoint's "View Journal" button to view its details, journal entry, and uploaded images.
                <br />
                <br />
                Most impotantly the "Delete Waypoints" will allow you to delete waypoints when toggled. Since its a toggle, don't forget to turn it off when you're done.
              </p>
            </div>
          </div>
        )}

      <button className={`${styles.fixedButton} ${styles.hideInstructionsButton}`} onClick={() => setShowInstructions(prev => !prev)}>
        {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
      </button>

      <button className={`${styles.fixedButton} ${styles.returnButton}`} onClick={() => navigate('/')}>
        Return to Map
      </button>

      <button className={`${styles.fixedButton} ${styles.deleteButton}`} onClick={() => setDeleteMode(prev => !prev)}>
        {deleteMode ? 'Cancel Deletion' : 'Delete Waypoints'}
      </button>

      <h1>All Waypoints</h1>
      <div className={styles['waypoints-grid']}>
        {waypoints.map((waypoint) => (
          <div key={waypoint._id} className={styles['waypoint-card']}>
            {deleteMode && (
              <button
                className={styles.deleteIcon}
                onClick={() => handleDelete(waypoint._id)}
              >
                X
              </button>
            )}
            <img
              src={waypoint.image ? getFullImageUrl(waypoint.image) : ''}
              alt={waypoint.title}
              className={styles['waypoint-image']}
            />
            <div className={styles['waypoint-content']}>
              <h2>{waypoint.title}</h2>
              <p>{waypoint.description}</p>
              <a href={`/journal/${waypoint._id}`} className={styles['view-journal-button']}>
                View Journal
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewWaypointsPage;
