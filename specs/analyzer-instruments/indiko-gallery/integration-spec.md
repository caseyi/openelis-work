# Thermo Scientific Indiko / Gallery — Field Mapping & Integration Specification

**Target Instruments:** Thermo Scientific Indiko Plus, Indiko, Gallery, Gallery Plus  
**Protocol:** CLSI LIS2-A2 (ASTM E1394-97) over CLSI LIS1-A2 (ASTM E1381-95)  
**Transport:** TCP/IP (Socket) or RS-232 Serial  
**OpenELIS Module:** ASTM Analyzer Adapter  
**Version:** 1.0  
**Date:** 2026-02-23  
**Reference Document:** Gallery-Indiko LIS Interface (Document N12027, Revision 5.0, June 2013)

---

## Architectural Note

This is a **Pattern A: ASTM/LIS Direct** instrument. The Indiko/Gallery communicates bidirectionally with OpenELIS using the standard CLSI LIS1-A2 (low-level framing) and CLSI LIS2-A2 (message structure) protocols over TCP/IP or RS-232 serial. OpenELIS already has an ASTM TCP listener in the codebase; this integration defines the instrument-specific message field mapping, test code translation, QC handling, and error flag interpretation needed to configure the existing ASTM handler for these analyzers.

The Indiko and Gallery share the same LIS interface — the vendor publishes a single combined interface manual (N12027). All message formats, field positions, and configuration options are identical across the Indiko, Indiko Plus, Gallery, and Gallery Plus models. The only difference is the instrument name reported in the Header record.

---

## Important: Validation Status

### What is high-confidence

- **ASTM message structure** — documented in detail in the vendor LIS Interface Manual (N12027 Rev 5.0). Record types, field positions, delimiters, and control characters are all specified.
- **Communication protocol** — CLSI LIS1-A / LIS2-A compliance confirmed. Both TCP/IP socket and RS-232 serial transports are documented.
- **Error flag system** — all 40 error flag codes are enumerated in the vendor manual with definitions.
- **Sample ID format** — composite format `SampleID/ManualDilution/Rack/Position` is documented.
- **Bidirectional flow** — host query, order download, and result upload sequences are all documented with examples.
- **Field length limits** — maximum character lengths for all fields are specified.

### What may need adjustment

- **Test code values** — the vendor manual states that test names are configured on the analyzer and must match on both sides. The actual test codes depend on the assay menu installed at each site. The representative test mapping table in this spec uses common clinical chemistry assays, but must be validated against each site's specific analyzer configuration.
- **Character encoding edge cases** — the manual specifies Windows 1252 encoding (supporting ASCII 128-255 for characters like ä, ö, ü, é). The ASTM parser must handle this correctly, particularly for sites using non-English test names.
- **TCP/IP network routing** — the manual documents specific Windows `route` commands needed when the analyzer has a dedicated network card. This may need site-specific adjustment.

### Recommended validation process

1. Connect the analyzer to OpenELIS on a test network
2. Run 3-5 known patient samples and capture the raw ASTM messages (use `lsdebug.txt` on the analyzer side)
3. Confirm field positions and test code values match this spec
4. Run at least one QC sample and verify QC identification
5. Test bidirectional order download and verify the analyzer receives orders correctly
6. Verify error flag handling with at least one flagged result

---

## 1. Overview

### Applicable Instruments

| Model | Discipline | Throughput | Notes |
|-------|-----------|------------|-------|
| Indiko | Clinical Chemistry | Up to 200 tests/hr | Photometric + ISE |
| Indiko Plus | Clinical Chemistry | Up to 300 tests/hr | Photometric + ISE |
| Gallery | Clinical Chemistry | Up to 200 tests/hr | Discrete photometric |
| Gallery Plus | Clinical Chemistry | Up to 300 tests/hr | Discrete photometric |

All four models use the same LIS interface protocol and message format.

### Data Flow

```
  ┌────────────────────────────────────────┐
  │  Thermo Indiko / Gallery Analyzer      │
  │  - Sample barcode scan                 │
  │  - Photometric / ISE measurement       │
  │  - On-board calibration & QC           │
  │  - Result calculation                  │
  └──────────┬──────────┬─────────────────┘
             │          │
     TCP/IP Socket   RS-232 Serial
     (default)       (alternative)
             │          │
  ┌──────────▼──────────▼─────────────────┐
  │  OpenELIS Global ASTM Listener         │
  │  - LIS1-A2 framing (STX/ETX/EOT)      │
  │  - LIS2-A2 message parsing             │
  │  - Instrument-specific adapter         │
  │    (Indiko/Gallery configuration)      │
  └──────────┬────────────────────────────┘
             │
  ┌──────────▼────────────────────────────┐
  │  OpenELIS Global                       │
  │  - Sample matching (accession number)  │
  │  - Test code → OE test mapping         │
  │  - QC sample extraction & evaluation   │
  │  - Result review & validation          │
  │  - Reporting                           │
  └────────────────────────────────────────┘
```

### Bidirectional Communication Flow

The Indiko/Gallery supports full bidirectional communication:

```
  Analyzer                                   OpenELIS
  ────────                                   ────────
  
  ── New sample scanned ──────────────────►
     Host Query (Q record)                   Lookup sample
                                              in OpenELIS
  ◄─────────────────── Order Download ──────
     Patient info (P record)
     Test orders (O record)
     
  ── Run tests ───────────────────────────►
     Results (R records)                     Parse & store
     Error flags (C records)                 results
  
  ◄─────────────────── ACK ─────────────────
```

---

## 2. Connection Layer

### 2.1 Transport Options

| Parameter | TCP/IP (Recommended) | RS-232 Serial |
|-----------|---------------------|---------------|
| Physical | Ethernet (dedicated NIC recommended) | 9-pin D-connector (pins 2, 3, 5) |
| Protocol | Windows TCP Sockets | Direct serial |
| Baud rate | N/A | 9600 (default) |
| Data bits | N/A | 8 |
| Start/Stop bits | N/A | 1 / 1 |
| Parity | N/A | None |
| Flow control | N/A | None |

