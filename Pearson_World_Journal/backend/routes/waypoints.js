const express = require('express');
const router = express.Router();
const db = require('../db'); // assuming you have a db.js or connection file

// Get all waypoints
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM waypoints');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

// Add a new waypoint
router.post('/', async (req, res) => {
    const { lat, lng, title, description, image } = req.body;
    try {
      const [result] = await db.query(
        'INSERT INTO waypoints (lat, lng, title, description, image) VALUES (?, ?, ?, ?, ?)',
        [lat, lng, title, description, image]
      );
      res.status(201).json({ _id: result.insertId, lat, lng, title, description, image });
    } catch (err) {
      console.error(err);
      res.status(500).send('Database error');
    }
  });
  

// Update a waypoint
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, image } = req.body;
  try {
    await db.query(
      'UPDATE waypoints SET title = ?, description = ?, image = ? WHERE id = ?',
      [title, description, image, id]
    );
    res.status(200).send('Waypoint updated');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

// Delete a waypoint
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM waypoints WHERE id = ?', [id]);
    res.status(200).send('Waypoint deleted');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

module.exports = router;