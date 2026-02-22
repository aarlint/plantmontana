const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'plantmontana.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK(category IN ('vegetable','herb','flower','fruit')),
    difficulty TEXT NOT NULL CHECK(difficulty IN ('easy','moderate','hard')),
    days_to_harvest INTEGER,
    spacing_inches INTEGER,
    depth_inches REAL,
    sun TEXT CHECK(sun IN ('full','partial','shade')),
    water TEXT CHECK(water IN ('low','moderate','high')),
    companion_plants TEXT DEFAULT '[]',
    incompatible_plants TEXT DEFAULT '[]',
    start_indoors_date TEXT,
    transplant_date TEXT,
    direct_sow_date TEXT,
    last_plant_date TEXT,
    frost_tolerance TEXT CHECK(frost_tolerance IN ('hardy','semi-hardy','tender')),
    description TEXT,
    tips TEXT
  );

  CREATE TABLE IF NOT EXISTS garden_layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    width_feet INTEGER NOT NULL,
    height_feet INTEGER NOT NULL,
    grid_data TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS layout_plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    layout_id INTEGER NOT NULL REFERENCES garden_layouts(id) ON DELETE CASCADE,
    plant_id INTEGER NOT NULL REFERENCES plants(id),
    grid_x INTEGER NOT NULL,
    grid_y INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS monthly_tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
    tip TEXT NOT NULL
  );
