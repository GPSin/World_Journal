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
  'https://world-journal-5mriqnitw-gps-projects-201f21a0.vercel.app'
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

app.options('*', cors());

app.use(express.json());

app.get('/', (req, res) => {
  res.send('🌍 World Journal API is running!');
});

app.use('/waypoints', waypointsRouter);
app.use('/upload-image', uploadsRouter);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});