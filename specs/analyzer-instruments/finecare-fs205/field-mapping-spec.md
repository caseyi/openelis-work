# Wondfo Finecare FIA Meter III Plus (FS-205) — Field Mapping Specification

**Version:** 1.0  
**Date:** 2026-02-27  
**Integration Pattern:** C — Flat File CSV Import  
**Status:** DRAFT  
**Confidence Rating:** DOCUMENTED (based on actual export data + FS-113 maintenance manual)  
**Related Epic:** OGC-304 (Madagascar Analyzer Work)  
**Related FRS:** OGC-329 (Flat File Analyzer Configuration)

---

## 1. Instrument Overview

| Attribute | Value |
|-----------|-------|
| **Manufacturer** | Guangzhou Wondfo Biotech Co., Ltd. |
| **Model** | Finecare FIA Meter III Plus (FS-205) |
| **Analyzer Type** | Point-of-care immunofluorescence assay (POCT) |
| **Operating System** | Android-based (custom Finecare application) |
| **Software Version** | 1.0.0.0.1.198.2.4.0.48 |
| **Display** | 7.9" capacitive touchscreen |
| **Connectivity** | USB export (flat file CSV — **this spec**), TCP/IP LIS (ASTM LIS2-A2 — see Companion Guide §3), Wi-Fi, Bluetooth |
| **Sample Types** | Whole blood, Plasma, Serum |
| **Test Principle** | Time-resolved fluorescence immunoassay (TRFIA) |
| **Operating Temp** | 10–30°C |
| **Operating Humidity** | 20–90% RH (non-condensing) |

### 1.1 Test Menu (Observed in Export Data)

| Analyzer Test Name | Category | Units | Sample Type |
|--------------------|----------|-------|-------------|
| TSH | Thyroid | mIU/L | Plasma |
| β-hCG | Reproductive | mIU/mL | Plasma |

> **Note:** The Finecare Plus platform supports 30+ immunoassay cartridges including CRP, PCT, cTnI, D-Dimer, HbA1c, NT-proBNP, AFP, PSA, Vitamin D, ferritin, and others. The test menu at each site depends on cartridges procured. This field mapping covers all tests generically — the test name in Column 3 determines the OpenELIS test mapping.

---

## 2. Export Format Specification

### 2.1 File Characteristics

| Property | Value |
|----------|-------|
| **File Name** | `history.csv` |
| **Format** | Comma-separated values (CSV) |
| **Encoding** | UTF-8 (assumed; instrument runs Android OS with French locale) |
| **Line Terminator** | `\n` (LF) |
| **Export Method** | USB flash drive export from instrument menu |
| **Row 0 (Metadata)** | `Date:YYYY-MM-DD   Time:HH:MM:SS  SN:<serial_number>,` |
| **Row 1 (Header)** | 40 column headers in instrument locale (French in this deployment) |
| **Row 2+ (Data)** | One row per test result, 40 fields per row |

### 2.2 File Header (Row 0)

The first row is a metadata line, **not** a CSV header. It contains the export timestamp and instrument serial number in the format:

```
Date:2026-02-27   Time:11:27:29  SN:FS2052408200558,
```

**Parser must skip Row 0** and treat Row 1 as the column header row.

### 2.3 Encoding Considerations

The instrument runs Android OS and is expected to output UTF-8 encoded CSV files. The sample data provided showed garbled accented characters, which is believed to be an artifact of the file being opened or transferred through a tool that applied a different encoding — not the instrument's native output.

**Parser approach:**
1. Attempt to read the file as **UTF-8** (default)
2. If UTF-8 decoding fails, fall back to **Latin-1** (ISO 8859-1) as a safe passthrough
3. Do **not** rely on header names for column identification — use **positional indexing** (Column 0–39) as the authoritative field mapping, since header language varies by instrument locale

> **Validation Note:** During site deployment, verify encoding by inspecting the raw `history.csv` bytes for the header row. French accented characters (é, è, ê, â) in column headers should decode cleanly under UTF-8.

---

## 3. Complete Field Mapping — CSV Columns 0–39

### 3.1 Core Result Fields (Required for OpenELIS Import)

