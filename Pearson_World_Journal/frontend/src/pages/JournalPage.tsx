import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
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

  type FilePreview = {
    file: File;
    previewUrl: string;
  };
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  

  // Fetch waypoint data from API
  useEffect(() => {
    axios.get(`/api/waypoints`).then(res => {
      const wp = res.data.find((w: Waypoint) => w._id === id);
      if (wp) {
        setWaypoint(wp);
        setJournalText(wp.journalText || '');
        setImages(wp.images || []);
      }
    });
  }, [id]);

  // Save journal entry and images to the API
  const handleSave = () => {
    axios.put(`/api/waypoints/${id}`, {
      journalText,
      images
    }).then(() => {
      alert('Saved!');
    }).catch((err) => {
      alert('Error saving: ' + err.message);
    });
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


  // Handle file upload to server
  const handleFileUpload = async () => {
    if (!filePreviews.length) return;
  
    const formData = new FormData();
    filePreviews.forEach(fp => formData.append('images', fp.file));
  
    setUploading(true);
    try {
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
  
      // Update the list of images with the URLs from the server
      const uploadedImages = res.data.urls;
      setImages(prev => [...prev, ...uploadedImages]);
  
      // Clear file previews after upload
      setFilePreviews([]); // <-- NEW: Clear the new `filePreviews`
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err.response?.data?.message || err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };  

  // Delete an image from the server and the local state
  const handleImageDelete = async (imageUrl: string, index: number) => {
    try {
      await axios.delete('/api/delete-image', { data: { imageUrl } });
      setImages(prev => prev.filter((_, i) => i !== index));
    } catch (err: any) {
      alert('Failed to delete the image.');
      console.error('Error deleting image:', err);
    }
  };

  const handlePreviewDelete = (index: number) => {
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };  
  
  if (!waypoint) return <p>Loading...</p>;

  return (
    <div className={styles.container}>
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
              src={img}
              alt={`upload-${i}`}
              className={styles.image}
              onClick={() => setZoomedImage(img)}
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

      <h4>Preview Images (Before Uploading):</h4>
      <div className={styles.uploadedImages}>
        {filePreviews.map((fp, i) => (
          <div key={i} className={styles.imageWrapper}>
            <img src={fp.previewUrl} alt={`preview-${i}`} className={styles.image} />
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
        <button
          onClick={handleFileUpload}
          disabled={!filePreviews.length || uploading}
          className={styles.button}
        >
          {uploading ? 'Uploading...' : 'Upload Images'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button className={`${styles.button} ${styles.mapButton}`} onClick={handleSave}>
          Save Journal
        </button>
        <button className={`${styles.button} ${styles.mapButton}`} onClick={() => navigate('/')}>
          Return to Map
        </button>
      </div>

      {/* Zoom Modal */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className={styles.zoomModal}
        >
          <img
            src={zoomedImage}
            alt="Zoomed"
            className={styles.zoomedImage}
          />
        </div>
      )}
    </div>
  );
}
