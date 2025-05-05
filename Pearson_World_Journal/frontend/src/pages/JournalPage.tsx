import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './JournalPage.module.css'; // Import CSS Module
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  description?: string;
  journal?: string;
  images?: string[];
}

export default function JournalPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [waypoint, setWaypoint] = useState<Waypoint | null>(null);
  const [journal, setjournal] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);

  type FilePreview = {
    file: File;
    previewUrl: string;
  };
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  

  // Fetch waypoint data from API
  useEffect(() => {
    const fetchWaypoint = async () => {
      const { data, error } = await supabase
        .from('waypoints')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching waypoint:', error.message);
      } else if (data) {
        setWaypoint(data);
        setjournal(data.journal || '');
        setImages(data.images || []);
      }
    };

    fetchWaypoint();
  }, [id]);

  // Save journal entry and images to the API
  const handleSave = async () => {
    setUploading(true);
    try {
      let uploadedImages: string[] = [];

      // Upload images to Supabase
      if (filePreviews.length) {
        for (const { file } of filePreviews) {
          const filePath = `waypoints/${id}/${file.name}`;

          const { data, error } = await supabase.storage
            .from('images')
            .upload(filePath, file);

          if (error) {
            throw error;
          }

          const fileUrl = `${supabaseUrl}/storage/v1/object/public/${data.path}`;
          uploadedImages.push(fileUrl);
        }
      }

      const allImages = [...images, ...uploadedImages];

      // Update waypoint in Supabase
      const { error } = await supabase
        .from('waypoints')
        .update({
          journal,
          images: allImages,
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

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
      // Extract file path from the URL (e.g., 'waypoints/{id}/{filename}')
      const path = imageUrl.replace(`${supabaseUrl}/storage/v1/object/public/`, '');
  
      const { error } = await supabase.storage
        .from('images')
        .remove([path]);
  
      if (error) {
        throw error;
      }
  
      // Remove the image from local state and mark it as pending delete
      setImages(prev => prev.filter((_, i) => i !== index));
      setPendingDeletes(prev => [...prev, imageUrl]);
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
          await fetch('/restore-image', {
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
    // If the image path starts with 'http', return it directly.
    if (path.startsWith('http')) {
      return path;
    }
    // Otherwise, construct the Supabase storage URL
    return `${supabaseUrl}/storage/v1/object/public/${path}`;
  }
  
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
        value={journal}
        onChange={e => setjournal(e.target.value)}
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