| CSV Col | French Header | English Translation | OpenELIS Mapping | Data Type | Example | Notes |
|---------|---------------|---------------------|------------------|-----------|---------|-------|
| **0** | Numéro de série | Serial Number | `analyzer_serial_number` | String | `2602270002` | Instrument-assigned accession ID; format: YYMMDDSSSSS |
| **1** | Numéro d'échantillon | Sample Number | `accession_number` | String | `6`, `10H`, `32` | **Primary match key** to OpenELIS Lab Number. May contain alpha suffixes (e.g., `10H`). |
| **2** | Échantillon type | Sample Type | `sample_type` (informational) | String | `Plasma` | Sample matrix; locale-dependent text |
| **3** | Nom du test | Test Name | `test_name` → Test ID lookup | String | `TSH`, `β-hCG` | Maps to OpenELIS Test via analyzer test-to-LOINC crosswalk |
| **4** | Résultat | Result | `result_value` | String | `0.57`, `9.44`, `<2` | **See Section 4.1** for comparison operator handling |
| **5** | Unité | Unit | `unit_of_measure` | String | `mIU/L`, `mIU/mL` | Should match OpenELIS test unit configuration |
| **6** | Gamme | Range | `reference_range` (informational) | String | `0.3-4.2` | **See Section 4.2** for interpretive criteria parsing |
| **21** | Date/Heure | Date/Time | `result_date_time` | DateTime | `2026-02-27 11:07:15` | Timestamp of test completion (instrument clock) |
| **23** | Numéro de lot | Lot Number | `reagent_lot_number` | String | `F2201090C` | Reagent cartridge lot; links to QC tracking |

### 3.2 Instrument Signal Fields (QC / Diagnostic Use)

| CSV Col | French Header | English Translation | OpenELIS Mapping | Data Type | Example | Notes |
|---------|---------------|---------------------|------------------|-----------|---------|-------|
| **7** | T | T (Test line signal) | `signal_T` (metadata) | Float | `4539` | Fluorescence intensity at test line |
| **8** | C | C (Control line signal) | `signal_C` (metadata) | Float | `4521`, `20473.5` | Fluorescence intensity at control line |
| **9** | Position de la ligne T | T Line Position | — (not imported) | Integer | `603` | Pixel position of T line |
| **10** | Position de la ligne C | C Line Position | — (not imported) | Integer | `797` | Pixel position of C line |
| **11** | T/C | T/C Ratio | `tc_ratio` (QC metadata) | Float | `1.00398147106171` | Ratio of T to C signal; key QC metric |
| **12** | Position de la plateforme | Platform Position | — (not imported) | Integer | `1` | Cartridge slot position |
| **13** | Pic1 | Peak 1 | — (not imported) | Float | `1517` | Signal processing peak values |
| **14** | Pic2 | Peak 2 | — (not imported) | Float | `4539` | |
| **15** | Pic3 | Peak 3 | — (not imported) | Float | `4521` | |
| **16** | Pic4 | Peak 4 | — (not imported) | Integer | `0` | |
| **17** | Position du pic1 | Peak 1 Position | — (not imported) | Integer | `421` | |
| **18** | Position du pic2 | Peak 2 Position | — (not imported) | Integer | `603` | |
| **19** | Position du pic3 | Peak 3 Position | — (not imported) | Integer | `797` | |
| **20** | Position du pic4 | Peak 4 Position | — (not imported) | Integer | `0` | |

### 3.3 Metadata / Administrative Fields

