# Mindray BS-Series Chemistry Analyzers — HL7 v2.3.1 Integration Specification

**Version:** 2.0
**Date:** 2025-02-20
**Status:** Draft — Ready for Development Review
**Protocol:** HL7 v2.3.1 over TCP/IP (MLLP)
**Confidence:** High — Based on Mindray Host Interface Manual v5
**Applicable Models:** BS-120, BS-130, BS-180, BS-190, BS-200, BS-220, BS-200E, BS-220E, BS-330, BS-350, BS-330E, BS-350E, BS-360E, BS-480, BS-800, BS-800M, BS-2000M

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

> **IMPORTANT — Protocol Correction:** Previous versions of this spec incorrectly described ASTM E1394/LIS2-A2 as the communication protocol. The actual Mindray BS-series chemistry analyzer protocol is **HL7 v2.3.1** over TCP/IP, as documented in the official Mindray Host Interface Manual. This is a different protocol from the Mindray BC-5380 hematology analyzer (which uses ASTM).

### 1.1 Model Throughput Reference

| Model | Throughput | ISE Module | Notes |
|-------|-----------|------------|-------|
| BS-120 / BS-130 | Up to 120/200 T/H | Optional | Entry-level, documented in Interface Manual v5 |
| BS-180 / BS-190 | Up to 180/200 T/H | Optional | Entry-level |
| BS-200 / BS-220 | Up to 200/200 T/H | Optional | Mid-range, documented in Interface Manual v5 |
| BS-200E / BS-220E | Up to 200/200 T/H | Optional | Enhanced versions |
| BS-330 / BS-350 | Up to 330/400 T/H | Optional | Mid-range, documented in Interface Manual v5 |
| BS-330E / BS-350E | Up to 330/400 T/H | Optional | Enhanced versions |
| BS-360E | Up to 360 T/H | Optional | Mid-range |
| BS-480 | Up to 400 T/H | Optional | Mid-range — likely same HL7 protocol |
| BS-800 / BS-800M | Up to 800/1200 T/H | Optional | High throughput — likely same HL7 protocol |
| BS-2000M | Up to 2000 T/H | Integrated | Flagship modular — likely same HL7 protocol |

> **Note on newer models:** The Interface Manual v5 explicitly covers BS-120 through BS-350E. The BS-480, BS-800, and BS-2000M are newer models that almost certainly use the same HL7 v2.3.1 protocol (Mindray has been consistent across the BS platform). Confirm with Mindray service engineer for the exact firmware version of your analyzer.

### 1.2 Reportable Parameters

Same as previously documented (see Section 4 for full test code mapping). The chemistry test menu depends on reagent kits loaded, not on the analyzer model.

---

## 2. Communication Architecture

### 2.1 Connection Model

The Mindray BS-series uses **HL7 v2.3.1 over TCP/IP** — this is fundamentally different from the ASTM-based connections used by the Mindray BC-5380 hematology analyzer. OpenELIS must implement an **HL7 MLLP listener** (not an ASTM listener) for these instruments.

