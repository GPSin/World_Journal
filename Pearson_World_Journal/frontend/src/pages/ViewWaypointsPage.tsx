import React, { useEffect, useState } from 'react';
import styles from './ViewWaypointsPage.module.css';

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

  useEffect(() => {
    fetch('http://localhost:3001/api/waypoints')
      .then(res => res.json())
      .then(data => setWaypoints(data))
      .catch(err => console.error('Error fetching waypoints:', err));
  }, []);

  return (
    <div className={styles['waypoints-container']}>
        <h1>All Waypoints</h1>
        <div className={styles['waypoints-grid']}>
            {waypoints.map((waypoint) => (
            <div key={waypoint._id} className={styles['waypoint-card']}>
                <img
                src={waypoint.image}
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
