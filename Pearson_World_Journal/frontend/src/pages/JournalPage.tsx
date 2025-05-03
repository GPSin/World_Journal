import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from './api';
import styles from './JournalPage.module.css'; // Import CSS Module

interface Waypoint {
  _id: string;
  lat: number;
  lng: number;
  description?: string;
  journalText?: string;
  images?: string[];
}

export default function JournalPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [waypoint, setWaypoint] = useState<Waypoint | null>(null);
  const [journalText, setJournalText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;


  type FilePreview = {
    file: File;
    previewUrl: string;
  };
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  

  // Fetch waypoint data from API
  useEffect(() => {
    API.get(`/api/waypoints`).then(res => {
      const wp = res.data.find((w: Waypoint) => w._id === id);
      if (wp) {
        setWaypoint(wp);
        setJournalText(wp.journalText || '');
        setImages(wp.images || []);
      }
    });
  }, [id]);

  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && pendingDeletes.length) {
        e.preventDefault();
        e.returnValue = '';
  
        // Try to restore deleted images
        for (const imageUrl of pendingDeletes) {
          try {
            await API.post('/api/restore-image', { imageUrl });
          } catch (err) {
            console.warn('Failed to restore image on unload:', imageUrl);
          }
        }
      }
    };
  
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, pendingDeletes]);
   

  // Save journal entry and images to the API
  const handleSave = async () => {
    setUploading(true);
    try {
      let uploadedImages: string[] = [];
  
      if (filePreviews.length) {
        const formData = new FormData();
        filePreviews.forEach(fp => formData.append('images', fp.file));
  
        const res = await API.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
  
        uploadedImages = res.data.urls;
      }
  
      const allImages = [...images, ...uploadedImages];
  
      await API.put(`/api/waypoints/${id}`, {
        journalText,
        images: allImages
      });
  
      setImages(allImages);
      setFilePreviews([]);
      setHasUnsavedChanges(false);
      alert('Saved!');
    } catch (err: any) {
      alert('Error saving: ' + err.message);
    } finally {
      setPendingDeletes([]);
      setUploading(false);
    }
  };  

  // Handle file selection and preview generation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];

    const newFilePreviews = selectedFiles.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setFilePreviews(prev => [...prev, ...newFilePreviews]);
  };


  // Delete an image from the server and the local state
  const handleImageDelete = async (imageUrl: string, index: number) => {
    try {
      await API.delete('/api/delete-image', { data: { imageUrl } });
  
      setImages(prev => prev.filter((_, i) => i !== index));
      setPendingDeletes(prev => [...prev, imageUrl]); // 👈 store it for possible restore
      setHasUnsavedChanges(true);
    } catch (err: any) {
      alert('Failed to delete the image.');
      console.error('Error deleting image:', err);
    }
  };
  

  const handlePreviewDelete = (index: number) => {
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleReturnToMap = async () => {
    if (hasUnsavedChanges && pendingDeletes.length) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. If you return to the map now, deleted images will be restored.'
      );
  
      if (!confirmLeave) return;
  
      // Restore any deleted images
      for (const imageUrl of pendingDeletes) {
        try {
          await fetch('/api/restore-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl }),
          });
        } catch (err) {
          console.warn('Failed to restore image:', imageUrl);
        }
      }
    }
  
    navigate('/');
    setPendingDeletes([]);
    setHasUnsavedChanges(false);

  };
  
  const getFullImageUrl = (path: string) => {
    if (path.startsWith('http')) {
      return path;
    }
    return `${BACKEND_URL}${path}`;
  };
  
  if (!waypoint) return <p>Loading...</p>;

  return (
    <div className={styles.container}>

      {showInstructions && (
        <div className={styles.instructionsContainer}>
          <div className={styles.instructionBox}>
            <p>This is the Journal Page:
              <br />
              <br />
              Here you can upload the photos you took and document everything that happened
              <br />
              <br />
              Selecting images only adds them to the preview section incase you change your mind. Once you like your selection of hitting the "Save Journal" button
              will save them to the journal until you choose to remove them.
              <br />
              <br />
              Saving is very important so don't forget to do it, there are plenty of checks to ensure you're happy with your journal before you leave the page!
            </p>
          </div>
        </div>
      )}
      <button className={`${styles.fixedButton} ${styles.hideInstructionsButton}`} onClick={() => setShowInstructions(prev => !prev)}>
        {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
      </button>

      <button className={`${styles.fixedButton} ${styles.returnButton}`} onClick={handleReturnToMap}>
        Return to Map
      </button>
      
      <h2 className={styles.title}>
        Journal for Location [{waypoint.lat.toFixed(2)}, {waypoint.lng.toFixed(2)}]
      </h2>

      <textarea
        className={styles.textarea}
        value={journalText}
        onChange={e => setJournalText(e.target.value)}
        placeholder="Write your journal entry here..."
      />

      <h4>Uploaded Images:</h4>
      <div className={styles.uploadedImages}>
        {images.map((img, i) => (
          <div key={i} className={styles.imageWrapper}>
            <img
              src={getFullImageUrl(img)}
              alt={`upload-${i}`}
              className={styles.image}
              onClick={() => setZoomedImage(getFullImageUrl(img))}
            />
            <button
              onClick={() => handleImageDelete(img, i)}
              className={styles.deleteButton}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <h4>Preview Images:</h4>
      <div className={styles.uploadedImages}>
        {filePreviews.map((fp, i) => (
          <div key={i} className={styles.imageWrapper}>
            <img src={fp.previewUrl} alt={`preview-${i}`} className={styles.image} onClick={() => setZoomedImage(fp.previewUrl)} />
            <button onClick={() => handlePreviewDelete(i)} className={styles.deleteButton}>×</button>
          </div>
        ))}
      </div>

      <div className={styles.fileInputWrapper}>
      <label htmlFor="file-upload" className={styles.button}>
        Choose Images
      </label>
      <input
        id="file-upload"
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
        multiple
        className={styles.hiddenFileInput}
      />
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button className={`${styles.button} ${styles.mapButton}`} onClick={handleSave}>
          Save Journal
        </button>
      </div>

      {/* Zoom Modal */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className={styles.zoomModal}
        >
          <img
            src={getFullImageUrl(zoomedImage)}
            alt="Zoomed"
            className={styles.zoomedImage}
          />
        </div>
      )}
    </div>
  );
}