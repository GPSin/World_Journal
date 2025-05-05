import express from 'express';
import { supabase } from '../supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET all waypoints
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('waypoints').select('*');
  if (error) return res.status(500).json({ error });
  res.json(data);
});

// POST a new waypoint
router.post('/', async (req, res) => {
  const { title, description, lat, lng, imageUrl, images, journal } = req.body;

  console.log('Received waypoint:', req.body);

  if (!title || !lat || !lng || !imageUrl) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const id = uuidv4();  // Generate UUID here

  const { data, error } = await supabase
  .from('waypoints')
  .insert([{
    id, title, description, lat, lng, imageUrl, images: images || null, journal: journal || null
  }])
  .select();

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data[0]);
});


// PUT (update) an existing waypoint
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  console.log('Updating waypoint with ID:', id);
  console.log('Update payload:', updates);

  const { data, error } = await supabase
    .from('waypoints')
    .update(updates)
    .eq('id', id)
    .select(); // Ensures data is returned

  if (error) return res.status(500).json({ error });
  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'Waypoint not found or update failed.' });
  }

  res.json(data[0]);
});

// DELETE a waypoint
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('waypoints')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error });
  res.sendStatus(204);
});

export default router;