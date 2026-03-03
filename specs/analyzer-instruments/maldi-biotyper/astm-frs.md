# Bruker MALDI Biotyper ASTM Integration — Functional Requirements Specification

## Document Information

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Status** | Draft |
| **Module** | Analyzer Integration — MALDI Biotyper |
| **Jira** | OGC-323 |
| **Epic** | OGC-304 (Madagascar Analyzer Work) |
| **Parent Spec** | Analyzer Results Import FRS v2.0 |

---

## 1. Overview

OpenELIS integration with the Bruker MALDI Biotyper sirius mass spectrometer for automated organism identification. The MALDI Biotyper performs matrix-assisted laser desorption/ionization time-of-flight (MALDI-TOF) mass spectrometry on microbial isolates, producing protein fingerprints that are matched against a reference library to identify organisms.

OpenELIS acts as the ASTM server (listener). The MALDI Biotyper Compass software (IVD or HT IVD) connects as the client to transmit organism identification results and to query the LIS for patient/order data and plate layouts.

---

## 2. Connection Architecture

| Parameter | Value |
|-----------|-------|
| **Transport** | TCP/IP Socket |
| **Role** | OpenELIS = Server (listener), Instrument = Client |
| **Default Port** | 9100 (configurable in Admin → Analyzer Configuration) |
| **High-Level Protocol** | ASTM E1394-97 |
| **Low-Level Protocol** | ASTM E1381-95 |
| **Character Encoding** | ASCII |
| **Record Delimiter** | CR (0x0D) |
| **Field Delimiter** | `|` (pipe, 0x7C) |
| **Component Delimiter** | `^` (caret, 0x5E) |
| **Repeat Delimiter** | `\` (backslash, 0x5C) |

---

## 3. Low-Level Protocol (ASTM E1381-95)

The low-level protocol manages reliable delivery of ASTM frames over TCP/IP.

### 3.1 Control Characters

| Character | Hex | Description |
|-----------|-----|-------------|
| ENQ | 0x05 | Establishment phase — sender requests permission to transmit |
| STX | 0x02 | Start of frame |
| ETX | 0x03 | End of frame (last or only frame) |
| ETB | 0x17 | End of intermediate frame (more frames follow) |
| CR | 0x0D | Carriage return — record terminator |
| LF | 0x0A | Line feed — frame terminator |
| ACK | 0x06 | Positive acknowledgement |
| NAK | 0x15 | Negative acknowledgement |
| EOT | 0x04 | End of transmission |

### 3.2 Frame Structure

```
STX [FN] [Record Data] [ETX or ETB] [Checksum] CR LF
```

- **FN**: Single-digit frame number cycling 0–7
- **Checksum**: 2-character hex value computed by summing all bytes between STX (exclusive) and ETX/ETB (inclusive), modulo 256

### 3.3 Transmission Sequence

1. Sender → **ENQ**
2. Receiver → **ACK** (ready) or **NAK** (busy/error)
3. Sender → **STX** [Frame] **ETX/ETB** [Checksum] **CR LF**
4. Receiver → **ACK** (frame OK) or **NAK** (retransmit, up to 6 attempts)
5. Repeat steps 3–4 for all frames
6. Sender → **EOT** (transmission complete)

### 3.4 Timeouts

| Timer | Duration | Action on Timeout |
|-------|----------|-------------------|
| Establishment | 15 seconds | Sender retries ENQ up to 6 times, then abandons |
| Frame Response | 15 seconds | Sender retransmits frame up to 6 times |
| Busy Wait | 60 seconds | After receiver NAKs ENQ, sender waits then retries |

### 3.5 Maximum Frame Size

63,993 bytes per ASTM specification. Messages exceeding this are split across multiple frames using ETB (intermediate) and ETX (final).

---

## 4. High-Level Message Types

### 4.1 Result Message (Instrument → LIS)

This is the primary message type. The MALDI Biotyper sends organism identification results after measurement.

| Record | ASTM Type | Key Fields |
|--------|-----------|------------|
| H | Header | Sender ID (H.5.1: instrument model), software version (H.5.2), timestamp |
| P | Patient | Run UUID (P.3), Sample UUID (P.4) — note: these are instrument-assigned UUIDs, not actual patient demographics |
| O | Order/Specimen | Accession number (O.3), measurement timestamp (O.7), instrument serial (O.13.2), target plate ID (O.13.3), target plate position (O.13.4), sample type (O.16) |
| R (ORG) | Result — Organism Summary | Organism code (R.4), consistency category (R.7), project type (R.9.2), sample type (R.9.3), validation flag (R.9.5), subtyping module (R.9.6) |
| R (PRO) | Result — Profile Detail | Organism code (R.3.4), organism name (R.3.5), qualitative probability (R.4.1), quantitative score (R.4.2), matched pattern UUID (R.4.4), library name (R.4.5) |
| L | Terminator | End of message |

**Message hierarchy**: One H record per transmission, one P record per run, one O record per specimen position, one ORG R record per specimen, and multiple PRO R records (ranked matches) per ORG.

### 4.2 Patient Query (LIS → Instrument)

Used by the MALDI Biotyper to retrieve demographic information for a given sample. OpenELIS responds with patient/order records matching the queried accession number.

| Record | Content |
|--------|---------|
| H | Header with query message type |
| Q | Query record with accession number filter |
| L | Terminator |

### 4.3 Measuring Task Query (LIS → Instrument)

Used to download a plate layout to the instrument before measurement. OpenELIS provides accession numbers, organism names, and sample types for each target plate position.

**Query (Instrument → LIS):**

| Record | Content |
|--------|---------|
| H | Header |
| Q | Query with target plate ID (Q.5) or project name (Q.3) filter |
| L | Terminator |

**Response (LIS → Instrument):**

| Record | Key Fields |
|--------|------------|
| H | Header |
| P | Patient stub |
| O | Accession (O.3), isolation number (O.4), analyte name (O.5.1), analyte description (O.5.2), sample type (O.16), preparation type (O.21: DT/EDT/EXT), plate position (O.22), chip number (O.23) |
| L | Terminator |

---

## 5. Result Field Details

### 5.1 ORG Record — Organism Summary

The ORG result record provides the overall identification summary for a specimen.

| Field | Position | Type | Description |
|-------|----------|------|-------------|
| Organism Code | R.4 | String | WHONET-compatible organism code |
| Consistency Category | R.7 | Char | A, B, or C (see 5.3) |
| Project Type | R.9.2 | String | "RUO" (Research Use Only) or "IVD" (In Vitro Diagnostic) |
| Sample Type | R.9.3 | String | STD, QC, BC, MYC, or FUNGI (see 5.5) |
| Validation Flag | R.9.5 | String | Instrument validation indicator |
| Subtyping Module | R.9.6 | String | "subtyping" if subtyping result present, empty otherwise |

### 5.2 PRO Record — Profile Detail

Multiple PRO records follow each ORG record, ranked by score (highest first). Each PRO represents one library match.

| Field | Position | Type | Description |
|-------|----------|------|-------------|
| Organism Code | R.3.4 | String | Matched organism code |
| Organism Name | R.3.5 | String | Full scientific name (e.g., "Escherichia coli") |
| Qualitative Probability | R.4.1 | String | +++, ++, +, or – (see 5.4) |
| Quantitative Score | R.4.2 | Decimal | MALDI log score, range 0.000–3.000 |
| Matched Pattern UUID | R.4.4 | UUID | UUID of the matched MSP (Main Spectrum) in the library |
| Library Name | R.4.5 | String | Reference library used (e.g., "MBT 2024 IVD") |

### 5.3 Consistency Categories

Describes the agreement level among the top-ranked profile matches.

| Code | Meaning | Interpretation |
|------|---------|----------------|
| A | Consistent species-level ID | Top-ranked scores agree at species level |
| B | Consistent genus-level ID | Scores agree at genus, differ at species |
| C | Inconsistent ID | Top scores disagree at genus level |

### 5.4 Qualitative Probability Symbols

| Symbol | Score Range | Meaning |
|--------|------------|---------|
| +++ | ≥ 2.300 | High confidence species identification |
| ++ | 2.000 – 2.299 | Secure genus identification, probable species |
| + | 1.700 – 1.999 | Probable genus identification |
| – | < 1.700 | Not reliable identification |

### 5.5 Sample Types (O.16)

| Code | Description |
|------|-------------|
| STD | Standard clinical sample |
| QC | Quality control sample (BTS — Bacterial Test Standard) |
| BC | Blood culture isolate |
| MYC | Mycobacterial sample |
| FUNGI | Fungal sample |

---

## 6. Instrument Identification

Auto-populated from parsed message fields:

| Data Point | Source Field | Example |
|------------|-------------|---------|
| Instrument Model | H.5.1 | "MBT Compass" or "MBT Compass HT" |
| Software Version | H.5.2 | "4.5.0.1" |
| Serial Number | O.13.2 | Unique serial from rear panel |
| Target Plate ID | O.13.3 | Barcode of the MALDI target plate |
| Target Position | O.13.4 | Position on plate (e.g., "A1", "H12") |

---

## 7. QC Handling

### 7.1 QC Sample Identification

QC samples are identified by `O.16 = "QC"` in the Order record. The MALDI Biotyper uses the Bacterial Test Standard (BTS) as its QC material.

### 7.2 QC Evaluation Criteria

| Criterion | Expected Value |
|-----------|---------------|
| Organism | *Escherichia coli* DH5alpha |
| Score | ≥ 2.000 |
| Consistency | A (species-level agreement) |
| Qualitative | +++ or ++ |

### 7.3 QC Evaluation Logic

1. Extract all R records where the parent O record has `O.16 = QC`
2. Evaluate the top-ranked PRO result (first R record after ORG) against expected organism and score threshold
3. If organism matches AND score ≥ 2.000 AND consistency = A → **QC Pass**
4. Otherwise → **QC Fail** → block patient result acceptance, trigger non-conformity workflow

QC results are displayed in the QC Panel on the Analyzer Import review page before patient results can be evaluated.

---

## 8. Data Model Mapping

Parsed MALDI results map to the `OrganismIdResult` type:

```typescript
interface OrganismIdResult {
  resultType: 'organism-id';
  sourceInstrument: 'maldi-biotyper';

