# Mindray BS-Series Clinical Chemistry Analyzers — Functional Requirements Specification

**Version:** 2.1
**Date:** 2026-02-24
**Status:** Ready for Development
**Confidence:** HIGH — Based on Mindray Host Interface Manual v5 (P/N: BA20-20-75337)
**Integration Pattern:** A (HL7/LIS Direct)
**Jira Story:** [OGC-326](https://uwdigi.atlassian.net/browse/OGC-326) — Implement Mindray BS-Series Chemistry HL7 Adapter (incl. BS-200)
**Jira Epic:** [OGC-304](https://uwdigi.atlassian.net/browse/OGC-304) — Madagascar Analyzer Integrations
**Depends On:** [OGC-325](https://uwdigi.atlassian.net/browse/OGC-325) — HL7 v2.3.1 MLLP Listener Service
**Assigned To:** Piotr Mankowski
**Label:** Madagascar

---

## 1. Instrument Overview

| Field | Value |
|-------|-------|
| **Manufacturer** | Shenzhen Mindray Bio-Medical Electronics Co., Ltd. |
| **Product Family** | BS-Series Clinical Chemistry Analyzers |
| **Discipline** | Clinical Chemistry / Biochemistry |
| **Communication** | **HL7 v2.3.1** over TCP/IP with MLLP framing |
| **Barcode Support** | Yes — built-in barcode reader (Code 128, Code 39, Codabar, Interleaved 2 of 5) |
| **Reference Document** | Mindray Host Interface Manual v5 (P/N: BA20-20-75337) |

> **IMPORTANT — Protocol Correction:** Previous versions of this spec (v1.0) incorrectly described ASTM E1394/LIS2-A2 as the communication protocol. The actual protocol is **HL7 v2.3.1** over TCP/IP, as documented in the official Mindray Host Interface Manual. This is a different protocol from the Mindray BC-5380 hematology analyzer (which also uses HL7 v2.3.1 but with different message structure — see OGC-327).

### 1.1 Applicable Models

All BS-series models share the same HL7 v2.3.1 communication protocol. The model name appears in MSH-3/MSH-4 fields of HL7 messages.

**Explicitly covered:** BS-120, BS-130, BS-180, BS-190, **BS-200**, BS-220, BS-200E, BS-220E, BS-240, BS-240 Pro, BS-330, BS-350, BS-330E, BS-350E, BS-360E, BS-480, BS-800, BS-800M, BS-2000M

### 1.2 Model Throughput Reference

| Model | Throughput | ISE Module | Notes |
|-------|-----------|------------|-------|
| BS-120 / BS-130 | Up to 120/200 T/H | Optional | Entry-level, documented in Interface Manual v5 |
| BS-180 / BS-190 | Up to 180/200 T/H | Optional | Entry-level |
| **BS-200 / BS-220** | **Up to 200/200 T/H** | **Optional** | **Mid-range, documented in Interface Manual v5** |
| BS-200E / BS-220E | Up to 200/200 T/H | Optional | Enhanced versions |
| BS-240 / BS-240 Pro | Up to 240 T/H | Optional | Mid-range |
| BS-330 / BS-350 | Up to 330/400 T/H | Optional | Mid-range, documented in Interface Manual v5 |
| BS-330E / BS-350E | Up to 330/400 T/H | Optional | Enhanced versions |
| BS-360E | Up to 360 T/H | Optional | Mid-range |
| BS-480 | Up to 400 T/H | Optional | Mid-range |
| BS-800 / BS-800M | Up to 800/1200 T/H | Optional | High throughput |
| BS-2000M | Up to 2000 T/H | Integrated | Flagship modular |

> **Note on Manual coverage:** The Interface Manual v5 explicitly documents BS-120 through BS-350E. Higher-throughput models (BS-480, BS-800, BS-2000M) use the same HL7 v2.3.1 protocol — Mindray has maintained protocol consistency across the BS platform. Confirm firmware version with Mindray service engineer for any model not listed in the manual.

### 1.3 Confidence Assessment

| Aspect | Confidence | Basis |
|--------|-----------|-------|
| Protocol (HL7 v2.3.1) | **HIGH** | Mindray Host Interface Manual v5 — primary reference |
| Message structure | **HIGH** | Documented with field-level detail and examples in Manual v5 |
| Test code numbering | **HIGH** | Confirmed numeric IDs; actual numbers are site-configurable |
| QC discrimination (MSH-16) | **HIGH** | Explicitly documented with examples |
| Bidirectional flow | **HIGH** | QRY/QCK/DSR sequence documented with full field definitions |
| BS-200 coverage | **HIGH** | BS-200 explicitly listed as covered model in Manual v5 |

---

## 2. Communication Architecture

### 2.1 Connection Model

The Mindray BS-series uses **HL7 v2.3.1 over TCP/IP** — this is fundamentally different from the ASTM-based connections some other analyzers use. OpenELIS requires an **HL7 MLLP listener** (OGC-325) for these instruments.

```
┌──────────────┐      HL7 v2.3.1 / MLLP    ┌──────────────────────┐
│  BS-xxx      │ ─────────────────────────▶ │  OpenELIS HL7        │
│  Chemistry   │   TCP/IP                   │  MLLP Listener       │
│  Analyzer    │ ◀───────────────────────── │                      │
│              │   (bidirectional)           │  → HL7 Parser        │
└──────────────┘                            │  → Test Code Mapper  │
                                            │  → Result Writer     │
                                            └──────────────────────┘
```

### 2.2 Transport Layer — MLLP (Minimal Lower Layer Protocol)

All HL7 messages are wrapped in MLLP framing:

```
<SB> message_content <EB><CR>
```

| Character | Hex | ASCII | Purpose |
|-----------|-----|-------|---------|
| `<SB>` | `0x0B` | VT (Vertical Tab) | Start Block — marks beginning of HL7 message |
| `<EB>` | `0x1C` | FS (File Separator) | End Block — marks end of HL7 message |
| `<CR>` | `0x0D` | CR (Carriage Return) | Message terminator after End Block |

Within the message, each HL7 segment is terminated by `<CR>` (`0x0D`).

### 2.3 TCP/IP Connection

| Parameter | Value |
|-----------|-------|
| Protocol | TCP/IP |
| Port | Configurable per analyzer instance (recommend unique port per instrument) |
| Connection Mode | Analyzer connects to OpenELIS (client mode) |
| Character Set | ASCII (ISO 8859-1, hex 20-FF plus CR) |

> **No RS-232 serial option.** Unlike some other analyzers, the BS-series chemistry HL7 interface is TCP/IP only per the Mindray Host Interface Manual.

### 2.4 HL7 Message Types

| Message | Direction | Purpose |
|---------|-----------|---------|
| `ORU^R01` | Analyzer → OpenELIS | Send test results (patient, QC, or calibration) |
| `ACK^R01` | OpenELIS → Analyzer | Acknowledge receipt of results |
| `QRY^Q02` | Analyzer → OpenELIS | Query for pending orders (by barcode or batch) |
| `QCK^Q02` | OpenELIS → Analyzer | Acknowledge query (data found / not found) |
| `DSR^Q03` | OpenELIS → Analyzer | Send sample/order information (order download) |
| `ACK^Q03` | Analyzer → OpenELIS | Acknowledge receipt of order data |

### 2.5 Result Upload Flow (Analyzer → OpenELIS)

**Critical: Each test result is sent as a separate ORU^R01 message.** A sample with 10 tests generates 10 individual HL7 messages, each requiring an ACK^R01 response. The adapter MUST aggregate results from multiple messages into a single sample result set for the Analyzer Import page.

**Aggregation key:** OBR-2 (sample barcode) — all ORU messages with the same OBR-2 belong to the same sample.

```
Analyzer                          OpenELIS
  │                                  │
  │── ORU^R01 (GLU result) ────────►│  Parse, extract, hold
  │◄── ACK^R01 (AA) ───────────────│
  │                                  │
  │── ORU^R01 (BUN result) ────────►│  Same barcode → aggregate
  │◄── ACK^R01 (AA) ───────────────│
  │                                  │
  │── ORU^R01 (CREA result) ───────►│  Same barcode → aggregate
  │◄── ACK^R01 (AA) ───────────────│
  │                                  │
  │   ... (repeat for each test)     │
  │                                  │
  │                                  │  Timeout / next barcode triggers
  │                                  │  display on Analyzer Import page
```

### 2.6 Order Download Flow (OpenELIS → Analyzer) — Optional

If bidirectional mode is enabled on the analyzer:

```
Analyzer                          OpenELIS
  │                                  │
  │── QRY^Q02 (barcode query) ─────►│  Look up pending orders
  │◄── QCK^Q02 (OK / NF) ─────────│
  │                                  │
  │   [If found:]                    │
  │◄── DSR^Q03 (patient + tests) ──│  Send demographics + ordered tests
  │── ACK^Q03 (AA) ────────────────►│
```

---

## 3. HL7 Message Structure

### 3.1 HL7 Delimiters

| Character | Symbol | Purpose |
|-----------|--------|---------|
| `\|` | Pipe | Field separator |
| `^` | Caret | Component separator |
| `&` | Ampersand | Subcomponent separator |
| `~` | Tilde | Repetition separator |
| `\` | Backslash | Escape character |

### 3.2 MSH — Message Header Segment

| Field # | Name | Value / Usage |
|---------|------|---------------|
| MSH-1 | Field Separator | `\|` |
| MSH-2 | Encoding Characters | `^~\&` |
| MSH-3 | Sending Application | `Mindray` |
| MSH-4 | Sending Facility | Model name (see Section 3.3) |
| MSH-7 | Date/Time | `YYYYMMDDHHmmss` |
| MSH-9 | Message Type | `ORU^R01`, `ACK^R01`, `QRY^Q02`, `QCK^Q02`, `DSR^Q03` |
| MSH-10 | Message Control ID | Sequential integer, unique per message |
| MSH-11 | Processing ID | `P` = Production |
| MSH-12 | Version ID | `2.3.1` |
| **MSH-16** | **Application Ack Type** | **`0` = Patient result, `1` = Calibration, `2` = QC result** |
| MSH-18 | Character Set | `ASCII` |

> **QC Discrimination:** The BS-series uses **MSH-16** (Application Acknowledgment Type) to distinguish result types — NOT MSH-11. This is different from the BC-5380 hematology analyzer which uses MSH-11. Patient results have MSH-16 = `0`, QC results have MSH-16 = `2`, Calibration results have MSH-16 = `1`.

### 3.3 MSH-4 Sender Identification by Model

The adapter MUST NOT hardcode an allowlist of MSH-4 values. It should accept any MSH-4 string and match dynamically against the analyzer name registered in OpenELIS Analyzer Administration. This ensures forward compatibility with new BS-series models.

| Model | MSH-3 (Sending App) | MSH-4 (Sending Facility) | Notes |
|-------|---------------------|--------------------------|-------|
| BS-120 | `Mindray` | `BS-120` | Entry-level, documented in Interface Manual v5 |
| BS-130 | `Mindray` | `BS-130` | Entry-level |
| BS-180 | `Mindray` | `BS-180` | Entry-level |
| BS-190 | `Mindray` | `BS-190` | Entry-level |
| **BS-200** | **`Mindray`** | **`BS-200`** | **Mid-range, documented in Interface Manual v5** |
| BS-220 | `Mindray` | `BS-220` | Mid-range, documented in Interface Manual v5 |
| BS-200E | `Mindray` | `BS-200E` | Enhanced mid-range |
| BS-220E | `Mindray` | `BS-220E` | Enhanced mid-range |
| BS-240 | `Mindray` | `BS-240` | Mid-range |
| BS-240 Pro | `Mindray` | `BS-240Pro` | Mid-range enhanced |
| BS-330 | `Mindray` | `BS-330` | Mid-range, documented in Interface Manual v5 |
| BS-350 | `Mindray` | `BS-350` | Mid-range, documented in Interface Manual v5 |
| BS-330E | `Mindray` | `BS-330E` | Enhanced mid-range |
| BS-350E | `Mindray` | `BS-350E` | Enhanced mid-range |
| BS-360E | `Mindray` | `BS-360E` | Mid-range |
| BS-480 | `Mindray` | `BS-480` | Mid-range |
| BS-800 | `Mindray` | `BS-800` | High throughput |
| BS-800M | `Mindray` | `BS-800M` | High throughput modular |
| BS-2000M | `Mindray` | `BS-2000M` | Flagship modular |

> **Verification note:** The exact MSH-4 string (e.g., `BS-200` vs `BS200`) should be confirmed from a live HL7 capture during commissioning. The values above follow the pattern documented in Interface Manual v5.

### 3.4 PID — Patient Identification Segment

| Field # | Name | Usage | Example |
|---------|------|-------|---------|
| PID-1 | Set ID | Sequence number | `1` |
| PID-2 | Patient ID (External) | Patient ID | `101` |
| PID-4 | Alternate Patient ID | Bed number | `3` |
| PID-5 | Patient Name | `LastName^FirstName` | `Rakoto^Fara` |
| PID-7 | Date/Time of Birth | `YYYYMMDDHHmmss` | `19850512000000` |
| PID-8 | Sex | `M` / `F` / `O` | `F` |
| PID-10 | Race | Blood type (repurposed) | `A` |

**Example:**
```
PID|1|101||3|Rakoto^Fara||19850512000000|F|A||||||||||||||||||||||
```

> **Note:** PID is present for patient results (MSH-16 = 0) but **absent** for QC results (MSH-16 = 2).

### 3.5 OBR — Observation Request Segment

#### Patient Result OBR (MSH-16 = 0)

| Field # | Name | Usage | Example |
|---------|------|-------|---------|
| OBR-1 | Set ID | Sequence number | `1` |
| **OBR-2** | **Placer Order Number** | **Sample barcode — PRIMARY match key** | `LAB-2025-00201` |
| OBR-3 | Filler Order Number | Internal sample ID (don't use for matching) | `5` |
| OBR-4 | Universal Service ID | `Mindray^{model}` | `Mindray^BS-200` |
| OBR-5 | Priority | `Y` = STAT, `N` = Routine | `N` |
| OBR-7 | Observation Date/Time | Test completion time | `20250220141530` |
| OBR-15 | Specimen Source | Sample type | `serum` |
| OBR-18 | Placer Field 1 | Sample characteristics (H/L/I indices) | *(optional)* |

#### QC Result OBR (MSH-16 = 2)

| Field # | Name | Usage | Example |
|---------|------|-------|---------|
| OBR-2 | Test Number | Numeric test ID | `1` |
| OBR-3 | Test Name | Test name string | `GLU` |
| OBR-6 | QC Date/Time | `YYYYMMDDHHmmss` | `20250220060015` |
| **OBR-13** | **Relevant Clinical Info** | **Control name** | `CTRL-Normal` |
| **OBR-14** | **Specimen Received Date** | **Lot number** | `LOT-2025-001` |
| OBR-15 | Specimen Source | Expiration date | `20260101000000` |
| **OBR-17** | **Order Callback Phone** | **Concentration level: `H`/`M`/`L`** | `M` |
| **OBR-18** | **Placer Field 1** | **Mean value** | `100.000000` |
| **OBR-19** | **Placer Field 2** | **Standard deviation** | `3.500000` |
| **OBR-20** | **Filler Field 1** | **QC result (concentration)** | `98.200000` |
| OBR-21 | Filler Field 2 | Unit | `mg/dL` |

> **Critical:** QC messages have NO PID segment and NO OBX segment. All QC data is in the OBR segment. This is unique to the BS-series.

### 3.6 OBX — Observation/Result Segment (Patient Results Only)

| Field # | Name | Usage | Example |
|---------|------|-------|---------|
| OBX-1 | Set ID | Sequence number | `1` |
| OBX-2 | Value Type | `NM` = numeric, `ST` = string (qualitative) | `NM` |
| **OBX-3** | **Observation Identifier** | **Numeric test ID — PRIMARY test code for mapping** | `1` |
| OBX-4 | Observation Sub-ID | Test name (informational, do NOT use for mapping) | `GLU` |
| **OBX-5** | **Observation Value** | **Result value** | `95.000000` |
| **OBX-6** | **Units** | **Unit of measurement** | `mg/dL` |
| OBX-7 | Reference Range | Normal range string | `70-100` |
| **OBX-8** | **Abnormal Flags** | **`N`=Normal, `L`=Low, `H`=High, `LL`=Critical Low, `HH`=Critical High** | `N` |
| OBX-11 | Result Status | `F` = Final | `F` |

---

## 4. Test Code Mapping — OpenELIS Configuration

The BS-series identifies tests by **numeric IDs** (e.g., `1` for Glucose), not mnemonic codes. These numbers are configured on the analyzer and **may vary between installations**. The adapter MUST support configurable numeric-to-test mapping in the OpenELIS Analyzer Management UI.

### 4.1 General Chemistry

| Test # | Analyzer Code | OpenELIS Test Name Tag | LOINC | Unit |
|--------|---------------|----------------------|-------|------|
| 1 | `GLU` | `label.test.glucose` | 2345-7 | mg/dL |
| 2 | `BUN` | `label.test.bun` | 3094-0 | mg/dL |
| 3 | `CREA` | `label.test.creatinine` | 2160-0 | mg/dL |
| 4 | `UA` | `label.test.uricAcid` | 3084-1 | mg/dL |
| 5 | `TP` | `label.test.totalProtein` | 2885-2 | g/dL |
| 6 | `ALB` | `label.test.albumin` | 1751-7 | g/dL |
| 7 | `TBIL` | `label.test.totalBilirubin` | 1975-2 | mg/dL |
| 8 | `DBIL` | `label.test.directBilirubin` | 1968-7 | mg/dL |
| 9 | `Ca` | `label.test.calcium` | 17861-6 | mg/dL |
| 10 | `Mg` | `label.test.magnesium` | 19123-9 | mg/dL |
| 11 | `P` | `label.test.phosphorus` | 2777-1 | mg/dL |
| 12 | `Fe` | `label.test.iron` | 2498-4 | µg/dL |

### 4.2 Liver Function

| Test # | Analyzer Code | OpenELIS Test Name Tag | LOINC | Unit |
|--------|---------------|----------------------|-------|------|
| 13 | `ALT` / `SGPT` | `label.test.alt` | 1742-6 | U/L |
| 14 | `AST` / `SGOT` | `label.test.ast` | 1920-8 | U/L |
| 15 | `ALP` | `label.test.alp` | 6768-6 | U/L |
| 16 | `GGT` | `label.test.ggt` | 2324-2 | U/L |
| 17 | `LDH` | `label.test.ldh` | 2532-0 | U/L |
| 18 | `CHE` | `label.test.cholinesterase` | 2710-2 | U/L |

### 4.3 Lipid Panel

| Test # | Analyzer Code | OpenELIS Test Name Tag | LOINC | Unit |
|--------|---------------|----------------------|-------|------|
| 19 | `CHOL` | `label.test.totalCholesterol` | 2093-3 | mg/dL |
| 20 | `TG` | `label.test.triglycerides` | 2571-8 | mg/dL |
| 21 | `HDL` | `label.test.hdl` | 2085-9 | mg/dL |
| 22 | `LDL` | `label.test.ldl` | 13457-7 | mg/dL |
| 23 | `VLDL` | `label.test.vldl` | 13458-5 | mg/dL |

### 4.4 Cardiac / Pancreatic Enzymes

| Test # | Analyzer Code | OpenELIS Test Name Tag | LOINC | Unit |
|--------|---------------|----------------------|-------|------|
| 24 | `CK` | `label.test.ck` | 2157-6 | U/L |
| 25 | `CK-MB` | `label.test.ckmb` | 13969-1 | U/L |
| 26 | `AMY` | `label.test.amylase` | 1798-8 | U/L |
| 27 | `LIP` | `label.test.lipase` | 3040-3 | U/L |

### 4.5 Diabetes / Glycemic Markers

| Test # | Analyzer Code | OpenELIS Test Name Tag | LOINC | Unit |
|--------|---------------|----------------------|-------|------|
| 28 | `HBA1C` | `label.test.hba1c` | 4548-4 | % |
| 29 | `FRU` | `label.test.fructosamine` | 14800-7 | µmol/L |

### 4.6 Renal / Urine Chemistry

| Test # | Analyzer Code | OpenELIS Test Name Tag | LOINC | Unit |
|--------|---------------|----------------------|-------|------|
| 30 | `MALB` | `label.test.microalbumin` | 14957-5 | mg/L |
| 31 | `UCREA` | `label.test.urineCreatinine` | 2161-8 | mg/dL |
| 32 | `UTP` | `label.test.urineTotalProtein` | 2888-6 | mg/dL |

### 4.7 Inflammation / Specific Proteins

| Test # | Analyzer Code | OpenELIS Test Name Tag | LOINC | Unit |
|--------|---------------|----------------------|-------|------|
| 33 | `CRP` | `label.test.crp` | 1988-5 | mg/L |
| 34 | `HCRP` | `label.test.hsCrp` | 30522-7 | mg/L |
| 35 | `ASO` | `label.test.aso` | 5370-2 | IU/mL |
| 36 | `RF` | `label.test.rheumatoidFactor` | 11572-5 | IU/mL |
| 37 | `PCT-I` | `label.test.procalcitonin` | 33959-8 | ng/mL |

### 4.8 Electrolytes (ISE Module — Optional)

| Test # | Analyzer Code | OpenELIS Test Name Tag | LOINC | Unit |
|--------|---------------|----------------------|-------|------|
| ISE-1 | `Na` | `label.test.sodium` | 2951-2 | mEq/L |
| ISE-2 | `K` | `label.test.potassium` | 2823-3 | mEq/L |
| ISE-3 | `Cl` | `label.test.chloride` | 2075-0 | mEq/L |
| ISE-4 | `Li` | `label.test.lithium` | 14334-7 | mEq/L |

> **Note:** Electrolyte parameters are only available on models equipped with the optional ISE module. ISE results are transmitted via the same HL7 message stream.

### 4.9 Unit Conventions

| Unit | Usage | Notes |
|------|-------|-------|
| `mg/dL` | Most chemistry analytes | Standard conventional unit |
| `g/dL` | Total protein, albumin | Conventional unit |
| `U/L` | Enzyme activities | International Units per liter |
| `mEq/L` | Electrolytes (ISE) | Milliequivalents per liter |
| `mg/L` | CRP, microalbumin | Milligrams per liter |
| `IU/mL` | ASO, RF | International Units per mL |
| `%` | HbA1c | Percent |

> **IMPORTANT:** The analyzer may transmit results in either conventional or SI units depending on its configuration. Verify unit settings match OpenELIS expectations during commissioning. Mismatched units are a patient safety risk.

---

## 5. QC Result Handling

### 5.1 QC Identification

QC results are identified by **MSH-16 = `2`** — NOT by sample ID pattern matching. This is fundamentally different from ASTM analyzers.

| MSH-16 Value | Result Type | OpenELIS Routing |
|-------------|-------------|-----------------|
| `0` | Patient result | Analyzer Import page → Validation |
| `1` | Calibration result | Log and discard (not needed by LIS) |
| `2` | QC result | QC evaluation module → Westgard rules |

### 5.2 QC Message Structure

QC messages have NO PID segment and NO OBX segment — all data is in OBR:

```
<VT>MSH|^~\&|Mindray|BS-200|||20250220060015||ORU^R01|1|P|2.3.1||||2||ASCII|||<CR>
OBR|1|1|GLU|Mindray^BS-200||20250220060015|||||||CTRL-Normal|LOT-2025-001|20260101000000||M|100.000000|3.500000|98.200000|mg/dL|||||||||||||||||||||||||||<CR>
<FS><CR>
```

### 5.3 QC Fields Extraction

| OBR Field | Data | OpenELIS Mapping |
|-----------|------|-----------------|
| OBR-2 | Test number | Numeric test ID (same mapping as patient results) |
| OBR-3 | Test name | Informational |
| OBR-6 | QC date/time | QC run timestamp |
| OBR-13 | Control name | Control material identifier |
| OBR-14 | Lot number | Lot tracking |
| OBR-15 | Expiration date | Lot expiry |
| OBR-17 | Concentration level | `H` = High, `M` = Medium/Normal, `L` = Low |
| OBR-18 | Mean value | Expected mean for Westgard evaluation |
| OBR-19 | Standard deviation | Expected SD for Westgard evaluation |
| OBR-20 | QC result | Measured concentration |
| OBR-21 | Unit | Unit of measurement |

---

## 6. Bidirectional Order Download (Optional)

### 6.1 Single Sample Query

When the analyzer scans a barcode, it sends a `QRY^Q02` with the barcode in QRD-8:

1. Parse QRD-8 for barcode value
2. Look up pending orders in OpenELIS matching the barcode
3. If found: Send `QCK^Q02` with `QAK|SR|OK|`, then `DSR^Q03` with patient demographics + ordered tests
4. If not found: Send `QCK^Q02` with `QAK|SR|NF|` — no DSR message

### 6.2 Batch Query

When the analyzer sends `QRY^Q02` with empty QRD-8:

1. Parse QRF-2 (start time) and QRF-3 (end time) for the time range
2. Query OpenELIS for all pending orders within the time range
3. Send one `DSR^Q03` per sample, with non-empty DSC for all except the last
4. Empty DSC on the last DSR signals end of batch

### 6.3 DSR^Q03 Response Construction

Build DSP segments in the required 29+ field sequence:

| DSP # | Field | Source |
|-------|-------|--------|
| 1 | Admission Number | Patient record |
| 2 | Bed Number | Patient record |
| 3 | Patient Name | `LastName^FirstName` |
| 4 | Date of Birth | `YYYYMMDDHHmmss` |
| 5 | Sex | `M`/`F`/`O` |
| 6–20 | Demographics | (mostly empty) |
| 21 | **Barcode** | Accession number |
| 22 | **Sample ID** | Sequence number |
| 23 | Sample Time | Collection time |
| 24 | STAT | `Y`/`N` |
| 25 | Collection Volume | (empty) |
| 26 | Sample Type | serum / plasma / urine |
| 27 | Ordering Doctor | Provider |
| 28 | Ordering Department | Department |
| 29+ | **Test Number^^^** | One DSP per ordered test |

### 6.4 Query Cancellation

If QRD-9 = `CAN` (instead of `OTH`), stop sending DSR messages after completing the current one.

---

## 7. Serum Index Handling (Optional)

Some BS-series models transmit Hemolysis (H), Lipemia (L), and Icterus (I) indices as additional result records:

| Analyzer Code | Parameter | Unit | Interpretation |
|---------------|-----------|------|---------------|
| `H-Index` | Hemolysis Index | mg/dL | >50 = significant hemolysis |
| `L-Index` | Lipemia Index | mg/dL | >150 = significant lipemia |
| `I-Index` | Icterus Index | mg/dL | >20 = significant icterus |

### OpenELIS Handling Options

1. **Map as informational results** — Store alongside chemistry results for tech review
2. **Map as sample flags** — Trigger sample quality warnings on the Analyzer Import page
3. **Ignore** — Set mappings as inactive if not needed

---

## 8. Error Handling

### 8.1 Result Processing Errors

| Scenario | Adapter Behavior |
|----------|-----------------|
| Unknown test number in OBX-3 | Log warning with test number and name, skip result, process remaining |
| Unmatched barcode in OBR-2 | Hold all results for that barcode in pending queue, display on Import page |
| OBX-2 = ST (qualitative result) | Store as text result, do not attempt numeric range comparison |
| Result value contains `>` or `<` | Store as text (over-linearity), flag for manual review |
| MSH-16 = 1 (calibration) | Log and discard (not needed by LIS) |
| Duplicate Message Control ID | Treat as retransmission, deduplicate |
| Empty OBX-5 | Log warning, skip result |

### 8.2 Communication Errors

| Error | OpenELIS Behavior |
|-------|------------------|
| Connection lost mid-message | Hold partial results, log incomplete transmission |
| ACK timeout (configurable, default 30s) | Analyzer will resend; OpenELIS should deduplicate on Message Control ID |
| Malformed MLLP framing | Log raw bytes, reject message, wait for next valid SB |

### 8.3 ACK Response Construction

For every ORU^R01 received, immediately respond with ACK^R01:

**Success:**
```
<VT>MSH|^~\&|||Mindray|BS-200|{timestamp}||ACK^R01|{echoId}|P|2.3.1||||0||ASCII|||<CR>
MSA|AA|{echoId}|Message accepted|||0|<CR>
<FS><CR>
```

**Rejection:**
```
<VT>MSH|^~\&|||Mindray|BS-200|{timestamp}||ACK^R01|{echoId}|P|2.3.1||||0||ASCII|||<CR>
MSA|AE|{echoId}|Message rejected|||0|<CR>
<FS><CR>
```

- `{echoId}` must match MSH-10 from the incoming ORU^R01
- MSH-4 and MSH-5 must echo the sender's MSH-3 and MSH-4

---

## 9. Validation Datasets

### 9.1 Test Case 1: Normal Single-Test Result (BS-480)

```
<VT>MSH|^~\&|Mindray|BS-480|||20250220141530||ORU^R01|1|P|2.3.1||||0||ASCII|||<CR>
PID|1|101||3|Sari^Dewi||19780512000000|F|||||||||||||||||||||||<CR>
OBR|1|LAB-2025-00201|5|Mindray^BS-480|N||20250220141530||||||serum|||||||||||||||||||||||||||||||||<CR>
OBX|1|NM|1|GLU|95.000000|mg/dL|70-100|N|||F|||||||<CR>
<FS><CR>
```

**Expected:** Parse barcode `LAB-2025-00201`, test ID `1` → Glucose, result `95.000000` mg/dL, flag Normal.

### 9.2 Test Case 2: BS-200 Glucose Result

```
<VT>MSH|^~\&|Mindray|BS-200|||20250220141530||ORU^R01|1|P|2.3.1||||0||ASCII|||<CR>
PID|1|101||2|Rakoto^Fara||19850512000000|F|||||||||||||||||||||||<CR>
OBR|1|LAB-2025-00401|6|Mindray^BS-200|N||20250220141530||||||serum|||||||||||||||||||||||||||||||||<CR>
OBX|1|NM|1|GLU|95.000000|mg/dL|70-100|N|||F|||||||<CR>
<FS><CR>
```

**Expected:** Adapter parses MSH-4 = `BS-200`, matches to registered analyzer "Mindray BS-200". Result extracted same as any other BS-series model.

### 9.3 Test Case 3: Abnormal Result — Elevated Glucose

```
<VT>MSH|^~\&|Mindray|BS-480|||20250220150100||ORU^R01|15|P|2.3.1||||0||ASCII|||<CR>
PID|15|456||3|Ahmad^Rizky||19720618000000|M|||||||||||||||||||||||<CR>
OBR|1|LAB-2025-00203|5|Mindray^BS-480|N||20250220150100||||||serum|||||||||||||||||||||||||||||||||<CR>
OBX|1|NM|1|GLU|485.000000|mg/dL|70-100|H|||F|||||||<CR>
<FS><CR>
```

**Expected:** Result `485.000000`, flag `H` (High). Critical value alert if configured.

### 9.4 Test Case 4: QC Result

```
<VT>MSH|^~\&|Mindray|BS-200|||20250220060015||ORU^R01|1|P|2.3.1||||2||ASCII|||<CR>
OBR|1|1|GLU|Mindray^BS-200||20250220060015|||||||CTRL-Normal|LOT-2025-001|20260101000000||M|100.000000|3.500000|98.200000|mg/dL|||||||||||||||||||||||||||<CR>
<FS><CR>
```

**Expected:** MSH-16 = `2` → route to QC module. Extract: control=CTRL-Normal, lot=LOT-2025-001, level=M, mean=100, SD=3.5, result=98.2 mg/dL.

### 9.5 Test Case 5: Over-Linearity Result

```
<VT>MSH|^~\&|Mindray|BS-480|||20250220160000||ORU^R01|20|P|2.3.1||||0||ASCII|||<CR>
PID|20|789||1|Rina^Volana||19950830000000|F|||||||||||||||||||||||<CR>
OBR|1|LAB-2025-00205|5|Mindray^BS-480|N||20250220160000||||||serum|||||||||||||||||||||||||||||||||<CR>
OBX|1|ST|1|GLU|>500|mg/dL|70-100|H|||F|||||||<CR>
<FS><CR>
```

**Expected:** OBX-2 = `ST` (string). Store result as text `>500`, do NOT attempt numeric parsing. Flag for manual review.

### 9.6 Test Case 6: Order Download Query

```
<VT>MSH|^~\&|Mindray|BS-200|||20250220141500||QRY^Q02|1|P|2.3.1||||||ASCII|||<CR>
QRD|20250220141500|R|D|1|||RD|LAB-2025-00201|OTH|||T|<CR>
QRF|BS-200|20250220141500|20250220141500|||RCT|COR|ALL||<CR>
<FS><CR>
```

**Expected Response (found):**
```
<VT>MSH|^~\&|||Mindray|BS-200|20250220141500||QCK^Q02|1|P|2.3.1||||||ASCII|||<CR>
MSA|AA|1|Message accepted|||0|<CR>
ERR|0|<CR>
QAK|SR|OK|<CR>
<FS><CR>
```

Followed by DSR^Q03 with patient demographics and ordered tests in DSP segments.

### 9.7 Validation Checklist

| # | Test | Expected Result | Pass |
|---|------|----------------|------|
| 1 | Normal GLU result (BS-480) | Parsed, stored, flagged N | ⬜ |
| 2 | Normal GLU result (BS-200) | Parsed from BS-200 sender, stored correctly | ⬜ |
| 3 | Abnormal GLU (critical high) | Stored, flagged H, alert triggered | ⬜ |
| 4 | Multi-test same barcode | All results aggregated to single sample | ⬜ |
| 5 | QC result (MSH-16=2) | Routed to QC module, not patient | ⬜ |
| 6 | QC fields parsed | Control name, lot, level, mean, SD, result extracted | ⬜ |
| 7 | Calibration (MSH-16=1) | Logged and discarded | ⬜ |
| 8 | Over-linearity (>500) | Stored as text, flagged for review | ⬜ |
| 9 | Qualitative result (ST) | Stored as text | ⬜ |
| 10 | Unmapped test number | Warning logged, other results still processed | ⬜ |
| 11 | Unmatched barcode | Held in pending queue | ⬜ |
| 12 | Duplicate message ID | Deduplicated | ⬜ |
| 13 | Order query (single barcode) | QCK + DSR sent with correct DSP sequence | ⬜ |
| 14 | Order query (batch) | Multiple DSR messages with DSC pagination | ⬜ |
| 15 | Query cancellation (CAN) | DSR transmission stops | ⬜ |
| 16 | ISE electrolytes (Na/K/Cl) | Parsed same as chemistry results | ⬜ |
| 17 | Serum indices (H/L/I) | Stored or flagged per site config | ⬜ |
| 18 | BS-200 registration in Admin | Analyzer selectable in dropdown, tag displays | ⬜ |

---

## 10. OpenELIS Configuration Guide

### 10.1 Prerequisites

| Item | Description |
|------|-------------|
| **BS-series analyzer** | Any model from Section 1.1, with LIS/HL7 interface enabled |
| **Network cable** | Ethernet cable connecting analyzer to lab network |
| **OpenELIS server** | With HL7 MLLP Listener Service (OGC-325) running |
| **Assigned port** | Unique TCP port for this analyzer instance |
| **Admin access** | OpenELIS administrator credentials |

### 10.2 Analyzer-Side Configuration

On the BS-series instrument, navigate to **Utility → Communication Setup** (or **Setup → LIS** depending on firmware):

| Parameter | Value |
|-----------|-------|
| LIS Interface | Enabled |
| Protocol | HL7 |
| Connection | TCP/IP Client |
| Server IP | OpenELIS server IP address |
| Server Port | Assigned port (e.g., 5001) |
| Auto-Upload | Enabled (sends results automatically after validation) |
| Bidirectional | Enable if order download is desired |

### 10.3 OpenELIS Analyzer Registration

Navigate to **Admin → Analyzer Administration → Add Analyzer:**

| Field | Value |
|-------|-------|
| `label.analyzer.name` | *(e.g., Mindray BS-200)* |
| `label.analyzer.description` | `label.analyzer.mindray.bsSeries.description` |
| `label.analyzer.protocol` | HL7 v2.3.1 (MLLP) |
| `label.analyzer.connectionType` | TCP/IP |
| `label.analyzer.port` | *(assigned port)* |
| `label.analyzer.senderMatch` | *(MSH-4 value, e.g., BS-200)* |
| `label.analyzer.active` | true |

#### Example: Registering a BS-200

| Field | Value |
|-------|-------|
| Name | `Mindray BS-200` |
| Description | `Mindray BS-200 Clinical Chemistry Analyzer` |
| Protocol | `HL7 v2.3.1 (MLLP)` |
| Connection Type | `TCP/IP` |
| Port | `5001` |
| MSH-4 Match | `BS-200` |
| Active | `Yes` |

> **Multi-analyzer strategy:** If a lab has multiple BS-series instruments (e.g., BS-200 and BS-480), register each as a separate analyzer with unique ports. Both use the same adapter code — no code changes needed.

### 10.4 Test Mapping Configuration

Navigate to **Admin → Analyzer Administration → [Analyzer Name] → Test Mappings:**

Enter each numeric test ID from Section 4 that the site performs. Only map tests that are actually ordered — unmapped test codes will be logged and skipped.

### 10.5 QC Configuration

QC routing is automatic via MSH-16 = `2`. No sample ID pattern matching is needed. Configure QC control materials and Westgard rules in the QC module as usual.

---

## 11. Daily Operation Workflow

### 11.1 Start of Day

1. Power on the BS-series analyzer and allow self-test/warm-up
2. Verify Ethernet cable is connected
3. Confirm the OpenELIS HL7 MLLP Listener is running (check **Admin → System Status**)
4. Run QC controls — results auto-route to QC module via MSH-16 = `2`
5. Review QC in OpenELIS QC dashboard before releasing patient results

### 11.2 Running Patient Samples

1. Place sample with barcode on the analyzer rack
2. The analyzer scans the barcode and (if bidirectional) queries OpenELIS for ordered tests
3. Tests run automatically
4. Results auto-transmit to OpenELIS via HL7
5. Results appear on the **Analyzer Results Import** page for review and acceptance
6. Technician reviews, accepts, or rejects results

### 11.3 Troubleshooting

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| No results in OpenELIS | MLLP listener not running | Check Admin → System Status, restart service |
| No results in OpenELIS | Network cable disconnected | Check physical connection |
| No results in OpenELIS | Port mismatch | Verify analyzer port matches OpenELIS listener config |
| Results in unmatched queue | Barcode not in OpenELIS | Verify sample was ordered; manually match if needed |
| "Unknown test code" in log | Test mapping not configured | Add missing numeric ID in Analyzer Administration |
| QC appearing as patient | Firmware sending wrong MSH-16 | Check analyzer firmware version; contact Mindray service |
| Garbled messages in log | Character set mismatch | Verify ASCII encoding on both sides |
| Partial results | Connection dropped mid-batch | Check network stability; results will re-aggregate on retry |

---

## 12. Localization Tags

### 12.1 Analyzer Registration Tags

| Tag | English Default |
|-----|----------------|
| `label.analyzer.mindray.bsSeries` | Mindray BS-Series |
| `label.analyzer.mindray.bsSeries.description` | Clinical Chemistry Analyzer (HL7) |
| `label.analyzer.mindray.bs120` | Mindray BS-120 |
| `label.analyzer.mindray.bs130` | Mindray BS-130 |
| `label.analyzer.mindray.bs180` | Mindray BS-180 |
| `label.analyzer.mindray.bs190` | Mindray BS-190 |
| **`label.analyzer.mindray.bs200`** | **Mindray BS-200** |
| `label.analyzer.mindray.bs220` | Mindray BS-220 |
| `label.analyzer.mindray.bs200e` | Mindray BS-200E |
| `label.analyzer.mindray.bs220e` | Mindray BS-220E |
| `label.analyzer.mindray.bs240` | Mindray BS-240 |
| `label.analyzer.mindray.bs240pro` | Mindray BS-240 Pro |
| `label.analyzer.mindray.bs330` | Mindray BS-330 |
| `label.analyzer.mindray.bs350` | Mindray BS-350 |
| `label.analyzer.mindray.bs330e` | Mindray BS-330E |
| `label.analyzer.mindray.bs350e` | Mindray BS-350E |
| `label.analyzer.mindray.bs360e` | Mindray BS-360E |
| `label.analyzer.mindray.bs480` | Mindray BS-480 |
| `label.analyzer.mindray.bs800` | Mindray BS-800 |
| `label.analyzer.mindray.bs800m` | Mindray BS-800M |
| `label.analyzer.mindray.bs2000m` | Mindray BS-2000M |

### 12.2 Protocol & Connection Tags

| Tag | English Default |
|-----|----------------|
| `label.analyzer.protocol.hl7` | HL7 v2.3.1 (MLLP) |
| `label.analyzer.connection.tcp` | TCP/IP |
| `label.analyzer.hl7.messageAccepted` | Message accepted |
| `label.analyzer.hl7.messageRejected` | Message rejected |
| `label.analyzer.hl7.ackTimeout` | Acknowledgment timeout |

### 12.3 Result & QC Tags

| Tag | English Default |
|-----|----------------|
| `label.analyzer.qcResult` | Quality Control Result |
| `label.analyzer.patientResult` | Patient Result |
| `label.analyzer.calibrationResult` | Calibration Result |
| `label.analyzer.unmappedTest` | Unmapped test number received |
| `label.analyzer.unmatchedSample` | Sample barcode not found in system |
| `label.analyzer.overLinearity` | Result exceeds analyzer linearity |
| `label.analyzer.serumIndex.hemolysis` | Hemolysis Index |
| `label.analyzer.serumIndex.lipemia` | Lipemia Index |
| `label.analyzer.serumIndex.icterus` | Icterus Index |
| `label.analyzer.serumIndex.warning` | Sample quality concern detected |

---

## 13. Risks and Open Questions

| # | Item | Impact | Resolution |
|---|------|--------|------------|
| 1 | MSH-4 string variations by model | BS-200 might send `BS-200`, `BS200`, or `BS-200E` | Capture live HL7 during commissioning; update Analyzer Admin registration to match |
| 2 | Numeric test IDs are site-configurable | ID `1` = Glucose at one site but might differ at another | Document analyzer test ID assignments during commissioning |
| 3 | ISE module availability | Not all models have ISE; Na/K/Cl may not transmit | Verify ISE module presence before mapping electrolyte tests |
| 4 | Unit convention mismatch | Analyzer may be set to SI units while OpenELIS expects conventional | Verify unit settings during commissioning |
| 5 | Result aggregation timeout | How long to wait before displaying partial results? | Configure timeout (recommend 60s) in MLLP listener |
| 6 | Firmware version differences | Older firmware may have message structure differences | Confirm firmware version ≥ Interface Manual v5 compatibility |

---

## 14. Related Specifications

| Document | Description |
|----------|-------------|
| HL7 MLLP Listener FRS (OGC-325) | Generic HL7 listener — shared infrastructure |
| Mindray BC-5380 Integration Spec v2.0 (OGC-327) | Hematology analyzer — same HL7 protocol, different message structure |
| Analyzer Results Import Page FRS | QC-first workflow for reviewing imported results |
| Test Catalog FRS v2 | Test definitions, LOINC mapping, and analyzer code configuration |
| Non-Conformity Event FRS | NCE workflow triggered when QC fails |
| System Audit Trail FRS | Tracks result receipt and acceptance events |

---

## 15. Acceptance Criteria

* [ ] Adapter registered for Mindray BS-series in HL7 MLLP listener (OGC-325)
* [ ] Adapter accepts HL7 messages from any BS-series model — MSH-4 is NOT hardcoded
* [ ] ORU^R01 patient result messages parsed: barcode (OBR-2), test number (OBX-3), result (OBX-5), unit (OBX-6), flags (OBX-8)
* [ ] Multiple ORU messages for same barcode aggregated into single sample result set
* [ ] Numeric test ID mapping configurable in Analyzer Management UI
* [ ] QC results identified by MSH-16 = `2` and routed to QC module
* [ ] QC fields parsed: control name (OBR-13), lot (OBR-14), level (OBR-17), mean (OBR-18), SD (OBR-19), result (OBR-20)
* [ ] Calibration results (MSH-16 = `1`) logged and discarded
* [ ] Qualitative results (OBX-2 = ST) stored as text
* [ ] Over-linearity results (`>`, `<`) stored as text and flagged
* [ ] Unmapped test numbers logged with warning, other results still processed
* [ ] Unmatched barcodes held in pending queue
* [ ] Bidirectional: QRY^Q02 queries parsed and responded to with QCK/DSR messages (if enabled)
* [ ] Bidirectional: DSP segments built in correct 29-field sequence
* [ ] Bidirectional: Batch query pagination with DSC segment
* [ ] Bidirectional: Query cancellation (QRD-9 = CAN) handled
* [ ] Parsed results appear on Analyzer Import review page for technician acceptance
* [ ] BS-200 test message (Section 9.2) parses correctly
* [ ] BS-200 can be registered as separate analyzer instance in Analyzer Administration
* [ ] Localization tag `label.analyzer.mindray.bs200` displays correctly in analyzer dropdown
* [ ] All UI labels use localization keys (no hardcoded strings)

---

## 16. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-02-20 | Casey / Claude | Initial draft — incorrectly described as ASTM E1394 |
| 2.0 | 2025-02-20 | Casey / Claude | Major revision: Corrected to HL7 v2.3.1 based on Mindray Host Interface Manual v5. Complete rewrite of message structure, QC handling, bidirectional flow. |
| **2.1** | **2026-02-24** | **Casey / Claude** | **Combined FRS: Merged integration spec + companion guide into single document. Expanded MSH-4 sender table from 7 to 19 models. Added all localization tags for every BS-series model including BS-200. Added BS-200 validation test message and registration example. Added acceptance criteria for non-hardcoded MSH-4 matching. Added MSH-4 string variation risk.** |
