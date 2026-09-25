// Close the temporary Python server cleanly before Playwright tears down its
// Windows shell. This also lets TemporaryDirectory remove the test database.
export default async function teardown() {
  try {
    await fetch('http://127.0.0.1:8001/__test_shutdown', {
      method: 'POST',
      signal: AbortSignal.timeout(3000),
    });
    for (let i = 0; i < 50; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      try {
        await fetch('http://127.0.0.1:8001/api/health', { signal: AbortSignal.timeout(300) });
      } catch {
        return;
      }
    }
    throw new Error('Temporary test server did not shut down.');
  } catch (error) {
    if (error.message === 'Temporary test server did not shut down.') throw error;
  }
}