```
┌──────────────┐      HL7 v2.3.1 / MLLP    ┌──────────────────────┐
│  BS-xxx      │ ───────────────────────── │  OpenELIS HL7        │
│  Chemistry   │   TCP/IP                  │  MLLP Listener       │
│  Analyzer    │ ◄───────────────────────  │                      │
│              │   (bidirectional)          │  → HL7 Parser        │
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
| Port | Configurable (default site-specific) |
| Connection Mode | Analyzer connects to OpenELIS (client mode) |
| Character Set | ASCII (ISO 8859-1, hex 20-FF plus CR) |

> **No RS-232 serial option.** Unlike the BC-5380 hematology analyzer, the BS-series chemistry interface is TCP/IP only per the Mindray HL7 Interface Manual.

### 2.4 HL7 Message Types

The interface uses 5 HL7 message types:

| Message | Direction | Purpose |
|---------|-----------|---------|
| `ORU^R01` | Analyzer → OpenELIS | Send test results (patient, QC, or calibration) |
| `ACK^R01` | OpenELIS → Analyzer | Acknowledge receipt of results |
| `QRY^Q02` | Analyzer → OpenELIS | Query for pending orders (by barcode or batch) |
| `QCK^Q02` | OpenELIS → Analyzer | Acknowledge query (data found / not found) |
| `DSR^Q03` | OpenELIS → Analyzer | Send sample/order information (order download) |
| `ACK^Q03` | Analyzer → OpenELIS | Acknowledge receipt of order data |

### 2.5 Result Upload Flow (Analyzer → OpenELIS)

**Critical: Each test result is sent as a separate ORU^R01 message.** A sample with 10 tests generates 10 individual HL7 messages, each requiring an ACK^R01 response.

```
BS-Series                           OpenELIS
   │                                    │
   │ ──── <SB>ORU^R01<EB><CR> ───────► │  Result 1 (e.g., GLU)
   │ ◄─── <SB>ACK^R01<EB><CR> ──────── │  Acknowledge
   │                                    │
   │ ──── <SB>ORU^R01<EB><CR> ───────► │  Result 2 (e.g., BUN)
   │ ◄─── <SB>ACK^R01<EB><CR> ──────── │  Acknowledge
   │                                    │
   │ ──── <SB>ORU^R01<EB><CR> ───────► │  Result 3 (e.g., CREA)
   │ ◄─── <SB>ACK^R01<EB><CR> ──────── │  Acknowledge
   │                                    │
   │      ... (one message per test)    │
```

### 2.6 Order Download Flow (Bidirectional)

**Single sample query (real-time, on barcode scan):**

```
BS-Series                           OpenELIS
   │                                    │
   │ ──── QRY^Q02 ──────────────────► │  Query by barcode
   │ ◄─── QCK^Q02 ──────────────────  │  Query ack (OK or NF)
   │ ◄─── DSR^Q03 ──────────────────  │  Sample + test info (if found)
   │ ──── ACK^Q03 ──────────────────► │  Acknowledge data
```

**Batch query (all samples for the day):**

```
BS-Series                           OpenELIS
   │                                    │
   │ ──── QRY^Q02 (no barcode) ─────► │  Query by time range
   │ ◄─── QCK^Q02 ──────────────────  │  Query ack
   │ ◄─── DSR^Q03 (sample 1) ───────  │  First sample
   │ ──── ACK^Q03 ──────────────────► │
   │ ◄─── DSR^Q03 (sample 2) ───────  │  Second sample
   │ ──── ACK^Q03 ──────────────────► │
   │ ◄─── DSR^Q03 (sample N, DSC="") ─│  Last sample (empty DSC = end)
   │ ──── ACK^Q03 ──────────────────► │
