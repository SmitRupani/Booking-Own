import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

async function seedEquipment() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://booking_user:booking_password@localhost:5432/booking_own',
  });

  try {
    console.log('Connecting to PostgreSQL database...');

    // 1. Ensure a general equipment resource exists
    let resResult = await pool.query("SELECT id FROM resources WHERE category = 'equipment' LIMIT 1");
    let resourceId;

    if (resResult.rows.length === 0) {
      const insertRes = await pool.query(`
        INSERT INTO resources (name, category, description, capacity, status)
        VALUES ('Campus Gear Locker', 'equipment', 'Central sports and lab equipment station', 50, 'ACTIVE')
        RETURNING id
      `);
      resourceId = insertRes.rows[0].id;
    } else {
      resourceId = resResult.rows[0].id;
    }

    // 2. Check if equipment items already exist
    const countRes = await pool.query('SELECT COUNT(*) FROM equipment_items');
    if (parseInt(countRes.rows[0].count, 10) > 0) {
      console.log(`Equipment items already seeded (${countRes.rows[0].count} items). Skipping.`);
      return;
    }

    // 3. Seed sports items, lab items, and library books
    const sampleItems = [
      // Sports Gear
      {
        name: 'Badminton Racket',
        description: 'Yonex Carbonex high-tension badminton racket',
        qtyTotal: 12,
        qtyAvailable: 12,
        sportCategory: 'BADMINTON',
        safety: false,
        requiresApproval: false,
      },
      {
        name: 'Nylon Shuttlecock',
        description: 'Mavis 350 tournament nylon shuttlecock tube',
        qtyTotal: 20,
        qtyAvailable: 20,
        sportCategory: 'BADMINTON',
        safety: false,
        requiresApproval: false,
      },
      {
        name: 'Cricket Bat (English Willow)',
        description: 'SS Ton full-size cricket bat',
        qtyTotal: 6,
        qtyAvailable: 6,
        sportCategory: 'CRICKET',
        safety: true,
        requiresApproval: false,
      },
      {
        name: 'Leather Cricket Ball',
        description: 'SG Club red leather four-piece cricket ball',
        qtyTotal: 10,
        qtyAvailable: 10,
        sportCategory: 'CRICKET',
        safety: true,
        requiresApproval: false,
      },
      {
        name: 'Football (Size 5)',
        description: 'Nivia Premier match football',
        qtyTotal: 8,
        qtyAvailable: 8,
        sportCategory: 'FOOTBALL',
        safety: false,
        requiresApproval: false,
      },
      {
        name: 'Basketball (Size 7)',
        description: 'Spalding TF-150 indoor/outdoor basketball',
        qtyTotal: 8,
        qtyAvailable: 8,
        sportCategory: 'BASKETBALL',
        safety: false,
        requiresApproval: false,
      },
      {
        name: 'Table Tennis Bat',
        description: 'Stiga professional rubber table tennis racket',
        qtyTotal: 10,
        qtyAvailable: 10,
        sportCategory: 'TABLE_TENNIS',
        safety: false,
        requiresApproval: false,
      },
      // Lab Gear
      {
        name: 'Digital Oscilloscope (100MHz)',
        description: 'Rigol DS1054Z 4-channel digital oscilloscope',
        qtyTotal: 4,
        qtyAvailable: 4,
        labCategory: 'GENERAL',
        safety: true,
        requiresApproval: true,
      },
      {
        name: 'Arduino Mega & Sensor Kit',
        description: 'Complete embedded systems development sensor kit',
        qtyTotal: 15,
        qtyAvailable: 15,
        labCategory: 'GENERAL',
        safety: false,
        requiresApproval: false,
      },
      {
        name: 'Dell Precision Mobile Workstation',
        description: 'High-spec workstation laptop for ML & CAD labs',
        qtyTotal: 5,
        qtyAvailable: 5,
        labCategory: 'LAPTOP',
        safety: true,
        requiresApproval: true,
      },
      // Library Books
      {
        name: 'Introduction to Algorithms (CLRS)',
        description: 'Comprehensive guide to algorithms and data structures',
        author: 'Thomas H. Cormen, Charles E. Leiserson',
        isbn: '9780262033848',
        qtyTotal: 5,
        qtyAvailable: 5,
        safety: false,
        requiresApproval: false,
      },
      {
        name: 'Clean Code: A Handbook of Agile Craftsmanship',
        description: 'Best practices for software design and architecture',
        author: 'Robert C. Martin',
        isbn: '9780132350884',
        qtyTotal: 4,
        qtyAvailable: 4,
        safety: false,
        requiresApproval: false,
      },
      {
        name: 'Designing Data-Intensive Applications',
        description: 'The big ideas behind reliable, scalable, and maintainable systems',
        author: 'Martin Kleppmann',
        isbn: '9781449373320',
        qtyTotal: 3,
        qtyAvailable: 3,
        safety: false,
        requiresApproval: false,
      },
    ];

    for (const item of sampleItems) {
      await pool.query(
        `INSERT INTO equipment_items 
         (resource_id, name, description, qty_total, qty_available, safety, requires_approval, sport_category, lab_category, isbn, author)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          resourceId,
          item.name,
          item.description || null,
          item.qtyTotal,
          item.qtyAvailable,
          item.safety || false,
          item.requiresApproval || false,
          item.sportCategory || null,
          item.labCategory || null,
          item.isbn || null,
          item.author || null,
        ]
      );
    }

    console.log(`✅ Successfully seeded ${sampleItems.length} equipment and library items!`);
  } catch (err) {
    console.error('Error seeding equipment:', err);
  } finally {
    await pool.end();
  }
}

seedEquipment();
