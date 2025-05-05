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
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'Image URL is required' });

  const parts = imageUrl.split('/');
  const fileName = parts[parts.length - 1];

  const { error } = await supabase.storage
    .from('images')
    .remove([fileName]);

  if (error) return res.status(500).json({ error });
  res.status(200).json({ message: 'Image deleted' });
});

export default router;
