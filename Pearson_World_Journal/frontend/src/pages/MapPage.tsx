import {
  MapContainer, TileLayer, Marker, Popup, useMapEvents, Tooltip
} from 'react-leaflet';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import API from './api';
import { useNavigate } from 'react-router-dom';
import L, { LatLngExpression, LeafletMouseEvent, Icon } from 'leaflet';
import styles from './MapPage.module.css';
import './global.css';

interface Waypoint {
  _id: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  image?: string;
  journalText?: string;
  images?: string[];
}

const waypointIcon = new Icon({
  iconUrl: '/point-of-interest.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

export default function MapPage() {
  const navigate = useNavigate();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [newWaypoint, setNewWaypoint] = useState<{ lat: number; lng: number } | null>(null);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [formData, setFormData] = useState<{ title: string; description: string; imageFile: File | null }>({
    title: '',
    description: '',
    imageFile: null,
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    API.get('/api/waypoints').then(res => setWaypoints(res.data));
  }, []);

  const AddWaypoint = () => {
    useMapEvents({
      dblclick: (e: LeafletMouseEvent) => {
        // Prevent default zoom action on double-click
        e.originalEvent.preventDefault();
  
        if (!isEditingMode) {
          setNewWaypoint({ lat: e.latlng.lat, lng: e.latlng.lng });
          setShowModal(true);
        }
      },
    });
    return null;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let imageUrl = editingWaypoint?.image;

    if (formData.imageFile) {
      const uploadData = new FormData();
      uploadData.append('images', formData.imageFile);
      const res = await API.post('/api/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Log the URL returned by the backend
      console.log('Image URL returned from backend:', res.data.urls[0]);

      imageUrl = `${BACKEND_URL}${res.data.urls[0]}`;
    }

    // Log the image URL that will be used
    console.log('Image URL being saved:', imageUrl);

    if (editingWaypoint) {
      const updated = {
        ...editingWaypoint,
        title: formData.title,
        description: formData.description,
        image: imageUrl,
      };
      await API.put(`/api/waypoints/${editingWaypoint._id}`, updated);
      setWaypoints(prev => prev.map(wp => wp._id === updated._id ? updated : wp));
    } else if (newWaypoint) {
      const newWp = {
        ...newWaypoint,
        title: formData.title,
        description: formData.description,
        image: imageUrl,
      };
      const res = await API.post('/api/waypoints', newWp);
      setWaypoints(prev => [...prev, res.data]);
    }

    setShowModal(false);
    setEditingWaypoint(null);
    setNewWaypoint(null);
    setFormData({ title: '', description: '', imageFile: null });
  };

  const getFullImageUrl = (path: string) => {
    if (path.startsWith('http')) {
      return path;
    }
    return `${BACKEND_URL}${path}`;
  };

  const center: LatLngExpression = [20, 0];

  const startEditing = (wp: Waypoint) => {
    if (!isEditingMode) return;
    setEditingWaypoint(wp);
    setFormData({
      title: wp.title || '',
      description: wp.description || '',
      imageFile: null,
    });
    setShowModal(true);
  };

  const handleMarkerDragEnd = async (e: L.LeafletEvent, wp: Waypoint) => {
    const marker = e.target;
    const newPos = marker.getLatLng();
    const updated = { ...wp, lat: newPos.lat, lng: newPos.lng };
    await API.put(`/api/waypoints/${wp._id}`, updated);
    setWaypoints(prev => prev.map(w => w._id === wp._id ? updated : w));
  };

  function DisableDoubleClickZoom() {
    const map = useMapEvents({
      dblclick: () => {
        // no-op: just so map is accessible
      }
    });

    useEffect(() => {
      map.doubleClickZoom.disable();
    }, [map]);

    return null;
  }

  return (
    <>
      {showInstructions && (
        <div className={styles.instructionsContainer}>
          <div className={styles.instructionBox}>
            Double-click on the map to add a new waypoint.
            <br />
            <br />
            Right-click on a waypoint to delete it.
          </div>

          <div className={styles.instructionBox}>
            Edit Mode: Edit Mode is a toggleable feature so don't forget to turn it off when you are done.
            <br />
            <br />
            In Edit Mode: Left-Click and hold to Drag waypoints to move them to a new location, or left-click waypoints to edit their details.
          </div>
        </div>
      )}
      <button className={`${styles.fixedButton} ${styles.hideInstructionsButton}`} onClick={() => setShowInstructions(prev => !prev)}>
        {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
      </button>

      <button className={`${styles.fixedButton} ${styles.editButtonFixed}`} onClick={() => setIsEditingMode(prev => !prev)}>
        {isEditingMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
      </button>

      <button className={`${styles.fixedButton} ${styles.viewButtonFixed}`} onClick={() => navigate('/view-waypoints')}>
        View Waypoints
      </button>

      <MapContainer
        center={center}
        zoom={2}
        style={{ height: '100vh' }}
        worldCopyJump={false}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        doubleClickZoom={false}
      >
        <DisableDoubleClickZoom />
        <AddWaypoint />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          noWrap={true}
        />
        {waypoints.map(wp => {
          console.log('Rendering waypoint with image:', wp.image); // Log image URL for each waypoint
          return (
            <Marker
              key={wp._id}
              position={[wp.lat, wp.lng]}
              icon={waypointIcon}
              draggable={isEditingMode}
              eventHandlers={{
                contextmenu: () => {
                  // eslint-disable-next-line no-restricted-globals
                  if (confirm('Delete this waypoint?')) {
                    API.delete(`/api/waypoints/${wp._id}`).then(() => {
                      setWaypoints(prev => prev.filter(p => p._id !== wp._id));
                    });
                  }
                },
                click: () => startEditing(wp),
                dragend: e => handleMarkerDragEnd(e, wp),
              }}
            >
              <Tooltip direction="top" offset={[0, -30]} opacity={1} permanent={false}>
                <div style={{
                  width: '150px',
                  backgroundColor: '#2F3C7E',
                  color: '#FBEAEB',
                  padding: '10px',
                  borderRadius: '10px',
                  fontSize: '1.2em',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}>
                  {wp.image && (
                    <img
                      src={getFullImageUrl(wp.image)}
                      alt="Preview"
                      style={{ width: '100%', borderRadius: '8px', marginBottom: '0.5em' }}
                    />
                  )}
                  {wp.title && <h4 style={{ margin: '0.5em 0 0.2em', wordWrap: 'break-word' }}>{wp.title}</h4>}
                </div>
              </Tooltip>

              <Popup>
                <div style={{
                  width: '150px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  backgroundColor: '#2F3C7E',
                  color: '#FBEAEB',
                  padding: '10px',
                  borderRadius: '10px',
                  fontSize: '1.2em',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  {wp.image && (
                    <img
                      src={getFullImageUrl(wp.image)}
                      alt="Waypoint"
                      style={{ width: '100%', borderRadius: '8px', marginBottom: '0.5em' }}
                    />
                  )}
                  {wp.title && <h4 style={{ margin: '0.5em 0 0.2em' }}>{wp.title}</h4>}
                  {wp.description && <p style={{ margin: '0 0 0.5em' }}>{wp.description}</p>}
                  <a
                    href={`/journal/${wp._id}`}
                    style={{
                      color: '#FBEAEB',
                      textDecoration: 'underline',
                      marginTop: 'auto',
                      wordWrap: 'break-word'
                    }}
                  >
                    View Journal
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {showModal && (
        <div className={styles.modal} style={{ position: 'fixed', top: '10vh', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <h3>{editingWaypoint ? 'Edit Waypoint' : 'Add New Waypoint'}</h3>
          <form onSubmit={handleFormSubmit} style={{ width: '100%' }}>
            <input
              type="text"
              placeholder="Title"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
            {previewUrl && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <img
                  src={previewUrl}
                  alt="Selected"
                  style={{
                    maxWidth: '300px',
                    maxHeight: '350px',
                    borderRadius: '12px',
                    marginBottom: '1em',
                    marginTop: '1em'
                  }}
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setFormData({ ...formData, imageFile: file });
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setPreviewUrl(reader.result as string);
                  reader.readAsDataURL(file);
                } else {
                  setPreviewUrl(null);
                }
              }}
            />
          <div className={styles.modalButtons}>
            <button
              className={styles.submit}
              type="submit"
              onClick={() => setPreviewUrl(null)}
            >
              {editingWaypoint ? 'Update' : 'Add'} Waypoint
            </button>
            <button
              className={styles.cancel}
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingWaypoint(null);
                setNewWaypoint(null);
                setFormData({ title: '', description: '', imageFile: null });
                setPreviewUrl(null);
            }}
          >
              Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
