import { config as loadEnv } from 'dotenv'
import { neon } from '@neondatabase/serverless'

loadEnv({ path: '.env.local' })
loadEnv()

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const sql = neon(url)

async function run() {
  console.log('truncating all public tables...')
  await sql.query(`
    DO $$ DECLARE r record;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `)
  console.log('done')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
