# Ramaz Challenge & Spinner

This project implements a lightweight, client‑side web application for classroom use. It combines a **daily challenge generator** with a **classroom spinner/poller** into a single tabbed interface. Everything runs entirely on the client – no authentication, no database and no backend services. Teachers can easily update the content by editing a single JSON file.

## Features

- **Challenge of the Day** – Randomly selects a challenge from the configured list. Filter challenges by subject, lock the current challenge so it persists across reloads, copy the challenge text to the clipboard, and reveal optional hints.
- **Classroom Spinner/Poller** – Choose a category (students, topics, review questions, etc.) and spin a virtual wheel to pick an item at random. Options include excluding picked items, shuffling the order without spinning, adding temporary session‑only items, viewing history and resetting the pool.
- **Teacher Controls** – Import or export the configuration JSON, toggle sound, dark mode and projector mode, and run a simple countdown timer.
- **Offline Support** – A service worker caches all assets and the JSON configuration on first load. The app continues to function offline, falling back to the cached configuration if necessary.
- **Accessible & Responsive** – Fully keyboard navigable with ARIA roles and live regions, visible focus styles, high contrast projector mode and responsive layout for desktops, tablets and phones.
- **Keyboard Shortcuts** – Quick access to core actions: `Space` (spin or new challenge), `L` (lock/unlock challenge), `R` (reset spinner), `H` (toggle history), and `F` (toggle full‑screen).

## Project Structure

```
ramaz-challenge/
├── index.html              – Main page with two panels (Challenge & Spinner) and teacher controls
├── assets/
│   ├── css/styles.css      – Styles for layout, dark mode, projector mode and animations
│   ├── js/
│   │   ├── app.js          – Entry point: loads config, initializes modules and binds controls
│   │   ├── challenge.js    – Challenge panel logic (random pick, locking, hints, copy)
│   │   ├── spinner.js      – Spinner logic (categories, spin, history, confetti, exclusions)
│   │   ├── storage.js      – Thin wrapper around localStorage with a consistent prefix
│   └── img/icon.svg        – Simple spinner icon used for the PWA manifest
│   └── sounds/tada.mp3     – Placeholder sound (actual sound generated via Web Audio API)
├── data/config.json        – Configuration file defining challenges and spinner categories
├── sw.js                   – Service worker for offline caching of assets and JSON
├── manifest.webmanifest    – PWA manifest
└── README.md               – This documentation
```

## Running Locally

No build step is required; everything runs directly in the browser.

1. Clone or extract this repository so that you have the `ramaz-challenge` folder.
2. **Option A: Open directly.** Simply open `index.html` in a modern web browser. Because the app uses a service worker, you may need to serve it from a local web server for full offline functionality.
   - You can use a simple Python HTTP server:
     ```bash
     cd ramaz-challenge
     python -m http.server 8000
     ```
     Then browse to `http://localhost:8000` in your browser.
3. **Option B: Using Vite.** If you prefer an ES module dev server with live reloading, install [Vite](https://vitejs.dev/) and run:
   ```bash
   npm install
   npm run dev
   ```
   Vite will serve the app at a local development URL. Note that Vite is optional; the app does not depend on it.

## Deploying to GitHub Pages or Netlify

Because this is a static site, deployment is straightforward:

### GitHub Pages

1. Push the `ramaz-challenge` directory to a GitHub repository.
2. In the repository settings, enable GitHub Pages with the root of the repository or the `ramaz-challenge` folder as the publishing source.
3. GitHub will host your site at `https://<username>.github.io/<repository>/`.

### Netlify

1. Drag‑and‑drop the `ramaz-challenge` folder onto the Netlify dashboard or connect it to your Git provider.
2. Use `ramaz-challenge` (or the repository root) as the publish directory.
3. Netlify will build and deploy the static site automatically.

## Editing `data/config.json`

The `config.json` file defines all of the challenges and spinner categories. Its structure looks like this:

```json
{
  "challenges": [
    { "subject": "Algebra", "text": "Find the slope between (1,2) and (3,6)." },
    { "subject": "Python", "text": "Write a function that returns the factorial of n." },
    ...
  ],
  "spinner": {
    "categories": {
      "Students": ["Ari", "Leah", "Noam", "Sara"],
      "Topics": ["Fractions", "Loops", "Arrays", "Slope"],
      "Review Questions": [
        "What does Big‑O for bubble sort represent?",
        "Convert y=mx+b to standard form.",
        "Explain PWM to a 5th grader."
      ]
    }
  }
}
```

- **To add a new challenge**, append a new object with a `subject` and `text` (and an optional `hints` array) to the `challenges` array.
- **To add or remove spinner items**, edit the arrays under `spinner.categories`.

After editing `config.json`, refresh your browser. The service worker will automatically cache the new version.

## Keyboard Shortcuts

| Shortcut | Context             | Action                                |
|---------:|---------------------|---------------------------------------|
| `Space`  | Challenge tab       | Pick a new challenge (if not locked)   |
| `Space`  | Spinner tab         | Spin the wheel                        |
| `L`      | Challenge tab       | Lock or unlock the current challenge   |
| `R`      | Spinner tab         | Reset the current category pool        |
| `H`      | Spinner tab         | Toggle the history panel               |
| `F`      | Anywhere            | Enter or exit full‑screen mode         |

## Accessibility Notes

The app strives to meet WCAG requirements:

- **ARIA roles and live regions** inform screen readers about tab panels, buttons and dynamically updated content. Spin results are announced via an `aria‑live` region.
- **Keyboard navigation** allows you to operate every control without a mouse. Visible focus states make it clear which element is active.
- **High contrast projector mode** increases font sizes and border contrast for projection. Dark mode is also available.

## Credits & License

This app was generated by an automated assistant based on the specifications provided. Feel free to customize, extend and share it. All code is licensed under the MIT License.