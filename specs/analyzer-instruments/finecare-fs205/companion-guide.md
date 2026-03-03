# Wondfo Finecare FIA Meter III Plus (FS-205) — Companion Guide

**Version:** 1.0  
**Date:** 2026-02-27  
**Paired With:** finecare-fs205-field-mapping-spec.md  
**Audience:** Lab IT, OpenELIS implementers, site lab managers

---

## 1. Instrument Software & Documentation

| Resource | Details |
|----------|---------|
| **Manufacturer** | Guangzhou Wondfo Biotech Co., Ltd. |
| **Product Page** | [https://en.wondfo.com.cn/finecare](https://en.wondfo.com.cn/finecare) |
| **Model** | FIA Meter III Plus (FS-205) |
| **Related Model** | FIA Meter Plus (FS-113) — same software platform, smaller form factor |
| **Software Version (observed)** | 1.0.0.0.1.198.2.4.0.48 |
| **Operating System** | Android (custom Wondfo launcher) |
| **Manual Reference** | FS-113 Construction and Maintenance Manual (applicable to FS-205 software interface) |

> **Note:** Wondfo does not publish firmware downloads publicly. Software updates are performed via USB by Wondfo service engineers or authorized distributors. Contact the local Wondfo distributor for firmware upgrade requests.

---

## 2. Export Procedure — USB CSV Export

This is the primary method for getting results from the Finecare FS-205 into OpenELIS via flat file import.

### 2.1 Prerequisites

- USB flash drive (FAT32 formatted, ≤32 GB recommended)
- The instrument must have test results in its history

### 2.2 Step-by-Step Export

1. **Insert USB drive** into the USB port on the rear panel of the FS-205
2. **Navigate to History** — From the main screen, tap the **History** (历史 / Historique) icon
3. **Select date range** — Use the date filter to select the range of results to export, or select "All"
4. **Tap Export** — Tap the **Export** (导出 / Exporter) button
5. **Select USB** — Choose USB as the export destination
6. **Wait for confirmation** — The instrument displays a success message when export is complete
7. **Safely remove USB** — Tap the notification or wait 5 seconds before removing the drive

### 2.3 Exported Files

The USB drive will contain:

```
USB Root/
├── history.csv              ← Main results file (IMPORT THIS)
├── pe_<SN>_<timestamp>.xls  ← Raw fluorescence signal data (NOT needed)
├── pe_<SN>_<timestamp>.xls  ← One file per test run
└── pe_<SN>_<timestamp>_tar.gz  ← Compressed archive of signal files
```

**Only `history.csv` is needed for OpenELIS import.** The `pe_*.xls` files contain raw fluorescence curve data (1,400 data points per test) used for Wondfo technical support and are not used in the LIS workflow.

### 2.4 Export Frequency Recommendations

| Scenario | Recommended Frequency |
|----------|----------------------|
| Low volume (< 20 tests/day) | Once daily, end of shift |
| Medium volume (20–50 tests/day) | Twice daily (midday + end of shift) |
| High volume (> 50 tests/day) | Consider ASTM/TCP connection instead |

> **Important:** The `history.csv` export contains **all results** currently in instrument memory, not just new ones. The OpenELIS flat file importer must perform duplicate detection (see Field Mapping Spec §4.4) to avoid re-importing previously processed results.

---

## 3. Alternative Connectivity — ASTM / TCP-IP LIS

The Finecare FS-205 also supports real-time result transmission via ASTM LIS2-A2 protocol over TCP/IP. This section documents that pathway for sites that need real-time connectivity rather than (or in addition to) USB flat file export.

### 5.1 When to Use ASTM Instead of Flat File

| Criteria | Flat File (CSV) | ASTM (TCP/IP) |
|----------|----------------|----------------|
| Test volume | Low–medium (< 50/day) | Medium–high or time-critical |
| Network infrastructure | None required (USB sneakernet) | Requires LAN between instrument and OpenELIS server |
| Result latency | Batch (minutes to hours) | Near real-time (seconds) |
| Bidirectional | No (results only) | Potentially (work list download — needs verification) |
| Implementation complexity | Lower (Pattern C flat file plugin) | Higher (Pattern A ASTM plugin via OGC-49) |

### 5.2 LIS Settings on Instrument

Navigate to: **Settings → LIS Settings** on the FS-205

| Parameter | Setting |
|-----------|---------|
| LIS Mode | TCP/IP |
| Server IP | OpenELIS server IP address |
| Server Port | Configured ASTM listener port (e.g., 9100) |
| Protocol | ASTM |
| Auto-send | Enable (results sent automatically after each test) |

### 5.3 Expected ASTM Message Format

Based on the Finecare platform documentation and ASTM LIS2-A2 standard, the FS-205 is expected to send messages in the following structure:

```
H|\^&|||FS-205^Wondfo|||||||LIS2-A2
P|1||||VOAHIRANA||||||||||
O|1|6||^^^TSH|||||||||||Plasma
R|1|^^^TSH|0.57|mIU/L||N||F||||2026-02-27 11:07:15
L|1|N
```

**Record mapping:**

| Record | Key Fields | Maps To |
|--------|-----------|---------|
| **H** (Header) | H.5: Sender Name/ID (`FS-205^Wondfo`) | `analyzer.name`, instrument identification |
| **P** (Patient) | P.5: Patient ID, P.6: Patient Name | Informational only (not used for matching) |
| **O** (Order) | O.2: Specimen ID (Lab Number), O.4: Test ID (`^^^TSH`) | `accession_number`, `test_code` |
| **R** (Result) | R.3: Test ID, R.4: Result Value, R.5: Units, R.7: Reference Range, R.9: Status | `result_value`, `unit`, `reference_range` |
| **L** (Terminator) | L.2: Termination code (`N`=Normal) | End of message |

### 5.4 OpenELIS Configuration for ASTM Mode

If ASTM connectivity is implemented, the FS-205 would use the **generic ASTM plugin** (OGC-49 / Analyzer Mapping Templates FRS v2) rather than a custom Java parser. Configuration would include:

- **Connection Role:** Server (Listener) — OpenELIS listens on a port; FS-205 connects outbound
- **Template:** Blank ASTM Template or a future `finecare-fs205` plugin template
- **Test Code Mapping:** Map `^^^TSH` → OpenELIS TSH test, `^^^β-hCG` → OpenELIS β-hCG test, etc.
- **QC Identification:** Configure sample ID prefix patterns (same as flat file approach)
- **Specimen ID Source:** O.2 (Specimen ID) → OpenELIS Lab Number match

> **Confidence:** ESTIMATED. The ASTM message format above is inferred from the LIS2-A2 standard and the instrument's documented support. Actual field positions and test code formats need to be verified by capturing live ASTM output from an FS-205 connected over TCP/IP. The flat file integration (Section 2) is based on actual export data and should be implemented first.

### 5.5 Implementation Sequence

1. **Phase 1 (current):** Flat file CSV import via OGC-329 Pattern C — based on confirmed export data
2. **Phase 2 (future):** ASTM real-time connection via OGC-49 Pattern A — requires network setup at site and live message capture to validate field positions

---

## 4. Instrument Configuration for OpenELIS Integration

### 5.1 Sample ID Entry

For successful matching to OpenELIS Lab Numbers, operators must enter the **OpenELIS accession number** (Lab Number) into the instrument's **Sample Number** field before running each test.

**Training points for lab staff:**
- When prompted for "Sample Number" (Numéro d'échantillon) on the test screen, enter the **Lab Number** from the OpenELIS-printed label or worksheet
- Do NOT use internal sequence numbers, patient names, or bed numbers
- The Sample Number is stored in CSV Column 1 and is the **only** field used to match results to orders

### 5.2 Instrument Clock Synchronization

The result timestamp (Column 21) comes from the instrument's internal clock. Ensure the instrument date/time is synchronized:

1. Navigate to **Settings → Date/Time** on the instrument
2. Set to the correct local date, time, and timezone
3. Re-verify monthly or after power outages

> The FS-205 does not support NTP. Manual synchronization is required.

### 5.3 Language / Locale

The instrument locale affects CSV column headers (but NOT data values). The parser uses **positional column indexing** and is locale-independent. No specific locale setting is required for the integration to work.

Observed locale in Madagascar deployment: **French**

---

## 5. Validation Dataset

### 5.1 Provided Test Data

The following actual export data from an FS-205 (SN: FS2052408200558) is provided for parser development and validation:

| Record | Sample # | Test | Result | Unit | Range | Date/Time |
|--------|----------|------|--------|------|-------|-----------|
| 1 | 6 | TSH | 0.57 | mIU/L | 0.3-4.2 | 2026-02-27 11:07:15 |
| 2 | 4 | β-hCG | 9.44 | mIU/mL | Interpretive (Neg/Indet/Pos) | 2026-02-27 10:17:12 |
| 3 | 10H | TSH | 1.54 | mIU/L | 0.3-4.2 | 2026-02-26 20:37:42 |
| 4 | 32 | β-hCG | <2 | mIU/mL | Interpretive (Neg/Indet/Pos) | 2026-02-26 07:01:00 |

### 5.2 Edge Cases Covered

| Edge Case | Record # | Description |
|-----------|----------|-------------|
| Normal numeric result | 1, 3 | Standard float value, simple range |
| Comparison operator in result | 4 | `<2` with possible trailing encoding artifacts |
| Interpretive reference range | 2, 4 | Pipe-delimited qualitative criteria |
| Alphanumeric sample number | 3 | `10H` (contains letter suffix) |
| Patient name present | All | PHI present but must NOT be imported |

### 5.3 Additional Validation Scenarios (Construct Manually)

| Scenario | How to Create |
|----------|---------------|
| QC sample | Run a QC cartridge with Sample Number = `QC-L1` or `CTRL-TSH` |
| Blank/error result | Run test with no cartridge or expired cartridge |
| Very long patient name | Enter full name with spaces in Patient field |
| Multiple tests, same sample | Run TSH + β-hCG on same Sample Number |
| High result above AMR | Run sample known to exceed test upper limit (expect `>` operator) |

---

## 6. Troubleshooting

| Issue | Possible Cause | Resolution |
|-------|---------------|------------|
| `history.csv` is empty | No results in instrument memory | Run at least one test before export |
| File appears garbled in text editor | Opened with wrong encoding | Open with UTF-8 encoding; the parser defaults to UTF-8. If still garbled, try Latin-1 as fallback. |
| Column count ≠ 40 | Commas in patient name or remark fields | Check if fields with commas are properly quoted; may need to handle quoted CSV fields |
| Results not matching to orders | Operator didn't enter Lab Number as Sample Number | Retrain staff on Sample Number = Lab Number workflow |
| Duplicate results imported | Re-imported same `history.csv` | Verify duplicate detection is active (key: Col 0 + Col 21 + Col 3) |
| `β-hCG` test name not recognized | Encoding artifact on `β` character | Parser should normalize: match on `hCG` substring as fallback |
| USB not recognized | FAT32 formatting issue or USB > 32 GB | Use FAT32-formatted drive ≤ 32 GB |
| Timestamps are wrong | Instrument clock not set | Synchronize instrument date/time (Settings → Date/Time) |

---

## 7. Maintenance & Support Contacts

| Contact | Details |
|---------|---------|
| **Wondfo Global** | [https://en.wondfo.com.cn](https://en.wondfo.com.cn) |
| **Wondfo Technical Support** | support@wondfo.com.cn |
| **Local Distributor (Madagascar)** | (site-specific — obtain from procurement) |
| **OpenELIS Support** | [https://openelis-global.org](https://openelis-global.org) |

---

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-27 | OpenELIS Team | Initial draft from actual FS-205 export data and FS-113 manual |
