import * as fs from 'fs';
import * as path from 'path';

// Clean up test directories before each test run
const TEST_KEYS_DIR = path.join(__dirname, '../../keys');
const TEST_UPLOADS_DIR = path.join(__dirname, '../../uploads');

beforeAll(() => {
  // Ensure directories exist
  if (!fs.existsSync(TEST_KEYS_DIR)) {
    fs.mkdirSync(TEST_KEYS_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEST_UPLOADS_DIR)) {
    fs.mkdirSync(TEST_UPLOADS_DIR, { recursive: true });
  }
});

afterAll(() => {
  // Final cleanup
  if (fs.existsSync(TEST_KEYS_DIR)) {
    const files = fs.readdirSync(TEST_KEYS_DIR);
    for (const file of files) {
      if (file.startsWith('test-')) {
        fs.unlinkSync(path.join(TEST_KEYS_DIR, file));
      }
    }
  }
});
