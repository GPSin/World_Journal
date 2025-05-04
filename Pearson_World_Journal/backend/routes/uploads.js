import express from 'express';
import multer from 'multer';
import { supabase } from '../supabaseClient.js';
import path from 'path';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload a single image to Supabase
router.post('/upload-image', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      const { waypointId } = req.body;
  
      if (!file || !waypointId) {
        return res.status(400).json({ error: 'Missing file or waypointId' });
      }
  
      const filePath = `waypoints/${waypointId}/${Date.now()}-${file.originalname}`;
  
      const { data, error } = await supabase.storage
        .from('images') // Make sure 'images' bucket exists in Supabase
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
        });
  
      if (error) {
        return res.status(500).json({ error: error.message });
      }
  
      const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${data.path}`;
  
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
