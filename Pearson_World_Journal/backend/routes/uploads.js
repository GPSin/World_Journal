import express from 'express';
import multer from 'multer';
import { supabase } from '../supabaseClient.js';
import path from 'path';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload a single image to Supabase
router.post('/', upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'waypointId', maxCount: 1 },
  ]), async (req, res) => {
    console.log('Files:', req.files);
    console.log('Body:', req.body)
    try {
      const file = req.files?.file?.[0];
      const { waypointId } = req.body;
  
      if (!file || !waypointId) {
        return res.status(400).json({ error: 'Missing file or waypointId' });
      }
  
      const filePath = `waypoints/${waypointId}/${Date.now()}-${file.originalname}`;
  
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
        });
  
      if (error) {
        console.error('Supabase upload error:', error);
        return res.status(500).json({ error: error.message });
      }
  
      
      const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/${data.path}`;
  
      res.json({ imageUrl: publicUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Upload failed' });
    }
});

// Delete image from Supabase
router.delete('/', async (req, res) => {
  const { imageUrl, waypointId } = req.body;

  if (!imageUrl || !waypointId) {
    return res.status(400).json({ error: 'Image URL and waypoint ID are required' });
  }

  const filePath = imageUrl.replace(`${supabaseUrl}/storage/v1/object/public/images/`, '');

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('images')
    .remove([filePath]);

  if (storageError) {
    return res.status(500).json({ error: storageError.message });
  }

  // Remove image from the waypoint's images array
  const { data, error: fetchError } = await supabase
    .from('waypoints')
    .select('images')
    .eq('id', waypointId)
    .single();

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message });
  }

  const updatedImages = data.images.filter((img) => img !== filePath);

  const { error: updateError } = await supabase
    .from('waypoints')
    .update({ images: updatedImages })
    .eq('id', waypointId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  res.status(200).json({ message: 'Image deleted from storage and database' });
});

export default router;