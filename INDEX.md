# Design Index — OpenELIS Global

Master index of all designs, specs, and handoff documents.
**Figma Template:** [OpenELIS Global Template](https://www.figma.com/make/15B8LmoBhZ5WgtYDI9MCHm/OpenELIS-Global-Template)

---

## Mockups (JSX)

### Analyzer Integration

| Screen | Mockup | Spec | Status |
|--------|--------|------|--------|
| Analyzer File Upload | [JSX](mockups/screens/analyzer-integration/analyzer-file-upload.jsx) | [FRS](specs/analyzer-integration/analyzer-file-upload-frs.md) | Imported |
| Analyzer Mapping Templates | [JSX](mockups/screens/analyzer-integration/analyzer-mapping-templates.jsx) | [ASTM Addendum](specs/analyzer-integration/astm-analyzer-mapping-addendum.md), [HL7 Addendum](specs/analyzer-integration/hl7-analyzer-mapping-addendum.md) | Imported |
| Flat File Analyzer Config | [JSX](mockups/screens/analyzer-integration/flat-file-analyzer-config.jsx) | [FRS](specs/analyzer-integration/flat-file-analyzer-config-frs.md) | Imported |
| HL7 Analyzer Mapping | [JSX](mockups/screens/analyzer-integration/hl7-analyzer-mapping.jsx) | [HL7 Addendum](specs/analyzer-integration/hl7-analyzer-mapping-addendum.md) | Imported |
| Validation Page | [JSX](mockups/screens/analyzer-integration/validation-page.jsx) | [Requirements](specs/analyzer-integration/validation-page-requirements.md) | Imported |

### Non-Conforming Events (NCE)

| Screen | Mockup | Spec | Status |
|--------|--------|------|--------|
| NCE Analytics | [JSX](mockups/screens/nce/nce-analytics.jsx) | [FRS](specs/nce/analytics-frs.md) | Imported |
| NCE Dashboard & CAPA | [JSX](mockups/screens/nce/nce-dashboard.jsx) | [FRS](specs/nce/dashboard-capa-frs.md) | Imported |
| NCE Results Entry | [JSX](mockups/screens/nce/nce-results-entry.jsx) | [FRS](specs/nce/results-entry-frs.md) | Imported |
| NCE Report | [JSX](mockups/screens/nce/nce-report.jsx) | [FRS](specs/nce/nonconformity-report-frs.md) | Imported |

### Other Features

| Screen | Mockup | Spec | Status |
|--------|--------|------|--------|
| TAT Dashboard | [JSX](mockups/screens/other/tat-dashboard.jsx) | [Requirements](specs/other/tat-dashboard-requirements.md) | Imported |
| Calendar Management | [JSX](mockups/screens/other/calendar-management.jsx) | — | Imported |

---

## Analyzer Instrument Specs

| Instrument | Integration Spec | Companion Guide | Other | Vendor Manual |
|------------|-----------------|-----------------|-------|---------------|
| Mindray BC-5380 | [Spec](specs/analyzer-instruments/mindray-bc5380/integration-spec.md) | [Guide](specs/analyzer-instruments/mindray-bc5380/companion-guide.md) | | [LIS Protocol](assets/vendor-manuals/bc5380-lis-protocol.pdf) |
| Mindray BS Series | [Spec](specs/analyzer-instruments/mindray-bs-series/integration-spec.md) | [Guide](specs/analyzer-instruments/mindray-bs-series/companion-guide.md) | [FRS](specs/analyzer-instruments/mindray-bs-series/frs.md) | [Interface Specs](assets/vendor-manuals/mindray-interface-specs-v5.pdf) |
| Stago ST4 | [Spec](specs/analyzer-instruments/stago-st4/integration-spec.md) | [Guide](specs/analyzer-instruments/stago-st4/companion-guide.md) | | [Service Manual](assets/vendor-manuals/stago-start4-service-manual.pdf) |
| GeneXpert DX | [ASTM](specs/analyzer-instruments/genexpert-dx/astm-integration-spec.md), [HL7](specs/analyzer-instruments/genexpert-dx/hl7-integration-spec.md) | | | [LIS Protocol](assets/vendor-manuals/genexpert-lis-protocol-spec.pdf) |
| Finecare FS205 | | [Guide](specs/analyzer-instruments/finecare-fs205/companion-guide.md) | [Field Mapping](specs/analyzer-instruments/finecare-fs205/field-mapping-spec.md) | [SOP](assets/vendor-manuals/finecare-lis-sop.pdf) |
| VIDAS | [Spec](specs/analyzer-instruments/vidas/integration-spec.md) | [Guide](specs/analyzer-instruments/vidas/companion-guide.md) | | [User Guide](assets/vendor-manuals/vidas-user-guide.pdf) |
| Indiko / Gallery | [Spec](specs/analyzer-instruments/indiko-gallery/integration-spec.md) | [Guide](specs/analyzer-instruments/indiko-gallery/companion-guide.md) | | [LIS Interface](assets/vendor-manuals/indiko-gallery-lis-interface.pdf) |
| MALDI Biotyper | | | [ASTM FRS](specs/analyzer-instruments/maldi-biotyper/astm-frs.md) | [ASTM Spec](assets/vendor-manuals/maldi-biotyper-astm-spec.pdf) |
| MinION / TBProfiler | | | [Field Mapping](specs/analyzer-instruments/minion-tbprofiler/field-mapping.md), [Component Story](specs/analyzer-instruments/minion-tbprofiler/preview-component-story.md) | |

---

## Other Specs

| Document | Link | Notes |
|----------|------|-------|
| HL7 MLLP Listener FRS | [Spec](specs/analyzer-integration/hl7-mllp-listener-frs.md) | Core HL7 listener spec |
| ASTM Crosswalk Gap Analysis | [Analysis](specs/analyzer-integration/astm-crosswalk-gap-analysis.md) | Protocol gap analysis |
| Instrument Software Companion Guide | [Guide](specs/analyzer-integration/instrument-software-companion-guide.md) | General instrument software guide |
| Report Level Signatures FRS | [Spec](specs/other/report-level-signatures-frs.md) | |
| Change Management Strategy | [Strategy](specs/other/change-management-strategy.md) | |

---

## Reference Data

Sample data files for testing and development:

| File | Instrument | Location |
|------|-----------|----------|
| BC-5380 sample | Mindray BC-5380 | [CSV](assets/reference-data/bc5380-sample.csv) |
| MALDI Biotyper export | MALDI Biotyper | [CSV](assets/reference-data/maldi-biotyper-export-sample.csv) |
| QS5 HIV-VL run | QuantStudio 5 | [CSV](assets/reference-data/qs5-hiv-vl-sample.csv) |
| QS7Flex RESP panel | QuantStudio 7 Flex | [CSV](assets/reference-data/qs7flex-resp-panel-sample.csv) |
| TBProfiler batch summary | MinION / TBProfiler | [CSV](assets/reference-data/tbprofiler-batch-summary-sample.csv) |
| TBProfiler individual results | MinION / TBProfiler | [JSON files](assets/reference-data/) (8 samples) |
