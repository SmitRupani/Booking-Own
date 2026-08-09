import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgres://booking_user:booking_password@localhost:5432/booking_own',
});

async function main() {
  const res = await pool.query(`
    INSERT INTO users (name, email, role, password)
    VALUES ('Main Gate Guard', 'guard-1@local', 'GUARD', 'guard123')
    ON CONFLICT (email) DO UPDATE SET password = 'guard123', role = 'GUARD'
    RETURNING id, name, email, role;
  `);
  console.log('Guard user ready:', res.rows);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
