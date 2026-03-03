# bioMérieux VIDAS — Field Mapping & Integration Specification

**Version:** 1.0
**Date:** 2026-02-24
**Status:** DRAFT — Awaiting model confirmation & real message captures
**Epic:** OGC-304 (Madagascar Analyzer Integrations)
**Integration Pattern:** E (Proprietary Serial/Network — BCI Protocol)
**Confidence:** MEDIUM-HIGH (protocol structure from VIDAS PC User Manual Ch.10; no real message captures yet)

---

## 1. Instrument Overview

| Attribute | Value |
|-----------|-------|
| Manufacturer | bioMérieux SA (Marcy-l'Étoile, France) |
| Instrument Family | VIDAS® |
| Applicable Models | VIDAS (30-slot), mini VIDAS (12-slot) — same BCI protocol |
| Deployed Model | **TBD — awaiting confirmation from Andry** |
| Technology | Enzyme-Linked Fluorescent Assay (ELFA) |
| Lab Domain | Immunoassay (infectious disease serology, hormones, cardiac markers, autoimmunity) |
| Analytical Sections | VIDAS: 5 sections × 6 positions = 30 slots; mini VIDAS: 2 sections × 6 positions = 12 slots |
| Pilot Software | VIDAS PC (Windows XPe-based), separate from analytical module |
| LIS Interface Software | BCI RS232 (serial) or BCI NET (TCP/IP) — **proprietary bioMérieux protocol** |
| Source Documentation | VIDAS PC User's Manual, Chapter 10: Bidirectional Computer Interface (BCI) |

### 1.1 Critical Architecture Note

The VIDAS system has a **two-component architecture**:

```
┌─────────────────┐    proprietary     ┌──────────────┐     BCI RS232/NET    ┌──────────────┐
│ VIDAS Analytical │ ←───────────────→ │  VIDAS PC    │ ←────────────────→  │  OpenELIS    │
│ Module           │  (internal bus)    │  (pilot PC)  │  (LIS interface)    │  Server      │
└─────────────────┘                     └──────────────┘                     └──────────────┘
     Hardware                           Windows XPe PC                       LIS
```

OpenELIS does NOT communicate directly with the VIDAS analytical module. All communication passes through the **VIDAS PC** pilot software via the **BCI RS232** or **BCI NET** interface.

### 1.2 Protocol Classification — NOT ASTM, NOT HL7

**WARNING:** The VIDAS BCI protocol is a fully proprietary bioMérieux protocol. It uses:

- Pipe-delimited (`|`) fields with 2-character named prefixes (e.g., `pi`, `pn`, `rt`, `qn`)
- ENQ/ACK handshaking (superficially similar to ASTM, but completely different message content)
- STX/ETX message framing with RS record separators and GS checksum
- Named field codes, NOT positional records (no H/P/O/R/L records as in ASTM)

This CANNOT use the existing ASTM or HL7 background services. A custom **VidasBCIAdapter** class is required.

---

## 2. Communication Architecture

### 2.1 Transport Options

The VIDAS PC supports two transport layers for LIS communication:

| Transport | Physical | Port | Bidirectional | Notes |
|-----------|----------|------|--------------|-------|
| **BCI RS232** | RS-232 serial | COM port (configurable) | Yes | Traditional serial cable; requires VIDAS PC COM port |
| **BCI NET** | TCP/IP Ethernet | Configurable port | Yes | Network connection; documented in separate BCI NET manual |

**Recommendation for Madagascar:** Use **BCI RS232** if the deployed VIDAS PC has a serial port, or **BCI NET** if network is preferred. Both use the same application-layer BCI protocol — only the transport differs.

### 2.2 Connection Modes

| Mode | Upload (Results → LIS) | Download (Orders → VIDAS) | Use Case |
|------|----------------------|--------------------------|----------|
| **Unidirectional** | ✅ Enabled | ❌ Disabled | Simple result capture; orders entered manually on VIDAS PC |
| **Bidirectional** | ✅ Enabled | ✅ Enabled | Full integration; OpenELIS sends orders, receives results |

**Recommendation:** Start with **Unidirectional** (result upload only) for initial deployment. Add bidirectional order download as a Phase 2 enhancement.

### 2.3 Message Framing

All BCI messages use the following control character envelope:

```
Phase 1: Handshake
  Sender:   <ENQ>           (0x05 — Enquiry: "ready to send?")
  Receiver: <ACK>           (0x06 — Acknowledge: "go ahead")

Phase 2: Message
  Sender:   <STX>           (0x02 — Start of Text)
            <RS>field1|field2|field3|...    (0x1E — Record Separator + pipe-delimited fields)
            <RS>field4|field5|...           (continuation records)
            <GS>cc          (0x1D — Group Separator + 2-char checksum)
            <ETX>           (0x03 — End of Text)
  Receiver: <ACK>           (0x06 — message received OK)

Phase 3: Termination
  Sender:   <EOT>           (0x04 — End of Transmission)
```

| Control Char | Hex | Purpose |
|-------------|-----|---------|
| ENQ | 0x05 | Request to send |
| ACK | 0x06 | Positive acknowledgment |
| NAK | 0x15 | Negative acknowledgment (retry) |
| STX | 0x02 | Start of message content |
| ETX | 0x03 | End of message content |
| EOT | 0x04 | End of transmission session |
| RS | 0x1E | Record separator within message |
| GS | 0x1D | Group separator — precedes 2-char checksum |

### 2.4 Checksum

The `<GS>` is followed by a **2-character checksum** (e.g., `ec`, `ab`). The exact algorithm is not documented in the User Manual and is described as proprietary to the bioMérieux connection protocol.

**Open Risk:** Checksum algorithm must be reverse-engineered from real message captures or obtained from bioMérieux technical documentation. For initial implementation, log the checksum but do not validate it until the algorithm is confirmed.

### 2.5 Character Set and Encoding

| Parameter | Value |
|-----------|-------|
| Character Set | ISO 8859-1 (Latin-1) |
| Field Separator | `\|` (pipe, 0x7C) |
| Date Separator | `/` (configurable) |
| Time Separator | `:` (configurable) |
| Date Format | Configurable: DD/MM/YYYY (default), MM/DD/YYYY, YYYY/MM/DD |
| Case | Configurable: As-is (default), Upper, Lower |
| Fixed/Variable Length | Configurable per link |

---

## 3. BCI Field Definitions

### 3.1 Field Prefix Codes

Each field in a BCI message is identified by a **2-character prefix** followed immediately by the field value:

| Prefix | Field Name | Direction | Description |
|--------|-----------|-----------|-------------|
| `mt` | Message Type | Both | `mpr` = order request (download), `rsl` = result (upload) |
| `pi` | Patient ID | Both | Patient identifier (up to 12 chars) |
| `pn` | Patient Name | Both | Patient name |
| `pb` | Patient Birthdate | Both | Date of birth (format per config) |
| `ps` | Patient Sex | Both | `M` or `F` |
| `so` | Sample Origin | Both | Laboratory origin code (multi-lab support) |
| `si` | Specimen ID | Both | Specimen identifier (alternate) |
| `ci` | Sample Identifier | Both | Primary sample ID / barcode (up to 12 chars) — **primary matching field** |
| `rt` | Requested Test | Both | VIDAS assay code (2-4 chars, e.g., `HCG`, `HAVT`, `TOXG`) |
| `rn` | Result Name | Upload | Result assay name |
| `tt` | Test Time | Upload | Time of result (HH:MM) |
| `td` | Test Date | Upload | Date of result (format per config) |
| `ql` | Qualitative Result | Upload | Qualitative interpretation (present for qualitative assays) |
| `qn` | Quantitative Result | Upload | Numeric result with units (e.g., `28,94mUI/ml`) |
| `y3` | Result Units | Upload | Units string (e.g., `mUI/ml`, `ng/ml`, `IU/ml`) |
| `qd` | Dilution | Both | Dilution factor (e.g., `1`, `1:1`, `1:10`) |
| `nc` | Calibration Status | Upload | Calibration/control status mnemonic |

### 3.2 Calibration Status Mnemonics (nc field)

| Mnemonic | Designation | Condition | OpenELIS Handling |
|----------|------------|-----------|-------------------|
| `valid` | Calibration validated | All calibration and controls OK | Accept result normally |
| `lotexp` | Lot expired | Reagent lot has expired | Flag result with warning |
| `calexp` | Calibration expired | Calibration has expired | Flag result with warning |
| `contneff` | Control not run | At least 1 control (C1/C2/C3) not present | Flag result with warning |
| `calinc` | Calibration not completed | Calibration invalid or not present | Flag result — may require review |
| `conthnor` | Control out of range | Control result out of acceptable range | Flag result — QC failure |
| `conthwst` | Control out of Westgard | QC result violates Westgard rules | Flag result — QC failure |

### 3.3 Message Type Examples

#### Result Upload (VIDAS PC → OpenELIS)

From VIDAS PC User Manual, p. 10-26:

```
<ENQ>
<ACK>
<STX>
<RS>mtrsl|pi990519001|pnPATIENT001|pb12/01/1963|psF|so2|si|ci990519001|rtHCG|rnHCG|
<RS>tt15:09|td20/05/1999|ql|qn28,94mUI/ml|y3mUI/ml|qd1:1|ncvalid|
<GS>ab
<ETX>
<ACK>
<EOT>
```

**Parsed fields:**

| Prefix | Value | Meaning |
|--------|-------|---------|
| mt | `rsl` | Result message |
| pi | `990519001` | Patient ID |
| pn | `PATIENT001` | Patient name |
| pb | `12/01/1963` | Date of birth |
| ps | `F` | Female |
| so | `2` | Origin lab 2 |
| si | (empty) | No alternate specimen ID |
| ci | `990519001` | Sample barcode |
| rt | `HCG` | Test: HCG (β-hCG) |
| rn | `HCG` | Result name |
| tt | `15:09` | Test time |
| td | `20/05/1999` | Test date |
| ql | (empty) | No qualitative flag (quantitative assay) |
| qn | `28,94mUI/ml` | Quantitative result: 28.94 mIU/mL |
| y3 | `mUI/ml` | Units |
| qd | `1:1` | Undiluted |
| nc | `valid` | Calibration OK |

#### Order Download (OpenELIS → VIDAS PC)

From VIDAS PC User Manual, p. 10-25:

```
<ENQ>
<ACK>
<STX>
<RS>mtmpr|pi990519001|pnPATIENT001|pb12/01/1963|psF|so2|si|ci990519001
<RS>|rtHCG|qd1|
<GS>ec
<ETX>
<ACK>
<EOT>
```

**Note:** Order download is Phase 2 scope. Unidirectional (result upload only) is Phase 1.

---

## 4. Result Parsing Rules

### 4.1 Quantitative Result Extraction

The `qn` field contains the numeric value concatenated with the units string. Parsing must:

1. Separate the numeric portion from the units portion
2. Handle European decimal format (comma `,` instead of period `.`)
3. Handle range prefixes: `>` (above range), `<` (below range)

**Algorithm:**
```
Input: qn = "28,94mUI/ml"
1. Read characters until first non-numeric/non-comma/non-sign char → "28,94"
2. Replace comma with period → "28.94"
3. Parse as float → 28.94
4. Remainder is units → "mUI/ml" (cross-check with y3 field)
```

**Edge cases:**
- `qn = ">500,00mUI/ml"` → value = 500.00, flag = "above upper limit"
- `qn = "<0,10ng/ml"` → value = 0.10, flag = "below lower limit"
- `qn = (empty)` → qualitative assay, use `ql` field instead

### 4.2 Qualitative Result Handling

For qualitative assays (e.g., HAV IgM, HIV screening), the `ql` field contains the interpretation:

| ql Value | Meaning | OpenELIS Result |
|----------|---------|-----------------|
| `POS` or `POSITIVE` | Positive/Reactive | Positive |
| `NEG` or `NEGATIVE` | Negative/Non-reactive | Negative |
| `EQU` or `EQUIVOCAL` | Equivocal/Indeterminate | Equivocal |

**Note:** Exact strings in `ql` field need confirmation from real message captures. The manual describes qualitative results as "test values" (TV) with interpretation thresholds, but the BCI transmission format for these values requires real-data verification.

### 4.3 Sample Matching

OpenELIS matches incoming results to orders using the **`ci` (Sample Identifier)** field:

1. Extract `ci` value from incoming BCI result message
2. Look up the accession number in OpenELIS
3. Match `rt` (test code) to the ordered test
4. If no match found → route to **Unmatched Results Queue** for manual resolution

The `pi` (Patient ID) field serves as a secondary verification — if `ci` matches but `pi` does not, flag the result for review.

---

## 5. VIDAS Assay Code → OpenELIS Test Mapping

The VIDAS uses 2-4 character **assay codes** (the `rt` and `rn` fields). The following table maps common VIDAS assay codes to OpenELIS tests and LOINC codes.

**Note:** The exact assay menu depends on the reagent kits loaded at the Madagascar site. This table covers the most commonly deployed VIDAS assays. Site-specific configuration will be required.

### 5.1 Infectious Disease Serology

| VIDAS Code | Assay Name | Result Type | LOINC | OpenELIS Test Name |
|------------|-----------|-------------|-------|-------------------|
| `TOXG` | Toxoplasma IgG | Quantitative (IU/mL) | 8039-9 | `label.test.toxo.igg` |
| `TOXM` | Toxoplasma IgM | Qualitative (index) | 6945-0 | `label.test.toxo.igm` |
| `RUBG` | Rubella IgG | Quantitative (IU/mL) | 8014-2 | `label.test.rubella.igg` |
| `RUBM` | Rubella IgM | Qualitative (index) | 5334-5 | `label.test.rubella.igm` |
| `HBSG` | HBs Ag | Qualitative | 5196-8 | `label.test.hbsag` |
| `ANTI` | Anti-HBs | Quantitative (mIU/mL) | 16935-9 | `label.test.antihbs` |
| `HBC` | Anti-HBc Total | Qualitative | 16933-4 | `label.test.antihbc.total` |
| `HBCM` | Anti-HBc IgM | Qualitative | 31204-1 | `label.test.antihbc.igm` |
| `HCV` | Anti-HCV | Qualitative | 16128-1 | `label.test.antihcv` |
| `HIV` | HIV Duo Ultra | Qualitative | 56888-1 | `label.test.hiv.combo` |
| `HAVT` | HAV Total | Qualitative | 5179-3 | `label.test.hav.total` |
| `HAVM` | HAV IgM | Qualitative | 5183-5 | `label.test.hav.igm` |
| `CMV` | CMV IgG | Quantitative (AU/mL) | 5124-9 | `label.test.cmv.igg` |
| `CMVM` | CMV IgM | Qualitative (index) | 5126-4 | `label.test.cmv.igm` |
| `WIDA` | Widal (Salmonella) | Qualitative | 5331-1 | `label.test.widal` |
| `STPH` | Staphylococcal markers | Qualitative | — | `label.test.staph` |

### 5.2 Hormones & Fertility

| VIDAS Code | Assay Name | Result Type | LOINC | OpenELIS Test Name |
|------------|-----------|-------------|-------|-------------------|
| `HCG` | β-hCG | Quantitative (mIU/mL) | 21198-7 | `label.test.bhcg` |
| `TSH` | TSH | Quantitative (µIU/mL) | 11580-8 | `label.test.tsh` |
| `FT4` | Free T4 | Quantitative (pmol/L) | 3024-7 | `label.test.ft4` |
| `FT3` | Free T3 | Quantitative (pmol/L) | 3051-0 | `label.test.ft3` |
| `PSA` | PSA Total | Quantitative (ng/mL) | 2857-1 | `label.test.psa` |
| `FPSA` | Free PSA | Quantitative (ng/mL) | 10886-0 | `label.test.fpsa` |
| `TPSA` | PSA Ratio | Calculated (%) | 12841-3 | `label.test.psa.ratio` |
| `ESTD` | Estradiol | Quantitative (pg/mL) | 2243-4 | `label.test.estradiol` |
| `PRGE` | Progesterone | Quantitative (ng/mL) | 2839-9 | `label.test.progesterone` |
| `LH` | LH | Quantitative (mIU/mL) | 10501-5 | `label.test.lh` |
| `FSH` | FSH | Quantitative (mIU/mL) | 15067-2 | `label.test.fsh` |
| `PROL` | Prolactin | Quantitative (ng/mL) | 2842-3 | `label.test.prolactin` |

### 5.3 Cardiac & Emergency Markers

| VIDAS Code | Assay Name | Result Type | LOINC | OpenELIS Test Name |
|------------|-----------|-------------|-------|-------------------|
| `TNIU` | Troponin I Ultra | Quantitative (ng/mL) | 42757-5 | `label.test.troponin.i` |
| `DDIR` | D-Dimer Exclusion | Quantitative (ng/mL FEU) | 48065-7 | `label.test.ddimer` |
| `BNP2` | BNP | Quantitative (pg/mL) | 42637-9 | `label.test.bnp` |
| `PCT` | Procalcitonin | Quantitative (ng/mL) | 33959-8 | `label.test.pct` |
| `CRP` | CRP | Quantitative (mg/L) | 1988-5 | `label.test.crp` |

### 5.4 Internal Controls (Not Patient Results)

| VIDAS Code | Purpose | OpenELIS Handling |
|------------|---------|-------------------|
| `QCV` | Quality Control VIDAS (pipette/optical check) | Route to QC module, not patient results |
| `S` + any assay code | Calibrator/Standard run | Route to QC module |
| `C1`, `C2`, `C3` | Internal kit controls | Evaluate per lot; route to QC module |

---

## 6. QC Handling

### 6.1 Identifying QC vs Patient Results

The BCI protocol does not use a separate message type for QC results. QC samples are identified by:

1. **Sample ID prefix:** Calibrators use `S` prefix in the `ci` field; controls use `C1`, `C2`, `C3`
2. **nc field:** The calibration status field provides QC-relevant status codes
3. **VIDAS assay code:** `QCV` (Quality Control VIDAS) is a dedicated QC test

### 6.2 QC Routing Rules

| Condition | Action |
|-----------|--------|
| `ci` starts with `S` | Route to QC module as calibrator |
| `ci` = `C1`, `C2`, or `C3` | Route to QC module as kit control |
| `rt` = `QCV` | Route to QC module as instrument QC |
| `nc` ≠ `valid` | Flag patient result with appropriate warning |
| `nc` = `conthnor` or `conthwst` | Flag result as QC failure; may require review before release |

---

## 7. Alternative Integration Path: CSV Export

The VIDAS PC software can also export results as **CSV files** (Comma Separated Value) from the Results menu. This provides a simpler, lower-risk integration path using the existing Analyzer File Upload Screen (OGC-324).

### 7.1 CSV Export Procedure

1. On VIDAS PC: Results menu → select results → Export icon → Save as .csv
2. Transfer .csv file to OpenELIS server (USB, network share, etc.)
3. Upload via Analyzer File Upload Screen (OGC-324)

### 7.2 CSV Field Mapping

The CSV export includes the same fields visible in the Results menu:

| CSV Column | Content | Maps To |
|------------|---------|---------|
| Or. | Origin | Sample origin code |
| Name | Patient name | Patient name |
| Patient ID | Patient identifier | Accession number |
| Sample | Sample ID | Sample barcode |
| Assay | VIDAS assay code | Test code (see Section 5) |
| Result | Numeric value | Test result |
| Unit | Result units | Units |
| Dil. | Dilution factor | Dilution |
| Interp. | Interpretation (qual.) | Qualitative result |
| Status | Calibration/control status | QC flags |
| Date | Completion date/time | Result date |
| Section Nr. | Section number | Instrument section |
| Position | Position in section | Instrument position |

### 7.3 Recommended Phased Approach

| Phase | Integration Path | Effort | Risk |
|-------|-----------------|--------|------|
| **Phase 1** | CSV Export → File Upload (OGC-324) | Low — uses existing infrastructure | Low — manual step required |
| **Phase 2** | BCI RS232/NET → Custom Adapter | High — new VidasBCIAdapter class | Medium — checksum algorithm unknown |

**Recommendation:** Implement Phase 1 (CSV export) first to deliver immediate value. Phase 2 (real-time BCI) can follow once checksum algorithm is confirmed and real message captures are available.

---

## 8. Validation Test Messages

The following synthetic messages simulate VIDAS BCI result uploads. Use these to develop and test the BCI parser.

**⚠️ SYNTHETIC — based on manual examples. Must validate against real captures.**

### Test Message 1: Quantitative Result (HCG)
```
<ENQ>
<ACK>
<STX>
<RS>mtrsl|pi20260001|pnDOE,JANE|pb15/03/1990|psF|so1|si|ci20260001|rtHCG|rnHCG|
<RS>tt10:30|td24/02/2026|ql|qn1250,00mUI/ml|y3mUI/ml|qd1:1|ncvalid|
<GS>xx
<ETX>
<ACK>
<EOT>
```

### Test Message 2: Qualitative Positive (HIV Combo)
```
<ENQ>
<ACK>
<STX>
<RS>mtrsl|pi20260002|pnSMITH,JOHN|pb22/07/1985|psM|so1|si|ci20260002|rtHIV|rnHIV|
<RS>tt11:15|td24/02/2026|qlPOS|qn2,45|y3|qd1:1|ncvalid|
<GS>xx
<ETX>
<ACK>
<EOT>
```

### Test Message 3: Qualitative Negative (HBs Ag)
```
<ENQ>
<ACK>
<STX>
<RS>mtrsl|pi20260003|pnRABE,HERY|pb01/01/1975|psM|so1|si|ci20260003|rtHBSG|rnHBSG|
<RS>tt12:00|td24/02/2026|qlNEG|qn0,08|y3|qd1:1|ncvalid|
<GS>xx
<ETX>
<ACK>
<EOT>
```

### Test Message 4: Expired Calibration Warning
```
<ENQ>
<ACK>
<STX>
<RS>mtrsl|pi20260004|pnRAKOTO,LALA|pb10/06/1988|psF|so1|si|ci20260004|rtTOXG|rnTOXG|
<RS>tt14:30|td24/02/2026|ql|qn185,00IU/ml|y3IU/ml|qd1:1|nccalexp|
<GS>xx
<ETX>
<ACK>
<EOT>
```

### Test Message 5: Control Out of Range (QC Failure)
```
<ENQ>
<ACK>
<STX>
<RS>mtrsl|pi20260005|pnANDRY,FARA|pb05/12/1992|psM|so1|si|ci20260005|rtTSH|rnTSH|
<RS>tt09:45|td24/02/2026|ql|qn3,850uIU/ml|y3uIU/ml|qd1:1|ncconthnor|
<GS>xx
<ETX>
<ACK>
<EOT>
```

### Test Message 6: Above-Range Result
```
<ENQ>
<ACK>
<STX>
<RS>mtrsl|pi20260006|pnRAZA,VOAHANGY|pb18/09/1970|psF|so1|si|ci20260006|rtHCG|rnHCG|
<RS>tt16:00|td24/02/2026|ql|qn>500000,00mUI/ml|y3mUI/ml|qd1:1|ncvalid|
<GS>xx
<ETX>
<ACK>
<EOT>
```

---

## 9. Development Scope

### 9.1 New Components Required

| Component | Description |
|-----------|-------------|
| **VidasBCIAdapter** | Main adapter class: serial/TCP listener, ENQ/ACK handshaking, message extraction |
| **BCIMessageParser** | Parse STX…ETX message: extract RS records, split pipe-delimited fields, decode named prefixes |
| **BCIFieldMapper** | Map VIDAS field prefixes (pi, ci, rt, qn, etc.) to OpenELIS data model |
| **VidasTestCodeMapper** | Map VIDAS assay codes (HCG, TOXG, HIV, etc.) to OpenELIS test IDs |
| **VidasQnParser** | Parse quantitative result field: separate value from units, handle European decimals, range flags |
| **BCIChecksumValidator** | Validate GS checksum (algorithm TBD — log-only until confirmed) |
| **VidasCSVParser** | Parse VIDAS PC CSV export format for Phase 1 file upload integration |
| **BCICalibrationStatusHandler** | Interpret nc field mnemonics and set appropriate OpenELIS result flags |

### 9.2 Shared Infrastructure Dependencies

| Dependency | Story | Status |
|------------|-------|--------|
| Serial port I/O library | Shared with Stago ST art (OGC-330) | Needed |
| Analyzer Results Import | Existing OpenELIS module | Available |
| Analyzer File Upload Screen | OGC-324 | In development |
| Test Catalog | Existing | VIDAS assays must be configured |
| QC Module | Existing | Must support VIDAS QC routing |

---

## 10. Open Risks and Unknowns

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | **Deployed model unknown** (VIDAS vs mini VIDAS) | Affects section count and possibly firmware version | Andry to confirm model on-site |
| 2 | **BCI checksum algorithm unknown** | Cannot validate message integrity | Log checksum, don't validate until algorithm confirmed; request algorithm from bioMérieux technical support |
| 3 | **Qualitative result format unconfirmed** | ql field contents may differ from assumed POS/NEG/EQU | Need real message captures |
| 4 | **European decimal handling** | Comma vs period decimal separator depends on VIDAS PC locale | Parser must handle both; confirm VIDAS PC locale at site |
| 5 | **Date format configuration** | VIDAS PC date format is configurable (6 options) | Must match OpenELIS parser config to VIDAS PC setting |
| 6 | **Assay menu unknown** | Don't know which reagent kits are loaded at Madagascar | Andry to provide list of active assays |
| 7 | **No real message captures** | Synthetic test messages may not match actual output | Capture real BCI RS232 traffic during site visit |
| 8 | **BCI NET vs RS232 choice** | Transport decision affects infrastructure | Confirm available ports on VIDAS PC and network topology |
| 9 | **Fixed vs variable length fields** | VIDAS PC link config allows fixed or variable length | Must match OpenELIS parser to VIDAS PC link setting |
| 10 | **CSV export column order** | CSV format not fully documented | Need sample CSV export file from VIDAS PC |

---

## 11. Validation Checklist

| # | Validation Step | Expected Result |
|---|----------------|-----------------|
| 1 | Connect to VIDAS PC via BCI RS232 or BCI NET | Connection established, S indicator green |
| 2 | ENQ/ACK handshake completes | VIDAS PC responds ACK within timeout |
| 3 | Receive STX…ETX message frame | Full message extracted including GS checksum |
| 4 | Parse RS-delimited records | All pipe-delimited fields extracted correctly |
| 5 | Extract `ci` field and match to OpenELIS order | Patient sample matched correctly |
| 6 | Extract `rt` field and map to OpenELIS test | Correct test identified via assay code mapping |
| 7 | Parse `qn` field for quantitative result | Numeric value and units separated correctly |
| 8 | Parse `ql` field for qualitative result | POS/NEG/EQU interpreted correctly |
| 9 | Handle European decimal format | Comma-decimal values parsed as floats |
| 10 | Handle above/below range results (>, <) | Range flags set, numeric value stored |
| 11 | Interpret `nc` field calibration status | Correct warning flags applied |
| 12 | Route QC samples (S, C1-C3, QCV) to QC module | QC results not stored as patient results |
| 13 | Handle unmatched sample ID | Result queued in Unmatched Results Queue |
| 14 | **Phase 1:** Parse CSV export file | All columns mapped correctly |
| 15 | Retransmission: VIDAS PC retransmits result | Duplicate detected and handled (no double-entry) |

---

## Appendix A: Localization Tags

All UI strings related to VIDAS integration must use localization tags:

| Tag | Default (en) |
|-----|-------------|
| `label.analyzer.vidas` | VIDAS |
| `label.analyzer.vidas.mini` | mini VIDAS |
| `label.analyzer.vidas.bci` | BCI Connection |
| `label.analyzer.vidas.bci.status.connected` | Connected |
| `label.analyzer.vidas.bci.status.disconnected` | Disconnected |
| `label.analyzer.vidas.bci.upload` | Result Upload |
| `label.analyzer.vidas.bci.download` | Order Download |
| `label.analyzer.vidas.calibration.valid` | Calibration Valid |
| `label.analyzer.vidas.calibration.expired` | Calibration Expired |
| `label.analyzer.vidas.calibration.lotexpired` | Lot Expired |
| `label.analyzer.vidas.calibration.controlnotrun` | Control Not Run |
| `label.analyzer.vidas.calibration.incomplete` | Calibration Incomplete |
| `label.analyzer.vidas.calibration.controloor` | Control Out of Range |
| `label.analyzer.vidas.calibration.westgard` | Control Westgard Violation |
| `label.analyzer.vidas.result.aboverange` | Above Measurement Range |
| `label.analyzer.vidas.result.belowrange` | Below Measurement Range |
| `label.analyzer.vidas.csv.import` | VIDAS CSV Import |
| `label.analyzer.vidas.csv.parse.error` | CSV Parse Error |

## Appendix B: Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-24 | Casey (via Claude) | Initial spec from VIDAS PC User Manual Ch.10 |
