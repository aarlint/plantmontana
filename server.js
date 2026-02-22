const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET all plants
app.get('/api/plants', (req, res) => {
  const { category, search } = req.query;
  let sql = 'SELECT * FROM plants WHERE 1=1';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (search) { sql += ' AND name LIKE ?'; params.push(`%${search}%`); }
  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all(...params));
});

// GET single plant
app.get('/api/plants/:id', (req, res) => {
  const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(req.params.id);
  if (!plant) return res.status(404).json({ error: 'Not found' });
  res.json(plant);
});

// GET calendar data
app.get('/api/calendar', (req, res) => {
  const plants = db.prepare('SELECT id, name, category, start_indoors_date, transplant_date, direct_sow_date, days_to_harvest, frost_tolerance FROM plants ORDER BY name').all();
  res.json({
    zone: '4b-6a',
    last_spring_frost: 'May 17',
    first_fall_frost: 'Sep 22',
    growing_season_days: 128,
    plants
  });
});

// GET what to do now
app.get('/api/now', (req, res) => {
  const month = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;
  const plants = db.prepare('SELECT * FROM plants ORDER BY name').all();
  const tip = db.prepare('SELECT tip FROM monthly_tips WHERE month = ?').get(month);

  const monthNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthAbbr = monthNames[month];

  const parseMonth = (dateStr) => {
    if (!dateStr) return null;
    const months = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
    // Parse "Mar 22 - Apr 5" -> return start and end months
    const parts = dateStr.split(' - ');
    const startMonth = months[parts[0].split(' ')[0]];
    const endMonth = parts[1] ? months[parts[1].split(' ')[0]] : startMonth;
    return { start: startMonth, end: endMonth };
  };

  const isInWindow = (dateStr, m) => {
    const range = parseMonth(dateStr);
    if (!range) return false;
    if (range.start <= range.end) return m >= range.start && m <= range.end;
    return m >= range.start || m <= range.end; // wraps around year
  };

  const startIndoors = plants.filter(p => isInWindow(p.start_indoors_date, month));
  const plantOutside = plants.filter(p => isInWindow(p.transplant_date, month) || isInWindow(p.direct_sow_date, month));

  // Estimate harvest: plants sown ~2-4 months ago
  const harvestMonth = (sowMonth, days) => {
    const m = sowMonth + Math.floor(days / 30);
    return m > 12 ? m - 12 : m;
  };
  const harvest = plants.filter(p => {
    const sowRange = parseMonth(p.direct_sow_date) || parseMonth(p.transplant_date);
    if (!sowRange || !p.days_to_harvest) return false;
    const hStart = harvestMonth(sowRange.start, p.days_to_harvest);
    const hEnd = harvestMonth(sowRange.end || sowRange.start, p.days_to_harvest);
    if (hStart <= hEnd) return month >= hStart && month <= hEnd;
    return month >= hStart || month <= hEnd;
  });

  // Frost countdown
  const now = new Date();
  const year = now.getFullYear();
  const springFrost = new Date(year, 4, 17);
  const fallFrost = new Date(year, 8, 22);
  let frostCountdown;
  if (now < springFrost) {
    const days = Math.ceil((springFrost - now) / 86400000);
    frostCountdown = { event: 'Last Spring Frost (May 17)', days, direction: 'until' };
  } else if (now < fallFrost) {
    const days = Math.ceil((fallFrost - now) / 86400000);
    frostCountdown = { event: 'First Fall Frost (Sep 22)', days, direction: 'until' };
  } else {
    frostCountdown = { event: 'Growing season has ended', days: 0, direction: 'past' };
  }

  res.json({
    month,
    monthName: ['','January','February','March','April','May','June','July','August','September','October','November','December'][month],
    tip: tip?.tip || '',
    frostCountdown,
    startIndoors,
    plantOutside,
    harvest
  });
});

// Layouts CRUD
app.get('/api/layouts', (req, res) => {
  res.json(db.prepare('SELECT * FROM garden_layouts ORDER BY updated_at DESC').all());
});

app.post('/api/layouts', (req, res) => {
  const { name, width_feet, height_feet, grid_data } = req.body;
  const result = db.prepare('INSERT INTO garden_layouts (name, width_feet, height_feet, grid_data) VALUES (?, ?, ?, ?)').run(name, width_feet, height_feet, JSON.stringify(grid_data || {}));
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/layouts/:id', (req, res) => {
  const { name, width_feet, height_feet, grid_data } = req.body;
  db.prepare("UPDATE garden_layouts SET name=?, width_feet=?, height_feet=?, grid_data=?, updated_at=datetime('now') WHERE id=?").run(name, width_feet, height_feet, JSON.stringify(grid_data || {}), req.params.id);
  res.json({ ok: true });
});

app.delete('/api/layouts/:id', (req, res) => {
  db.prepare('DELETE FROM garden_layouts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/layouts/:id/plants', (req, res) => {
  const { plant_id, grid_x, grid_y } = req.body;
  const result = db.prepare('INSERT INTO layout_plants (layout_id, plant_id, grid_x, grid_y) VALUES (?, ?, ?, ?)').run(req.params.id, plant_id, grid_x, grid_y);
  res.json({ id: result.lastInsertRowid });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Plant Montana running on port ${PORT}`));
