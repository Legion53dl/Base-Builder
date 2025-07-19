# Copilot Instructions for AI Agents

## Project Overview
This codebase is a static web application for planning bases in "Dune: Awakening." It consists of two nearly identical sets of files: one in the root and one in the `Base-Builder/` subdirectory. Both contain the main app logic (`app.js`), HTML (`index.html`), and styles (`styles.css`).

## Architecture & Data Flow
- The app is a single-page application using vanilla JavaScript, HTML, and CSS.
- The main logic is in `app.js`, which manages the canvas, UI state, and piece catalog.
- The UI is rendered in `index.html` and styled with `styles.css`.
- The app uses a catalog of building pieces (see `pieceCatalog` in `app.js`) and supports multi-level base planning.
- State is managed in-memory (see variables like `piecesByLevel`, `undoHistory`).
- All user actions (add, remove, move, undo, redo) are handled via DOM events and canvas drawing.

## Developer Workflows
- No build step: all files are static and can be served directly.
- To test locally, open `index.html` in a browser.
- Deployment is automated via GitHub Actions (`.github/workflows/static.yml`) to GitHub Pages on push to `main`.
- No package manager or external dependencies are used.

## Project Conventions
- All logic is in a single `app.js` file; avoid splitting unless refactoring for maintainability.
- UI elements are referenced by ID or class in the DOM; keep IDs/classes in sync with `index.html`.
- The `pieceCatalog` object defines all available building pieces and their properties.
- Multi-level support: state is organized by level (see `piecesByLevel`).
- Undo/redo is implemented via deep copies of state.

## Integration Points
- No backend or API calls; all logic is client-side.
- GitHub Actions deploys the entire repo as a static site.
- If modifying deployment, update `.github/workflows/static.yml`.

## Examples
- To add a new building piece, update `pieceCatalog` in `app.js` and add a corresponding sidebar entry in `index.html`.
- To change the UI, edit `index.html` and `styles.css`.

## Key Files
- `app.js`: Main application logic
- `index.html`: UI structure
- `styles.css`: Styling
- `.github/workflows/static.yml`: Deployment workflow

## Duplicated Structure
- The root and `Base-Builder/` directories are nearly identical. Changes should be mirrored in both unless refactoring to a single source.

---
For more, see the top of `app.js` for the piece catalog and state structure, and `.github/workflows/static.yml` for deployment details.