### 2.2 TCP/IP Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| Socket type | TCP stream | Windows Sockets implementation |
| Analyzer role | Client or Server | Configurable |
| Port | Configurable | Assign unique port per analyzer |
| Network card | Dedicated NIC recommended | Requires `route` command for proper card selection |
| IP addressing | Static | DHCP not recommended for analyzer connections |

**Network Routing Note:** When the analyzer PC has multiple network cards, Windows `route` commands are needed to ensure ASTM traffic routes through the correct interface. Example:

```
route add <OpenELIS_IP> mask 255.255.255.255 <Gateway_IP> metric 1 if <NIC_interface_number>
```

### 2.3 LIS1-A2 Framing (Low-Level Protocol)

| Control Character | Hex | ASCII | Purpose |
|-------------------|-----|-------|---------|
| STX | 0x02 | — | Start of frame |
| ETX | 0x03 | — | End of frame (last frame in record) |
| ETB | 0x17 | — | End of frame (intermediate frame, more to follow) |
| EOT | 0x04 | — | End of transmission |
| ENQ | 0x05 | — | Request to send |
| ACK | 0x06 | — | Positive acknowledgement |
| NAK | 0x15 | — | Negative acknowledgement |
| CR | 0x0D | — | Carriage return (record terminator within frame) |
| LF | 0x0A | — | Line feed (follows CR) |

**Frame structure:**

```
<STX><Frame#><Record Data><CR><ETX or ETB><Checksum><CR><LF>
```

