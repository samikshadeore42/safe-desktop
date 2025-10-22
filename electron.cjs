// electron.cjs
(async () => {
    try {
      // Dynamically import the ESM entry file (runs its top-level code)
      await import('./electron.main.js');
    } catch (err) {
      console.error('Failed to start ESM main module:', err);
      process.exit(1);
    }
  })();
  