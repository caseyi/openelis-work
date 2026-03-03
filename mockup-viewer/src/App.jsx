import React, { useState, Suspense } from 'react';

/**
 * OpenELIS Design Gallery
 *
 * This app renders all JSX mockups from the mockups/ directory.
 * To add a new mockup, import it in the MOCKUP_REGISTRY below.
 *
 * Usage: npm run dev (from mockup-viewer/)
 */

// ─── MOCKUP REGISTRY ────────────────────────────────────────────
// Add your mockups here. Each entry needs:
//   - name: display name
//   - category: "screens" | "components" | "flows"
//   - component: lazy import of the JSX file
//   - description: short description
//   - figmaLink: (optional) link to Figma source
//   - specLink: (optional) link to spec file
//   - date: date added or last updated
//
// Example:
//   {
//     name: 'Sample Management',
//     category: 'screens',
//     component: React.lazy(() => import('@mockups/screens/SampleManagement.jsx')),
//     description: 'Main sample management dashboard',
//     figmaLink: 'https://figma.com/...',
//     specLink: '../specs/sample-management.md',
//     date: '2026-03-03',
//   },
// ─────────────────────────────────────────────────────────────────

const MOCKUP_REGISTRY = [
  // Add your first mockup here!
];

const categories = ['all', 'screens', 'components', 'flows'];

function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedMockup, setSelectedMockup] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = MOCKUP_REGISTRY.filter((m) => {
    const matchesCategory = activeCategory === 'all' || m.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>OpenELIS Global — Design Gallery</h1>
        <p style={styles.subtitle}>
          {MOCKUP_REGISTRY.length} mockup{MOCKUP_REGISTRY.length !== 1 ? 's' : ''} tracked
        </p>
      </header>

      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Search mockups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.search}
        />
        <div style={styles.tabs}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                ...styles.tab,
                ...(activeCategory === cat ? styles.tabActive : {}),
              }}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {selectedMockup ? (
        <div>
          <button onClick={() => setSelectedMockup(null)} style={styles.backButton}>
            ← Back to Gallery
          </button>
          <div style={styles.mockupHeader}>
            <h2>{selectedMockup.name}</h2>
            <span style={styles.badge}>{selectedMockup.category}</span>
            <span style={styles.date}>{selectedMockup.date}</span>
          </div>
          <p style={styles.description}>{selectedMockup.description}</p>
          <div style={styles.links}>
            {selectedMockup.figmaLink && (
              <a href={selectedMockup.figmaLink} target="_blank" rel="noopener" style={styles.link}>
                View in Figma ↗
              </a>
            )}
            {selectedMockup.specLink && (
              <a href={selectedMockup.specLink} style={styles.link}>
                View Spec ↗
              </a>
            )}
          </div>
          <div style={styles.preview}>
            <Suspense fallback={<div style={styles.loading}>Loading mockup...</div>}>
              <selectedMockup.component />
            </Suspense>
          </div>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.length === 0 ? (
            <div style={styles.empty}>
              {MOCKUP_REGISTRY.length === 0
                ? 'No mockups yet. Add your first one to the MOCKUP_REGISTRY in App.jsx!'
                : 'No mockups match your search.'}
            </div>
          ) : (
            filtered.map((mockup, i) => (
              <div
                key={i}
                style={styles.card}
                onClick={() => setSelectedMockup(mockup)}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)')}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.badge}>{mockup.category}</span>
                  <span style={styles.date}>{mockup.date}</span>
                </div>
                <h3 style={styles.cardTitle}>{mockup.name}</h3>
                <p style={styles.cardDesc}>{mockup.description}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { fontFamily: "'IBM Plex Sans', sans-serif", maxWidth: 1200, margin: '0 auto', padding: 24 },
  header: { marginBottom: 24, borderBottom: '2px solid #0f62fe', paddingBottom: 16 },
  title: { margin: 0, fontSize: 28, color: '#161616' },
  subtitle: { margin: '4px 0 0', color: '#6f6f6f', fontSize: 14 },
  toolbar: { display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' },
  search: { padding: '8px 12px', border: '1px solid #c6c6c6', borderRadius: 4, fontSize: 14, flex: '1 1 200px' },
  tabs: { display: 'flex', gap: 4 },
  tab: { padding: '6px 14px', border: '1px solid #c6c6c6', background: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  tabActive: { background: '#0f62fe', color: '#fff', borderColor: '#0f62fe' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  card: { border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { margin: '0 0 4px', fontSize: 16 },
  cardDesc: { margin: 0, color: '#525252', fontSize: 13, lineHeight: 1.4 },
  badge: { background: '#e0e0e0', padding: '2px 8px', borderRadius: 12, fontSize: 11, textTransform: 'uppercase', fontWeight: 600 },
  date: { color: '#8d8d8d', fontSize: 12 },
  backButton: { background: 'none', border: 'none', color: '#0f62fe', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 16 },
  mockupHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  description: { color: '#525252', marginBottom: 16 },
  links: { display: 'flex', gap: 16, marginBottom: 24 },
  link: { color: '#0f62fe', fontSize: 14 },
  preview: { border: '1px solid #e0e0e0', borderRadius: 8, padding: 24, background: '#f4f4f4', minHeight: 400 },
  loading: { textAlign: 'center', padding: 40, color: '#6f6f6f' },
  empty: { gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: '#6f6f6f', fontSize: 15 },
};

export default App;
