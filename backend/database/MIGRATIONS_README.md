Migration instructions — run manually on your database

1) Confirm current schema for `future_orders`:

   - Open your MySQL/TiDB client or phpMyAdmin and run:

     DESCRIBE future_orders;

   - If you see a `side` column already, stop — the column exists and no migration is necessary.

2) Run the migration (only if `side` missing):

   - In mysql client (replace host/port/user as needed):

     mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USERNAME> -p <DB_DATABASE>
     -- then paste and run the SQL from `backend/database/migrations/0002_add_side_future_orders.sql`

   - Or in PowerShell, if `mysql` CLI available (substitute values):

```pwsh
$env:DB_HOST = 'localhost'
$env:DB_PORT = '3306'
$env:DB_USER = 'root'
$env:DB_NAME = 'crypto_exchange'
# Run interactive client
mysql -h $env:DB_HOST -P $env:DB_PORT -u $env:DB_USER -p $env:DB_NAME
# Then paste the ALTER statement from the migration file
```

3) Verify the column added:

   DESCRIBE future_orders;

4) Reproduce the failing API call (open futures) and check server logs; the `Unknown column 'side'` error should be gone.

If you'd like, I can also prepare an automated migration runner (local-dev only) that executes the SQL file against the configured DB; tell me if you want that and I'll add a one-off CLI script.

Auto-migrate on server start:

- You can enable automatic migration when the backend starts by setting environment variable `AUTO_MIGRATE=true` in your `.env` (development only). The app will attempt to run `scripts/run_migrations.php` during boot. Example in `.env`:

```
AUTO_MIGRATE=true
```

- Warning: Only enable auto-migrate in development or controlled environments. Running migrations in production should be done through a reviewed migration process.
 
Runner instructions:

1) Ensure your PHP environment can run from command-line and has access to the project's autoload.
2) From the `backend` folder run:

```pwsh
php scripts/run_migrations.php
```

The script will create a `migrations` table and apply each `.sql` file in `backend/database/migrations` that has not yet been applied.
