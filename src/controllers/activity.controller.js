const db = require('../config/db');

// GET semua aktivitas untuk user tertentu
const getAllActivities = async (req, res) => {
  try {
    const userId = req.user.id; // HARUS DAPAT DARI AUTH MIDDLEWARE
    
    const [rows] = await db.query(
      'SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({
      success: true,
      data: rows,
      message: 'Data activities berhasil diambil'
    });
  } catch (error) {
    console.error('Error getting activities:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


// POST tambah aktivitas
const createActivity = async (req, res) => {
  try {
    const { 
      title, 
      category, 
      mood, 
      energy, 
      note,
      activity_date 
    } = req.body;
    
    const userId = req.user.id; // HARUS DAPAT DARI AUTH MIDDLEWARE
    
    // Validation
    if (!title || !category || !mood || !energy) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, mood, dan energy diperlukan'
      });
    }
    
    if (energy < 1 || energy > 5) {
      return res.status(400).json({
        success: false,
        message: 'Energy harus antara 1-5'
      });
    }
    
    const [result] = await db.query(
      `INSERT INTO activities 
       (title, category, mood, energy, note, activity_date, user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, category, mood, energy, note || null, 
       activity_date || new Date().toISOString().split('T')[0], 
       userId]
    );
    
    res.status(201).json({
      success: true,
      data: { id: result.insertId, ...req.body },
      message: 'Activity berhasil dibuat'
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
};

// GET dashboard summary
const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userId = req.user.id; // HARUS DAPAT DARI AUTH MIDDLEWARE
    
    // Total aktivitas hari ini
    const [totalResult] = await db.query(
      'SELECT COUNT(*) as total FROM activities WHERE DATE(activity_date) = ? AND user_id = ?',
      [today, userId]
    );
    
    // Mood dominan hari ini
    const [moodResult] = await db.query(
      `SELECT mood, COUNT(*) as count 
       FROM activities 
       WHERE DATE(activity_date) = ? AND user_id = ?
       GROUP BY mood 
       ORDER BY count DESC 
       LIMIT 1`,
      [today, userId]
    );
    
    // Rata-rata energi
    const [energyResult] = await db.query(
      'SELECT AVG(energy) as average_energy FROM activities WHERE DATE(activity_date) = ? AND user_id = ?',
      [today, userId]
    );
    
    // Aktivitas terbaru
    const [activitiesResult] = await db.query(
      `SELECT * FROM activities 
       WHERE DATE(activity_date) = ? AND user_id = ?
       ORDER BY created_at DESC 
       LIMIT 5`,
      [today, userId]
    );
    
    res.json({
      success: true,
      data: {
        total_activities: totalResult[0].total,
        dominant_mood: moodResult.length > 0 ? moodResult[0].mood : null,
        average_energy: energyResult[0].average_energy || 0,
        recent_activities: activitiesResult
      }
    });
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// POST tambah aktivitas

// GET activity by ID
const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      'SELECT * FROM activities WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error getting activity:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// PUT update activity
const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      category, 
      mood, 
      energy, 
      note,
      activity_date 
    } = req.body;
    
    const userId = req.user.id;
    
    // Cek jika activity ada dan milik user ini
    const [checkRows] = await db.query(
      'SELECT id FROM activities WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (checkRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found or you dont have permission'
      });
    }
    
    // Validation
    if (!title || !category || !mood || !energy || !activity_date) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }
    
    if (energy < 1 || energy > 5) {
      return res.status(400).json({
        success: false,
        message: 'Energy must be between 1-5'
      });
    }
    
    await db.query(
      `UPDATE activities 
       SET title = ?, category = ?, mood = ?, energy = ?, 
           note = ?, activity_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [title, category, mood, energy, note || null, activity_date, id, userId]
    );
    
    // Get updated activity
    const [updatedRows] = await db.query(
      'SELECT * FROM activities WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      data: updatedRows[0],
      message: 'Activity berhasil diupdate'
    });
    
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// DELETE activity
const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.query(
      'DELETE FROM activities WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Activity berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getAllActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getDashboardSummary
};