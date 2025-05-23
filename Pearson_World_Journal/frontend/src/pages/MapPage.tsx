
import {
  MapContainer, TileLayer, Marker, useMapEvents, Tooltip
} from 'react-leaflet';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import API from '../utils/api';
import { useNavigate } from 'react-router-dom';
import L, { LatLngExpression, LeafletMouseEvent, Icon } from 'leaflet';
import styles from './MapPage.module.css';
import './global.css';

interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  journal?: string;
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
  const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(null);  
  const [formData, setFormData] = useState<{ title: string; description: string; imageFile: File | null }>({
    title: '',
    description: '',
    imageFile: null,
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    API.get('/waypoints').then(res => setWaypoints(res.data));
  }, []);

  const isValidLatLng = (lat: any, lng: any) => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  const AddWaypoint = () => {
    useMapEvents({
      dblclick: (e: LeafletMouseEvent) => {
        // Prevent default zoom action on double-click
        e.originalEvent.preventDefault();
  
        if (!isEditingMode && isValidLatLng(e.latlng.lat, e.latlng.lng)) {
          setNewWaypoint({ lat: e.latlng.lat, lng: e.latlng.lng });
          setShowModal(true);
        }
      },
    });
    return null;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let imageUrl = editingWaypoint?.imageUrl;

    if (formData.imageFile) {
      const uploadData = new FormData();
      uploadData.append('file', formData.imageFile);
    
      const waypointId = (editingWaypoint?.id || `temp-${Date.now()}`).toString();
      uploadData.append('waypointId', waypointId);
    
      const res = await API.post('/upload-image', uploadData);
    
      console.log('Image URL returned from backend:', res.data.imageUrl);
    
      imageUrl = res.data.imageUrl;
    }

    // Log the image URL that will be used
    console.log('Image URL being saved:', imageUrl);

    if (editingWaypoint) {
      const updated = {
        ...editingWaypoint,
        title: formData.title,
        description: formData.description,
        imageUrl: imageUrl,
      };
      await API.put(`/waypoints/${editingWaypoint.id}`, updated);
      setWaypoints(prev => prev.map(wp => wp.id === updated.id ? updated : wp));
    } else if (newWaypoint) {
      const newWp = {
        ...newWaypoint,
        title: formData.title,
        description: formData.description,
        imageUrl: imageUrl,
      };
      const res = await API.post('/waypoints', newWp);
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
    await API.put(`/waypoints/${wp.id}`, updated);
    setWaypoints(prev => prev.map(w => w.id === wp.id ? updated : w));
  };

  const getDirection = (lat: any) => {
    return lat > 0 ? 'bottom' : 'top';
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
            <br />
            <br />
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
          return (
            <Marker
              key={wp.id}
              position={[wp.lat, wp.lng]}
              icon={waypointIcon}
              draggable={isEditingMode}
              eventHandlers={{
                contextmenu: () => {
                  // eslint-disable-next-line no-restricted-globals
                  if (confirm('Delete this waypoint?')) {
                    API.delete(`/waypoints/${wp.id}`).then(() => {
                      setWaypoints(prev => prev.filter(p => p.id !== wp.id));
                    });
                  }
                },
                click: () => {
                  startEditing(wp);
                  setSelectedWaypoint(wp);
                },
                dragend: e => handleMarkerDragEnd(e, wp),
              }}
            >
              <Tooltip direction={getDirection(wp.lat)} offset={getDirection(wp.lat) === 'bottom' ? [0, 0] : [0, -30]}  opacity={1} permanent={false}>
                <div style={{width: '150px', backgroundColor: '#2F3C7E', color: '#FBEAEB', padding: '10px', borderRadius: '10px', fontSize: '1.2em', wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', overflow: 'hidden', textAlign: 'center'}}>
                  {wp.imageUrl && (
                    <img
                      src={wp.imageUrl}
                      alt="Preview"
                      style={{ width: '100%', borderRadius: '8px', marginBottom: '0.5em' }}
                    />
                  )}
                  {wp.title && <h4 style={{ margin: '0.5em 0 0.2em', wordWrap: 'break-word' }}>{wp.title}</h4>}
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {selectedWaypoint && (
        <div style={{
          position: 'fixed', top: '.5%', [selectedWaypoint.lng > 0 ? 'left' : 'right']: '.5%', width: '14%', backgroundColor: '#2F3C7E', color: '#FBEAEB', padding: '15px', borderRadius: '10px', zIndex: 1000, boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
          {selectedWaypoint.imageUrl && (
            <img
              src={getFullImageUrl(selectedWaypoint.imageUrl)}
              alt="Waypoint"
              style={{ maxWidth: '90%', borderRadius: '8px', marginBottom: '0.5em', objectFit: 'cover'}}
            />
          )}
          {selectedWaypoint.title && (
            <h4 style={{ margin: '0.5em 0 0.2em' }}>
              {selectedWaypoint.title}
            </h4>
          )}
          {selectedWaypoint.description && (
            <p style={{ margin: '0 0 0.5em' }}>
              {selectedWaypoint.description}
            </p>
          )}
          <a
            href={`/journal/${selectedWaypoint.id}`}
            style={{ color: '#FBEAEB', textDecoration: 'underline', marginTop: '10px'}}
          >
            View Journal
          </a>
          <button 
            onClick={() => setSelectedWaypoint(null)} 
            style={{marginTop: '15px', backgroundColor: '#FBEAEB', color: '#2F3C7E', border: 'none', borderRadius: '5px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold'}}
          >
            Close
          </button>
        </div>
      )}

      {showModal && (
        <div className={styles.modal} style={{ position: 'fixed', top: '3vh', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
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
                  style={{maxWidth: '37%', maxHeight: '37%px', borderRadius: '12px', marginBottom: '1em', marginTop: '1em'}}
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
              onClick={() => {setShowModal(false); setEditingWaypoint(null); setNewWaypoint(null); setFormData({ title: '', description: '', imageFile: null }); setPreviewUrl(null);}}
          >
              Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
