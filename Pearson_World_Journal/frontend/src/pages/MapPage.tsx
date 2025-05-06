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
        style={{ height: '100vh', width: '100vw' }}
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
              <Tooltip direction={getDirection(wp.lat)} offset={getDirection(wp.lat) === 'bottom' ? [0, 0] : [0, -30]}  opacity={1} permanent={false} className="custom-tooltip">
                <div>
                  {wp.imageUrl && (
                    <img
                      src={wp.imageUrl}
                      alt="Preview"
                      className="tooltip-image"
                    />
                  )}
                  {wp.title && <h4 className="tooltip-title">{wp.title}</h4>}
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {selectedWaypoint && (
        <div
          className={`waypoint-panel ${
            selectedWaypoint.lng > 0 ? 'left-panel' : 'right-panel'
          }`}
        >
          {selectedWaypoint.imageUrl && (
            <img
              src={getFullImageUrl(selectedWaypoint.imageUrl)}
              alt="Waypoint"
              className="panel-image"
            />
          )}
          {selectedWaypoint.title && (
            <h4 className="panel-title">{selectedWaypoint.title}</h4>
          )}
          {selectedWaypoint.description && (
            <p className="panel-description">{selectedWaypoint.description}</p>
          )}
          <a
            href={`/journal/${selectedWaypoint.id}`}
            className="panel-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Journal
          </a>
          <button 
            onClick={() => setSelectedWaypoint(null)} 
            className="panel-close-button"
          >
            Close
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal">
          <h3>{editingWaypoint ? 'Edit Waypoint' : 'Add New Waypoint'}</h3>
          <form onSubmit={handleFormSubmit} className="modal-form">
            <input
              type="text"
              placeholder="Title"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="modal-input"
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="modal-textarea"
            />
            {previewUrl && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <img
                  src={previewUrl}
                  alt="Selected"
                  className="modal-image-preview"
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
              className="modal-file-input"
            />
          <div className="modal-buttons">
            <button
              type="submit"
              className="modal-submit"
              onClick={() => setPreviewUrl(null)}
            >
              {editingWaypoint ? 'Update' : 'Add'} Waypoint
            </button>
            <button
              type="button"
              className="modal-cancel"
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