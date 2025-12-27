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

// GET analytics data
const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    
    // Get this week's data (last 7 days)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    
    // 1. Weekly mood data
    const [weeklyMoodData] = await db.query(
      `SELECT 
        DAYNAME(activity_date) as day,
        AVG(energy) as avg_energy,
        COUNT(*) as count
       FROM activities 
       WHERE user_id = ? 
         AND activity_date >= ? 
         AND activity_date <= ?
       GROUP BY DAYOFWEEK(activity_date), DAYNAME(activity_date)
       ORDER BY DAYOFWEEK(activity_date)`,
      [userId, weekStartStr, todayStr]
    );
    
    // 2. Category distribution
    const [categoryData] = await db.query(
      `SELECT 
        category,
        COUNT(*) as count
       FROM activities 
       WHERE user_id = ?
       GROUP BY category`,
      [userId]
    );
    
    // 3. Monthly activity trend (last 30 days)
    const monthStart = new Date(today);
    monthStart.setDate(today.getDate() - 29);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    
    const [monthlyTrend] = await db.query(
      `SELECT 
        DATE(activity_date) as date,
        COUNT(*) as count
       FROM activities 
       WHERE user_id = ? 
         AND activity_date >= ?
       GROUP BY DATE(activity_date)
       ORDER BY date`,
      [userId, monthStartStr]
    );
    
    // 4. Mood distribution
    const [moodDistribution] = await db.query(
      `SELECT 
        mood,
        COUNT(*) as count
       FROM activities 
       WHERE user_id = ?
       GROUP BY mood`,
      [userId]
    );
    
    // 5. Peak hours
    const [peakHours] = await db.query(
      `SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as count
       FROM activities 
       WHERE user_id = ?
       GROUP BY HOUR(created_at)
       ORDER BY count DESC
       LIMIT 3`,
      [userId]
    );
    
    // 6. Most productive day
    const [productiveDay] = await db.query(
      `SELECT 
        DAYNAME(activity_date) as day,
        COUNT(*) as count
       FROM activities 
       WHERE user_id = ?
       GROUP BY DAYOFWEEK(activity_date), DAYNAME(activity_date)
       ORDER BY count DESC
       LIMIT 1`,
      [userId]
    );
    
    // 7. Weekly summary
    const [weeklySummary] = await db.query(
      `SELECT 
        COUNT(*) as total_activities,
        AVG(energy) as avg_energy,
        MIN(activity_date) as start_date,
        MAX(activity_date) as end_date
       FROM activities 
       WHERE user_id = ? 
         AND activity_date >= ?`,
      [userId, weekStartStr]
    );
    
    // 8. User stats for profile
    const [userStats] = await db.query(
      `SELECT 
        COUNT(DISTINCT DATE(activity_date)) as days_tracked,
        COUNT(*) as total_activities,
        (COUNT(*) / GREATEST(COUNT(DISTINCT DATE(activity_date)), 1)) as avg_daily_activities,
        (SELECT COUNT(*) FROM activities a2 
         WHERE a2.user_id = ? 
           AND DATE(a2.activity_date) = DATE(?)) as streak_days
       FROM activities 
       WHERE user_id = ?`,
      [userId, today, userId]
    );
    
    res.json({
      success: true,
      data: {
        weekly_mood: formatWeeklyMoodData(weeklyMoodData),
        category_distribution: formatCategoryData(categoryData),
        monthly_trend: formatMonthlyTrend(monthlyTrend),
        mood_distribution: moodDistribution,
        peak_hours: peakHours,
        productive_day: productiveDay[0] || null,
        weekly_summary: weeklySummary[0] || {},
        user_stats: userStats[0] || {}
      }
    });
    
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Helper functions to format data
function formatWeeklyMoodData(data) {
  const daysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayMap = {};
  
  data.forEach(item => {
    dayMap[item.day] = {
      avg_energy: parseFloat(item.avg_energy) || 0,
      count: item.count || 0
    };
  });
  
  return daysOrder.map(day => ({
    day: day.substring(0, 3),
    avg_energy: dayMap[day] ? dayMap[day].avg_energy : 0,
    count: dayMap[day] ? dayMap[day].count : 0
  }));
}

function formatCategoryData(data) {
  const categoryNames = {
    'belajar': 'Study',
    'kerja': 'Work',
    'olahraga': 'Exercise',
    'santai': 'Relax',
    'lainnya': 'Other'
  };
  
  return data.map(item => ({
    category: categoryNames[item.category] || item.category,
    count: item.count || 0
  }));
}

function formatMonthlyTrend(data) {
  const result = [];
  const today = new Date();
  
  // Create array for last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const found = data.find(item => 
      new Date(item.date).toISOString().split('T')[0] === dateStr
    );
    
    result.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: found ? found.count : 0
    });
  }
  
  return result;
}

// Export the new function
module.exports = {
  getAllActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getDashboardSummary,
  getAnalytics  // Add this
};