| CSV Col | French Header | English Translation | OpenELIS Mapping | Data Type | Example | Notes |
|---------|---------------|---------------------|------------------|-----------|---------|-------|
| **22** | Version | Software Version | `analyzer_software_version` (metadata) | String | `Version 1.0.0.0.1.198.2.4.0.48` | Firmware/software ID |
| **24** | Titre du projet | Project Title | — (not imported) | String | (empty) | Research project grouping |
| **25** | Nom | Name | — (NOT imported; PHI) | String | `VOAHIRANA` | Patient name — **do not store in analyzer result** |
| **26** | Âge | Age | — (NOT imported; PHI) | String | (empty) | Patient age |
| **27** | Genre | Gender | — (NOT imported; PHI) | String | (empty) | Patient gender |
| **28** | Numéro de lit | Bed Number | — (not imported) | String | (empty) | Inpatient bed number |
| **29** | Département | Department | — (not imported) | String | (empty) | Requesting department |
| **30** | Type de patient | Patient Type | — (not imported) | String | (empty) | Inpatient/Outpatient |
| **31** | Inspecteur | Inspector | — (not imported) | String | (empty) | Testing technician |
| **32** | Numéro d'admission | Admission Number | — (not imported) | String | (empty) | Hospital admission ID |
| **33** | Diagnostic | Diagnosis | — (not imported) | String | (empty) | Clinical diagnosis |
| **34** | Remarque | Remark | `note` (if populated) | String | (empty) | Free-text comment |
| **35** | Soumettre le médecin | Submitting Physician | — (not imported) | String | (empty) | Ordering physician |
| **36** | Critique | Critical | `critical_flag` | String | (empty) | Critical value flag |
| **37** | Temps d'échantillonnage | Sampling Time | — (not imported) | String | (empty) | Specimen collection time |
| **38** | Heure de soumission | Submission Time | — (not imported) | String | (empty) | Order submission time |
| **39** | Vérifier le code | Verification Code | — (not imported) | String | `29311805.57` | Internal integrity/checksum value |

---

## 4. Special Parsing Rules

### 4.1 Comparison Operators in Result Values (Column 4)

Results may contain comparison operator prefixes indicating the value is at or beyond the assay's analytical measurement range (AMR).

| Pattern | Example | Parsed Value | Parsed Operator | Handling |
|---------|---------|-------------|-----------------|----------|
| Numeric only | `0.57` | `0.57` | (none) | Store as numeric result |
| `<` + numeric | `<2` | `2` | `<` | Store result as `<2` (string); flag as below AMR |
| `>` + numeric | `>100` | `100` | `>` | Store result as `>100` (string); flag as above AMR |

**Implementation:**

```
regex: /^([<>]?)(\d+\.?\d*)(.*)$/
group 1: operator (may be empty)
group 2: numeric value
group 3: trailing characters (may include GBK artifacts — strip)
```

> **Note:** The sample data showed `<2¡ý` for a β-hCG result — the trailing characters are believed to be an encoding artifact from file transfer. Apply `.trim()` and remove any non-ASCII trailing bytes after extracting the operator and numeric value.

### 4.2 Interpretive Criteria in Reference Range (Column 6)

For qualitative/semi-quantitative tests (e.g., β-hCG), the Range field contains pipe-delimited interpretive criteria instead of a simple numeric range.

**Simple numeric range (TSH):**
```
0.3-4.2
```
→ Parse as: low = `0.3`, high = `4.2`

**Interpretive criteria (β-hCG):**
```
Négatif：<5 | Aucune interprétation：5≤X≤25 | Positif：>25
```

Structure: `<Interpretation>：<Criteria> | <Interpretation>：<Criteria> | ...`

| Segment | Interpretation | Operator | Value(s) |
|---------|---------------|----------|----------|
| 1 | Négatif (Negative) | `<` | 5 |
| 2 | Aucune interprétation (Indeterminate) | `≤X≤` | 5–25 |
| 3 | Positif (Positive) | `>` | 25 |

**Parser behavior:**
1. Detect pipe character (`|`) in Range field
2. If present: treat as interpretive criteria → store full string as `interpretive_range_text`, do **not** extract numeric low/high
3. If absent: parse as standard `low-high` numeric range
4. Interpretive evaluation can be performed post-import by matching result value against criteria thresholds

### 4.3 Sample Number Matching (Column 1)

Column 1 (`Numéro d'échantillon`) is the operator-entered sample ID at the instrument. This is the **primary key** for matching to OpenELIS accession/lab numbers.

**Observed patterns:**
- Pure numeric: `6`, `32`, `4`
- Alphanumeric: `10H`

**Matching strategy:**
- The site workflow determines what value operators enter here. In the Madagascar deployment, this appears to be a sequence number or lab register number.
- The parser should perform a **flexible string match** against OpenELIS Lab Number, trimming leading zeros and ignoring case.
- If no match is found, the result enters the analyzer import queue as "unmatched" for manual resolution.

### 4.4 Duplicate Detection

The combination of **Column 0 (Serial Number) + Column 21 (Date/Time) + Column 3 (Test Name)** forms a natural unique key per result. The parser should check for duplicates on re-import of the same `history.csv` file.

