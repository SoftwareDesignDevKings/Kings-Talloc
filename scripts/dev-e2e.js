#!/usr/bin/env node

/**
 * Start Next.js dev server with E2E environment variables loaded
 */
const { spawn } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// Load E2E environment variables
const envPath = path.resolve(__dirname, '..', '.env.e2e');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Failed to load .env.e2e:', result.error);
  process.exit(1);
}

// Start Next.js dev server with inherited environment
const next = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  env: { ...process.env },
  shell: true,
});

next.on('exit', (code) => {
  process.exit(code);
});

// Handle cleanup
process.on('SIGINT', () => {
  next.kill('SIGINT');
});

process.on('SIGTERM', () => {
  next.kill('SIGTERM');
});
