# OpenELIS Global — Design Workspace

A centralized workspace for tracking mockups, specifications, and design changes for [OpenELIS Global](https://github.com/I-TECH-UW/OpenELIS-Global2). This repo serves as the single source of truth for design work, making it easy for designers, clients, and developers to stay aligned.

**Most mockups are JSX files** (React components created via Claude artifacts), with a built-in gallery viewer for browsing and presenting them.

## Figma Source

**Generic UI Template:** [OpenELIS Global Template](https://www.figma.com/make/15B8LmoBhZ5WgtYDI9MCHm/OpenELIS-Global-Template)

---

## Repo Structure

```
├── mockups/                # JSX mockup files (primary design artifacts)
│   ├── screens/            # Full screen/page mockups
│   ├── components/         # Individual component mockups
│   └── flows/              # Multi-step flow mockups
├── mockup-viewer/          # Vite + React app to browse & present mockups
│   └── src/App.jsx         # MOCKUP_REGISTRY lives here
├── designs/                # Static design artifacts (Figma exports, PNGs, SVGs)
│   ├── screens/
│   ├── components/
│   └── flows/
├── specs/                  # Written specifications & requirements
├── handoff/                # Developer handoff documents
├── changelogs/             # Per-feature design changelogs
├── assets/                 # Shared assets (icons, images, exports)
├── .templates/             # Templates for specs, handoffs, changelogs
└── INDEX.md                # Master index of all designs & specs
```

## Quick Start

```bash
# Clone the repo
git clone https://github.com/YOUR_ORG/openelis-design-workspace.git
cd openelis-design-workspace

# Launch the mockup gallery viewer
cd mockup-viewer
npm install
npm run dev
# Opens at http://localhost:5173
```

## Workflow

### Adding a New JSX Mockup

1. **Save the JSX file** from Claude into `mockups/screens/` (or `components/` or `flows/`)
2. **Register it** in `mockup-viewer/src/App.jsx` by adding an entry to `MOCKUP_REGISTRY`:
   ```js
   {
     name: 'Sample Management',
     category: 'screens',
     component: React.lazy(() => import('@mockups/screens/SampleManagement.jsx')),
     description: 'Main sample management dashboard',
     figmaLink: 'https://figma.com/...',
     specLink: '../specs/sample-management.md',
     date: '2026-03-03',
   }
   ```
3. **Create a spec** (optional) by copying `.templates/SCREEN_SPEC.md` into `specs/`
4. **Update `INDEX.md`** with a row linking the mockup, spec, and status
5. **Commit** with: `feat(design): add sample management mockup v1`

### Updating a Mockup

1. **Replace or version** the JSX file (e.g., `SampleManagement_v2.jsx`)
2. **Update the spec** if requirements changed
3. **Add a changelog entry** in `changelogs/`
4. **Commit** with: `update(design): revise sample management — add batch mode`

### Handing Off to Developers

1. **Copy** `.templates/HANDOFF.md` into `handoff/`
2. **Fill in** component details, Carbon for React notes, and acceptance criteria
3. **Link** to the JSX mockup, spec, and Figma frames
4. **Commit and tag**: `git tag handoff/sample-mgmt-v1`

### Presenting to Clients

Run the mockup viewer (`npm run dev` in `mockup-viewer/`) and use the gallery to browse all mockups. The viewer supports searching, filtering by category, and clicking into any mockup to see the full rendered component along with links to Figma and specs.

For a shareable build: `cd mockup-viewer && npm run build` — the `dist/` folder can be deployed to any static host.

## Commit Convention

| Prefix | Use |
|--------|-----|
| `feat(design):` | New mockup or screen |
| `update(design):` | Changes to existing mockup |
| `fix(design):` | Corrections to designs |
| `spec:` | New or updated specification |
| `handoff:` | Developer handoff document |
| `docs:` | README, index, or documentation |
| `chore:` | Maintenance, cleanup |

## Tech Stack Context

OpenELIS Global uses **Carbon for React** (Carbon Design System) on the frontend. Mockups, specs, and handoff documents should reference Carbon components where applicable.

## License

[Specify license]