```

### 2.7 Query Cancellation

The analyzer can cancel a batch download in progress by sending a QRY^Q02 with `QRD-9 = CAN` (instead of `OTH`). OpenELIS should stop sending DSR messages after completing the current one.

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

Present in every message. Key fields:

| Field # | Name | Value / Usage |
|---------|------|---------------|
| MSH-1 | Field Separator | `\|` |
| MSH-2 | Encoding Characters | `^~\&` |
| MSH-3 | Sending Application | Manufacturer name (e.g., `Mindray`) |
| MSH-4 | Sending Facility | Model name (e.g., `BS-480`) |
| MSH-5 | Receiving Application | Empty (reserved) |
| MSH-6 | Receiving Facility | Empty (reserved) |
| MSH-7 | Date/Time | `YYYYMMDDHHmmss` |
| MSH-9 | Message Type | `ORU^R01`, `ACK^R01`, `QRY^Q02`, `QCK^Q02`, `DSR^Q03`, `ACK^Q03` |
| MSH-10 | Message Control ID | Sequential integer, unique per message. **Returned unchanged in ACK** |
| MSH-11 | Processing ID | `P` (production) |
| MSH-12 | Version ID | `2.3.1` |
| **MSH-16** | **App Ack Type** | **`0` = Patient result, `1` = Calibration, `2` = QC result, empty = non-ORU** |
| MSH-18 | Character Set | `ASCII` |

> **MSH-16 is critical for QC identification.** OpenELIS uses this field to distinguish patient results from QC results — NOT sample ID pattern matching.

**Example (patient result):**
```
MSH|^~\&|Mindray|BS-480|||20250220141530||ORU^R01|1|P|2.3.1||||0||ASCII|||
```

**Example (QC result):**
```
MSH|^~\&|Mindray|BS-480|||20250220060015||ORU^R01|1|P|2.3.1||||2||ASCII|||
```

### 3.3 PID — Patient Identification Segment

Only present in patient result ORU^R01 messages (MSH-16 = 0).

| Field # | Name | Usage |
|---------|------|-------|
| PID-1 | Set ID | Sequential integer |
| PID-2 | Patient ID | Patient admission/hospital number |
| PID-3 | Patient Identifier List | Medical record number |
| PID-4 | Alternate Patient ID | Bed number |
| PID-5 | Patient Name | Patient name |
| PID-7 | Date/Time of Birth | `YYYYMMDDHHmmss` |
| PID-8 | Sex | `M`, `F`, `O` |
| PID-9 | Patient Alias | Blood type (`O`, `A`, `B`, `AB`) |

**Example:**
```
PID|1|854||12|Putri^Amelia||19880922000000|F|A||||||||||||||||||||||
```

### 3.4 OBR — Observation Request Segment

#### For Patient Results (MSH-16 = 0):

| Field # | Name | Usage |
|---------|------|-------|
| OBR-1 | Set ID | Sequential integer |
| OBR-2 | Placer Order Number | **Sample barcode** |
| OBR-3 | Filler Order Number | Sample ID (internal to analyzer) |
| OBR-4 | Universal Service ID | `Mindray^BS-480` (Manufacturer^Model) |
| OBR-5 | Priority | `Y` = STAT, `N` = Routine |
| OBR-7 | Observation Date/Time | Testing date/time |
| OBR-13 | Relevant Clinical Info | Clinical diagnosis |
| OBR-15 | Specimen Source | Sample type (`serum`, `plasma`, `urine`, etc.) |
| OBR-16 | Ordering Provider | Sender / ordering doctor |
| OBR-18 | Placer Field 1 | Sample characteristics (icterus, hemolysis, lipemia) |
| OBR-20 | Filler Field 1 | Attending doctor |
| OBR-21 | Filler Field 2 | Treatment department |

**Example:**
```
OBR|1|LAB-2025-00201|2|Mindray^BS-480|N||20250220141530||||||serum|||||||||||||||||||||||||||||||||
```

#### For QC Results (MSH-16 = 2):

OBR fields are repurposed for QC-specific data:

| Field # | Name | QC Usage |
|---------|------|----------|
| OBR-2 | Placer Order Number | **Test number** |
| OBR-3 | Filler Order Number | **Test name** |
| OBR-6 | Requested Date/Time | QC date/time |
| OBR-13 | Relevant Clinical Info | **Control name** |
| OBR-14 | Specimen Received | **Lot number** |
| OBR-15 | Specimen Source | **Expiration date** |
| OBR-17 | Order Callback Phone | **Concentration level** (`H`, `M`, `L`) |
| OBR-18 | Placer Field 1 | **Mean value (mean concentration)** |
| OBR-19 | Placer Field 2 | **Standard deviation** |
| OBR-20 | Filler Field 1 | **Test result (concentration)** |
| OBR-21 | Filler Field 2 | **Unit** |

**Example:**
```
OBR|1|1|GLU|Mindray^BS-480||20250220060143|||||||CTRL-Normal|LOT-2025-001|20260101000000||M|100.000000|3.500000|98.200000|mg/dL|||||||||||||||||||||||||||
```

### 3.5 OBX — Observation/Result Segment

Only present in patient result messages. **One OBX per ORU message.**

| Field # | Name | Usage |
|---------|------|-------|
| OBX-1 | Set ID | Sequential integer |
| OBX-2 | Value Type | `NM` (numeric) for quantitative, `ST` (string) for qualitative |
| OBX-3 | Observation Identifier | **Test number (integer as string)** — this is the primary test identifier |
| OBX-4 | Observation Sub-ID | Test name (informational only, do not use for mapping) |
| OBX-5 | Observation Value | Test result (concentration, or `+`/`-`/`+-` for qualitative) |
| OBX-6 | Units | Unit of test result |
| OBX-7 | References Range | Reference range string |
| OBX-8 | Abnormal Flags | Abnormal flag (user-configurable on analyzer) |
| OBX-11 | Observe Result Status | `F` (final result) |
| OBX-13 | User Defined | Original result (before any correction) |
| OBX-14 | Date/Time of Observation | Testing date/time |
| OBX-16 | Responsible Observer | Tester name |

**Example (quantitative):**
```
OBX|1|NM|2|GLU|92.000000|mg/dL|70-100||||F|||||||
```

**Example (qualitative):**
```
OBX|1|ST|45|HBsAg|-||negative||||F|||||||
```

> **CRITICAL — Test Identification:** The test is identified by the **numeric ID in OBX-3**, NOT by the test name in OBX-4. The test name is informational only. The numeric ID corresponds to the test number configured on the analyzer. The `ItemID.ini` file on the analyzer controls the mapping between internal test numbers and the LIS test numbers. Both systems must agree on the test number mapping.

### 3.6 MSA — Message Acknowledgment Segment

| Field # | Name | Usage |
|---------|------|-------|
| MSA-1 | Acknowledgment Code | `AA` = Accepted, `AE` = Error, `AR` = Rejected |
| MSA-2 | Message Control ID | **Must match MSH-10 of the message being acknowledged** |
| MSA-3 | Text Message | Human-readable description |
| MSA-6 | Error Condition | Numeric status code |

**Status codes:**

| Code | MSA-1 | Description |
|------|-------|-------------|
| 0 | AA | Message accepted |
| 100 | AE | Segment sequence error |
| 101 | AE | Required field missing |
| 102 | AE | Data type error |
| 103 | AE | Table value not found |
| 200 | AR | Unsupported message type |
| 201 | AR | Unsupported event code |
| 202 | AR | Unsupported processing ID |
| 203 | AR | Unsupported version ID |
| 204 | AR | Unknown key identifier |
| 205 | AR | Duplicate key identifier |
| 206 | AR | Application record locked |
| 207 | AR | Application internal error |

**Example (success):**
```
MSA|AA|1|Message accepted|||0|
```

**Example (rejection):**
```
MSA|AR|1|Application record locked|||206|
```

### 3.7 DSR/DSP — Display Response and Data Segments

Used for order download (OpenELIS → Analyzer). The DSP segments carry sample information in a **fixed 29-field sequence**:

| DSP Seq | Data | Type |
|---------|------|------|
| 1 | Admission Number | String |
| 2 | Bed Number | String |
| 3 | Patient Name | String |
| 4 | Date of Birth | String (`YYYYMMDDHHmmss`) |
| 5 | Sex | `M` / `F` / `O` |
| 6 | Blood Type | `O` / `A` / `B` / `AB` |
| 7–14 | Reserved demographics | (typically empty) |
| 15 | Patient Account Number | `Outpatient` / `Inpatient` / `Other` |
| 16 | Social Security Number | `Own` / `Insurance` |
| 17–20 | Reserved | (typically empty) |
| 21 | **Bar Code** | String — **required** |
| 22 | **Sample ID** | Integer — **required** |
| 23 | Sample Time | `YYYYMMDDHHmmss` |
| 24 | STAT | `Y` / `N` |
| 25 | Collection Volume | Float (typically empty) |
| 26 | Sample Type | `serum` / `plasma` / `urine` |
| 27 | Ordering Doctor | String |
| 28 | Ordering Department | String |
| 29+ | **Test Number^Test Name^Unit^Normal Range** | String — **one DSP per test, required** |

**Example DSP segment for a test order:**
```
DSP|29||1^^^|||
DSP|30||3^^^|||
```

> **Test numbers in DSP field 3** must match the test numbers configured on the analyzer. The `^^^` after the test number are empty component separators for test name, unit, and normal range (optional).

The **DSC segment** controls batch pagination: a non-empty DSC field means more DSR messages follow; an empty DSC field signals the end of the batch.

---

## 4. Test Code Mapping — OpenELIS Configuration

### 4.1 Test Identification Architecture

Unlike ASTM-based analyzers that use mnemonic test codes (e.g., `GLU`, `ALT`), the Mindray BS-series uses **numeric test IDs**. The mapping between these IDs and the actual test is configured in the analyzer's `ItemID.ini` file.

**The numeric test ID in OBX-3 is the primary key for mapping.** OpenELIS must map these numeric IDs to OpenELIS test definitions.

> **IMPORTANT:** Test number assignments may vary between analyzer installations. The lab must document the actual test number → chemistry test mapping for their specific analyzer and configure OpenELIS accordingly. The table below provides typical defaults, but these MUST be verified against the actual analyzer configuration.

### 4.2 Typical Test Number Mapping

| Analyzer Test # | Parameter | OpenELIS Test Tag | LOINC | Unit |
|-----------------|-----------|-------------------|-------|------|
| 1 | Glucose (GLU) | `label.test.glucose` | 2345-7 | mg/dL |
| 2 | BUN | `label.test.bun` | 3094-0 | mg/dL |
| 3 | Creatinine (CREA) | `label.test.creatinine` | 2160-0 | mg/dL |
| 4 | Uric Acid (UA) | `label.test.uricAcid` | 3084-1 | mg/dL |
| 5 | Total Protein (TP) | `label.test.totalProtein` | 2885-2 | g/dL |
| 6 | Albumin (ALB) | `label.test.albumin` | 1751-7 | g/dL |
| 7 | Total Bilirubin (TBIL) | `label.test.totalBilirubin` | 1975-2 | mg/dL |
| 8 | Direct Bilirubin (DBIL) | `label.test.directBilirubin` | 1968-7 | mg/dL |
| 9 | ALT (SGPT) | `label.test.alt` | 1742-6 | U/L |
| 10 | AST (SGOT) | `label.test.ast` | 1920-8 | U/L |
| 11 | ALP | `label.test.alp` | 6768-6 | U/L |
| 12 | GGT | `label.test.ggt` | 2324-2 | U/L |
| 13 | LDH | `label.test.ldh` | 2532-0 | U/L |
| 14 | Total Cholesterol (CHOL) | `label.test.totalCholesterol` | 2093-3 | mg/dL |
| 15 | Triglycerides (TG) | `label.test.triglycerides` | 2571-8 | mg/dL |
| 16 | HDL Cholesterol | `label.test.hdl` | 2085-9 | mg/dL |
| 17 | LDL Cholesterol | `label.test.ldl` | 13457-7 | mg/dL |
| 18 | CK | `label.test.ck` | 2157-6 | U/L |
| 19 | CK-MB | `label.test.ckmb` | 13969-1 | U/L |
| 20 | Amylase (AMY) | `label.test.amylase` | 1798-8 | U/L |
| 21 | Calcium (Ca) | `label.test.calcium` | 17861-6 | mg/dL |
| 22 | Magnesium (Mg) | `label.test.magnesium` | 19123-9 | mg/dL |
| 23 | Phosphorus (IP) | `label.test.phosphorus` | 2777-1 | mg/dL |
| 24 | Iron (Fe) | `label.test.iron` | 2498-4 | µg/dL |
| 25 | CRP | `label.test.crp` | 1988-5 | mg/L |
| 26 | HbA1c | `label.test.hba1c` | 4548-4 | % |
| 100+ | Calculated tests | Site-specific | — | Varies |
| ISE-1 | Sodium (Na) | `label.test.sodium` | 2951-2 | mEq/L |
| ISE-2 | Potassium (K) | `label.test.potassium` | 2823-3 | mEq/L |
| ISE-3 | Chloride (Cl) | `label.test.chloride` | 2075-0 | mEq/L |

> **Note:** Test numbers 100+ are typically used for calculated tests (formulas defined on the analyzer, e.g., A/G ratio, LDL by Friedewald). ISE test numbers vary by model. **Verify all test number assignments with the specific analyzer's configuration.**

### 4.3 QC Result Identification

QC results are identified by **MSH-16 = `2`** (not by sample ID pattern). Each QC run transmits one ORU message per control material. The OBR segment carries:

| OBR Field | QC Data |
|-----------|---------|
| OBR-2 | Test number |
| OBR-3 | Test name |
| OBR-6 | QC date/time |
| OBR-13 | Control name |
| OBR-14 | Lot number |
| OBR-15 | Expiration date |
| OBR-17 | Concentration level (`H` / `M` / `L`) |
| OBR-18 | Mean value |
| OBR-19 | Standard deviation |
| OBR-20 | QC result (concentration) |
| OBR-21 | Unit |

OpenELIS should:
1. Check MSH-16: if `2`, route to QC evaluation module
2. Extract control name, lot, level from OBR fields
3. Compare QC result against mean ± SD for Westgard rule evaluation

---

## 5. Sample ID Resolution

### 5.1 Barcode-to-Accession Mapping

The sample barcode is transmitted in **OBR-2** (Placer Order Number). OpenELIS resolves this to an accession number using the same priority as other analyzers:

1. **Direct match** — Barcode value matches an OpenELIS accession number
2. **Tube ID lookup** — Barcode matches a registered tube barcode
3. **Error handling** — Unmatched barcodes flagged for manual resolution

### 5.2 Internal Sample ID

**OBR-3** (Filler Order Number) contains the analyzer's internal sample ID. Per the Mindray documentation: *"Sample ID is for internal use and must not be analyzed by the server."* OpenELIS should store but not rely on this value.

---

## 6. OpenELIS Implementation Requirements

### 6.1 HL7 MLLP Listener

OpenELIS must implement a TCP/IP server that:

1. Listens on a configurable port
2. Accepts MLLP-framed HL7 messages (`<VT>` ... `<FS><CR>`)
3. Parses HL7 v2.3.1 segments (MSH, PID, OBR, OBX)
4. Returns properly formed ACK messages with matching Message Control IDs

### 6.2 ACK Response Requirements

**Every ORU^R01 message must receive an ACK^R01 response.** The analyzer waits for the ACK before sending the next result. If no ACK is received, the analyzer will retry or flag a communication error.

ACK structure:
```
MSH|^~\&|||Mindray|BS-480|20250220141530||ACK^R01|1|P|2.3.1||||0||ASCII|||
MSA|AA|1|Message accepted|||0|
```

**The MSH-10 value in the ACK must match the MSH-10 of the ORU being acknowledged.**

### 6.3 Order Download Implementation (Bidirectional)

If bidirectional mode is enabled, OpenELIS must implement:

1. **QRY^Q02 handler** — Parse query for barcode (QRD-8) or time range (QRF-2, QRF-3)
2. **QCK^Q02 generator** — Respond with OK (data found) or NF (not found)
3. **DSR^Q03 generator** — Build DSP segments in the required 29+ field sequence
4. **ACK^Q03 handler** — Parse acknowledgment from analyzer
5. **Cancel handler** — Stop batch download when QRD-9 = `CAN`

### 6.4 Key Differences from ASTM Implementation

| Aspect | ASTM (BC-5380) | HL7 (BS-Series) |
|--------|---------------|-----------------|
| Protocol | ASTM E1394 / LIS2-A2 | HL7 v2.3.1 |
| Transport | RS-232 or TCP/IP | TCP/IP only |
| Framing | ENQ/ACK/EOT handshake | MLLP (`<VT>` ... `<FS><CR>`) |
| Results per message | Multiple R records in one session | **One test per ORU message** |
| Test identifier | Mnemonic code (e.g., `WBC`) | **Numeric test ID** (e.g., `2`) |
| QC identification | Sample ID pattern (`QC*`) | **MSH-16 field = `2`** |
| Order download | ASTM Query/Response records | QRY/QCK/DSR/ACK messages |
| Acknowledgment | Frame-level ACK (single byte) | Full HL7 ACK message with status codes |

---

## 7. Error Handling

| Scenario | OpenELIS Behavior |
|----------|-------------------|
| **Unknown test number in OBX-3** | Log warning, skip result, flag run with `label.analyzer.unmappedTest` |
| **Unmatched barcode in OBR-2** | Hold in pending queue, display on Analyzer Import page |
| **Malformed HL7 message** | Return ACK with `AE` and error code 100/101/102 |
| **ACK timeout** | Analyzer retries; OpenELIS should be idempotent for duplicate Message Control IDs |
| **Duplicate Message Control ID** | Treat as retransmission; compare with last processed, deduplicate |
| **Connection drop** | Analyzer reconnects automatically; OpenELIS should accept new connections |
| **Qualitative result (OBX-2 = ST)** | Store as text; do not attempt numeric range comparison |
| **Over-linearity result** | Transmitted as string (OBX-2 = ST); store as text, flag for review |

---

## 8. Validation Dataset

### 8.1 Normal Chemistry Result — Single Test (GLU)

```
<VT>MSH|^~\&|Mindray|BS-480|||20250220141530||ORU^R01|1|P|2.3.1||||0||ASCII|||<CR>
PID|1|854||12|Putri^Amelia||19880922000000|F|||||||||||||||||||||||<CR>
OBR|1|LAB-2025-00201|2|Mindray^BS-480|N||20250220141530||||||serum|||||||||||||||||||||||||||||||||<CR>
OBX|1|NM|1|GLU|92.000000|mg/dL|70-100||||F|||||||<CR>
<FS><CR>
```

### 8.2 Normal Chemistry Result — Second Test (BUN, same sample)

```
<VT>MSH|^~\&|Mindray|BS-480|||20250220141530||ORU^R01|2|P|2.3.1||||0||ASCII|||<CR>
PID|2|854||12|Putri^Amelia||19880922000000|F|||||||||||||||||||||||<CR>
OBR|1|LAB-2025-00201|2|Mindray^BS-480|N||20250220141530||||||serum|||||||||||||||||||||||||||||||||<CR>
OBX|1|NM|2|BUN|15.000000|mg/dL|7-20||||F|||||||<CR>
<FS><CR>
```

> **Note the incrementing MSH-10:** Message 1 has `|1|`, message 2 has `|2|`. The ACK for each must echo back the corresponding ID.

### 8.3 Abnormal Result — Elevated Glucose

```
<VT>MSH|^~\&|Mindray|BS-480|||20250220150100||ORU^R01|15|P|2.3.1||||0||ASCII|||<CR>
PID|15|456||3|Ahmad^Rizky||19720618000000|M|||||||||||||||||||||||<CR>
OBR|1|LAB-2025-00203|5|Mindray^BS-480|N||20250220150100||||||serum|||||||||||||||||||||||||||||||||<CR>
OBX|1|NM|1|GLU|485.000000|mg/dL|70-100|H|||F|||||||<CR>
<FS><CR>
```

### 8.4 QC Result

```
<VT>MSH|^~\&|Mindray|BS-480|||20250220060015||ORU^R01|1|P|2.3.1||||2||ASCII|||<CR>
OBR|1|1|GLU|Mindray^BS-480||20250220060015|||||||CTRL-Normal|LOT-2025-001|20260101000000||M|100.000000|3.500000|98.200000|mg/dL|||||||||||||||||||||||||||<CR>
<FS><CR>
```

### 8.5 Expected ACK Response

```
<VT>MSH|^~\&|||Mindray|BS-480|20250220141530||ACK^R01|1|P|2.3.1||||0||ASCII|||<CR>
MSA|AA|1|Message accepted|||0|<CR>
<FS><CR>
```

### 8.6 Order Download — Query

```
<VT>MSH|^~\&|Mindray|BS-480|||20250220141500||QRY^Q02|1|P|2.3.1||||||ASCII|||<CR>
QRD|20250220141500|R|D|1|||RD|LAB-2025-00201|OTH|||T|<CR>
QRF|BS-480|20250220141500|20250220141500|||RCT|COR|ALL||<CR>
<FS><CR>
```

### 8.7 Order Download — Response (found)

```
<VT>MSH|^~\&|||Mindray|BS-480|20250220141500||QCK^Q02|1|P|2.3.1||||||ASCII|||<CR>
MSA|AA|1|Message accepted|||0|<CR>
ERR|0|<CR>
QAK|SR|OK|<CR>
<FS><CR>
```

Followed by:

```
<VT>MSH|^~\&|||Mindray|BS-480|20250220141500||DSR^Q03|1|P|2.3.1||||||ASCII|||<CR>
MSA|AA|1|Message accepted|||0|<CR>
ERR|0|<CR>
QAK|SR|OK|<CR>
QRD|20250220141500|R|D|1|||RD|LAB-2025-00201|OTH|||T|<CR>
QRF|BS-480|20250220141500|20250220141500|||RCT|COR|ALL||<CR>
DSP|1||854|||<CR>
DSP|2||12|||<CR>
DSP|3||Putri^Amelia|||<CR>
DSP|4||19880922000000|||<CR>
DSP|5||F|||<CR>
DSP|6|||||<CR>
DSP|7|||||<CR>
DSP|8|||||<CR>
DSP|9|||||<CR>
DSP|10|||||<CR>
DSP|11|||||<CR>
DSP|12|||||<CR>
DSP|13|||||<CR>
DSP|14|||||<CR>
DSP|15|||||<CR>
DSP|16|||||<CR>
DSP|17|||||<CR>
DSP|18|||||<CR>
DSP|19|||||<CR>
DSP|20|||||<CR>
DSP|21||LAB-2025-00201|||<CR>
DSP|22||2|||<CR>
DSP|23||20250220103000|||<CR>
DSP|24||N|||<CR>
DSP|25|||||<CR>
DSP|26||serum|||<CR>
DSP|27|||||<CR>
DSP|28|||||<CR>
DSP|29||1^^^|||<CR>
DSP|30||2^^^|||<CR>
DSP|31||3^^^|||<CR>
DSC||<CR>
<FS><CR>
```

---

## 9. Localization Tags

| Tag | English Default |
|-----|----------------|
| `label.analyzer.mindray.bsSeries` | Mindray BS-Series |
| `label.analyzer.mindray.bsSeries.description` | Clinical Chemistry Analyzer (HL7) |
| `label.analyzer.protocol.hl7` | HL7 v2.3.1 (MLLP) |
| `label.analyzer.connection.tcp` | TCP/IP |
| `label.analyzer.hl7.messageAccepted` | Message accepted |
| `label.analyzer.hl7.messageRejected` | Message rejected |
| `label.analyzer.hl7.ackTimeout` | Acknowledgment timeout |
| `label.analyzer.qcResult` | Quality Control Result |
| `label.analyzer.patientResult` | Patient Result |
| `label.analyzer.unmappedTest` | Unmapped test number received |
| `label.analyzer.unmatchedSample` | Sample barcode not found in system |

---

## 10. Related Specifications

| Document | Description |
|----------|-------------|
| Mindray Host Interface Manual v5 (BA20-20-75337) | Vendor protocol specification — **primary reference** |
| Mindray BC-5380 Integration Spec | ASTM-based hematology integration (different protocol) |
| Analyzer Results Import Page FRS | QC-first workflow for reviewing imported results |
| Test Catalog FRS v2 | Test definitions and LOINC mapping |

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-02-20 | Casey / Claude | Initial draft (incorrectly described as ASTM) |
| **2.0** | **2025-02-20** | **Casey / Claude** | **Major revision: Corrected to HL7 v2.3.1 based on Mindray Host Interface Manual v5. Complete protocol rewrite including MLLP framing, one-test-per-message architecture, MSH-16 QC discrimination, numeric test IDs, DSP-based order download.** |
