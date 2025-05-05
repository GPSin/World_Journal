import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from './ViewWaypointsPage.module.css';
import { useNavigate } from 'react-router-dom';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  imageUrl?: string;
  images?: string[];
}

const ViewWaypointsPage = () => {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [loading, setLoading] = useState(true); // Loading state
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const navigate = useNavigate();

  const getFullImageUrl = (path: string) => {
    // If the image path starts with 'http', return it directly.
    if (path.startsWith('http')) {
      return path;
    }
    // Otherwise, construct the Supabase storage URL
    return `${supabaseUrl}/storage/v1/object/public/${path}`;
  };

  useEffect(() => {
    const fetchWaypoints = async () => {
      try {
        const { data, error } = await supabase
          .from('waypoints')
          .select('*');

        if (error) {
          throw error;
        }
        setWaypoints(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching waypoints:', err);
        setLoading(false);
      }
    };

    fetchWaypoints();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this waypoint?')) {
      try {
        const { error } = await supabase
          .from('waypoints')
          .delete()
          .eq('id', id);

        if (error) {
          throw error;
        }
        
        // Remove the deleted waypoint from the state
        setWaypoints(prev => prev.filter(wp => wp.id !== id));
        setDeleteConfirmation('Waypoint deleted successfully!');
      } catch (err) {
        console.error('Error deleting waypoint:', err);
      }
    }
  };

  if (loading) {
    return <p>Loading waypoints...</p>; // Or a spinner
  }

  return (
    <div className={styles['waypoints-container']}>
      {/* Instructions Section */}
      {showInstructions && (
        <div className={styles.instructionsContainer}>
          <div className={styles.instructionBox}>
            <p>This is the View Waypoints Page:</p>
            <p>Here you can view a list of all the waypoints you have saved.</p>
            <p>Click on any waypoint's "View Journal" button to view its details, journal entry, and uploaded images.</p>
            <p>Most importantly, the "Delete Waypoints" will allow you to delete waypoints when toggled. Don't forget to turn it off when you're done.</p>
          </div>
        </div>
      )}

      {/* Instructions Toggle Button */}
      <button
        className={`${styles.fixedButton} ${styles.hideInstructionsButton}`}
        onClick={() => setShowInstructions(prev => !prev)}
      >
        {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
      </button>

      {/* Return to Map Button */}
      <button
        className={`${styles.fixedButton} ${styles.returnButton}`}
        onClick={() => navigate('/')}
      >
        Return to Map
      </button>

      {/* Delete Mode Toggle Button */}
      <button
        className={`${styles.fixedButton} ${styles.deleteButton}`}
        onClick={() => setDeleteMode(prev => !prev)}
      >
        {deleteMode ? 'Cancel Deletion' : 'Delete Waypoints'}
      </button>

      {/* Confirmation Message */}
      {deleteConfirmation && <div className={styles.confirmationMessage}>{deleteConfirmation}</div>}

      <h1>All Waypoints</h1>

      {/* Waypoints Grid */}
      <div className={styles['waypoints-grid']}>
        {waypoints.map((waypoint) => (
          <div key={waypoint.id} className={styles['waypoint-card']}>
            {deleteMode && (
              <button
                className={styles.deleteIcon}
                onClick={() => handleDelete(waypoint.id)}
              >
                X
              </button>
            )}
            <img
              src={waypoint.imageUrl ? getFullImageUrl(waypoint.imageUrl) : '/path/to/default-image.jpg'}
              alt={waypoint.title}
              className={styles['waypoint-image']}
            />
            <div className={styles['waypoint-content']}>
              <h2>{waypoint.title}</h2>
              <p>{waypoint.description}</p>
              <a href={`/journal/${waypoint.id}`} className={styles['view-journal-button']}>
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