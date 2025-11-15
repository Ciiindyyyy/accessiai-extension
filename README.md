AccessiAI - Chrome Extension
Making the Web Accessible for Everyone

🔗 Chrome Web Store (official link)
https://chromewebstore.google.com/detail/nodgcdoambnmoodclmnkolkniaklkmhd?utm_source=item-share-cb

AccessiAI is a powerful Chrome extension that uses local Google Gemini Nano APIs + a secure Cloudflare Worker to make any online content easier to understand, correct, translate, rewrite, and summarize — instantly and privately.

Designed for students, professionals, non-native speakers, researchers, and anyone who wants a clearer, smarter, more accessible web experience.

✨ Features
- Simplify (Summarizer API):
    Extract key ideas
    Produce short, clear summaries
    Works locally using Chrome’s Summarizer when available
    Falls back to Gemini Flash via secure proxy

- Explain (Prompt API):
    Explains complex text in simple language
    Short, clear explanations with optional examples
    Local Prompt API support + cloud fallback

- Translate (Translator API):
    Detects source language automatically
    JSON-safe and robust
    Supports 44 languages

- Correct (Proofreader API):
    Fix grammar, spelling, and clarity
    Local Proofreader API when available
    Cloud fallback with Gemini Flash

- Writer (Writer API):
    Generates short content, drafts, descriptions
    Ideal for productivity, emails, notes, captions, etc.

- Rewriter (Rewriter API):
    Improve clarity, tone, readability
    Rewrite text in a clean, natural way

- Chat Assistant (Advanced):
    Conversational AI directly inside the popup
    Remembers the last messages (local history)
    Supports text + (file metadata coming soon)
    Uses a custom-tuned prompt for high-quality replies
    Secure Cloudflare Worker handles API calls

🔐 Privacy & Security
✔ No API keys inside the extension
All API calls are routed through a Cloudflare Worker backend, protecting API keys from being exposed.

✔ No personal data collected
Everything stays on the user’s device (Chrome storage).
No analytics. No tracking. No logging.

✔ Local-first
When Chrome’s built-in AI APIs (Gemini Nano) are available, the extension runs entirely offline.

📁 File Structure
accessiai-extension/
├─ manifest.json
├─ popup.html
├─ popup.js
├─ popup.css
├─ content.js
├─ background.js
├─ languages.json
├─ assets/
│   ├─ icon16.png
│   ├─ icon48.png
│   ├─ icon128.png
│   └─ logo.png

Backend (Cloudflare Worker)
accessiai-backend/
└─ src/
   └─ index.js     # secure proxy for Gemini API

🛠 Installation (Dev Mode)
Download the ZIP
Extract it
Go to chrome://extensions
Enable "Developer mode"
Click Load unpacked
Select the folder accessiai-extension/

🧠 Technologies Used
JavaScript, MV3 Service Worker
Chrome Built-in AI APIs (Gemini Nano)
Google Gemini Flash (Cloud)
Cloudflare Worker (secure proxy)
HTML / CSS UI
Local session & storage system


🏆 Motivation
AccessiAI was built for the Google Chrome Built-in AI Challenge 2025 to provide:
  accessibility, simplicity, local-first performance and a great user experience.
  It solves the problem of complex online content by delivering instant, privacy-respecting AI assistance.

🧩 License
MIT — free to modify, share, and improve. ( You can contact me before and after modification )

💬 Support

If you encounter any issue or want to contribute, feel free to open an Issue or a Pull Request.

🌟 Enjoy using AccessiAI!

If you like it, don’t forget to ⭐ the repository and leave a review on the Chrome Web Store ❤️
