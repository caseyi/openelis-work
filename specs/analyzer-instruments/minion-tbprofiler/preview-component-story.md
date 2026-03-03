# TB-Profiler Custom Preview Component

## Summary

Implement the `TBProfilerPreview` React component that renders inside the preview slot (OGC-324) in **two contexts**:

1. **Upload mode** — on the Upload Analyzer File page when a TB-Profiler JSON file is manually uploaded
2. **Review mode** — on the Analyzer Results page when TB-Profiler results arrive via the backend file watcher (no upload step)

This is a single component with a `mode` prop that controls which action strip is shown. The visualization sections (classification banner, QC gauges, drug resistance table, metadata) are identical in both modes.

The component lives in the core OpenELIS codebase at `src/components/analyzerUpload/previews/TBProfilerPreview.tsx` and is registered in the compiled-in `previewRegistry` under key `tbprofiler-json`.

## Parent Epic

OGC-304 (Madagascar Analyzer Work)

## Depends On

- **OGC-324** — Analyzer File Upload screen with preview slot framework (must be implemented first or in parallel — specifically the `PreviewSlotProps` interface, `previewRegistry`, `PreviewSlot` component, and `PreviewErrorBoundary`)

## Related Stories

- OGC-324 — Analyzer File Upload (slot framework)
- OGC-329 — Flat File Analyzer Config & Sidebar Nav
- OGC-325 — HL7 MLLP Listener

## Component Location

```
src/components/analyzerUpload/previews/TBProfilerPreview.tsx
```

## Props Interface

Implements `PreviewSlotProps` as defined in OGC-324 FRS §2.7:

```typescript
type PreviewMode = 'upload' | 'review';

interface PreviewSlotProps {
  mode: PreviewMode;
  preview: AnalyzerRunPreview;
  customData: Record<string, unknown> | null;
  analyzer: AnalyzerInfo;
  file?: { name: string; size: number; type: string };  // upload mode only

  // Upload mode callbacks
  onValidationUpdate?: (summary: ValidationSummary) => void;

  // Review mode callbacks
  onAcceptAll?: () => void;
  onRetest?: (resultIds: string[]) => void;
  onIgnore?: (resultIds: string[]) => void;
  qcGatingStatus?: { passed: boolean; failedControls: string[]; nonConformityId?: string };
  run?: { id: string; receivedAt: string; source: string; status: string };
}
```

The component renders in **two contexts**:

| Mode | Page | Data Source | Action Bar |
|------|------|-------------|------------|
| `upload` | Upload Analyzer File | Real-time parse response | Submit to Import Queue / Cancel |
| `review` | Analyzer Results | Loaded from `analyzer_run.custom_preview_data` | Accept All / Retest / Ignore |

In both modes, the classification banner, QC gauges, drug resistance table, and metadata panels render identically. The differences are:
- **Review mode** adds a run source banner (file watcher / manual upload, timestamp, status badge)
- **Review mode** adds a "Result Actions" section where the tech selects Accept / Retest / Ignore per resistant drug
- **Review mode** respects QC gating: if `qcGatingStatus.passed === false`, Accept is blocked and a warning banner displays

## UI Sections

### 1. Classification Banner
- MDR-TB / Pre-XDR-TB / XDR-TB / Sensitive badge (color-coded per WHO definitions)
- Accession number
- Organism species + lineage family
- Resistant / Susceptible drug counts

### 2. Sequencing Quality Control (collapsible, default open)
- 2×2 grid of gauge cards for: Reads Mapped (%), Median Depth (x), Coverage at 30x (%), Total Reads
- Each gauge: value, progress bar with pass/warn/fail threshold markers, color-coded left border
- Overall QC badge in section header (worst-case of all metrics)
- Expandable per-target gene depth table (13 resistance gene targets)

### 3. Drug Resistance Results (collapsible, default open)
- Grouped: First-Line, Second-Line, Group C
- Each drug row: name, abbreviation code, Resistant/Susceptible badge
- Resistant drugs expandable → mutation detail table: Gene, Change, Frequency %, Depth, WHO Grading badge
- Susceptible drugs not expandable

