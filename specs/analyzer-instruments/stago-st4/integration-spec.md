# Stago ST art (ST4) Coagulation Analyzer — Field Mapping & Integration Specification

**Version:** 2.0
**Date:** 2026-02-23
**Status:** Validated against Stago ST art Service Manual V1.0 (December 1999), Chapter 11: User's RS232-C Interface
**Integration Pattern:** E (Proprietary Serial Protocol) — **NOT ASTM**
**Jira Epic:** [OGC-304](https://uwdigi.atlassian.net/browse/OGC-304) (Madagascar Analyzer Integrations)
**Jira Story:** TBD
**Assigned To:** Piotr Mankowski
**Label:** Madagascar

---

## 1. Instrument Overview

| Field | Value |
|-------|-------|
| **Manufacturer** | Stago (Diagnostica Stago S.A.S.) |
| **Model** | ST art (also referred to as ST4) |
| **Lab Domain** | Coagulation / Hemostasis |
| **Methodology** | Mechanical clot detection (viscosity-based) |
| **Sample Types** | Citrated plasma (3.2% sodium citrate) |
| **Result Types** | Clotting time (seconds), ratio, % activity, INR (calculated) |
| **LIS Interface** | RS-232C serial — **Proprietary fixed-position protocol** |
| **Manual Reference** | ST art Service Manual V1.0, December 1999, Chapter 11 |

### 1.1 Analysis Menu (Rank Table)

The ST art identifies each analysis type by a 2-digit **Rank** code. This is the definitive list from the vendor manual:

| Rank | Analysis | Rank | Analysis |
|------|----------|------|----------|
| 01 | PT | 16 | VII-X |
| 02 | APTT | 17 | X |
| 03 | Fibrinogen | 18 | Staclot PNP |
| 04 | Unfractionated Heparin | 19 | VIII |
| 05 | Thrombin Time | 20 | IX |
| 06 | SPA | 21 | XI |
| 07 | Reptilase Time | 22 | XII |
| 08 | Staclot LA | 23 | Protein S |
| 09 | LMWH | 24 | Protein C |
| 10 | Mode 1 | 25 | Mode 3 |
| 11 | Mode 2 | 26 | Mode 4 |
| 12 | II | 27 | Not used |
| 13 | Not used | 28 | Not used |
| 14 | V | 29 | Mode 5 |
| 15 | VII | — | — |

> **"Mode" ranks (10, 11, 25, 26, 29):** These are user-configurable analysis modes. The laboratory assigns a custom test to each mode via the instrument's setup menu. The OpenELIS mapping for these ranks must be configured per site.

### 1.2 Confidence Assessment (Post-Manual Review)

| Aspect | Confidence | Notes |
|--------|-----------|-------|
| Protocol | **Confirmed** | Proprietary fixed-position serial, per Chapter 11 |
| Physical connection | **Confirmed** | RS-232C, 9600/8N1, no handshaking, per Section 11.1 |
| Message format | **Confirmed** | STX + DAT + CHK + ETX, per Section 11.2 |
| Rank codes | **Confirmed** | 29 ranks per Table 1 |
| Result format | **Confirmed** | ####.### (Standard Format, 8 characters) |
| Result status codes | **Confirmed** | S, D, R, F, E, R, I per status table |
| Checksum algorithm | **Confirmed** | XOR of DAT, then OR with 0x40 |

---

## 2. Communication Architecture

### 2.1 Connection Model

> **CRITICAL: The ST art does NOT use ASTM.** It cannot use the existing OpenELIS ASTM background service. A dedicated **Stago ST art serial parser** must be implemented as a new analyzer adapter.

```
┌──────────────┐    Proprietary Serial     ┌──────────────────────────┐
│  Stago ST art│ ─────────────────────────→ │  OpenELIS                │
│  Coagulation │   RS-232C, 9600/8N1       │  Stago ST art Adapter    │
│  Analyzer    │   No handshaking          │  (NEW — custom parser)   │
│              │   Unidirectional           │                          │
└──────────────┘                            │  → Frame extractor       │
                                            │  → Checksum validator    │
                                            │  → Fixed-field parser    │
                                            │  → Rank → Test mapper    │
                                            │  → Result writer         │
                                            └──────────────────────────┘
```

> **Unidirectional:** The ST art sends results to the LIS as soon as they are obtained. There is no query/response or order download. The manual states: *"The data are sent on line as soon as the results are obtained with a specific format without ST art control."*

### 2.2 Physical Connection

From Section 11.1 of the manual:

| Parameter | Value | Source |
|-----------|-------|--------|
| **Interface** | Serial, RS-232C Standard | Manual §11.1 |
| **Connector on ST art** | Male, 9-pin connector | Manual §11.1 |
| **Handshaking** | No control line is used | Manual §11.1 |
| **Baud Rate** | 9600 Bauds | Manual §11.1 |
| **Parity** | No | Manual §11.1 |
| **Data Bit** | 8 | Manual §11.1 |
| **Stop Bit** | 1 | Manual §11.1 |

### 2.3 Pin Assignment (DB-9 Male on ST art)

From the manual's pin diagram:

| Pin | Signal | Notes |
|-----|--------|-------|
| 1 | — | Not connected |
| 2 | TD (Transmit Data) | ST art → LIS |
| 3 | RD (Receive Data) | Not used (unidirectional) |
| 4 | DTR | NC (Not Connected) |
| 5 | GND | Signal ground |
| 6 | — | Not connected |
| 7 | CTS | Connected to Pin 9 (DSR) — loopback |
| 8 | RTS | NC (Not Connected) |
| 9 | DSR | Connected to Pin 7 (CTS) — loopback |

> **Cable note:** Pins 7 (CTS) and 9 (DSR) are connected together on the ST art side. This is a self-loopback so the ST art sees its own "ready" signal. The cable from ST art to the OpenELIS server only needs 3 wires: Pin 2 (TD) → Server RD, Pin 5 (GND) → Server GND. No null modem crossover is needed for the data line since only TD is active.

### 2.4 Cable Wiring

```
ST art (DB-9 Male)              Server (DB-9 or USB-Serial)
───────────────────             ─────────────────────────────
Pin 2 (TD)  ──────────────────→ Pin 3 (RD)
Pin 5 (GND) ──────────────────→ Pin 5 (GND)

Pin 7 (CTS) ─┐
              │ (internal loopback on ST art side)
Pin 9 (DSR) ─┘
```

---

## 3. Message Protocol

### 3.1 Message Envelope

From Section 11.2 of the manual, each message has the following structure:

```
┌─────┬─────────────────────────────┬─────┬─────┐
│ STX │           DAT               │ CHK │ ETX │
│(0x02)│  (variable-length data)    │(1B) │(0x03)│
└─────┴─────────────────────────────┴─────┴─────┘
```

| Field | Size | Description |
|-------|------|-------------|
| **STX** | 1 byte | ASCII character 0x02 — start of message |
| **DAT** | Variable | Data block containing all fields (see Section 3.2) |
| **CHK** | 1 byte | Checksum of DAT block |
| **ETX** | 1 byte | ASCII character 0x03 — end of message |

### 3.2 Checksum Algorithm

From the manual:

> *"Checksum, result from an exclusive OR of all the characters of the DAT block, followed by a logic OR with the 40h value."*

**Algorithm:**

```
1. Initialize CHK = 0x00
2. For each byte in DAT block:
     CHK = CHK XOR byte
3. CHK = CHK OR 0x40
```

**Implementation (pseudocode):**

```python
def calculate_checksum(dat_bytes):
    chk = 0x00
    for byte in dat_bytes:
        chk = chk ^ byte      # XOR
    chk = chk | 0x40          # OR with 0x40
    return chk
```

> **Why OR 0x40?** This ensures the checksum byte is always a printable ASCII character (0x40–0x7F range), avoiding control characters that could interfere with serial transmission.

### 3.3 DAT Block Structure (Fixed-Position Fields)

The DAT block is a fixed-position (non-delimited) structure. Field positions are counted from the first byte after STX.

```
┌───────────┬───┬───┬────────┬──────┬───────┬──────────┬──────┬──────────┬─── ─── ───┐
│ ST4       │ T │ R │Station │ Rank │ Units │ Ref Rslt │ Nber │ ID#      │ Results…  │
│ (5 chars) │(1)│(1)│ (2)    │ (2)  │ (5)   │ (SF=8)   │ (2)  │ (12)     │ (×N)      │
└───────────┴───┴───┴────────┴──────┴───────┴──────────┴──────┴──────────┴─── ─── ───┘
```

#### Field Definitions

| # | Field | Offset | Length | Format | Description |
|---|-------|--------|--------|--------|-------------|
| 1 | **Instrument ID** | 0 | 5 | Text, space-padded | `"ST4  "` (ST4 + 2 spaces) |
| 2 | **Type** | 5 | 1 | Char | `'T'` — fixed |
| 3 | **Mode** | 6 | 1 | Char | `'R'` — result transmission |
| 4 | **Station Number** | 7 | 2 | Numeric, space-padded left | Station/channel (1–4), e.g., `" 1"` |
| 5 | **Rank** | 9 | 2 | Numeric, zero-padded left | Analysis type code from Table 1 (01–29), e.g., `"01"` = PT |
| 6 | **Units** | 11 | 5 | Text | Unit of measure, e.g., `"sec  "`, `"%    "`, `"g/l  "` |
| 7 | **Reference Result** | 16 | 8 | SF (####.###) | Reference/normal value, space-padded left |
| 8 | **Number of Results** | 24 | 2 | Numeric, space-padded left | Count of result blocks that follow |
| 9 | **ID#** | 26 | 12 | Text, space-padded left | Patient identification number (4 digits) + additional chars |

**Then, repeated N times (Number of Results):**

| # | Field | Length | Format | Description |
|---|-------|--------|--------|-------------|
| 10 | **Result** | 8 | SF (####.###) | Measured value, space-padded left |
| 11 | **Result Status** | 1 | Char | Status code (see Section 3.5) |
| 12 | **Result (seconds)** | 8 | SF (####.###) | Clotting time in seconds |
| 13 | **Result (units)** | 8 | SF (####.###) | Result in configured units |
| 14 | **INR** | 8 | SF (####.###) | INR value (PT only; may be zero/blank for other tests) |

> **SF (Standard Format):** `####.###` — 8 characters total, right-aligned numeric with decimal point, space-padded on the left. Example: `"  12.500"` for 12.5 seconds.

### 3.4 Field Details

#### Station Number

2 digits, values less than 10 are left-padded with a space. The ST art has up to 4 measurement stations.

#### Rank (Analysis Type)

2 digits, values less than 10 are left-padded with zero (`"01"`, `"02"`, ..., `"29"`). Maps to Table 1 in Section 1.1.

#### Patient ID (ID#)

12 characters. The manual states: *"Number of 4 figures, justified on the left by spaces."* In practice, this field may contain a barcode-scanned value up to 12 characters. This is the field OpenELIS uses for accession number matching.

#### Number of Results (Nber)

Indicates how many result blocks follow the header. For a single determination, Nber = `" 1"`. For duplicate determinations, Nber = `" 2"`.

### 3.5 Result Status Codes

From the manual's status table:

| ASCII Code | Status | Description | OpenELIS Handling |
|------------|--------|-------------|-------------------|
| `S` | Single, completed | Single determination, valid result | Accept as final result |
| `D` | Duplicate, completed | First of duplicate pair, valid | Accept; flag as duplicate run 1 |
| `R` | Duplicate, completed | Second of duplicate pair, valid | Accept; flag as duplicate run 2 |
| `F` | Duplicate, completed | Mean of duplicate pair | Accept as final (preferred for duplicates) |
| `E` | Error — exceeds max | Greater than the maximum time | Store as text; flag as error |
| `R` | Error — below min | Less than the minimum time | Store as text; flag as error |
| `I` | Refused | Refused result | Reject; do not store |
| `!` | Error — margin exceeded | Greater than the given margin | Store with warning flag |

> **Note:** The manual shows `"R"` for both "duplicate completed" and "less than minimum time." Context (single vs. duplicate mode) disambiguates. OpenELIS should check the Nber field: if Nber=1, an `R` status means "below minimum." If Nber=2, `R` means "second duplicate run."

---

## 4. Test Code Mapping — OpenELIS Configuration

This table maps the ST art Rank codes to OpenELIS test definitions. Only ranks corresponding to tests actually performed at the site need to be configured.

### 4.1 Core Coagulation Tests

| # | Rank | ST art Analysis | OpenELIS Test Name Tag | OpenELIS LOINC | Primary Unit | Notes |
|---|------|----------------|----------------------|---------------|-------------|-------|
| 1 | 01 | PT | `label.test.pt.time` | 5902-2 | sec | Primary: clotting time |
| 2 | 01 | PT (% Activity) | `label.test.pt.activity` | 5894-1 | % | Derived from same rank |
| 3 | 01 | PT (INR) | `label.test.pt.inr` | 6301-6 | *(ratio)* | INR field in result block |
| 4 | 02 | APTT | `label.test.aptt.time` | 3173-2 | sec | |
| 5 | 03 | Fibrinogen | `label.test.fibrinogen` | 3255-7 | g/L | Clauss method |
| 6 | 05 | Thrombin Time | `label.test.tt.time` | 3243-3 | sec | |

### 4.2 Specialized Coagulation Tests

| # | Rank | ST art Analysis | OpenELIS Test Name Tag | OpenELIS LOINC | Unit | Notes |
|---|------|----------------|----------------------|---------------|------|-------|
| 7 | 04 | Unfrac. Heparin | `label.test.heparin.unfrac` | 3656-0 | U/mL | Anti-Xa activity |
| 8 | 06 | SPA | `label.test.spa` | — | sec | Screening; site-specific LOINC |
| 9 | 07 | Reptilase Time | `label.test.reptilaseTime` | 6683-7 | sec | |
| 10 | 08 | Staclot LA | `label.test.lupusAnticoag` | 34575-1 | sec | Lupus anticoagulant screen |
| 11 | 09 | LMWH | `label.test.heparin.lmw` | 59038-3 | U/mL | Low molecular weight heparin |
| 12 | 18 | Staclot PNP | `label.test.staclotPNP` | — | sec | PNP (Platelet Neutralization) |
| 13 | 23 | Protein S | `label.test.proteinS` | 27820-0 | % | |
| 14 | 24 | Protein C | `label.test.proteinC` | 27818-4 | % | |

### 4.3 Coagulation Factor Assays

| # | Rank | ST art Analysis | OpenELIS Test Name Tag | OpenELIS LOINC | Unit |
|---|------|----------------|----------------------|---------------|------|
| 15 | 12 | Factor II | `label.test.factorII` | 3289-6 | % |
| 16 | 14 | Factor V | `label.test.factorV` | 3193-0 | % |
| 17 | 15 | Factor VII | `label.test.factorVII` | 3198-9 | % |
| 18 | 16 | Factor VII-X | `label.test.factorVIIX` | — | % |
| 19 | 17 | Factor X | `label.test.factorX` | 3218-5 | % |
| 20 | 19 | Factor VIII | `label.test.factorVIII` | 3209-4 | % |
| 21 | 20 | Factor IX | `label.test.factorIX` | 3187-2 | % |
| 22 | 21 | Factor XI | `label.test.factorXI` | 3223-5 | % |
| 23 | 22 | Factor XII | `label.test.factorXII` | 3232-6 | % |

### 4.4 User-Configurable Modes

| # | Rank | ST art Analysis | OpenELIS Test Name Tag | Notes |
|---|------|----------------|----------------------|-------|
| 24 | 10 | Mode 1 | `label.test.stagoMode1` | Site-specific — map to actual test |
| 25 | 11 | Mode 2 | `label.test.stagoMode2` | Site-specific |
| 26 | 25 | Mode 3 | `label.test.stagoMode3` | Site-specific |
| 27 | 26 | Mode 4 | `label.test.stagoMode4` | Site-specific |
| 28 | 29 | Mode 5 | `label.test.stagoMode5` | Site-specific |

### 4.5 Mapping Logic: Rank → Multiple Results

A single ST art message with one Rank code can produce multiple OpenELIS results. The parser must extract the correct value from each field position in the result block:

| Rank | Result Field (pos 10) | Seconds Field (pos 12) | Units Field (pos 13) | INR Field (pos 14) |
|------|----------------------|----------------------|---------------------|-------------------|
| 01 (PT) | % Activity → `label.test.pt.activity` | Clotting time → `label.test.pt.time` | *(same as Result or Units)* | INR → `label.test.pt.inr` |
| 02 (APTT) | Ratio → `label.test.aptt.ratio` | Clotting time → `label.test.aptt.time` | — | — |
| 03 (Fibrinogen) | Concentration → `label.test.fibrinogen` | Clotting time → `label.test.fibrinogen.time` | — | — |
| 05 (TT) | Ratio → `label.test.tt.ratio` | Clotting time → `label.test.tt.time` | — | — |
| 12–22 (Factors) | % Activity → `label.test.factorXX` | Clotting time *(optional)* | — | — |

> **Parser implementation note:** The exact semantics of each positional field (Result, Seconds, Units) depend on the Rank. The parser should use the Rank code to determine which OpenELIS tests to populate from which positions. This mapping table is the core configuration for the adapter.

---

## 5. Parser Implementation Requirements

### 5.1 New Adapter Required

Because the ST art uses a proprietary protocol (not ASTM or HL7), a new analyzer adapter class must be implemented in OpenELIS. This adapter:

1. **Listens** on a configured serial port (or TCP-to-serial bridge)
2. **Extracts frames** by detecting STX...ETX boundaries
3. **Validates checksum** using XOR + OR 0x40 algorithm
4. **Parses fixed-position fields** from the DAT block
5. **Maps Rank code** to OpenELIS test definitions
6. **Extracts multiple results** from a single message (e.g., PT time + % + INR)
7. **Handles result status** codes (accept, flag, or reject)
8. **Matches Patient ID** to OpenELIS accession numbers
9. **Writes results** to the analyzer results queue

### 5.2 Frame Extraction (Pseudocode)

```python
def extract_frame(serial_stream):
    """Read bytes until STX found, then read until ETX."""
    # Wait for STX
    while True:
        byte = serial_stream.read(1)
        if byte == 0x02:  # STX
            break
    
    # Read DAT + CHK until ETX
    dat_buffer = bytearray()
    while True:
        byte = serial_stream.read(1)
        if byte == 0x03:  # ETX
            break
        dat_buffer.append(byte)
    
    # Last byte of dat_buffer is CHK
    chk_received = dat_buffer[-1]
    dat_bytes = dat_buffer[:-1]
    
    # Validate checksum
    chk_calculated = 0x00
    for b in dat_bytes:
        chk_calculated ^= b
    chk_calculated |= 0x40
    
    if chk_calculated != chk_received:
        raise ChecksumError(f"Expected {chk_calculated:#x}, got {chk_received:#x}")
    
    return dat_bytes
```

### 5.3 Field Extraction (Pseudocode)

```python
def parse_dat(dat_bytes):
    """Parse fixed-position fields from DAT block."""
    text = dat_bytes.decode('ascii')
    
    result = {
        'instrument':    text[0:5].strip(),    # "ST4"
        'type':          text[5],               # 'T'
        'mode':          text[6],               # 'R'
        'station':       text[7:9].strip(),     # "1" - " 4"
        'rank':          text[9:11],            # "01" - "29"
        'units':         text[11:16].strip(),   # "sec", "%", "g/l"
        'ref_result':    text[16:24].strip(),   # Reference value (SF)
        'nber':          text[24:26].strip(),   # Number of result blocks
        'patient_id':    text[26:38].strip(),   # 12-char patient/sample ID
    }
    
    # Parse N result blocks starting at offset 38
    n = int(result['nber'])
    offset = 38
    result['results'] = []
    
    for i in range(n):
        block = {
            'result':     text[offset:offset+8].strip(),      # Primary result (SF)
            'status':     text[offset+8],                      # Status code
            'seconds':    text[offset+9:offset+17].strip(),    # Time in seconds (SF)
            'units_val':  text[offset+17:offset+25].strip(),   # Result in units (SF)
            'inr':        text[offset+25:offset+33].strip(),   # INR value (SF)
        }
        result['results'].append(block)
        offset += 33  # Advance to next result block
    
    return result
```

> **IMPORTANT:** The exact byte offsets above are derived from the manual's field-size diagram. They MUST be validated against a real captured message from the ST art. Off-by-one errors in fixed-position parsing will corrupt all downstream fields.

---

## 6. QC Handling

### 6.1 QC Discrimination

The ST art protocol does not have a dedicated QC flag in the message. QC samples are distinguished by the **Patient ID (ID#)** field. The laboratory must use a consistent QC naming convention.

| Method | Description |
|--------|-------------|
| **Patient ID pattern** | QC samples use a reserved ID pattern (e.g., `QC-N`, `QC-A`, `CTRL1`) |
| **Station assignment** | Some labs dedicate a specific station number to QC runs |

OpenELIS should use configurable pattern matching on the Patient ID field to route QC results to the QC module.

### 6.2 Duplicate Determinations

The ST art supports duplicate (paired) measurements. When Nber = 2:

| Result Block | Status | Meaning |
|-------------|--------|---------|
| Block 1 | `D` | First determination |
| Block 2 | `R` | Second determination |

Additionally, a third "result" with status `F` may be transmitted containing the mean of the two determinations. OpenELIS should use the `F` (mean) value as the reported result, and optionally store `D` and `R` values for audit trail.

---

## 7. Error Handling

### 7.1 Result Status-Based Error Handling

| Status Code | Action | OpenELIS Behavior |
|-------------|--------|-------------------|
| `S` (Single complete) | Accept | Store as final result |
| `D` (Duplicate run 1) | Accept | Store; await run 2 |
| `R` (Duplicate run 2) | Accept | Store; pair with run 1 |
| `F` (Duplicate mean) | Accept as final | Store as reported result |
| `E` (Exceeds max time) | Flag error | Store raw value as text with `label.error.exceedsMaxTime` flag |
| `R` (Below min time) | Flag error | Store raw value as text with `label.error.belowMinTime` flag (when Nber=1) |
| `I` (Refused) | Reject | Do NOT store; log as refused |
| `!` (Exceeds margin) | Flag warning | Store result with `label.warning.exceedsMargin` flag |

### 7.2 Communication Errors

| Error | Detection | OpenELIS Action |
|-------|-----------|-----------------|
| Checksum mismatch | CHK validation fails | Discard message; log error with hex dump |
| Incomplete frame | ETX not received within timeout | Discard partial data; log timeout |
| Invalid Rank code | Rank not in 01–29 or not mapped | Log unknown rank; skip message |
| Unparseable result | SF field contains non-numeric data | Store as text result |
| Unknown Patient ID | ID# doesn't match any accession | Hold in unmatched results queue |

### 7.3 No Handshaking Recovery

Since the ST art has **no handshaking** (no ENQ/ACK, no flow control), there is no mechanism to request retransmission. If a message is corrupted:

1. The parser detects the checksum error
2. The message is discarded and logged
3. The operator must **re-send the result from the ST art** (typically by reprinting/retransmitting the result on the instrument)
4. OpenELIS cannot request the retransmission automatically

---

## 8. OpenELIS Analyzer Configuration

### 8.1 Analyzer Registration

Configure in **Admin → Analyzer Administration → Add Analyzer**:

| Field | Value |
|-------|-------|
| `label.analyzer.name` | Stago ST art |
| `label.analyzer.description` | `label.analyzer.stago.start.description` |
| `label.analyzer.protocol` | Stago Proprietary Serial |
| `label.analyzer.connectionType` | Serial (RS-232) |
| `label.analyzer.serialPort` | *(site-specific, e.g., /dev/ttyUSB0)* |
| `label.analyzer.baudRate` | 9600 |
| `label.analyzer.dataBits` | 8 |
| `label.analyzer.stopBits` | 1 |
| `label.analyzer.parity` | None |
| `label.analyzer.flowControl` | None |
| `label.analyzer.adapterClass` | `StagoSTartAdapter` *(new class)* |
| `label.analyzer.active` | true |

### 8.2 Test Mapping Configuration

Each Rank code is mapped to one or more OpenELIS test definitions. The mapping must specify which positional field within the result block maps to which OpenELIS test:

| Configuration Field | Description | Example |
|--------------------|-------------|---------|
| `rank` | 2-digit rank code | `01` |
| `resultField` → OE test | Primary result value | `01.result` → `label.test.pt.activity` |
| `secondsField` → OE test | Time in seconds | `01.seconds` → `label.test.pt.time` |
| `inrField` → OE test | INR value | `01.inr` → `label.test.pt.inr` |

---

## 9. Localization Tags

| Tag | Default (English) | Context |
|-----|-------------------|---------|
| `label.analyzer.stago.start` | Stago ST art | Analyzer name |
| `label.analyzer.stago.start.description` | Stago ST art Semi-Automated Coagulation Analyzer | Description |
| `label.test.pt.time` | PT (Prothrombin Time) | Test name |
| `label.test.pt.activity` | PT % Activity | Test name |
| `label.test.pt.inr` | PT INR | Test name |
| `label.test.aptt.time` | APTT (Activated Partial Thromboplastin Time) | Test name |
| `label.test.aptt.ratio` | APTT Ratio | Test name |
| `label.test.fibrinogen` | Fibrinogen (Clauss) | Test name |
| `label.test.fibrinogen.time` | Fibrinogen Clotting Time | Test name |
| `label.test.tt.time` | TT (Thrombin Time) | Test name |
| `label.test.tt.ratio` | TT Ratio | Test name |
| `label.test.heparin.unfrac` | Unfractionated Heparin | Test name |
| `label.test.heparin.lmw` | LMWH (Low Molecular Weight Heparin) | Test name |
| `label.test.reptilaseTime` | Reptilase Time | Test name |
| `label.test.lupusAnticoag` | Lupus Anticoagulant (Staclot LA) | Test name |
| `label.test.spa` | SPA | Test name |
| `label.test.staclotPNP` | Staclot PNP | Test name |
| `label.test.proteinS` | Protein S Activity | Test name |
| `label.test.proteinC` | Protein C Activity | Test name |
| `label.test.factorII` | Factor II Activity | Test name |
| `label.test.factorV` | Factor V Activity | Test name |
| `label.test.factorVII` | Factor VII Activity | Test name |
| `label.test.factorVIIX` | Factor VII+X Activity | Test name |
| `label.test.factorVIII` | Factor VIII Activity | Test name |
| `label.test.factorIX` | Factor IX Activity | Test name |
| `label.test.factorX` | Factor X Activity | Test name |
| `label.test.factorXI` | Factor XI Activity | Test name |
| `label.test.factorXII` | Factor XII Activity | Test name |
| `label.test.stagoMode1` | Stago Mode 1 (Site-Configured) | Test name |
| `label.test.stagoMode2` | Stago Mode 2 (Site-Configured) | Test name |
| `label.test.stagoMode3` | Stago Mode 3 (Site-Configured) | Test name |
| `label.test.stagoMode4` | Stago Mode 4 (Site-Configured) | Test name |
| `label.test.stagoMode5` | Stago Mode 5 (Site-Configured) | Test name |
| `label.error.exceedsMaxTime` | Result exceeds maximum clotting time | Error flag |
| `label.error.belowMinTime` | Result below minimum clotting time | Error flag |
| `label.warning.exceedsMargin` | Result exceeds acceptable margin | Warning flag |
| `label.error.resultRefused` | Result refused by analyzer | Error flag |
| `label.error.checksumFailed` | Message checksum validation failed | Error log |

---

## 10. Validation Datasets

### 10.1 Synthetic Test Messages

The following hex-annotated messages simulate ST art output for parser development. All use the exact fixed-position format from the manual.

> **Notation:** `<STX>` = 0x02, `<ETX>` = 0x03. Spaces within SF fields are shown as `·` for clarity. CHK values below are illustrative — the actual implementation must compute them.

#### Test Case 1: Normal PT Result (Single Determination)

```
<STX>ST4  TR 101sec  ··12.000 1···1234    ··12.500S··12.500··95.000···1.050<CHK><ETX>
```

**Parsed fields:**

| Field | Value | Interpretation |
|-------|-------|---------------|
| Instrument | `ST4` | — |
| Station | `1` | Station 1 |
| Rank | `01` | PT |
| Units | `sec` | Seconds |
| Ref Result | `12.000` | Reference PT time |
| Nber | `1` | 1 result block |
| ID# | `1234` | Patient/Sample ID |
| Result | `12.500` | % Activity = 95% *(or time, verify)* |
| Status | `S` | Single, completed |
| Seconds | `12.500` | PT clotting time = 12.5 sec |
| Units value | `95.000` | % Activity = 95% |
| INR | `1.050` | INR = 1.05 |

**Expected OpenELIS results:**
- PT Time = 12.5 sec (LOINC 5902-2)
- PT % Activity = 95.0% (LOINC 5894-1)
- PT INR = 1.05 (LOINC 6301-6)

#### Test Case 2: Abnormal APTT (Prolonged)

```
<STX>ST4  TR 102sec  ··30.000 1···5678    ··52.300S··52.300···1.740···0.000<CHK><ETX>
```

**Expected:** APTT Time = 52.3 sec, APTT Ratio = 1.74. INR = 0 (not applicable for APTT).

#### Test Case 3: Fibrinogen

```
<STX>ST4  TR 203g/l  ···3.000 1···9012    ···3.200S··15.800···3.200···0.000<CHK><ETX>
```

**Expected:** Fibrinogen = 3.2 g/L, Fibrinogen time = 15.8 sec.

#### Test Case 4: Error — Exceeds Maximum Time

```
<STX>ST4  TR 105sec  ··14.000 1···3456    ·999.999E·999.999···0.000···0.000<CHK><ETX>
```

**Expected:** TT result stored as text ">999.999", status = Error (exceeds max time).

#### Test Case 5: Duplicate Determination (PT)

```
<STX>ST4  TR 101sec  ··12.000 2···7890    ··12.800D··12.800··92.000···1.070··12.400R··12.400··94.000···1.050<CHK><ETX>
```

**Expected:** Two result blocks. Run 1 (D): PT=12.8s, 92%, INR=1.07. Run 2 (R): PT=12.4s, 94%, INR=1.05. May be followed by a third message with status F (mean).

#### Test Case 6: Refused Result

```
<STX>ST4  TR 302sec  ··30.000 1···4321    ···0.000I···0.000···0.000···0.000<CHK><ETX>
```

**Expected:** Result with status `I` (refused). OpenELIS should NOT store this result.

### 10.2 Validation Checklist

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 1 | Normal PT (time + % + INR) | 3 OE results stored, all Normal | ⬜ |
| 2 | Abnormal APTT (prolonged) | Time + Ratio stored, flagged | ⬜ |
| 3 | Fibrinogen + time | Both results stored | ⬜ |
| 4 | Exceeds max time (E status) | Stored as text, error flagged | ⬜ |
| 5 | Duplicate determination (D + R) | Both runs stored, mean preferred | ⬜ |
| 6 | Refused result (I status) | NOT stored, logged | ⬜ |
| 7 | Checksum validation pass | Frame accepted | ⬜ |
| 8 | Checksum validation fail | Frame rejected, logged | ⬜ |
| 9 | Unknown Patient ID | Held in unmatched queue | ⬜ |
| 10 | Rank not mapped | Logged and skipped | ⬜ |
| 11 | Multiple stations in sequence | Each parsed independently | ⬜ |
| 12 | Factor assay (e.g., Rank 19 = FVIII) | % Activity stored | ⬜ |

---

## 11. Implementation Scope

### 11.1 New Development Required

| Component | Description | Effort Estimate |
|-----------|-------------|-----------------|
| `StagoSTartAdapter` class | New analyzer adapter implementing the proprietary parser | Medium |
| Checksum validator | XOR + OR 0x40 algorithm | Small |
| Fixed-position field extractor | Parse DAT block by byte offsets | Medium |
| Rank-to-test mapping engine | Map rank code + field position to OE test | Small |
| Result status handler | Accept/flag/reject logic per status code | Small |
| Duplicate determination handler | Pair D+R blocks, prefer F (mean) | Small |

### 11.2 Existing Infrastructure Reused

| Component | Description |
|-----------|-------------|
| Serial port listener | Base serial I/O (shared with other serial analyzers) |
| Result writer | Standard OE result insertion |
| Unmatched results queue | Existing queue for unmatched specimen IDs |
| QC routing | Existing pattern-based QC discrimination |
| Analyzer Administration UI | Existing config screens (add new adapter type) |

---

## 12. Risks and Open Questions

| # | Item | Impact | Resolution |
|---|------|--------|------------|
| 1 | **Byte offsets need real-data validation** | Off-by-one error corrupts all fields | Capture a real message from the ST art and verify field boundaries |
| 2 | **Result field semantics per Rank** | Which positional field maps to which result type (time vs % vs ratio) may vary by rank | Test with real output for PT, APTT, Fibrinogen, Factor assays |
| 3 | **Ambiguous R status code** | `R` means "duplicate run 2" OR "below minimum time" depending on context | Use Nber field to disambiguate |
| 4 | **Patient ID field length** | Manual says "4 figures" but field is 12 chars; may contain barcodes | Test with actual barcode input |
| 5 | **Firmware variations** | Manual is V1.0 December 1999; newer ST art firmware may have protocol changes | Verify firmware version on deployed instrument |
| 6 | **Mode ranks (10, 11, 25, 26, 29)** | Unknown test assignments | Must be configured per site after checking instrument setup |
| 7 | **No retransmission mechanism** | Lost messages cannot be automatically recovered | Operator must manually re-send from instrument |

---

## 13. Related Specifications

| Document | Relationship |
|----------|-------------|
| Analyzer Results Import FRS v2.0 | Parent spec — defines the Analyzer Results page workflow |
| Mindray BC-5380 Integration Spec v2.0 | Sibling — HL7 protocol (Pattern D) |
| Mindray BS-series Integration Spec v2.0 | Sibling — HL7 protocol (Pattern D) |
| MinION + TB-Profiler Field Mapping Spec | Sibling — Pipeline output (Pattern B) |
| Analyzer File Upload FRS | Sibling — Flat file upload (Pattern C) |
| Test Catalog FRS v2 | Defines test definitions and analyzer code mappings |
| System Audit Trail FRS | Tracks result receipt events |

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-23 | Claude / Casey | Initial draft — incorrectly assumed ASTM E1381-95 |
| **2.0** | **2026-02-23** | **Claude / Casey** | **Complete rewrite from ST art Service Manual V1.0 Ch.11. Protocol corrected to proprietary fixed-position serial. New integration Pattern E defined. Checksum, message format, rank table, result status codes all from vendor documentation.** |