- **Frame number:** Single digit, 0-7, cycling
- **Max record length:** 247 characters (excluding STX, frame#, CR, ETX/ETB, checksum, CR, LF)
- **Checksum:** Modulo 256 sum of all bytes between (and including) the frame number and ETX/ETB, encoded as two uppercase hex characters
- **Character encoding:** Windows 1252 (ASCII 0-127 + extended 128-255)

### 2.4 Timing Parameters

| Parameter | Default | Configurable | Notes |
|-----------|---------|-------------|-------|
| Sample sending delay | 0 ms | Yes (in ms) | Delay between sending sample results |
| Result sending delay | 0 ms | Yes (in ms) | Delay between individual results |
| ENQ response timeout | 15 s | No | Standard LIS1-A2 |
| Frame response timeout | 15 s | No | Wait for ACK/NAK after each frame |
| Retry count | 6 | No | Standard LIS1-A2 |

---

## 3. ASTM Message Structure

### 3.1 Delimiter Definition

| Character | Position in H record | Purpose |
|-----------|---------------------|---------|
| `\|` | Field delimiter | Separates fields within a record |
| `\\` | Escape delimiter | Escape character |
| `^` | Component delimiter | Separates components within a field |
| `&` | Repeat delimiter | Separates repeated values |

Standard delimiter string in Header record field 2: `\^&`

### 3.2 Record Types

| Record | Type | Direction | Purpose |
|--------|------|-----------|---------|
| H | Header | Both | Session initiation, processing mode |
| P | Patient | Both | Patient demographics |
| O | Order | Both | Test orders, sample identification |
| R | Result | Analyzer → Host | Test result values |
| C | Comment | Analyzer → Host | Error flags, analyzer flags |
| Q | Request | Both | Query for sample/order information |
| L | Terminator | Both | End of message |

### 3.3 Header Record (H)

```
H|\^&|||Indiko^TF^5.02.00|||||||LIS2-A2|P|1|20250223100000
```

| Field | Position | Content | Description |
|-------|----------|---------|-------------|
| Record Type | 1 | `H` | Header identifier |
| Delimiter Definition | 2 | `\^&` | Field, component, repeat delimiters |
| Message Control ID | 3 | *(empty)* | — |
| Access Password | 4 | *(empty)* | — |
| Sender Name/ID | 5 | `Type^Mfr^SWVersion` | Analyzer type (3 chars max) ^ Manufacturer ID (2 chars max) ^ Software version (16 chars max) |
| Sender Street | 6 | *(empty)* | — |
| Reserved | 7 | *(empty)* | — |
| Sender Phone | 8 | *(empty)* | — |
| Characteristics | 9 | *(empty)* | — |
| Receiver ID | 10 | *(empty)* | — |
| Comment | 11 | *(empty)* | — |
| Processing ID | 12 | `P`, `T`, `D`, or `Q` | See below |
| Version Number | 13 | `1` | ASTM version |
| Timestamp | 14 | `YYYYMMDDHHMMSS` | Message creation time |

**Processing ID values (H-12):**

| Value | Meaning | OpenELIS Action |
|-------|---------|-----------------|
| `P` | Production — patient results | Process as patient results |
| `T` | Training — test/QC results | Process as QC results |
| `D` | Debug | Log only, do not process |
| `Q` | Quality control | Process as QC results |

> **QC Discrimination:** Use H-12 to distinguish patient from QC. When H-12 = `T` or `Q`, the entire message contains QC data. When H-12 = `P`, the message contains patient data.

### 3.4 Patient Record (P)

```
P|1||||Doe^Jane||19900315|F|||||||||||||||||||||Adult
```

| Field | Position | Content | Max Length | Description |
|-------|----------|---------|------------|-------------|
| Record Type | 1 | `P` | — | Patient identifier |
| Sequence | 2 | `1` | — | Sequential number |
| Practice Patient ID | 3 | *(empty)* | — | — |
| Lab Patient ID | 4 | *(empty)* | — | — |
| Patient ID | 5 | ID value | — | Patient identifier |
| Patient Name | 6 | `Last^First` | 24 chars | Patient name components |
| Mother's Maiden Name | 7 | *(empty)* | — | — |
| DOB | 8 | `YYYYMMDD` | 8 chars | Date of birth |
| Sex | 9 | `M`, `F`, `U` | 1 char | Patient sex |
| Fields 10-26 | 10-26 | *(mostly empty)* | — | Various demographic fields |
| Reference Range Name | 27 | Group name | — | Reference range group name (configurable on analyzer) |

### 3.5 Order Record (O)

**Analyzer → Host (results sending):**

```
O|1|SID-001/1/3/5||^^^Glucose\^^^CRP|R|20250223100000||||A||||serum||||||||||F
```

**Host → Analyzer (order download):**

```
O|1|SID-001||^^^Glucose\^^^CRP|R|||||N||||||serum
```

| Field | Position | Content | Max Length | Description |
|-------|----------|---------|------------|-------------|
| Record Type | 1 | `O` | — | Order identifier |
| Sequence | 2 | `1` | — | Sequential number |
| Specimen ID | 3 | Composite ID | 20 chars | See Sample ID Format below |
| Instrument Specimen ID | 4 | *(empty)* | — | — |
| Universal Test ID | 5 | See Test ID Format | 30 chars | Test identification (repeat-delimited for multiple) |
| Priority | 6 | Priority code | 1 char | See Priority Codes |
| Order Date/Time | 7 | `YYYYMMDDHHMMSS` | 14 chars | When order was created |
| Collection Date/Time | 8 | *(empty)* | — | — |
| Collection End Time | 9 | *(empty)* | — | — |
| Collection Volume | 10 | *(empty)* | — | — |
| Collector ID | 11 | *(empty)* | — | — |
| Action Code | 12 | Action code | 1 char | See Action Codes |
| Danger Code | 13 | *(empty)* | — | — |
| Relevant Clinical Info | 14 | *(empty)* | — | — |
| Date/Time Received | 15 | *(empty)* | — | — |
| Specimen Type | 16 | Description | 30 chars | Sample information (e.g., "serum") |
| Fields 17-25 | 17-25 | *(empty)* | — | — |
| Report Type | 26 | Report code | 1 char | See Report Type Codes |

**Sample ID Format (O-3):**

The Specimen ID field uses a composite format with `/` as separator:

```
SampleID/ManualDilution/Rack/Position
```

| Component | Position | Max Length | Description |
|-----------|----------|------------|-------------|
| Sample ID | 1 | 20 chars | Barcode / accession number |
| Manual Dilution | 2 | — | Manual dilution factor (if applicable) |
| Rack | 3 | — | Rack number |
| Position | 4 | — | Cup position on rack |

**OpenELIS parsing:** Extract only the first component (before the first `/`) as the accession number. Store the full composite string in a raw data field for troubleshooting.

**Test ID Format (O-5):**

```
^^^TestOnlineName^^^MfrCode^DilutionFactor
```

| Component | Content | Description |
|-----------|---------|-------------|
| Component 4 | Test Online Name | The test name configured on the analyzer. **Must match the name configured in OpenELIS test mapping.** |
| Component 4 (alt) | Manufacturer Code | Manufacturer's assay code (optional, used with code-based identification) |
| Component 5 | Dilution Factor | Automatic dilution factor (if applicable) |

When multiple tests are ordered, they are separated by the repeat delimiter `\`:

```
^^^Glucose\^^^CRP\^^^ALT\^^^AST
```

### 3.6 Priority Codes (O-6)

| Code | Meaning | OpenELIS Mapping |
|------|---------|-----------------|
| `S` | Stat | STAT priority |
| `A` | ASAP | High priority |
| `R` | Routine | Normal priority |
| `C` | Callback | Normal priority (with callback flag) |
| `P` | Preoperative | Normal priority (with preoperative flag) |

### 3.7 Action Codes (O-12)

| Code | Meaning | Direction | OpenELIS Action |
|------|---------|-----------|-----------------|
| `A` | Add test to existing order | Host → Analyzer | Add-on order |
| `N` | New order | Host → Analyzer | New order |
| `P` | Pending | Analyzer → Host | Tests pending |
| `X` | In process | Analyzer → Host | Tests being analyzed |
| `Q` | QC sample | Analyzer → Host | Mark as QC |

### 3.8 Report Type Codes (O-26)

| Code | Meaning | OpenELIS Action |
|------|---------|-----------------|
| `O` | Order download | Order sent to analyzer |
| `F` | Final result | Accept as final |
| `X` | Cancelled | Mark test as cancelled |
| `I` | Pending | Mark as in-progress |
| `Y` | No order information available | Accept result but flag "no matching order" |
| `Z` | No patient information available | Accept result but flag "no patient info" |
| `Q` | Response to query | Process as query response |

### 3.9 Result Record (R)

```
R|1|^^^Glucose^^^00100|5.2|mmol/L||N|F||||20250223100500|00100
```

| Field | Position | Content | Max Length | Description |
|-------|----------|---------|------------|-------------|
| Record Type | 1 | `R` | — | Result identifier |
| Sequence | 2 | `1` | — | Sequential number within order |
| Universal Test ID | 3 | `^^^TestName^^^Code^Dil` | 30 chars | Same format as O-5 |
| Result Value | 4 | Numeric or text | 8 chars | Measurement result |
| Units | 5 | Unit string | 10 chars | Unit of measure |
| Reference Range | 6 | *(empty or range)* | — | Normal range (if configured) |
| Abnormal Flag | 7 | Flag code | — | See Abnormal Flags |
| Nature of Abnormality | 8 | *(empty)* | — | — |
| Result Status | 9 | Status code | 1 char | See Result Status Codes |
| Date of Change | 10 | *(empty)* | — | — |
| Operator | 11 | *(empty)* | — | — |
| Date/Time Started | 12 | *(empty)* | — | — |
| Date/Time Completed | 13 | `YYYYMMDDHHMMSS` | 14 chars | Result completion timestamp |
| Instrument ID | 14 | Instrument ID | — | Instrument identification |

**Abnormal Flags (R-7):**

| Flag | Meaning | OpenELIS Display |
|------|---------|-----------------|
| `N` | Normal | — (no flag) |
| `L` | Below low reference range | `label.analyzer.flagLow` |
| `H` | Above high reference range | `label.analyzer.flagHigh` |
| `LL` | Below critical low limit | `label.analyzer.flagCritLow` |
| `HH` | Above critical high limit | `label.analyzer.flagCritHigh` |
| `<` | Below reportable range | `label.analyzer.flagBelowRange` |
| `>` | Above reportable range | `label.analyzer.flagAboveRange` |

**Result Status Codes (R-9):**

| Code | Meaning | OpenELIS Action |
|------|---------|-----------------|
| `P` | Preliminary | Store but do not release |
| `F` | Final | Store and make available for review |
| `X` | Cancelled / order not performed | Mark as cancelled |
| `I` | Pending (instrument-specific) | Store as pending |
| `R` | Already reported (to another LIS) | Store with "previously reported" flag |
| `Q` | Response to query (QC) | Process as QC result |

### 3.10 Comment Record (C)

The Comment record carries error flags. Each error is transmitted as a separate C record following the R record it applies to.

```
C|1|I|3^Instrument absorbance limit|G
```

| Field | Position | Content | Description |
|-------|----------|---------|-------------|
| Record Type | 1 | `C` | Comment identifier |
| Sequence | 2 | `1` | Sequential number |
| Source | 3 | `I` | I = Instrument (always `I` for Indiko/Gallery) |
| Comment Text | 4 | `ErrorCode^ErrorDescription` | Error flag code and description |
| Comment Type | 5 | `G` | G = General comment |

### 3.11 Terminator Record (L)

```
L|1|N
```

| Field | Position | Content | Description |
|-------|----------|---------|-------------|
| Record Type | 1 | `L` | Terminator identifier |
| Sequence | 2 | `1` | Sequential number |
| Termination Code | 3 | `N`, `I`, or `P` | N = Normal, I = Not processed/no information, P = Protocol error |

### 3.12 Request Record (Q)

Used by the analyzer to query the host for sample information and test orders when a new sample is introduced.

```
Q|1|SID-001||ALL
```

| Field | Position | Content | Description |
|-------|----------|---------|-------------|
| Record Type | 1 | `Q` | Request identifier |
| Sequence | 2 | `1` | Sequential number |
| Starting Range ID | 3 | Sample ID | Sample to query for |
| Ending Range ID | 4 | *(empty)* | — |
| Request Scope | 5 | `ALL` or test list | What information is requested |

**OpenELIS response to a host query:** Send H → P → O → L message with patient info and ordered tests for the queried sample ID.

---

## 4. Error Flag Mapping

The Indiko/Gallery uses 40 error flag codes. These are transmitted as Comment (C) records attached to the Result (R) record. Multiple flags can be present for a single result.

### 4.1 Error Flag Reference

| Code | Description | Severity | OpenELIS Action |
|------|-------------|----------|-----------------|
| 1 | Instrument error | Critical | Reject result; flag for service review |
| 2 | Additional measurement error | Critical | Reject result |
| 3 | Instrument absorbance limit | Warning | Accept with flag |
| 4 | Initial absorbance low | Warning | Accept with flag |
| 5 | Initial absorbance high | Warning | Accept with flag |
| 6 | Bichromatic net absorbance | Warning | Accept with flag |
| 7 | Linearity | Warning | Accept with flag — may indicate substrate depletion |
| 8 | Point(s) out of curve | Warning | Accept with flag |
| 9 | Reaction direction | Warning | Accept with flag — unexpected kinetic direction |
| 10 | Blank initial absorbance low | Warning | Accept with flag |
| 11 | Blank initial absorbance high | Warning | Accept with flag |
| 12 | Blank response low | Warning | Accept with flag |
| 13 | Blank response high | Warning | Accept with flag |
| 14 | Unstable | Warning | Accept with flag |
| 15 | Unstable calibration | Warning | Accept with flag; verify calibration |
| 16 | Liquid movement | Critical | Reject result — clot or short sample detected |
| 17 | ISE dV | Warning | Accept with flag (ISE-specific) |
| 18 | Dilution limit low | Information | Accept; result is at lower dilution limit |
| 19 | Dilution limit high | Information | Accept; result is at upper dilution limit |
| 20 | Test limit low | Warning | Accept with flag — below analytical range |
| 21 | Test limit high | Warning | Accept with flag — above analytical range |
| 22 | Critical limit low | Critical | Accept with critical alert |
| 23 | Critical limit high | Critical | Accept with critical alert |
| 24 | Antigen excess limit low | Warning | Accept with flag (immunoturbidimetry) |
| 25 | Antigen excess limit high | Critical | Reject result — prozone/antigen excess suspected |
| 26 | Calibration | Warning | Accept with flag — calibration issue |
| 27 | QC | Warning | Accept with flag — QC out of range |
| 28 | Calculation error | Critical | Reject result |
| 29 | Not measurable | Critical | Reject result |
| 30 | Outside of calibration | Warning | Accept with flag — extrapolated result |
| 31 | Square limit low | Warning | Accept with flag |
| 32 | Factor limit low | Warning | Accept with flag |
| 33 | Factor limit high | Warning | Accept with flag |
| 34 | Bias limit low | Warning | Accept with flag |
| 35 | Bias limit high | Warning | Accept with flag |
| 36 | Delta absorbance error | Warning | Accept with flag |
| 37 | Prozone check error | Critical | Reject result — antigen excess |
| 38 | Reference range low | Information | Result below reference range |
| 39 | Reference range high | Information | Result above reference range |
| 40 | (Reserved) | — | — |

### 4.2 Error Severity Classification for OpenELIS

| Severity | Action | Error Codes |
|----------|--------|-------------|
| **Critical — auto-reject** | Reject result; do not present for acceptance; require rerun | 1, 2, 16, 25, 28, 29, 37 |
| **Warning — accept with flag** | Present result with visible warning flag; technician must acknowledge | 3-15, 17, 20, 21, 24, 26, 27, 30-36 |
| **Critical alert — accept with alert** | Accept result but trigger critical value notification workflow | 22, 23 |
| **Information — accept normally** | Accept result; display informational note | 18, 19, 38, 39 |

---

## 5. Test Code Mapping — OpenELIS Configuration

The Indiko/Gallery uses **configurable test online names** as the primary test identifier. These names are set on the analyzer and must match exactly in the OpenELIS analyzer configuration. The table below shows representative common chemistry assays — **actual test names must be validated against each site's specific analyzer configuration**.

### 5.1 Representative Clinical Chemistry Test Mapping

| Analyzer Test Name | Description | Specimen Type | Typical Units | LOINC Code | OpenELIS Test Name |
|-------------------|-------------|---------------|---------------|------------|-------------------|
| `Glucose` | Blood glucose | Serum/Plasma | mmol/L | 2345-7 | `label.test.glucose` |
| `BUN` | Blood urea nitrogen | Serum | mmol/L | 3094-0 | `label.test.bun` |
| `Creatinine` | Creatinine | Serum | µmol/L | 2160-0 | `label.test.creatinine` |
| `Uric Acid` | Uric acid | Serum | µmol/L | 3084-1 | `label.test.uricAcid` |
| `Total Protein` | Total protein | Serum | g/L | 2885-2 | `label.test.totalProtein` |
| `Albumin` | Albumin | Serum | g/L | 1751-7 | `label.test.albumin` |
| `Total Bilirubin` | Total bilirubin | Serum | µmol/L | 1975-2 | `label.test.totalBilirubin` |
| `Direct Bilirubin` | Direct bilirubin | Serum | µmol/L | 1968-7 | `label.test.directBilirubin` |
| `ALT` | Alanine aminotransferase | Serum | U/L | 1742-6 | `label.test.alt` |
| `AST` | Aspartate aminotransferase | Serum | U/L | 1920-8 | `label.test.ast` |
| `ALP` | Alkaline phosphatase | Serum | U/L | 6768-6 | `label.test.alp` |
| `GGT` | Gamma-glutamyl transferase | Serum | U/L | 2324-2 | `label.test.ggt` |
| `LDH` | Lactate dehydrogenase | Serum | U/L | 2532-0 | `label.test.ldh` |
| `CK` | Creatine kinase | Serum | U/L | 2157-6 | `label.test.ck` |
| `Amylase` | Amylase | Serum | U/L | 1798-8 | `label.test.amylase` |
| `Lipase` | Lipase | Serum | U/L | 3040-3 | `label.test.lipase` |
| `Cholesterol` | Total cholesterol | Serum | mmol/L | 2093-3 | `label.test.cholesterol` |
| `Triglycerides` | Triglycerides | Serum | mmol/L | 2571-8 | `label.test.triglycerides` |
| `HDL` | HDL cholesterol | Serum | mmol/L | 2085-9 | `label.test.hdl` |
| `LDL` | LDL cholesterol (calculated) | Serum | mmol/L | 13457-7 | `label.test.ldl` |
| `Calcium` | Calcium | Serum | mmol/L | 17861-6 | `label.test.calcium` |
| `Phosphorus` | Inorganic phosphorus | Serum | mmol/L | 2777-1 | `label.test.phosphorus` |
| `Magnesium` | Magnesium | Serum | mmol/L | 19123-9 | `label.test.magnesium` |
| `Iron` | Iron | Serum | µmol/L | 2498-4 | `label.test.iron` |
| `TIBC` | Total iron binding capacity | Serum | µmol/L | 2500-7 | `label.test.tibc` |

### 5.2 Immunoturbidimetry Assays

| Analyzer Test Name | Description | Typical Units | LOINC Code | OpenELIS Test Name |
|-------------------|-------------|---------------|------------|-------------------|
| `CRP` | C-reactive protein | mg/L | 1988-5 | `label.test.crp` |
| `RF` | Rheumatoid factor | IU/mL | 11572-5 | `label.test.rf` |
| `ASO` | Anti-streptolysin O | IU/mL | 5370-6 | `label.test.aso` |
| `HbA1c` | Glycated hemoglobin | % | 4548-4 | `label.test.hba1c` |
| `Microalbumin` | Urine microalbumin | mg/L | 14957-5 | `label.test.microalbumin` |
| `Transferrin` | Transferrin | g/L | 3034-6 | `label.test.transferrin` |
| `IgG` | Immunoglobulin G | g/L | 2465-3 | `label.test.igg` |
| `IgA` | Immunoglobulin A | g/L | 2458-8 | `label.test.iga` |
| `IgM` | Immunoglobulin M | g/L | 2472-9 | `label.test.igm` |
| `C3` | Complement C3 | g/L | 4485-9 | `label.test.c3` |
| `C4` | Complement C4 | g/L | 4498-2 | `label.test.c4` |

### 5.3 ISE Electrolytes (Indiko Only)

| Analyzer Test Name | Description | Typical Units | LOINC Code | OpenELIS Test Name |
|-------------------|-------------|---------------|------------|-------------------|
| `Na` | Sodium | mmol/L | 2951-2 | `label.test.sodium` |
| `K` | Potassium | mmol/L | 2823-3 | `label.test.potassium` |
| `Cl` | Chloride | mmol/L | 2075-0 | `label.test.chloride` |

### 5.4 Drug Monitoring (TDM) Assays

| Analyzer Test Name | Description | Typical Units | LOINC Code | OpenELIS Test Name |
|-------------------|-------------|---------------|------------|-------------------|
| `Phenobarbital` | Phenobarbital | µg/mL | 3948-7 | `label.test.phenobarbital` |
| `Phenytoin` | Phenytoin | µg/mL | 3968-5 | `label.test.phenytoin` |
| `Carbamazepine` | Carbamazepine | µg/mL | 3432-2 | `label.test.carbamazepine` |
| `Valproic Acid` | Valproic acid | µg/mL | 4086-5 | `label.test.valproicAcid` |
| `Theophylline` | Theophylline | µg/mL | 4049-3 | `label.test.theophylline` |

> **Configuration note:** The actual test names depend on the reagent kits installed on each analyzer. The analyzer's **Test Online Name** setting (configured via the analyzer software) must match exactly with the test name entered in the OpenELIS Analyzer Administration → Test Mapping screen. Test names are case-sensitive.

---

## 6. QC Handling

### 6.1 QC Sample Identification

The Indiko/Gallery identifies QC samples through two mechanisms:

| Method | Field | Value | Description |
|--------|-------|-------|-------------|
| **Header Processing ID** | H-12 | `T` or `Q` | Entire message is QC data |
| **Action Code** | O-12 | `Q` | Individual order is QC |

**OpenELIS QC extraction logic:**

1. Check H-12 first. If `T` or `Q`, treat entire message as QC.
2. If H-12 = `P` (production), check individual O-12 for `Q` flag.
3. Extract QC sample ID from O-3 (same composite format as patient samples).
4. Match to QC lot in OpenELIS by sample ID pattern or prefix.

### 6.2 QC Evaluation

The Indiko/Gallery performs its own on-board QC evaluation and sends error flag 27 ("QC") when a QC result is out of range. OpenELIS should:

1. **Import** all QC results regardless of the analyzer's own QC evaluation.
2. **Evaluate** QC results against OpenELIS-defined rules (Westgard rules, SD limits, etc.) independently.
3. **Display** both the analyzer's QC flag (error code 27) and OpenELIS's own QC evaluation.
4. **Gate** patient result acceptance on OpenELIS QC evaluation (not the analyzer's).

### 6.3 Reagent Lot Tracking

The Indiko/Gallery uses FIFO (First In, First Out) reagent lot selection. When multiple lots of the same reagent are loaded, the analyzer uses the oldest lot first. OpenELIS should capture the reagent lot information if transmitted in the result message for traceability.

---

## 7. Bidirectional Communication

### 7.1 Host Query Flow (Analyzer Queries Host)

When "Host query on new sample" is enabled on the analyzer, it automatically queries OpenELIS when a new sample barcode is scanned:

**Sequence:**

1. Analyzer scans barcode, sends ENQ
2. Host responds with ACK
3. Analyzer sends: `H|\^&|||...|||||||Q|1` → `Q|1|SampleID||ALL` → `L|1|N`
4. Host responds: `H|\^&|||...|||||||P|1` → `P|1||||...` → `O|1|SampleID||^^^Test1\^^^Test2|R|||||N` → `L|1|N`
5. Analyzer loads orders and begins testing

**If no orders found:** Host sends H + L with no P or O records. The analyzer displays "No orders" and the technician can manually order tests.

### 7.2 Result Upload Flow (Analyzer Sends Results)

**Automatic sending:** When "Automatic result sending" is enabled, results are sent immediately upon completion.

**By request:** When "Result sending by Request" is configured, the analyzer accumulates results and sends them when the operator initiates a manual send, or in response to a host request.

**Result sending mode:** Configurable as "by sample" (all results for one sample in a single message) or individual result mode.

**Sequence:**

1. Analyzer sends ENQ
2. Host responds with ACK
3. Analyzer sends: H → P → O → R (+ C if errors) → L
4. Host responds with ACK for each frame
5. Analyzer sends EOT

### 7.3 Configuration Parameters

| Parameter | Options | Recommended | Notes |
|-----------|---------|-------------|-------|
| LIS connection type | TCP/IP, Serial | TCP/IP | More reliable for continuous operation |
| Automatic result sending | Yes / No | Yes | Eliminates manual send step |
| Result sending by Request | Yes / No | No | Use automatic sending instead |
| Host query on new sample | Yes / No | Yes | Enables bidirectional order download |
| Sample sending delay | 0-9999 ms | 0 | Increase if host drops messages |
| Result sending delay | 0-9999 ms | 0 | Increase if host drops messages |

---

## 8. Communication Errors

### 8.1 LIS1-A Error Handling

| Scenario | Behavior |
|----------|----------|
| NAK received | Retry frame (up to 6 times per LIS1-A) |
| No response to ENQ | Retry after timeout (15 seconds) |
| Checksum mismatch | Send NAK; sender retries frame |
| Invalid frame number | Send NAK |
| EOT received during transmission | Abort current message |

### 8.2 Application-Level Errors

| Code | Description | OpenELIS Action |
|------|-------------|-----------------|
| E3 | Wrong initializing character | Log protocol error; check connection |
| E4 | Wrong termination or request code | Log protocol error |
| E5 | Records in wrong order | Reject message; log structure error |
| E104 | Invalid sample position | Log; sample ID may be malformed |
| E105 | Request creation failed | Log; check order format |
| E108 | Maximum samples exceeded | Log; analyzer buffer full |
| E201 | Rack position reserved | Log; sample already in process |
| E210 | Patient update failed | Log; patient record issue |
| E211 | Patient not found | Log; patient lookup failed |
| E220 | Sample already exists | Log; duplicate sample ID |
| E221 | Sample information problem | Log; sample data issue |

---

## 9. Validation Test Data

The following scenarios should be validated using actual analyzer output. Until real ASTM message captures are available, these represent the expected message patterns based on the vendor manual.

### 9.1 Test Scenario Inventory

| # | Scenario | Key Features | Expected Parser Behavior |
|---|----------|--------------|-------------------------|
| 1 | Normal patient — basic metabolic panel | Glucose, BUN, Creatinine, Na, K, Cl — all within reference range, no flags | Accept all results as final; no flags |
| 2 | Normal patient — liver panel with abnormal | ALT elevated (H flag), AST elevated (H flag), others normal | Accept all; display H flags on ALT and AST |
| 3 | Critical result | Glucose critically low (LL flag), error code 22 in C record | Accept with critical alert; trigger critical value notification |
| 4 | Flagged result — linearity error | CRP result with error code 7 (Linearity) in C record | Accept with warning flag; technician must acknowledge |
| 5 | Rejected result — instrument error | Result with error codes 1+16 (instrument error + liquid movement) | Auto-reject result; flag for rerun |
| 6 | QC sample | H-12 = `T`, QC lot results for L1 and L2 controls | Route to QC evaluation; do not mix with patient results |
| 7 | Immunoturbidimetry — antigen excess | CRP or RF result with error code 25 (antigen excess high) | Auto-reject; flag prozone suspected |
| 8 | Bidirectional — order download | Host query Q record → OpenELIS responds with P + O records | Verify orders load correctly on analyzer |
| 9 | Multi-test sample | Single sample with 15+ tests, mixed normal/abnormal | All results matched to correct tests; flags on correct results |
| 10 | No matching order | Result received with report type `Y` (no order info) | Accept result; flag as "no matching order" in review queue |

### 9.2 Example ASTM Messages

**Scenario 1: Normal BMP result**

```
H|\^&|||Indiko^TF^5.02.00|||||||LIS2-A2|P|1|20260223100000
P|1||||Doe^Jane||19900315|F|||||||||||||||||||||Adult
O|1|2602230001/1/3/5||^^^Glucose\^^^BUN\^^^Creatinine\^^^Na\^^^K\^^^Cl|R|20260223100000||||A||||serum||||||||||F
R|1|^^^Glucose|5.2|mmol/L|3.9-6.1|N|F||||20260223100500
R|2|^^^BUN|5.1|mmol/L|2.5-7.1|N|F||||20260223100500
R|3|^^^Creatinine|72|µmol/L|53-97|N|F||||20260223100500
R|4|^^^Na|140|mmol/L|136-145|N|F||||20260223100500
R|5|^^^K|4.2|mmol/L|3.5-5.1|N|F||||20260223100500
R|6|^^^Cl|103|mmol/L|98-107|N|F||||20260223100500
L|1|N
```

**Scenario 3: Critical glucose**

```
H|\^&|||Indiko^TF^5.02.00|||||||LIS2-A2|P|1|20260223110000
P|1||||Smith^John||19750801|M|||||||||||||||||||||Adult
O|1|2602230002/1/4/2||^^^Glucose|S|20260223110000||||A||||serum||||||||||F
R|1|^^^Glucose|1.8|mmol/L|3.9-6.1|LL|F||||20260223110500
C|1|I|22^Critical limit low|G
L|1|N
```

**Scenario 5: Instrument error + liquid movement**

```
H|\^&|||Indiko^TF^5.02.00|||||||LIS2-A2|P|1|20260223113000
P|1||||Brown^Alice||19880612|F|||||||||||||||||||||Adult
O|1|2602230003/1/2/7||^^^ALT|R|20260223113000||||A||||serum||||||||||F
R|1|^^^ALT||U/L||N|F||||20260223113500
C|1|I|1^Instrument error|G
C|2|I|16^Liquid movement|G
L|1|N
```

**Scenario 6: QC sample**

```
H|\^&|||Indiko^TF^5.02.00|||||||LIS2-A2|T|1|20260223080000
P|1||||QC-L1^Control||20260601|U
O|1|QC-L1-LOT2026A/1/1/1||^^^Glucose\^^^ALT\^^^CRP|R|20260223080000||||Q||||control||||||||||F
R|1|^^^Glucose|5.0|mmol/L||N|Q||||20260223080500
R|2|^^^ALT|35|U/L||N|Q||||20260223080500
R|3|^^^CRP|12.5|mg/L||N|Q||||20260223080500
L|1|N
```

**Scenario 7: Antigen excess (prozone)**

```
H|\^&|||Indiko^TF^5.02.00|||||||LIS2-A2|P|1|20260223120000
P|1||||Jones^Mary||19680410|F|||||||||||||||||||||Adult
O|1|2602230004/1/5/1||^^^CRP|R|20260223120000||||A||||serum||||||||||F
R|1|^^^CRP|185.0|mg/L||HH|F||||20260223120500
C|1|I|25^Antigen excess limit high|G
C|2|I|37^Prozone check error|G
L|1|N
```

**Scenario 8: Host query (bidirectional order download)**

Analyzer sends:
```
H|\^&|||Indiko^TF^5.02.00|||||||LIS2-A2|Q|1|20260223130000
Q|1|2602230005||ALL
L|1|N
```

OpenELIS responds:
```
H|\^&|||OpenELIS^OE^3.0|||||||LIS2-A2|P|1|20260223130001
P|1||||Williams^Robert||20000115|M|||||||||||||||||||||Adult
O|1|2602230005||^^^Glucose\^^^BUN\^^^Creatinine\^^^ALT\^^^AST\^^^CRP|R|||||N||||||serum
L|1|N
```

---

## 10. Parser Configuration

```json
{
  "analyzer_name": "Thermo Indiko/Gallery",
  "analyzer_pattern": "A",
  "protocol": "ASTM_LIS2A2",
  "transport": "TCP",
  
  "connection": {
    "host": "0.0.0.0",
    "port": 12000,
    "role": "server",
    "encoding": "windows-1252",
    "max_record_length": 247,
    "frame_timeout_ms": 15000,
    "retry_count": 6
  },
  
  "identification": {
    "header_sender_field": 5,
    "expected_type_values": ["Indiko", "Gallery"],
    "expected_manufacturer_values": ["TF", "Thermo Scientific"]
  },
  
  "sample_id_parsing": {
    "field": "O-3",
    "format": "composite",
    "separator": "/",
    "accession_number_position": 0,
    "store_full_composite": true
  },
  
  "test_id_parsing": {
    "field": "R-3",
    "component_position": 4,
    "match_type": "name",
    "case_sensitive": true
  },
  
  "result_parsing": {
    "value_field": "R-4",
    "units_field": "R-5",
    "abnormal_flag_field": "R-7",
    "status_field": "R-9",
    "timestamp_field": "R-13",
    "timestamp_format": "YYYYMMDDHHMMSS"
  },
  
  "qc_identification": {
    "primary_method": "header_processing_id",
    "header_field": "H-12",
    "qc_values": ["T", "Q"],
    "secondary_method": "order_action_code",
    "action_code_field": "O-12",
    "qc_action_value": "Q"
  },
  
  "error_handling": {
    "comment_source_field": "C-3",
    "comment_text_field": "C-4",
    "error_code_separator": "^",
    "auto_reject_codes": [1, 2, 16, 25, 28, 29, 37],
    "critical_alert_codes": [22, 23],
    "warning_codes": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 20, 21, 24, 26, 27, 30, 31, 32, 33, 34, 35, 36],
    "info_codes": [18, 19, 38, 39]
  },
  
  "bidirectional": {
    "enabled": true,
    "host_query_support": true,
    "order_download_support": true,
    "query_response_format": "H_P_O_L"
  },
  
  "report_type_mapping": {
    "O": "order_download",
    "F": "final",
    "X": "cancelled",
    "I": "pending",
    "Y": "no_order_info",
    "Z": "no_patient_info",
    "Q": "query_response"
  }
}
```

---

## 11. Localization Tags

| Context | Tag | Default (English) |
|---------|-----|-------------------|
| Analyzer name | `label.analyzer.indikoGallery` | Thermo Scientific Indiko / Gallery |
| Connection type | `label.analyzer.connectionType` | Connection type |
| TCP/IP | `label.analyzer.tcpip` | TCP/IP |
| Serial | `label.analyzer.serial` | Serial (RS-232) |
| Production mode | `label.analyzer.modeProduction` | Production |
| QC mode | `label.analyzer.modeQC` | Quality Control |
| Debug mode | `label.analyzer.modeDebug` | Debug |
| Normal flag | `label.analyzer.flagNormal` | Normal |
| Low flag | `label.analyzer.flagLow` | Below reference range |
| High flag | `label.analyzer.flagHigh` | Above reference range |
| Critical low | `label.analyzer.flagCritLow` | Critical low |
| Critical high | `label.analyzer.flagCritHigh` | Critical high |
| Below range | `label.analyzer.flagBelowRange` | Below reportable range |
| Above range | `label.analyzer.flagAboveRange` | Above reportable range |
| Instrument error | `label.analyzer.errInstrument` | Instrument error — result rejected |
| Liquid movement | `label.analyzer.errLiquidMovement` | Liquid movement detected — possible clot or short sample |
| Antigen excess | `label.analyzer.errAntigenExcess` | Antigen excess suspected — result rejected |
| Prozone error | `label.analyzer.errProzone` | Prozone check error — dilute and rerun |
| Linearity | `label.analyzer.errLinearity` | Linearity limit — verify with dilution |
| Calibration flag | `label.analyzer.errCalibration` | Calibration issue detected |
| QC flag | `label.analyzer.errQC` | QC out of range |
| Calculation error | `label.analyzer.errCalculation` | Calculation error — result rejected |
| Not measurable | `label.analyzer.errNotMeasurable` | Not measurable — result rejected |
| Outside calibration | `label.analyzer.errOutsideCal` | Result outside calibration range |
| No matching order | `label.analyzer.noMatchingOrder` | Result received — no matching order found |
| No patient info | `label.analyzer.noPatientInfo` | Result received — no patient information |
| Host query | `label.analyzer.hostQuery` | Host query for sample orders |
| Order downloaded | `label.analyzer.orderDownloaded` | Orders sent to analyzer |
| Result final | `label.analyzer.resultFinal` | Final result |
| Result preliminary | `label.analyzer.resultPreliminary` | Preliminary result |
| Result cancelled | `label.analyzer.resultCancelled` | Result cancelled |
| Protocol error | `label.analyzer.protocolError` | Communication protocol error |
| Checksum error | `label.analyzer.checksumError` | Frame checksum mismatch |
| Connection lost | `label.analyzer.connectionLost` | Analyzer connection lost |
| Stat priority | `label.analyzer.priorityStat` | STAT |
| Routine priority | `label.analyzer.priorityRoutine` | Routine |

---

## 12. Debug & Troubleshooting

### 12.1 Analyzer-Side Debug Log

The Indiko/Gallery writes all LIS communication to a debug file:

| Item | Value |
|------|-------|
| File path | `c:\ARC\tmp\lsdebug.txt` |
| Enable | F5 → Actions → Change debug status |
| Content | All sent and received ASTM frames with timestamps |

This file is invaluable for troubleshooting parsing issues — compare the raw frames in `lsdebug.txt` against what OpenELIS receives.

### 12.2 OpenELIS-Side Logging

The ASTM listener should log:

| Log Level | What to Log |
|-----------|-------------|
| INFO | Connection established/dropped, message received summary (sample ID, test count, report type) |
| DEBUG | Full ASTM frames (sent and received) |
| WARN | Checksum mismatches, NAK responses, unknown test codes, unmatched sample IDs |
| ERROR | Protocol errors (E-codes), auto-rejected results, connection failures |

---

## 13. Related Specifications

| Document | Description |
|----------|-------------|
| Gallery-Indiko LIS Interface Manual (N12027 Rev 5.0) | Vendor protocol specification — **primary reference** |
| Analyzer Results Import Page FRS | QC-first workflow for reviewing imported results |
| Test Catalog FRS v2 | Test definitions and LOINC mapping |
| Indiko/Gallery Companion Guide | End-user setup and configuration document |

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-23 | Casey / Claude | Initial draft based on vendor LIS Interface Manual (N12027 Rev 5.0, June 2013). Full ASTM message structure, 40 error flags, bidirectional flow, test mapping for chemistry + immunoturbidimetry + TDM + ISE. |
