const config = {
  schema: 'src/lib/db/schema.ts',
  out: 'drizzle/migrations',
  driver: 'pg',
  // Use env var at runtime to connect when running migrations
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
};

export default config;
