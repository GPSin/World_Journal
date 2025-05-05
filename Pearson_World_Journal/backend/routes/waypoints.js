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

  if (!lat || !lng) {
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

  // Step 1: Fetch current waypoint to get existing image
  const { data: existingWaypoint, error: fetchError } = await supabase
    .from('waypoints')
    .select('image')
    .eq('id', id)
    .single();

  if (fetchError) {
    return res.status(500).json({ error: 'Failed to fetch existing waypoint' });
  }

  const oldImageUrl = existingWaypoint?.image;
  const newImageUrl = updates.image;

  // Step 2: If new image is different, delete the old one
  if (oldImageUrl && newImageUrl && oldImageUrl !== newImageUrl) {
    const path = oldImageUrl.replace(`${process.env.SUPABASE_URL}/storage/v1/object/public/`, '');
    const { error: deleteError } = await supabase.storage
      .from('images')
      .remove([path]);

    if (deleteError) {
      console.error('Failed to delete old image:', deleteError);
      // Proceed anyway; don’t block the update
    }
  }

  // Step 3: Update the waypoint
  const { data, error: updateError } = await supabase
    .from('waypoints')
    .update(updates)
    .eq('id', id)
    .select();

  if (updateError) return res.status(500).json({ error: updateError });
  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'Waypoint not found or update failed.' });
  }

  res.json(data[0]);
});

// DELETE a waypoint
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  // Step 1: Fetch the waypoint to get the image URL
  const { data: waypoint, error: fetchError } = await supabase
    .from('waypoints')
    .select('image')
    .eq('id', id)
    .single();

  if (fetchError) return res.status(500).json({ error: 'Failed to fetch waypoint image' });

  // Step 2: Delete image from storage if it exists
  if (waypoint?.imageUrl) {
    // Extract just the path from full URL
    const path = waypoint.imageUrl.replace(`${process.env.SUPABASE_URL}/storage/v1/object/public/images/`, '');

    const { error: deleteImageError } = await supabase.storage
      .from('images')
      .remove([path]);

    if (deleteImageError) {
      console.error('Failed to delete associated image:', deleteImageError);
      // Don’t fail deletion if image cleanup fails, just log
    }
  }

  // Step 3: Delete the waypoint from the table
  const { error: deleteError } = await supabase
    .from('waypoints')
    .delete()
    .eq('id', id);

  if (deleteError) return res.status(500).json({ error: deleteError });

  res.sendStatus(204);
});


export default router;