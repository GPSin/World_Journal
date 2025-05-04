import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import waypointsRouter from './routes/waypoints.js';
import uploadsRouter from './routes/uploads.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

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

app.get('/', (req, res) => {
  res.send('🌍 World Journal API is running!');
});

app.use('/api/waypoints', waypointsRouter);
app.use('/api/upload-image', uploadsRouter);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});