---

## 5. QC Identification Strategy

### 5.1 Control Sample Detection

The Finecare FS-205 does not export a dedicated "QC" flag field. Control samples must be identified by **Sample Number pattern matching** (Column 1).

**Recommended approach:**
- Configure QC sample ID prefixes in the analyzer plugin (e.g., `QC`, `CTRL`, `L1`, `L2`, `L3`)
- Match Column 1 against configured QC patterns
- Matched rows are routed to the QC evaluation panel; unmatched rows are treated as patient samples

### 5.2 QC Signal Validation

The **T/C ratio** (Column 11) and **C line signal** (Column 8) provide instrument-level quality metrics:

| Metric | Valid Range | Failure Condition |
|--------|-------------|-------------------|
| C line signal (Col 8) | > instrument minimum (varies by assay) | C = 0 or below minimum → invalid test strip |
| T/C ratio (Col 11) | Assay-dependent | N/A (used for quantification, not pass/fail) |

> **Note:** A C line signal of 0 or near-zero indicates a failed lateral flow control and the result should be flagged as invalid. The exact threshold is assay-specific and should be configurable per test in the analyzer plugin.

### 5.3 Reagent Lot Tracking

Column 23 (`Numéro de lot`) provides the reagent cartridge lot number. This should be:
- Stored as metadata on each imported result
- Used to group results by lot for QC trending
- Cross-referenced with OpenELIS lot inventory if configured

---

## 6. Flat File Import Configuration Schema

This section defines the JSON configuration for the OGC-329 Flat File Analyzer plugin.

```json
{
  "analyzer": {
    "name": "Wondfo Finecare FIA Meter III Plus",
    "model": "FS-205",
    "plugin_id": "finecare-fs205",
    "protocol": "flat-file-csv",
    "version": "1.0"
  },
  "file": {
    "format": "csv",
    "encoding": "utf-8",
    "delimiter": ",",
    "has_header": true,
    "header_row": 1,
    "data_start_row": 2,
    "skip_rows": [0],
    "expected_column_count": 40
  },
  "field_mapping": {
    "accession_number": { "column": 1, "type": "string", "required": true },
    "test_name": { "column": 3, "type": "string", "required": true },
    "result_value": { "column": 4, "type": "string", "required": true },
    "unit_of_measure": { "column": 5, "type": "string", "required": false },
    "reference_range": { "column": 6, "type": "string", "required": false },
    "result_date_time": { "column": 21, "type": "datetime", "format": "YYYY-MM-DD HH:mm:ss", "required": true },
    "reagent_lot_number": { "column": 23, "type": "string", "required": false },
    "note": { "column": 34, "type": "string", "required": false },
    "critical_flag": { "column": 36, "type": "string", "required": false }
  },
  "metadata_mapping": {
    "analyzer_serial_number": { "column": 0 },
    "sample_type": { "column": 2 },
    "signal_T": { "column": 7 },
    "signal_C": { "column": 8 },
    "tc_ratio": { "column": 11 },
    "software_version": { "column": 22 }
  },
  "transformations": [
    {
      "field": "result_value",
      "type": "strip_trailing_nonascii",
      "description": "Remove any trailing non-ASCII artifact bytes after comparison operators (e.g., '<2¡ý' → '<2')"
    },
    {
      "field": "result_value",
      "type": "extract_operator",
      "regex": "^([<>]?)(\\d+\\.?\\d*)$",
      "output_operator": "result_operator",
      "output_value": "result_numeric"
    }
  ],
  "duplicate_detection": {
    "key_columns": [0, 21, 3],
    "strategy": "skip_duplicate"
  },
  "qc_detection": {
    "method": "sample_id_pattern",
    "column": 1,
    "patterns": ["^QC.*", "^CTRL.*", "^L[123]$"]
  },
  "test_crosswalk": [
    {
      "analyzer_test_name": "TSH",
      "openelis_test_id": null,
      "loinc": "11580-8",
      "note": "Configure site-specific OpenELIS test ID during deployment"
    },
    {
      "analyzer_test_name": "β-hCG",
      "openelis_test_id": null,
      "loinc": "21198-7",
      "note": "May appear with encoding artifacts on β character; normalize or match by 'hCG' substring"
    }
  ]
}
```

---

