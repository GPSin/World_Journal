import express from 'express';
import multer from 'multer';
import { supabase } from '../supabaseClient.js';
import path from 'path';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload a single image to Supabase
router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = path.extname(req.file.originalname);
  const fileName = `${Date.now()}-${Math.random()}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
    });

  if (uploadError) return res.status(500).json({ error: uploadError.message });

  const { data: { publicUrl } } = supabase.storage
    .from('images')
    .getPublicUrl(fileName);

  res.status(200).json({ url: publicUrl });
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
