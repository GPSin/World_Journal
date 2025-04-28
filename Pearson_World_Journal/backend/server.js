const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const app = express();
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const waypointRoutes = require('./routes/waypoints');
const PORT = process.env.PORT || 3001;

require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const allowedOrigins = [
  'http://localhost:3000',
  'https://world-journal.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use('/api/waypoints', waypointRoutes);

// Multer setup
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type.'));
  },
});

// Routes
app.get('/', (req, res) => res.send('🌍 World Journal API is running!'));


app.post('/api/upload', upload.array('images', 10), async (req, res) => {
  if (!req.files?.length) return res.status(400).send('No files uploaded.');

  try {
    const urls = [];
    for (let file of req.files) {
      const uploadResponse = await cloudinary.uploader.upload_stream({
        resource_type: 'image',  
      }, (error, result) => {
        if (error) return res.status(500).json({ message: 'Error uploading to Cloudinary', error });
        urls.push(result.secure_url);
      });

      file.stream.pipe(uploadResponse);
    }

    res.json({ urls });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).send('Failed to upload images');
  }
});

app.delete('/api/delete-image', async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ message: 'Image URL is required' });

  // Extract the public ID from the Cloudinary URL
  const publicId = imageUrl.split('/').pop().split('.')[0]; // Assuming your URL ends with the file name

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== 'ok') {
      return res.status(500).json({ message: 'Error deleting image from Cloudinary' });
    }

    res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    res.status(500).json({ message: 'Failed to delete image' });
  }
})

app.post('/api/restore-image', async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ message: 'Image URL is required' });

  try {
    // Re-upload the image from the URL to Cloudinary
    const result = await cloudinary.uploader.upload(imageUrl, { resource_type: 'image' });

    res.status(200).json({ message: 'Image restored successfully', imageUrl: result.secure_url });
  } catch (error) {
    console.error('Error restoring image:', error);
    res.status(500).json({ message: 'Failed to restore image' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});