`);

// Seed only if empty
const count = db.prepare('SELECT COUNT(*) as c FROM plants').get().c;
if (count === 0) {
  const insert = db.prepare(`INSERT INTO plants (name, category, difficulty, days_to_harvest, spacing_inches, depth_inches, sun, water, companion_plants, incompatible_plants, start_indoors_date, transplant_date, direct_sow_date, last_plant_date, frost_tolerance, description, tips) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  const plants = [
    ["Tomato", "vegetable", "moderate", 75, 24, 0.25, "full", "moderate", '["Basil","Carrot","Parsley","Marigold"]', '["Cabbage","Fennel","Walnut"]', "Mar 22 - Apr 5", "May 31 - Jun 7", null, "Jun 7", "tender", "The king of the summer garden. Choose short-season varieties (Early Girl, Stupice, Glacier) for Montana's short growing season.", "Use black plastic mulch or Wall O' Water to warm soil. Stake or cage at planting time."],
    ["Bell Pepper", "vegetable", "moderate", 70, 18, 0.25, "full", "moderate", '["Tomato","Basil","Carrot"]', '["Fennel","Kohlrabi"]', "Mar 7 - Mar 22", "May 31 - Jun 7", null, "Jun 7", "tender", "Sweet peppers need warmth. Choose early varieties like Ace or King of the North for Montana.", "Use row covers early in season. Peppers love warm soil—wait until soil is 65°F+."],
    ["Lettuce", "vegetable", "easy", 45, 8, 0.25, "partial", "moderate", '["Carrot","Radish","Strawberry","Chive"]', '["Celery","Parsley"]', "Mar 22 - Apr 5", null, "Apr 19 - Apr 26", "Aug 1", "semi-hardy", "Cool-season green that thrives in Montana spring and fall. Succession plant every 2 weeks.", "Provide afternoon shade in summer to prevent bolting. Great for containers."],
    ["Pea", "vegetable", "easy", 60, 3, 1.0, "full", "moderate", '["Carrot","Turnip","Radish","Cucumber","Corn"]', '["Onion","Garlic"]', null, null, "Apr 19 - Apr 26", "Jun 15", "hardy", "One of the first crops to plant in spring. Sugar snap and snow peas are most productive.", "Inoculate seeds with rhizobium bacteria. Provide trellis for climbing varieties."],
    ["Green Bean", "vegetable", "easy", 55, 4, 1.0, "full", "moderate", '["Corn","Cucumber","Potato","Carrot"]', '["Onion","Garlic","Fennel"]', null, null, "May 24 - Jun 14", "Jun 14", "tender", "Bush beans are most reliable for Montana. Direct sow after last frost.", "Don't handle plants when wet. Succession plant every 2 weeks for continuous harvest."],
    ["Carrot", "vegetable", "easy", 70, 3, 0.25, "full", "moderate", '["Pea","Lettuce","Tomato","Onion","Rosemary"]', '["Dill"]', null, null, "Apr 19 - May 3", "Jun 15", "semi-hardy", "Sweet Montana-grown carrots thrive in our cool nights. Nantes and Danvers types do well.", "Keep soil consistently moist for germination (10-21 days). Thin to 2-3 inches apart."],
    ["Potato", "vegetable", "easy", 90, 12, 4.0, "full", "moderate", '["Bean","Corn","Cabbage","Horseradish"]', '["Tomato","Squash","Cucumber"]', null, null, "Apr 19 - May 3", "May 15", "semi-hardy", "A Montana staple. Yukon Gold and Red Norland are reliable. Hill soil as plants grow.", "Cut seed potatoes 2 days before planting. Hill 6 inches of soil as stems grow."],
    ["Pumpkin", "vegetable", "moderate", 100, 60, 1.0, "full", "moderate", '["Corn","Bean","Radish"]', '["Potato"]', "Apr 26 - May 3", "May 31 - Jun 7", null, "Jun 7", "tender", "Choose short-season varieties like Jack Be Little, Sugar Pie, or Baby Pam for Montana.", "Start indoors in peat pots to avoid transplant shock. Needs lots of space."],
    ["Sweet Corn", "vegetable", "moderate", 75, 12, 1.5, "full", "high", '["Bean","Pea","Pumpkin","Squash","Cucumber"]', '["Tomato"]', null, null, "May 31 - Jun 14", "Jun 14", "tender", "Plant in blocks of at least 4 rows for pollination. Choose early varieties (65-75 days).", "Soil must be 60°F+ for germination. Plant in blocks, not single rows."],
    ["Broccoli", "vegetable", "moderate", 65, 18, 0.5, "full", "high", '["Onion","Celery","Potato","Dill"]', '["Tomato","Strawberry"]', "Apr 5 - Apr 19", "May 3 - May 17", null, "Jun 15", "hardy", "A cool-season champion in Montana. Harvest main head, then side shoots continue for weeks.", "Floating row covers protect from cabbage worms. Harvest before yellow flowers appear."],
    ["Kale", "vegetable", "easy", 55, 18, 0.5, "full", "moderate", '["Beet","Celery","Herb","Onion","Potato"]', '["Strawberry","Tomato"]', "Mar 22 - Apr 5", "May 3 - May 17", null, "Jul 15", "hardy", "Montana's hardiest green. Flavor improves after frost. Lacinato and Red Russian are favorites.", "Can overwinter with protection. Harvest outer leaves first for continuous production."],
    ["Spinach", "vegetable", "easy", 40, 6, 0.5, "partial", "moderate", '["Strawberry","Pea","Bean","Cabbage"]', '[]', null, null, "Apr 19 - Apr 26", "May 15", "hardy", "Fast-growing cool-season crop. Plant early spring and again in late summer for fall harvest.", "Bolts quickly in heat. Bloomsdale Long Standing is bolt-resistant. Great fall crop."],
    ["Basil", "herb", "easy", 60, 12, 0.25, "full", "moderate", '["Tomato","Pepper","Oregano"]', '["Sage","Rue"]', "Apr 5 - Apr 19", "May 31 - Jun 14", null, "Jun 14", "tender", "Essential herb for any garden. Genovese for pesto, Thai for Asian dishes.", "Pinch flowers to encourage bushier growth. Very frost sensitive—cover or harvest before first frost."],
    ["Cucumber", "vegetable", "easy", 55, 12, 1.0, "full", "high", '["Bean","Corn","Pea","Radish","Sunflower"]', '["Potato","Aromatic Herb"]', "Apr 26 - May 3", "May 24 - Jun 7", null, "Jun 14", "tender", "Bush varieties work great in small spaces. Marketmore and Spacemaster are reliable for Montana.", "Use trellises for better air circulation and straighter fruit. Keep well-watered."],
    ["Radish", "vegetable", "easy", 25, 2, 0.5, "full", "low", '["Pea","Lettuce","Cucumber","Carrot"]', '["Hyssop"]', null, null, "Apr 19 - Apr 26", "Aug 15", "hardy", "The fastest crop in the garden—harvest in 3-4 weeks. Kids love growing these.", "Succession plant every 10 days. Spring and fall plantings avoid pithy roots from summer heat."],
    ["Beet", "vegetable", "easy", 55, 4, 0.5, "full", "moderate", '["Onion","Lettuce","Cabbage","Garlic"]', '["Pole Bean"]', null, null, "Apr 19 - May 3", "Jul 1", "semi-hardy", "Both roots and greens are edible. Detroit Dark Red and Chioggia are Montana favorites.", "Soak seeds overnight for faster germination. Each seed cluster produces multiple seedlings—thin early."],
    ["Onion", "vegetable", "moderate", 100, 4, 0.5, "full", "moderate", '["Beet","Carrot","Lettuce","Tomato","Cabbage"]', '["Pea","Bean"]', "Mar 7 - Mar 22", "Apr 19 - May 3", null, "May 3", "hardy", "Long-day varieties are best for Montana. Walla Walla and Copra are reliable choices.", "Start from sets or transplants for best results. Stop watering when tops fall over."],
    ["Garlic", "vegetable", "easy", 240, 6, 2.0, "full", "low", '["Beet","Lettuce","Tomato","Fruit Tree"]', '["Pea","Bean"]', null, null, "Oct 1 - Oct 15", "Oct 15", "hardy", "Plant in fall, harvest in July. Hardneck varieties are best for cold Montana winters.", "Mulch heavily in fall with straw. Snap scapes in June for bigger bulbs."],
    ["Zucchini", "vegetable", "easy", 50, 36, 1.0, "full", "moderate", '["Corn","Bean","Nasturtium"]', '["Potato"]', "Apr 26 - May 3", "May 31", null, "Jun 7", "tender", "Incredibly productive—one or two plants is plenty. Pick at 6-8 inches for best flavor.", "Check daily once producing. Harvest small for best texture. Hand-pollinate if needed."],
    ["Eggplant", "vegetable", "hard", 70, 24, 0.25, "full", "moderate", '["Bean","Pepper","Spinach","Thyme"]', '["Fennel"]', "Mar 22 - Apr 5", "May 31 - Jun 7", null, "Jun 7", "tender", "Challenging in Montana but rewarding. Choose early varieties like Ichiban or Hansel.", "Needs warm soil (70°F+). Black plastic mulch and row covers help enormously."],
    ["Cauliflower", "vegetable", "hard", 70, 18, 0.5, "full", "high", '["Celery","Dill","Onion"]', '["Tomato","Strawberry"]', "Apr 5 - Apr 19", "May 10 - May 24", null, "Jun 1", "semi-hardy", "Demanding but delicious. Snow Crown is the most reliable variety for Montana.", "Blanch heads by tying leaves over the curd when it reaches 2-3 inches."],
    ["Brussels Sprout", "vegetable", "hard", 100, 24, 0.5, "full", "moderate", '["Dill","Onion","Sage","Beet"]', '["Strawberry","Tomato"]', "Apr 5 - Apr 19", "May 3 - May 17", null, "May 17", "hardy", "A long-season crop that tastes best after frost. Jade Cross is reliable for Montana.", "Remove lower leaves as sprouts develop. Flavor sweetens dramatically after frost."],
    ["Cabbage", "vegetable", "moderate", 70, 18, 0.5, "full", "high", '["Celery","Dill","Onion","Potato"]', '["Strawberry","Tomato"]', "Mar 22 - Apr 5", "Apr 26 - May 3", null, "Jun 1", "hardy", "Early varieties work best. Plant spring crop and late summer crop for fall harvest.", "Use row covers to protect from cabbage moths. Good for sauerkraut and storage."],
    ["Swiss Chard", "vegetable", "easy", 55, 12, 0.5, "full", "moderate", '["Bean","Cabbage","Onion"]', '[]', "Apr 5 - Apr 19", "May 3 - May 17", null, "Jul 1", "semi-hardy", "Beautiful and productive. Bright Lights adds color to the garden. Harvest outer leaves.", "Very heat-tolerant for a green. Produces all season long until hard freeze."],
    ["Celery", "vegetable", "hard", 100, 8, 0.1, "full", "high", '["Tomato","Cabbage","Bean"]', '["Corn","Potato"]', "Feb 21 - Mar 7", "May 24 - Jun 7", null, "Jun 7", "semi-hardy", "Demanding but possible in Montana. Needs consistent moisture and long season.", "Start very early indoors. Blanch stalks by hilling soil or wrapping in newspaper."],
    ["Turnip", "vegetable", "easy", 45, 4, 0.5, "full", "moderate", '["Pea","Bean"]', '["Potato"]', null, null, "Apr 19 - Apr 26", "Aug 1", "hardy", "Fast-growing root vegetable. Purple Top White Globe is the classic choice.", "Spring and fall crops are sweetest. Young greens are excellent sautéed."],
    ["Parsnip", "vegetable", "moderate", 120, 4, 0.5, "full", "moderate", '["Pea","Potato","Radish"]', '["Carrot","Celery"]', null, null, "Apr 19 - Apr 26", "May 15", "hardy", "Sweet root vegetable that improves with frost. Incredibly cold-hardy.", "Very slow to germinate (2-3 weeks). Be patient. Can overwinter in the ground."],
    ["Watermelon", "vegetable", "hard", 80, 60, 1.0, "full", "moderate", '["Corn","Radish","Nasturtium"]', '["Potato"]', "Apr 26 - May 10", "May 31 - Jun 7", null, "Jun 7", "tender", "Choose short-season varieties like Sugar Baby or Blacktail Mountain (bred in Montana!).", "Black plastic mulch is essential. Row covers for warmth early on."],
    ["Cantaloupe", "vegetable", "hard", 80, 36, 0.5, "full", "moderate", '["Corn","Radish"]', '["Potato"]', "Apr 5 - Apr 19", "May 31 - Jun 7", null, "Jun 7", "tender", "Minnesota Midget and Halona are good short-season choices for Montana.", "Start indoors in peat pots. Black plastic and row covers help enormously."],
    ["Winter Squash", "vegetable", "moderate", 95, 48, 1.0, "full", "moderate", '["Corn","Bean","Radish"]', '["Potato"]', "Apr 26 - May 3", "May 24 - Jun 7", null, "Jun 7", "tender", "Butternut, Delicata, and Acorn squash store for months. Great Montana staple.", "Cure in sun for 10 days after harvest for best storage. Mulch well."],
    ["Dill", "herb", "easy", 40, 12, 0.25, "full", "low", '["Cabbage","Onion","Lettuce","Cucumber"]', '["Carrot","Tomato"]', null, null, "May 10 - May 31", "Jun 15", "semi-hardy", "Essential for pickles and fish. Self-seeds prolifically. Bouquet and Fernleaf are popular.", "Let some plants go to seed for next year. Attracts beneficial swallowtail butterflies."],
    ["Cilantro", "herb", "easy", 30, 6, 0.25, "full", "moderate", '["Bean","Pea","Tomato"]', '["Fennel"]', null, null, "May 17 - May 31", "Aug 1", "semi-hardy", "Bolts quickly in heat. Plant succession crops. Coriander seeds are the bonus harvest.", "Plant in partial shade for slower bolting. Slow Bolt variety lives up to its name."],
    ["Parsley", "herb", "easy", 75, 8, 0.25, "partial", "moderate", '["Tomato","Asparagus","Corn"]', '["Lettuce"]', "Mar 7 - Mar 22", "May 24 - Jun 7", null, "Jun 15", "semi-hardy", "Biennial herb, but treated as annual. Italian flat-leaf has the best flavor.", "Soak seeds overnight for faster germination. Very slow to start—be patient."],
    ["Oregano", "herb", "easy", 45, 12, 0.1, "full", "low", '["Basil","Pepper","Tomato"]', '[]', "Mar 7 - Apr 5", "May 24 - Jun 7", null, "Jun 15", "hardy", "Perennial herb that thrives in Montana. Greek oregano has the strongest flavor.", "Cut back hard before winter. Divide every 3-4 years. Flavor is best just before bloom."],
    ["Thyme", "herb", "easy", 40, 9, 0.1, "full", "low", '["Cabbage","Eggplant","Potato","Strawberry"]', '[]', "Mar 7 - Mar 22", "May 24 - May 31", null, "Jun 7", "hardy", "Hardy perennial herb. English thyme is most culinary. Creeping thyme makes great ground cover.", "Well-drained soil is essential. Mulch lightly in winter. Prune after flowering."],
    ["Sage", "herb", "easy", 75, 18, 0.1, "full", "low", '["Cabbage","Carrot","Rosemary","Strawberry"]', '["Cucumber","Onion"]', "Mar 22 - Apr 5", "May 24 - Jun 7", null, "Jun 15", "hardy", "Beautiful perennial herb. Common sage is most versatile. Purple sage is ornamental.", "Don't overwater. Prune in spring to prevent woodiness. Replace plants every 4-5 years."],
    ["Rosemary", "herb", "moderate", 90, 18, 0.1, "full", "low", '["Sage","Bean","Cabbage","Carrot"]', '[]', "Feb 21 - Mar 7", "May 31 - Jun 7", null, "Jun 7", "tender", "Grow as annual or bring indoors for winter in Montana. Arp variety is most cold-hardy.", "Excellent in containers. Bring inside before frost. Needs good drainage."],
    ["Mint", "herb", "easy", 30, 18, 0.25, "partial", "high", '["Cabbage","Tomato","Pea"]', '["Parsley"]', "Mar 7 - Mar 22", "May 24 - May 31", null, "Jun 15", "hardy", "Aggressively spreading perennial. ALWAYS grow in containers to prevent takeover.", "Harvest frequently to promote bushy growth. Spearmint and peppermint are most popular."],
    ["Chive", "herb", "easy", 30, 6, 0.25, "full", "moderate", '["Carrot","Tomato","Apple Tree"]', '["Bean","Pea"]', "Mar 22 - Apr 5", "Apr 26 - May 3", null, "Jun 1", "hardy", "Easy perennial herb with beautiful purple flowers. Great border plant.", "Divide clumps every 3 years. Both leaves and flowers are edible."],
    ["Lavender", "herb", "moderate", 90, 18, 0.1, "full", "low", '["Echinacea","Rose","Sage"]', '[]', "Mar 7 - Mar 22", "May 31 - Jun 14", null, "Jun 14", "semi-hardy", "Munstead and Hidcote are most cold-hardy for Montana. Needs excellent drainage.", "Add gravel to planting hole for drainage. Don't cut into old wood. Mulch in winter."],
    ["Sunflower", "flower", "easy", 70, 18, 1.0, "full", "low", '["Cucumber","Corn","Bean"]', '["Potato"]', null, null, "May 17 - May 31", "Jun 7", "tender", "Iconic Montana flower. Mammoth varieties grow 10+ feet. Great for kids.", "Plant in succession for blooms all summer. Save seeds for birds or snacking."],
    ["Marigold", "flower", "easy", 50, 10, 0.25, "full", "low", '["Tomato","Pepper","Bean","Cucumber"]', '["Cabbage"]', "Apr 5 - Apr 19", "May 31", null, "Jun 7", "tender", "Pest-repelling powerhouse. French marigolds deter nematodes and many insects.", "Deadhead regularly for continuous blooms. Mix throughout vegetable garden."],
    ["Zinnia", "flower", "easy", 60, 8, 0.25, "full", "low", '["Tomato","Bean"]', '[]', null, null, "May 31 - Jun 7", "Jun 7", "tender", "Spectacular cut flowers in every color. State Fair and Benary's Giant are showstoppers.", "Deadhead for continuous blooms. Good air circulation prevents powdery mildew."],
    ["Cosmos", "flower", "easy", 50, 12, 0.25, "full", "low", '["Tomato","Carrot"]', '[]', null, null, "May 17 - May 31", "Jun 7", "tender", "Effortless beauty. Thrives in poor soil. Sensation mix provides all colors.", "Don't fertilize—poor soil produces more flowers. Self-seeds for next year."],
    ["Nasturtium", "flower", "easy", 45, 12, 0.5, "full", "low", '["Tomato","Cucumber","Bean","Cabbage"]', '[]', null, null, "May 17 - May 31", "Jun 7", "tender", "Edible flowers and leaves with peppery flavor. Trap crop for aphids.", "Direct sow only—doesn't transplant well. Flowers and leaves great in salads."],
    ["Sweet Pea", "flower", "easy", 60, 6, 1.0, "full", "moderate", '["Bean"]', '["Onion","Garlic"]', null, null, "Apr 19 - Apr 26", "May 15", "hardy", "Fragrant climbing flower for early spring. Not edible—purely ornamental.", "Soak seeds overnight before planting. Provide trellis. Pick flowers to encourage more."],
    ["Dahlia", "flower", "moderate", 70, 18, 4.0, "full", "moderate", '["Aster"]', '[]', null, "May 31 - Jun 7", null, "Jun 7", "tender", "Stunning tuber-grown flowers in endless varieties. Dig tubers before hard freeze.", "Stake tall varieties. Pinch center shoot for bushier plants. Dig and store tubers in fall."],
    ["Echinacea", "flower", "easy", 120, 18, 0.1, "full", "low", '["Lavender","Black-Eyed Susan"]', '[]', "Mar 7 - Mar 22", "May 24 - May 31", null, "Jun 7", "hardy", "Native Montana perennial. Purple coneflower supports pollinators and has medicinal uses.", "Leave seed heads for winter bird food. Drought-tolerant once established."],
    ["Black-Eyed Susan", "flower", "easy", 120, 18, 0.1, "full", "low", '["Echinacea","Lavender"]', '[]', "Mar 7 - Mar 22", "May 17 - May 31", null, "Jun 7", "hardy", "Native perennial that lights up late summer. Rudbeckia hirta is the classic choice.", "Deadhead for longer bloom. Self-seeds freely. Cut back in late fall."],
    ["Lupine", "flower", "moderate", 90, 18, 0.25, "full", "low", '["Echinacea"]', '[]', null, null, "Apr 19 - May 3", "May 15", "hardy", "Stunning native flower. Wild lupine carpets Montana meadows in June.", "Scarify seeds before planting. Fixes nitrogen in soil. Don't transplant—taproot resents it."],
    ["Strawberry", "fruit", "easy", 60, 12, 0.0, "full", "moderate", '["Spinach","Lettuce","Bean","Onion","Thyme"]', '["Cabbage","Broccoli"]', null, "May 3 - May 17", null, "May 17", "semi-hardy", "June-bearing varieties like Honeoye and Jewel produce best. Everbearing for longer harvest.", "Remove flowers first year for stronger plants. Mulch heavily with straw for winter."],
    ["Raspberry", "fruit", "easy", 365, 24, 0.0, "full", "moderate", '["Garlic","Tansy"]', '["Blackberry","Potato"]', null, "Apr 19 - May 3", null, "May 3", "hardy", "Red and yellow raspberries thrive in Montana. Heritage and Boyne are proven varieties.", "Prune spent canes after harvest. Mulch well. Provide support for tall canes."],
    ["Rhubarb", "fruit", "easy", 365, 36, 0.0, "full", "moderate", '["Garlic","Onion"]', '[]', null, "Apr 19 - May 3", null, "May 3", "hardy", "Montana classic. Victoria and Canada Red are reliable. Leaves are toxic—only eat stalks.", "Don't harvest first year. Pull (don't cut) stalks. Stop harvest by July 4th."]
  ];

  const insertMany = db.transaction((plants) => {
    for (const p of plants) insert.run(...p);
  });
  insertMany(plants);

  // Monthly tips
  const tipInsert = db.prepare('INSERT INTO monthly_tips (month, tip) VALUES (?, ?)');
  const tips = [
    [1, "Review seed catalogs and plan your garden layout. Order seeds early for best selection. Clean and sharpen tools."],
    [2, "Start celery and rosemary indoors under grow lights. Test soil pH. Repair cold frames and greenhouses."],
    [3, "Start tomatoes, peppers, onions, and many herbs indoors. Begin hardening off early seedlings on warm days."],
    [4, "Direct sow peas, radishes, carrots, spinach, and lettuce. Transplant cold-hardy starts after soil thaws."],
    [5, "After May 17 last frost: transplant warm-season crops. Direct sow beans, corn, and flowers. Mulch everything."],
    [6, "Keep up with watering and weeding. Succession plant lettuce and beans. Watch for pests. Harvest early crops."],
    [7, "Peak harvest season! Pick zucchini daily. Harvest garlic when lower leaves brown. Start fall crop seeds indoors."],
    [8, "Continue harvesting. Plant fall crops of lettuce, spinach, kale. Start saving seeds from best plants."],
    [9, "Harvest before Sept 22 first frost. Cover tender plants on cold nights. Start bringing in herbs."],
    [10, "Plant garlic for next year. Clean up garden beds. Compost spent plants. Mulch perennials for winter."],
    [11, "Finish garden cleanup. Drain and store hoses. Protect fruit trees from deer. Plan for next year."],
    [12, "Rest and plan! Review what worked this year. Order seed catalogs. Dream about next season's garden."]
  ];
  const insertTips = db.transaction((tips) => {
    for (const t of tips) tipInsert.run(...t);
  });
  insertTips(tips);
}

module.exports = db;