## 7. Data Flow Diagram

```
┌──────────────────┐     USB Export      ┌──────────────────────┐
│  Finecare FS-205 │ ──────────────────> │  history.csv on USB  │
│  (Instrument)    │                     │  (GBK encoded)       │
└──────────────────┘                     └──────────┬───────────┘
                                                    │
                                                    │  Manual upload or
                                                    │  file watcher
                                                    ▼
                                         ┌──────────────────────┐
                                         │  OpenELIS Flat File   │
                                         │  Import Service       │
                                         │  (OGC-329 Pattern C)  │
                                         └──────────┬───────────┘
                                                    │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                            ┌──────────┐   ┌──────────────┐  ┌──────────┐
                            │ Skip     │   │ Decode GBK   │  │ Validate │
                            │ Row 0    │   │ Parse 40 cols│  │ Col count│
                            └──────────┘   └──────┬───────┘  └──────────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    ▼              ▼              ▼
                             ┌────────────┐ ┌───────────┐ ┌────────────┐
                             │ QC Pattern │ │ Match to  │ │ Parse      │
                             │ Detection  │ │ Lab Number│ │ Result +   │
                             │ (Col 1)    │ │ (Col 1)   │ │ Operators  │
                             └─────┬──────┘ └─────┬─────┘ └──────┬─────┘
                                   │              │              │
                                   ▼              ▼              ▼
                            ┌──────────┐  ┌────────────┐  ┌───────────┐
                            │ QC Panel │  │ Analyzer   │  │ Result    │
                            │ Review   │  │ Import     │  │ Validation│
                            │          │  │ Queue      │  │ Page      │
                            └──────────┘  └────────────┘  └───────────┘
```

---

## 8. Sample Data — Parsed Examples

### Record 1: TSH (Normal Numeric Result)

| Field | Raw Value | Parsed → OpenELIS |
|-------|-----------|-------------------|
| Serial Number (Col 0) | `2602270002` | analyzer_serial: `2602270002` |
| Sample Number (Col 1) | `6` | accession_number: `6` → match to Lab No. |
| Sample Type (Col 2) | `Plasma` | sample_type: `Plasma` |
| Test Name (Col 3) | `TSH` | test_name: `TSH` → LOINC 11580-8 |
| Result (Col 4) | `0.57` | result_value: `0.57` (numeric, no operator) |
| Unit (Col 5) | `mIU/L` | unit: `mIU/L` |
| Range (Col 6) | `0.3-4.2` | reference_range: low=`0.3`, high=`4.2` |
| T/C Ratio (Col 11) | `1.00398` | tc_ratio: `1.004` (QC metadata) |
| Date/Time (Col 21) | `2026-02-27 11:07:15` | result_datetime: `2026-02-27T11:07:15` |
| Lot Number (Col 23) | `F2201090C` | reagent_lot: `F2201090C` |
| Patient Name (Col 25) | `VOAHIRANA` | **NOT IMPORTED** (PHI) |

### Record 2: β-hCG (Positive, with Interpretive Range)

| Field | Raw Value | Parsed → OpenELIS |
|-------|-----------|-------------------|
| Sample Number (Col 1) | `4` | accession_number: `4` |
| Test Name (Col 3) | `β-hCG` | test_name: `β-hCG` → LOINC 21198-7 |
| Result (Col 4) | `9.44` | result_value: `9.44` (numeric) |
| Unit (Col 5) | `mIU/mL` | unit: `mIU/mL` |
| Range (Col 6) | `Négatif：<5 \| Indeterminate：5≤X≤25 \| Positif：>25` | interpretive_range (stored as text) |
| Interpretation | (derived) | `Aucune interprétation` (5 ≤ 9.44 ≤ 25) |
| Date/Time (Col 21) | `2026-02-27 10:17:12` | result_datetime: `2026-02-27T10:17:12` |
| Lot Number (Col 23) | `F2251920C` | reagent_lot: `F2251920C` |

### Record 3: β-hCG (Below AMR, with Comparison Operator)

