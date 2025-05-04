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
app.post('/waypoints', async (req, res) => {
    try {
      const { waypointId, imageUrl } = req.body;
      if (!waypointId || !imageUrl) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
  
      // Process the waypoint creation (save to DB, etc.)
  
      res.status(200).json({ message: 'Waypoint created successfully' });
    } catch (error) {
      console.error('Error creating waypoint:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
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