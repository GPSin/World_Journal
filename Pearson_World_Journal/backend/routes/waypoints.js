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
  const { title, description, lat, lng, imageUrl } = req.body;
  const id = uuidv4();

  const { data, error } = await supabase
    .from('waypoints')
    .insert([{ id, title, description, lat, lng, imageUrl }]);

  if (error) return res.status(500).json({ error });
  res.status(201).json(data[0]);
});

// PUT (update) an existing waypoint
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data, error } = await supabase
    .from('waypoints')
    .update(updates)
    .eq('id', id);

  if (error) return res.status(500).json({ error });
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