### 4. Pipeline and Sequencing Metadata (collapsible, default closed)
- Two-column layout
- Pipeline: Software, Version, DB Version, Analysis Date
- Sequencing: Platform, Instrument, Flowcell, Kit, Basecaller

### 5. Run Source Banner (review mode only)
- Source badge: "File Watcher" or "Manual Upload"
- Received timestamp
- Filename
- Status badge: "Pending Review" / "Partial" / "Accepted"
- Localization key: `label.review.source`

### 6. Result Actions Strip (review mode only)
- Table: Drug | Result | Action (Accept / Retest / Ignore toggle buttons)
- Only resistant drug results shown — susceptible results accepted automatically
- Counter badge in section header: "X / Y actioned"
- Instructions text: `label.review.actionInstructions`
- QC gating: if `qcGatingStatus.passed === false`, Accept buttons disabled and warning banner shown

## QC Threshold Logic

| Metric | Pass | Warn | Fail |
|--------|------|------|------|
| Reads Mapped | ≥ 90% | ≥ 80% | < 80% |
| Median Depth | ≥ 30x | ≥ 15x | < 15x |
| Coverage at 30x | ≥ 90% | ≥ 80% | < 80% |
| Total Reads | ≥ 50,000 | ≥ 25,000 | < 25,000 |

Thresholds come from `customData.qcThresholds` (configurable on backend). Component should use the threshold values from the data, not hardcode them.

## QC Fail Warning

If any metric is below its fail threshold, the component should call `onValidationUpdate` to flag a QC warning, and display a warning banner above the action bar:

> "Sequencing quality control has failed. Results may be unreliable."

Localization key: `label.tbprofiler.qc.failWarning`

## Localization Keys

All visible text must use localization keys. Full table in OGC-324 FRS §4.5.2:

| Key | Default (English) |
|-----|-------------------|
| `label.tbprofiler.classification.mdr` | MDR-TB |
| `label.tbprofiler.classification.preXdr` | Pre-XDR-TB |
| `label.tbprofiler.classification.xdr` | XDR-TB |
| `label.tbprofiler.classification.sensitive` | Sensitive |
| `label.tbprofiler.qc.title` | Sequencing Quality Control |
| `label.tbprofiler.qc.pass` | QC Pass |
| `label.tbprofiler.qc.warning` | QC Warning |
| `label.tbprofiler.qc.fail` | QC Fail |
| `label.tbprofiler.qc.readsMapped` | Reads Mapped |
| `label.tbprofiler.qc.medianDepth` | Median Depth |
| `label.tbprofiler.qc.coverage30x` | Coverage at 30x |
| `label.tbprofiler.qc.totalReads` | Total Reads |
| `label.tbprofiler.qc.perTargetDepth` | Per-Target Gene Depth |
| `label.tbprofiler.qc.failWarning` | Sequencing quality control has failed. Results may be unreliable. |
| `label.tbprofiler.drugs.title` | Drug Resistance Results |
| `label.tbprofiler.drugs.resistant` | Resistant |
| `label.tbprofiler.drugs.susceptible` | Susceptible |
| `label.tbprofiler.drugs.firstLine` | First-Line |
| `label.tbprofiler.drugs.secondLine` | Second-Line |
| `label.tbprofiler.drugs.groupC` | Group C |
| `label.tbprofiler.drugs.gene` | Gene |
| `label.tbprofiler.drugs.change` | Change |
| `label.tbprofiler.drugs.frequency` | Frequency |
| `label.tbprofiler.drugs.depth` | Depth |
| `label.tbprofiler.drugs.whoGrading` | WHO Grading |
| `label.tbprofiler.metadata.title` | Pipeline and Sequencing Metadata |
| `label.tbprofiler.metadata.pipeline` | Pipeline |
| `label.tbprofiler.metadata.sequencing` | Sequencing |
| `label.review.source` | Source |
| `label.review.receivedAt` | Received |
| `label.review.actionInstructions` | Choose an action for each resistant drug result before saving. Susceptible results will be accepted automatically. |
| `label.review.qcGatingWarning` | QC has failed for this run. Results cannot be accepted until QC is resolved. |
| `label.button.accept` | Accept |
| `label.button.retest` | Retest |
| `label.button.ignore` | Ignore |
| `label.button.acceptAll` | Accept All Results |
| `label.button.retestSelected` | Retest Selected |
| `label.button.backToRunList` | Back to Run List |

