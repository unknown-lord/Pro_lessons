// test-gemini.js
// Usage: set GEMINI_API_KEY in your environment, then run: node app/api/generate-lesson/test-gemini.js

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY. Set it in your environment or .env.local.');
  process.exit(1);
}

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(data => {
    console.log('Available models:');
    (data.models || []).forEach(model => {
      console.log(`- ${model.name}`);
    });
  })
  .catch(err => console.error('Error:', err));