  // ORG-level summary
  organismCode: string;              // From ORG R.4
  organismName: string;              // From top PRO R.3.5
  confidenceCategory: 'A' | 'B' | 'C'; // From ORG R.7
  projectType: 'RUO' | 'IVD';       // From ORG R.9.2
  validationFlag?: string;           // From ORG R.9.5
  subtypingModule?: string;          // From ORG R.9.6

  // PRO-level ranked profiles
  profiles: OrganismProfile[];
}

interface OrganismProfile {
  rank: number;                      // 1 = top match
  organismCode: string;              // From PRO R.3.4
  organismName: string;              // From PRO R.3.5
  qualitativeProbability: '+++' | '++' | '+' | '–'; // From PRO R.4.1
  quantitativeScore: number;         // From PRO R.4.2 (0.000–3.000)
  matchedPatternUUID?: string;       // From PRO R.4.4
  libraryName?: string;              // From PRO R.4.5
}
```

### Specimen-Level Fields

```typescript
interface MaldiSpecimen {
  labNumber: string;           // From ASTM O.3 (accession field)
  targetPlateId: string;             // From O.13.3
  targetPlatePosition: string;       // From O.13.4
  sampleType: 'STD' | 'QC' | 'BC' | 'MYC' | 'FUNGI'; // From O.16
  measurementTimestamp: string;      // From O.7
  runUUID: string;                   // From P.3
  sampleUUID: string;                // From P.4
  instrumentSerial: string;          // From O.13.2
}
```

---

## 9. Preparation Types (Measuring Task Response)

When OpenELIS sends plate layout data back to the instrument, it includes the sample preparation method:

| Code | Method | Description |
|------|--------|-------------|
| DT | Direct Transfer | Sample smeared directly on target plate, overlaid with matrix |
| EDT | Extended Direct Transfer | Sample smeared, overlaid with formic acid, then matrix |
| EXT | Extraction | Full ethanol/formic acid extraction before spotting |

---

## 10. Error Handling

### 10.1 Connection Errors

| Error | Handling |
|-------|----------|
| Instrument cannot connect | OpenELIS logs connection attempt; Analyzer status shows "Disconnected" |
| Connection drops mid-transmission | OpenELIS discards partial data; instrument will retransmit on reconnection |
| Checksum mismatch | OpenELIS sends NAK; instrument retransmits frame (up to 6 retries) |
| All retries exhausted | Transmission abandoned; instrument logs error; OpenELIS logs event |

### 10.2 Parse Errors

| Error | Handling |
|-------|----------|
| Missing accession (O.3 empty) | Result flagged with MISSING_LAB_NUMBER warning; stored but not linkable to order |
| Unknown sample type in O.16 | Default to "OTHER"; log warning |
| Score outside 0–3 range | Flag as VALUE_OUT_OF_RANGE; store original value |
| Malformed R record | Skip record; log parse error; continue with remaining records |

---

## 11. Audit Trail

| Event | Logged Data |
|-------|-------------|
| Connection established | Timestamp, instrument IP, instrument model |
| Message received | Timestamp, raw ASTM message (stored for replay), parsed record count |
| QC evaluated | QC sample IDs, pass/fail result, expected vs actual values |
| Results imported | Run ID, specimen count, lab numbers, importing user |
| Connection closed | Timestamp, duration, records transmitted |

---

## 12. Configuration (Admin)

The MALDI Biotyper adapter is configured in Admin → Analyzer Configuration:

| Setting | Default | Description |
|---------|---------|-------------|
| Listening Port | 9100 | TCP port OpenELIS listens on |
| QC Expected Organism | Escherichia coli DH5alpha | Expected organism for BTS QC |
| QC Minimum Score | 2.000 | Minimum acceptable score for QC pass |
| QC Expected Consistency | A | Expected consistency category for QC |
| Auto-Accept Confidence Threshold | — | Optional: auto-accept results above this score (disabled by default) |
| Test-to-Code Mapping | — | Maps MALDI organism codes to OpenELIS test entries |
| Raw Message Retention | 90 days | How long to keep raw ASTM messages |

---

## 13. Acceptance Criteria

- [ ] OpenELIS ASTM TCP server accepts connections from MALDI Compass on configurable port
- [ ] Low-level E1381-95 protocol: ENQ/ACK handshake, frame checksums, retry logic (6 max), timeouts (15s/15s/60s)
- [ ] H|P|O|R(ORG)|R(PRO)|L result messages parsed into structured OrganismIdResult objects
- [ ] ORG fields extracted: organism code, consistency (A/B/C), project type (RUO/IVD), sample type, validation flag, subtyping module
- [ ] PRO records extracted with ranked profiles: organism name, qualitative probability (+++/++/+/–), quantitative score (0–3.000), matched pattern UUID, library name
- [ ] QC samples identified by O.16 = "QC" and evaluated against configurable BTS criteria
- [ ] Patient Query responses return correct patient/order data for queried lab number
- [ ] Measuring Task Query responses return plate layout with accession, analyte, sample type, preparation type, position
- [ ] Instrument model, serial number, software version, and target plate ID captured from message headers
- [ ] Raw ASTM messages stored for audit trail with configurable retention period
- [ ] Parsed results appear on the Analyzer Import review page for QC evaluation and acceptance
- [ ] All UI labels use localization keys

---

## 14. Reference

Source specification: Bruker MALDI Biotyper ASTM v4.5 (Spec_ASTM_v_4_5.pdf)
