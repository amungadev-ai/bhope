// Passenger-compatible startup entry point. Build TypeScript before starting.
import('./dist/index.js').catch(() => {
  console.error(
    'Beacon of Hope could not start. Check environment settings, database migrations, and build output.',
  );
  process.exit(1);
});