## Registry Registration

After component is built, add to `previewRegistry.ts`:

```typescript
const TBProfilerPreview = React.lazy(
  () => import('./previews/TBProfilerPreview')
);

export const previewRegistry = {
  'tbprofiler-json': TBProfilerPreview,
};
```

## Mockup Reference

See `analyzer-file-upload-mockup-v3.jsx` — select "MinION + TB-Profiler" analyzer to see the preview.

## Acceptance Criteria

### Upload Mode (shared visualization)
- [ ] **AC-01**: Component renders inside the preview slot when TB-Profiler analyzer is selected and file parsed
- [ ] **AC-02**: Classification banner shows correct MDR-TB / Pre-XDR / XDR / Sensitive based on `customData.classification`
- [ ] **AC-03**: Lineage and species displayed from `customData.lineage` and `customData.species`
- [ ] **AC-04**: Resistant / Susceptible drug counts are correct
- [ ] **AC-05**: QC gauge cards display all four metrics with values from `customData.qcMetrics`
- [ ] **AC-06**: Gauge thresholds use values from `customData.qcThresholds` (not hardcoded)
- [ ] **AC-07**: Overall QC badge reflects worst-case metric status
- [ ] **AC-08**: Per-target gene depth table is expandable and shows all targets from `customData.perTargetDepth`
- [ ] **AC-09**: Drug resistance table groups drugs by First-Line / Second-Line / Group C
- [ ] **AC-10**: Resistant drugs are expandable showing mutation detail (gene, change, frequency, depth, WHO grading)
- [ ] **AC-11**: Susceptible drugs show badge but are not expandable
- [ ] **AC-12**: Pipeline metadata section shows software, version, DB version, analysis date
- [ ] **AC-13**: Sequencing metadata section shows platform, instrument, flowcell, kit, basecaller
- [ ] **AC-14**: Metadata section collapsed by default
- [ ] **AC-15**: QC fail warning banner displayed and `onValidationUpdate` called when any QC metric fails

### Review Mode (backend-imported results)
- [ ] **AC-16**: Component renders on Analyzer Results page when `mode="review"` and run has `custom_preview_data`
- [ ] **AC-17**: Run source banner displays source (File Watcher / Manual Upload), received timestamp, filename, and status
- [ ] **AC-18**: Result Actions section shows per-drug Accept / Retest / Ignore toggle buttons for resistant drugs only
- [ ] **AC-19**: Susceptible drugs are not listed in Result Actions (accepted automatically)
- [ ] **AC-20**: Action counter badge updates as the user toggles actions
- [ ] **AC-21**: When `qcGatingStatus.passed === false`, Accept buttons are disabled with tooltip explaining QC failure
- [ ] **AC-22**: QC gating warning banner reads: "QC has failed for this run. Results cannot be accepted until QC is resolved." (`label.review.qcGatingWarning`)
- [ ] **AC-23**: `onAcceptAll` callback called when Accept All clicked (only if QC passed)
- [ ] **AC-24**: `onRetest` callback called with result IDs of drugs marked Retest
- [ ] **AC-25**: `onIgnore` callback called with result IDs of drugs marked Ignore

### Shared
- [ ] **AC-26**: Component registered in `previewRegistry` under key `tbprofiler-json`
- [ ] **AC-27**: All visible text uses localization keys (no hardcoded English strings)
- [ ] **AC-28**: Component handles missing/null fields in `customData` gracefully (no crash)
- [ ] **AC-29**: Carbon Design System components used where applicable (Accordion, Tag, DataTable)
- [ ] **AC-30**: Same component source file serves both modes — no code duplication