| Field | Raw Value | Parsed → OpenELIS |
|-------|-----------|-------------------|
| Sample Number (Col 1) | `32` | accession_number: `32` |
| Test Name (Col 3) | `β-hCG` | test_name: `β-hCG` |
| Result (Col 4) | `<2` (raw: `<2¡ý`) | result_value: `<2`, operator: `<`, numeric: `2` |
| Range (Col 6) | (same interpretive criteria) | Interpretation: `Négatif` (< 5) |
| T/C Ratio (Col 11) | `0.000107` | Very low T/C → consistent with undetectable analyte |

---

## 9. Known Limitations and Open Items

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | **Model variant** | OPEN | Manual is for FS-113; FS-205 is same Finecare Plus family. Confirm CSV export format is identical across FS-113/FS-205. |
| 2 | **ASTM/LIS mode** | DOCUMENTED (estimated) | The FS-205 supports ASTM LIS2-A2 over TCP/IP for real-time result transmission. Expected message format documented in Companion Guide §3. Actual field positions unverified — flat file should be implemented first, ASTM as Phase 2. |
| 3 | **Test crosswalk completeness** | OPEN | Only TSH and β-hCG observed in sample data. Full crosswalk requires site test menu enumeration. |
| 4 | **QC sample ID convention** | OPEN | No QC samples in the provided export data. Site must define QC sample numbering convention. |
| 5 | **Encoding validation** | OPEN | UTF-8 assumed based on Android OS. Sample data had encoding artifacts believed to be from file transfer, not native output. Verify with fresh export directly from instrument. |
| 6 | **Bidirectional communication** | NOT SUPPORTED | Flat file import is unidirectional (instrument → LIS). Work list download not supported in this pattern. |
| 7 | **Column 39 checksum** | UNKNOWN | `Vérifier le code` values (e.g., `29311805.57`) appear to be integrity checksums. Algorithm unknown. Not used for import. |
| 8 | **Multiple instruments** | CONSIDERATION | Row 0 contains the instrument serial number (SN). If a site has multiple FS-205 units, the parser should extract the SN from Row 0 to tag results by instrument. |

---

## 10. Validation Checklist

| # | Validation Step | Method | Expected Result |
|---|----------------|--------|-----------------|
| 1 | Import `history.csv` with 4 records | Upload via flat file import | 4 results parsed, 0 errors |
| 2 | Verify TSH result value | Check record with Col 0 = `2602270002` | Result = `0.57 mIU/L` |
| 3 | Verify β-hCG with operator | Check record with Col 0 = `2602260001` | Result = `<2 mIU/mL` |
| 4 | Verify date/time parsing | All records | Timestamps match Col 21 values |
| 5 | Verify lot number capture | All records | Lot numbers stored as metadata |
| 6 | Verify PHI exclusion | Check imported records | Columns 25–27 (Name, Age, Gender) NOT stored |
| 7 | Verify duplicate detection | Re-import same file | 0 new records, 4 duplicates skipped |
| 8 | Verify unmatched handling | Import with no matching lab numbers | 4 results in "unmatched" queue |
| 9 | Test UTF-8 encoding | Import file with accented headers | No parsing errors, correct column count |
| 10 | Test empty fields | All optional columns empty | No null reference errors |

---

## Appendix A: Raw CSV Structure Reference

```
Row 0: Date:2026-02-27   Time:11:27:29  SN:FS2052408200558,
Row 1: [40 column headers in French]
Row 2: 2602270002,6,Plasma,TSH,0.57,mIU/L,0.3-4.2,4539,4521,603,797,1.004...,1,...,2026-02-27 11:07:15,Version 1.0.0.0.1.198.2.4.0.48,F2201090C,,VOAHIRANA,,,,,,,,,,,,,,29311805.57
Row 3: 2602270001,4,Plasma,β-hCG,9.44,mIU/mL,Négatif：<5|...,245,20473.5,...,2026-02-27 10:17:12,...,F2251920C,,JULIENNE,,,,,,,,,,,,,,29353641.44
Row 4: 2602260002,10H,Plasma,TSH,1.54,mIU/L,0.3-4.2,6348,3712,...,2026-02-26 20:37:42,...,F2201090C,,RAHARIMANANA NOMENJA,,,,,,,,,,,,,,28404833.54
Row 5: 2602260001,32,Plasma,β-hCG,<2,mIU/mL,Négatif：<5|...,2.167,20161.3,...,2026-02-26 07:01:00,...,F2251920C,,RAJAOVELO,,,,,,,,,,,,,,28322022
```
