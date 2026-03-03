# Cepheid GeneXpert Dx System — ASTM E1394-97 Integration Specification

**Version:** 1.0  
**Date:** 2025-02-25  
**Status:** Draft — Ready for Development Review  
**Protocol:** ASTM E1394-97 over TCP/IP (ASTM E-1381 lower-level transport)  
**Confidence:** HIGH — Based on GeneXpert LIS Interface Protocol Specification (301-2002, Rev. E, Dec 2014)  
**Reference Documents:** GeneXpert LIS Interface Protocol Specification (301-2002 Rev. E); GeneXpert Dx System Operator Manual Rev. L (301-0045)

---

## 1. Instrument Overview

| Field | Value |
|-------|-------|
| **Manufacturer** | Cepheid (a Danaher company) |
| **Model** | GeneXpert Dx System |
| **Discipline** | Molecular diagnostics — real-time PCR |
| **Communication Protocol** | ASTM E1394-97 (message layer) over ASTM E-1381 (transport layer) over TCP/IP |
| **Alternative Protocol** | HL7 v2.5 (selectable, covered in separate spec) |
| **Connection Modes** | LIS as server / GX as client, or LIS as client / GX as server |
| **Port** | Configurable (1024–65535), must not conflict with instrument port |
| **Barcode Support** | Yes — scanner-triggered Host Query |
| **Bidirectional** | Yes — GX-initiated order query, GX-initiated result upload, LIS-initiated result request |
| **ISID Support** | Optional — Instrument Specimen ID for labs that reuse Specimen IDs |
| **Software Versions** | GeneXpert Dx v4.6+, Infinity-48 Xpertise v4.6+, Infinity Xpertise v6.2+ |

### 1.1 Common Assays

| Assay | Type | Result Structure |
|-------|------|-----------------|
| Xpert MTB/RIF | Multi-result | MTB detection + RIF resistance |
| Xpert MTB/RIF Ultra | Multi-result | MTB detection (trace+) + RIF resistance |
| Xpert HIV-1 Viral Load | Single-result (quantitative) | Copies/mL + LOG |
| Xpert HCV Viral Load | Single-result (quantitative) | IU/mL + LOG |
| Xpert HBV Viral Load | Single-result (quantitative) | IU/mL + LOG |
| Xpert CT/NG | Multi-result | CT detection + NG detection |
| Xpert Flu/RSV | Multi-result | Flu A + Flu B + RSV |
| Xpert GBS | Single-result (qualitative) | POSITIVE / NEGATIVE |
| Xpert Xpress SARS-CoV-2 | Multi-result | SARS-CoV-2 detection |
| Xpert Carba-R | Multi-result | KPC, NDM, VIM, IMP-1, OXA-48 |

> **Note:** The exact assay menu varies by site configuration. Test codes are configured per-assay in the GeneXpert "Define Test Code" dialog and must match the OpenELIS analyzer test code mapping.

---

## 2. Communication Architecture

### 2.1 Physical Layer

The GeneXpert LIS interface is built on TCP/IP. Both systems must reside on the same network. Data is transmitted in clear text (no TLS). A dedicated NIC on the GeneXpert PC is recommended for LIS connectivity.

### 2.2 Transport Layer — ASTM E-1381

The lower-level transport uses the ASTM E-1381 character-oriented protocol with half-duplex, stop-and-wait framing.

**Frame structure:**

```
Intermediate frame: <STX> FN Text <ETB> C1 C2 <CR> <LF>
End frame:          <STX> FN Text <ETX> C1 C2 <CR> <LF>
```

Where FN = frame number (1–7, cycling), C1C2 = two-character hex checksum.

**Session phases:**

| Phase | Description |
|-------|-------------|
| Establishment | Sender transmits `<ENQ>`, receiver replies `<ACK>` |
| Transfer | Sender transmits frames, receiver replies `<ACK>` or `<NAK>` per frame |
| Termination | Sender transmits `<EOT>` to release the link |

**Timeouts:**

| Timeout | Duration | Action |
|---------|----------|--------|
| Sender: no `<ACK>` after `<ENQ>` | 15 seconds | Retry up to 6 times, then abort |
| Receiver: no frame after `<ACK>` | 30 seconds | Abort session |
| Sender: no `<ACK>` after frame | 15 seconds | Retry frame up to 6 times |
| Receiver: contention (both send `<ENQ>`) | 1–15 seconds random | Receiver sends `<ENQ>` after wait |

**Error recovery:** A `<NAK>` causes the sender to retransmit the frame (same frame number). After 6 failed retransmissions, the sender aborts by sending `<EOT>`.

### 2.3 Message Layer — ASTM E1394-97

**Delimiters (defined in Header record field 2):**

| Delimiter | Character | ASCII | Purpose |
|-----------|-----------|-------|---------|
| Field | `\|` (pipe) | 124 | Separates adjacent fields |
| Repeat | `@` | 64 | Separates repeated values within a field |
| Component | `^` | 94 | Separates components within a field |
| Escape | `\` | 92 | Escape character for special sequences |
| Record | `<CR>` | 13 | Terminates each record |

**Standard delimiter definition string:** `@^\`

### 2.4 Data Flow Summary

```
┌─────────────────┐                          ┌──────────────┐
│   OpenELIS       │                          │  GeneXpert   │
│   (LIS Host)     │                          │  Dx System   │
│                  │                          │              │
│  ┌────────────┐  │  ←── Q (Query All) ────  │  Auto/Manual │
│  │ Order      │  │  ── H,P,O,L (Orders) ──→ │  Download    │
│  │ Response   │  │                          │              │
│  └────────────┘  │  ←── H,P,O,R,C,L ──────  │  Result      │
│  ┌────────────┐  │       (Results)           │  Upload      │
│  │ Result     │  │                          │              │
│  │ Receive    │  │  ── Q (Result Req) ────→  │              │
│  └────────────┘  │  ←── H,P,O,R,C,L ──────  │  Result      │
│  ┌────────────┐  │       (Results)           │  Response    │
│  │ Result     │  │                          │              │
│  │ Request    │  │  ── H,P,O,L ──────────→  │  REJECTED    │
│  └────────────┘  │    (Unsolicited Orders)   │  (NOT        │
│                  │                          │  SUPPORTED)  │
└─────────────────┘                          └──────────────┘
```

> **CRITICAL:** The GeneXpert does **not** support unsolicited order download from the LIS. All order download is GeneXpert-initiated via query. If OpenELIS sends orders without a pending query, the GeneXpert rejects them.

---

## 3. ASTM Message Scenarios

### 3.1 Scenario Matrix

| # | Scenario | Initiator | Direction | OpenELIS Role | Section |
|---|----------|-----------|-----------|---------------|---------|
| 1 | Query for all test orders | GeneXpert | GX → LIS | Respond with available orders | 3.2 |
| 2 | Host Query for specific sample | GeneXpert | GX → LIS | Respond with matching orders | 3.3 |
| 3 | Return Instrument Specimen ID | GeneXpert | GX → LIS | Store ISID mapping | 3.4 |
| 4 | Upload test results | GeneXpert | GX → LIS | Receive and store results | 3.5 |
| 5 | Request test results | LIS | LIS → GX | Query GX for results | 3.6 |
| 6 | Unsolicited order download | LIS | LIS → GX | **NOT SUPPORTED — do not send** | — |

### 3.2 GeneXpert Queries for All Test Orders

**Trigger:** Automatic timer or manual "Query All" on GeneXpert.

**Step 1 — GX sends Query (Upload):**

```
H|@^\|<MessageID>||<SystemID>^GeneXpert^<Version>|||||<HostID>||P|1394-97|<DateTime>
Q|1|||||||||||||O@N
L|1|N
```

**Step 2 — OpenELIS responds with orders (Download):**

```
H|@^\|<MessageID>||<HostID>|||||<SystemID>^GeneXpert^<Version>||P|1394-97|<DateTime>
P|1|||<PatientID2>||<PatientID1>|<LastName>^<FirstName>^<MiddleName>||<DOB>|<Sex>
O|1|<SpecimenID>||^^^<TestCode>|<Priority>|<OrderDateTime>|||||A||||ORH||||||||||Q
O|2|<SpecimenID>||^^^<TestCode2>|R|<OrderDateTime>|||||A||||ORH||||||||||Q
P|2|||<PatientID2-B>||<PatientID1-B>
O|1|<SpecimenID-B>||^^^<TestCode>|R|<OrderDateTime>|||||A||||ORH||||||||||Q
L|1|F
```

**Step 2 (alt) — OpenELIS responds with no orders:**

```
H|@^\|<MessageID>||<HostID>|||||<SystemID>^GeneXpert^<Version>||P|1394-97|<DateTime>
L|1|I
```

> **Timeout:** If OpenELIS does not respond within 60 seconds, the GeneXpert assumes no orders are available and cancels the request. Always respond promptly, even if no orders exist.

### 3.3 GeneXpert Host Query for Specific Sample

**Trigger:** User scans barcode or enters Sample ID on GeneXpert (when "Automatic Host Query After Sample ID Scan" is enabled).

**Step 1 — GX sends Host Query (Upload):**

```
H|@^\|<MessageID>||<SystemID>^GeneXpert^<Version>|||||<HostID>||P|1394-97|<DateTime>
Q|1|<PatientID1>^<SpecimenID>^<ISID>||||||||||O@N
L|1|N
```

The Q record field 3 contains: `PatientID1^SpecimenID^InstrumentSpecimenID`. For multiple specimens, repeat with `@` delimiter: `PatID^Spec1^ISID1@PatID^Spec2^ISID2`.

**Step 2 — OpenELIS responds** using the same order format as section 3.2.

### 3.4 GeneXpert Returns Instrument Specimen ID

**Trigger:** After order download, if "Use Instrument Specimen ID" is enabled.

**GX sends ISID mapping (Upload):**

```
H|@^\|<MessageID>||<SystemID>^GeneXpert^<Version>|||||<HostID>||P|1394-97|<DateTime>
P|1
O|1|<SpecimenID>|<InstrumentSpecimenID>||||||||P||||ORH||||||||||I
P|2
O|1|<SpecimenID-2>|<InstrumentSpecimenID-2>||||||||P||||ORH||||||||||I
L|1|N
```

OpenELIS must store the Specimen ID ↔ ISID mapping. All subsequent messages about this specimen will reference both identifiers.

### 3.5 GeneXpert Uploads Test Results

**Trigger:** Automatic (after test completion) or manual upload.

This is the primary result flow. The GeneXpert sends results in `H|P|O|C|R|L` message structure. See Section 4 for detailed field mappings.

### 3.6 LIS Requests Test Results

**Trigger:** OpenELIS initiates a result query to the GeneXpert.

**Step 1 — OpenELIS sends result request (Download):**

```
H|@^\|<MessageID>||LIS|||||<SystemID>^GeneXpert^<Version>||P|1394-97|<DateTime>
Q|1|<PatientID1>^<SpecimenID>^<ISID>^<PatientID2>^<TestCode>||||||||F
L|1|N
```

Q record field 3 components:
1. Patient ID 1 (optional)
2. Specimen ID (required, repeatable with `@`)
3. Instrument Specimen ID (required if ISID enabled, repeatable with `@`)
4. Patient ID 2 (optional)
5. Test ID in `^^^TestCode` format (optional, repeatable with `@`)

Field 13 = `F` (request final results).

**Step 2 — GeneXpert responds** with the same result message structure as Section 3.5 (max 20 results). Report Type field 26 = `Q@F` (response to query, final results) or `Q@I` (pending) or `Q@X` (canceled).

---

## 4. ASTM Field Mapping — Result Upload (GX → OpenELIS)

This section defines the complete field-level mapping for the primary result upload message (`H|P|O|C|R|C|L`).

### 4.1 Message Structure

```
Level 0          Level 1              Level 2              Level 3
────────────     ──────────────       ──────────────       ──────────────
Message Header   Patient Info (P)     Test Order (O)
  (H)                                   Comment (C)        [error/notes]
                                        Main Result (R)
                                        Analyte Result (R)
                                          Complementary (R)
                                        Comment (C)        [error/notes]
Message Term.
  (L)
```

### 4.2 Header Record (H) — Result Upload

| Field # | Field Name | Comp | Type | Max Len | Req | OpenELIS Mapping | Notes |
|---------|-----------|------|------|---------|-----|-----------------|-------|
| 1 | Record Type ID | 1 | String | 1 | R | — | Always `H` |
| 2 | Delimiter Definition | 1 | String | 4 | R | — | `@^\` |
| 3 | Message ID | 1 | String | 32 | R | `analyzer_message.message_id` | Unique per message |
| 5.1 | System ID | 1 | String | 50 | R | `analyzer.serial_number` | GX System Name from config |
| 5.2 | System Name | 2 | String | 50 | R | — | Always `GeneXpert` |
| 5.3 | Software Version | 3 | String | 16 | R | `analyzer_message.software_version` | e.g., `Dx4.6a.5_Demo` |
| 10 | Receiver ID | 1 | String | 20 | R | — | Host ID from GX config; must match OpenELIS config |
| 12 | Processing ID | 1 | String | 1 | R | — | `P` = Production |
| 13 | Version No. | 1 | String | 7 | R | — | `1394-97` |
| 14 | Date and Time | 1 | ASTM Date | — | R | `analyzer_message.sent_datetime` | `YYYYMMDDHHMMSS` |

### 4.3 Patient Information Record (P) — Result Upload

| Field # | Field Name | Comp | Type | Max Len | Req | OpenELIS Mapping | Notes |
|---------|-----------|------|------|---------|-----|-----------------|-------|
| 1 | Record Type ID | 1 | String | 1 | R | — | Always `P` |
| 2 | Sequence Number | 1 | Numeric | — | R | — | 1, 2, 3… n |
| 3 | Patient ID 2 | 1 | String | 32 | O | `patient.external_id` | Practice-assigned patient ID |
| 5 | Patient ID 1 | 1 | String | 32 | O | `patient.national_id` | Patient identification |
| 6.1 | Family Name | 1 | String | 194 | O | `person.last_name` | |
| 6.2 | Given Name | 2 | String | 30 | O | `person.first_name` | |
| 6.3 | Middle Name | 3 | String | 30 | O | `person.middle_name` | |
| 6.4 | Suffix | 4 | String | 20 | O | — | e.g., JR, III |
| 6.5 | Title | 5 | String | 20 | O | — | e.g., DR |
| 8 | Date of Birth | 1 | DateTime | — | O | `patient.birth_date` | `YYYYMMDD[HHMMSS]` |
| 9 | Sex | 1 | String | 1 | O | `patient.gender` | `F`, `M`, `U` |
| 10 | Race | 1 | String | 1 | O | — | `A`, `B`, `H`, `I`, `O`, `U`, `W` — not mapped in OpenELIS |
| 11 | Address (ZIP) | 4 | String | 12 | O | `person.zip_code` | Zip/postal code only |

### 4.4 Test Order Record (O) — Result Upload

| Field # | Field Name | Comp | Type | Max Len | Req | OpenELIS Mapping | Notes |
|---------|-----------|------|------|---------|-----|-----------------|-------|
| 1 | Record Type ID | 1 | String | 1 | R | — | Always `O` |
| 2 | Sequence Number | 1 | Numeric | — | R | — | 1, 2, 3… n |
| 3 | Specimen ID | 1 | String | 25 | R | `sample.accession_number` | Host-assigned specimen ID — **primary matching key** |
| 4 | Instrument Specimen ID | 1 | String | 32 | O | `sample.instrument_specimen_id` | Only if ISID enabled; required if so |
| 5 | Universal Test ID | 4 | String | 15 | R | `test.analyzer_test_code` | Assay Host Test Code — maps to OpenELIS test |
| 6 | Priority | 1 | String | 1 | R | `analysis.priority` | `S` = Stat, `R` = Routine |
| 7 | Ordered Date/Time | 1 | ASTM Date | — | O | `sample.order_datetime` | Defaults to current if empty |
| 12 | Action Code | 1 | String | 1 | R | `analysis.status_id` | `Q` = QC specimen, `C` = canceled, `P` = pending, empty = normal |
| 16 | Specimen Descriptor | 1 | String | 5 | R | — | Always `ORH` (Other per POCT1-A) |
| 26 | Report Type | 1 | String | 1 | R | `result.result_type` | **`F`** = Final, **`X`** = Cannot be done/canceled, **`I`** = Pending |

> **QC Detection:** When O.12 (Action Code) = `Q`, the specimen is a Quality Control sample. OpenELIS must route these to the QC module rather than patient results.

### 4.5 Comment Record (C) — Errors and Notes

Comment records appear after Order records (order-level errors) or after Result records (result-level notes/errors).

| Field # | Field Name | Comp | Type | Max Len | Req | OpenELIS Mapping | Notes |
|---------|-----------|------|------|---------|-----|-----------------|-------|
| 1 | Record Type ID | 1 | String | 1 | R | — | Always `C` |
| 2 | Sequence Number | 1 | String | — | R | — | 1, 2, 3… n |
| 3 | Comment Source | 1 | String | 1 | R | — | `I` = Instrument |
| 4.1 | Comment ID | 1 | String | 10 | R | — | `Notes` or `Error` |
| 4.2 | Error Code | 2 | String | 50 | O | `result.error_code` | Error code if applicable |
| 4.3 | Comment Description | 3 | String | 500 | O/R | `result.note` or `result.error_description` | Error description or note text |
| 4.4 | Error Details | 4 | String | 500 | O | `result.error_details` | Additional error details |
| 4.5 | Timestamp | 5 | ASTM Date | — | O | `result.error_timestamp` | Required if Error type |
| 5 | Comment Type | 1 | String | 1 | R | — | **`I`** = Notes, **`N`** = Error |

### 4.6 Result Record (R) — Test Results

This is the most complex record. Results come in a three-level hierarchy: Main → Analyte → Complementary.

| Field # | Field Name | Comp | Type | Max Len | Req | OpenELIS Mapping | Notes |
|---------|-----------|------|------|---------|-----|-----------------|-------|
| 1 | Record Type ID | 1 | String | 1 | R | — | Always `R` |
| 2 | Sequence Number | 1 | Numeric | — | R | — | 1, 2, 3… n |
| 3.2 | Panel Test ID | 2 | String | 15 | O | `test.panel_code` | Empty for single-result; Assay Panel ID for multi-result |
| 3.4 | Test ID | 4 | String | 15 | R | `test.analyzer_test_code` | Host Test Code (single) or Result Test Code (multi) |
| 3.5 | Test Name | 5 | String | 20 | O* | `test.assay_name` | Assay name — only on Main result |
| 3.6 | Test Version | 6 | String | 4 | O* | — | Assay version from GX config |
| 3.7 | Analyte/Result Name | 7 | String | 20 | O | `result.analyte_name` | Multi-result: Result Test Code at main level; Analyte name at analyte/complementary level |
| 3.8 | Complementary Name | 8 | String | 10 | O | `result.complementary_type` | `Ct`, `EndPt`, `Delta Ct`, `Conc/LOG`, or empty |
| 4.1 | Qualitative Value | 1 | String | 256 | O | `result.value` (qualitative) | e.g., `POSITIVE`, `NEGATIVE`, `DETECTED`, `NOT DETECTED`, `INDETERMINATE`, `ERROR`, `INVALID`, `NO RESULT` |
| 4.2 | Quantitative Value | 2 | String | 20 | O | `result.value` (quantitative) | Numeric value (e.g., `20385215991.41`) |
| 5 | Units | 1 | String | 20 | O | `result.unit_of_measure` | `Copies/mL`, `IU/mL`, `Copies`, `%`, `% (IS)`, `IS`, `IU`, or empty |
| 6 | Reference Ranges | 1 | String | 60 | O | `result.reference_range` | Format: `"3.5 to 4.5"`, `"to 4.5"`, `"3.5 to"` — only on main quantitative result |
| 7 | Abnormal Flags | 1 | String | 2 | O | `result.abnormal_flag` | See table below |
| 9 | Result Status | 1 | String | 1 | O* | `result.result_status` | `F` = Final, `I` = Pending, `X` = Cannot be done, `C` = Correction (can combine: `F@C`) |
| 11 | Operator ID | 1 | String | 32 | O* | `result.performed_by` | Full name of test performer — required for main result |
| 12 | Date/Time Started | 1 | ASTM Date | — | O* | `result.started_datetime` | Required for main result |
| 13 | Date/Time Completed | 1 | ASTM Date | — | O* | `result.completed_datetime` | Required for main result |
| 14.1 | Computer System Name | 1 | String | 20 | O* | `analyzer.computer_name` | PC connected to instrument |
| 14.2 | Instrument S/N | 2 | Numeric | — | O* | `analyzer.instrument_serial` | Instrument serial number |
| 14.3 | Module S/N | 3 | Numeric | — | O* | `result.module_serial` | Module that ran the test |
| 14.4 | Cartridge S/N | 4 | Numeric | — | O* | `result.cartridge_serial` | Cartridge serial number |
| 14.5 | Reagent Lot ID | 5 | String | 10 | O* | `result.reagent_lot_id` | |
| 14.6 | Expiration Date | 6 | ASTM Date | — | O* | `result.reagent_expiry` | |

> **Fields marked O*** are required for the main/overall result record, optional for analyte and complementary results.

#### Abnormal Flag Values

| Flag | Meaning | OpenELIS Mapping |
|------|---------|-----------------|
| `N` | Normal | Normal |
| `L` | Below low normal | Low |
| `H` | Above high normal | High |
| `LL` | Below panic low | Critical Low |
| `HH` | Above panic high | Critical High |
| `<` | Below absolute low (off-scale) | Below Range |
| `>` | Above absolute high (off-scale) | Above Range |
| `A` | Abnormal | Abnormal |
| `U` | Significant change up | — |
| `D` | Significant change down | — |
| `B` | Better | — |
| `W` | Worse | — |

### 4.7 Result Record Parsing Rules

The GeneXpert uses a hierarchical result structure. OpenELIS must parse according to these rules:

#### Determining Single vs. Multi-Result Test

| Condition | Test Type |
|-----------|-----------|
| R field 3, component 2 = **empty** | Single-result test |
| R field 3, component 2 = **not empty** (contains Panel ID) | Multi-result test |

#### Determining Result Level

| Level | Condition | What to Extract |
|-------|-----------|-----------------|
| **Main Result** | Field 3.5 ≠ empty (contains assay name) | Qualitative result (4.1), Quantitative result (4.2), Units (5), Reference Range (6), Status (9), Operator (11), Start/End times (12,13), Instrument info (14) |
| **Analyte Result** | Field 3.5 = empty AND field 3.7 ≠ empty AND field 3.8 = empty | Qualitative result (4.1) — this is the individual target detection (e.g., MTB DETECTED, RIF Resistance DETECTED) |
| **Complementary Result** | Field 3.5 = empty AND field 3.7 ≠ empty AND field 3.8 ≠ empty | Quantitative result (4.2) — Ct values, EndPt values, concentrations |

#### Quantitative Result Handling

For quantitative assays (viral load, etc.), the GeneXpert uploads **two main results**:

1. Primary result: Test Code in R.3.4, value in R.4.1 (qualitative) and R.4.2 (quantitative)
2. LOG result: Same Test Code in R.3.4, `LOG` in R.3.8, LOG value in R.4.2

OpenELIS should store both and display the primary result with the LOG value as a secondary field.

#### What Is NOT Uploaded

Per the Cepheid specification, the following data is **not transmitted** via ASTM:

- Secondary/complementary results (Ct, EndPt, DeltaCt) — only main results uploaded
- LDA total values for LDA assays
- Instrument identification beyond Instrument S/N (no module S/N, cartridge S/N, reagent lot, expiration via ASTM upload)
- Individual test errors — replaced with generic "Error" in Comment record

> **Note:** The Ct/EndPt limitation applies specifically to the ASTM result upload (section 6.3.4). When results are requested by the LIS (section 6.3.5), the full result hierarchy including analyte and complementary results IS returned.

### 4.8 Message Terminator Record (L)

| Field # | Field Name | Comp | Type | Max Len | Req | Values |
|---------|-----------|------|------|---------|-----|--------|
| 1 | Record Type ID | 1 | String | 1 | R | `L` |
| 2 | Sequence Number | 1 | String | 1 | R | `1` |
| 3 | Termination Code | 1 | String | 1 | R | `N` = Normal, `I` = No information available (empty response), `F` = Last request processed |

---

## 5. ASTM Field Mapping — Order Response (OpenELIS → GX)

When OpenELIS responds to a query with available orders, it must construct messages using these field definitions.

### 5.1 Header Record (H) — Order Download

| Field # | Field Name | Comp | Value / Source | Notes |
|---------|-----------|------|---------------|-------|
| 1 | Record Type | 1 | `H` | |
| 2 | Delimiters | 1 | `@^\` | |
| 3 | Message ID | 1 | Generated UUID or counter | Unique per message |
| 5 | Sender Name/ID | 1 | OpenELIS Host ID | Must match GX "Receiver ID" config |
| 10.1 | Receiver ID | 1 | GX System Name | From GX config |
| 10.2 | Receiver Name | 2 | `GeneXpert` | |
| 10.3 | Software Version | 3 | GX software version | |
| 12 | Processing ID | 1 | `P` | Production |
| 13 | Version | 1 | `1394-97` | |
| 14 | Date/Time | 1 | Current timestamp | `YYYYMMDDHHMMSS` |

### 5.2 Patient Information Record (P) — Order Download

| Field # | Field Name | Comp | Value / Source | Notes |
|---------|-----------|------|---------------|-------|
| 1 | Record Type | 1 | `P` | |
| 2 | Sequence | 1 | Sequential (1, 2, 3…) | One per patient |
| 3 | Patient ID 2 | 1 | `patient.external_id` | Practice-assigned |
| 5 | Patient ID 1 | 1 | `patient.national_id` | |
| 6 | Patient Name | 1-5 | `Last^First^Middle^Suffix^Title` | |
| 8 | DOB | 1 | `patient.birth_date` | `YYYYMMDD` |
| 9 | Sex | 1 | `patient.gender` | `F`, `M`, `U` |
| 11 | Address ZIP | 4 | `person.zip_code` | |

### 5.3 Test Order Record (O) — Order Download

| Field # | Field Name | Comp | Value / Source | Notes |
|---------|-----------|------|---------------|-------|
| 1 | Record Type | 1 | `O` | |
| 2 | Sequence | 1 | Sequential per patient | |
| 3 | Specimen ID | 1 | `sample.accession_number` | **Required** — primary identifier |
| 4 | Instrument Specimen ID | 1 | `sample.instrument_specimen_id` | Required if ISID enabled and previously assigned |
| 5 | Universal Test ID | 4 | `^^^<TestCode>` | Must match GX "Assay Host Test Code" |
| 6 | Priority | 1 | `S` or `R` | From `analysis.priority` |
| 7 | Ordered Date/Time | 1 | `sample.order_datetime` | `YYYYMMDDHHMMSS` |
| 12 | Action Code | 1 | `A` or `C` | `A` = Add/New, `C` = Cancel |
| 16 | Specimen Descriptor | 1 | `ORH` | Always |
| 26 | Report Type | 1 | `Q` | Response to query |

### 5.4 Example — Order Response (2 patients, 3 orders)

```
H|@^\|msg-uuid-001||OpenELIS|||||ICU^GeneXpert^1.0||P|1394-97|20250225140500
P|1|||PAT-2025-0042||NID-12345|DOE^JANE^^^
O|1|LAB-2025-00818||^^^MTB-RIF|R|20250225090000|||||A||||ORH||||||||||Q
O|2|LAB-2025-00818||^^^HIV-VL|R|20250225090100|||||A||||ORH||||||||||Q
P|2|||PAT-2025-0043||NID-67890|SMITH^JOHN^^^
O|1|LAB-2025-00819||^^^MTB-RIF|S|20250225100000|||||A||||ORH||||||||||Q
L|1|F
```

---

## 6. Test Code Mapping — OpenELIS Configuration

The Test Code is the critical link between GeneXpert assay definitions and OpenELIS test definitions. This mapping is configured in two places:

1. **GeneXpert:** "Define Test Code" dialog — sets the Assay Host Test Code and Result Test Code per assay
2. **OpenELIS:** Analyzer Administration — maps analyzer test codes to OpenELIS test/result definitions

### 6.1 Recommended Test Code Mapping

| # | GX Assay Name | Host Test Code | Result Test Codes (multi-result) | OpenELIS Test Name Tag | LOINC |
|---|--------------|----------------|----------------------------------|----------------------|-------|
| 1 | Xpert MTB/RIF | `MTB-RIF` | `MTB` (MTB detection), `RIF` (RIF resistance) | `label.test.mtbRif` | 94500-6 (MTB), 94557-6 (RIF) |
| 2 | Xpert MTB/RIF Ultra | `MTB-ULTRA` | `MTB-U` (MTB detection), `RIF-U` (RIF resistance) | `label.test.mtbRifUltra` | 94500-6, 94557-6 |
| 3 | Xpert HIV-1 Viral Load | `HIV-VL` | — (single-result + LOG) | `label.test.hivViralLoad` | 25836-8 |
| 4 | Xpert HCV Viral Load | `HCV-VL` | — (single-result + LOG) | `label.test.hcvViralLoad` | 11259-9 |
| 5 | Xpert HBV Viral Load | `HBV-VL` | — (single-result + LOG) | `label.test.hbvViralLoad` | 42595-9 |
| 6 | Xpert CT/NG | `CT-NG` | `CT` (Chlamydia), `NG` (Gonorrhea) | `label.test.ctNg` | 21613-5 (CT), 21415-5 (NG) |
| 7 | Xpert Flu/RSV | `FLU-RSV` | `FluA`, `FluB`, `RSV` | `label.test.fluRsv` | 92142-9 (A), 92141-1 (B), 92131-2 (RSV) |
| 8 | Xpert GBS | `GBS-TC` | — (single-result) | `label.test.gbs` | 92145-2 |
| 9 | Xpert SARS-CoV-2 | `COV2` | `COV2` (SARS-CoV-2) | `label.test.sarsCov2` | 94500-6 |
| 10 | Xpert Carba-R | `CARBA-R` | `KPC`, `NDM`, `VIM`, `IMP1`, `OXA48` | `label.test.carbaR` | 85827-4 |
| 11 | Xpert EV | `EV-TC` | — (single-result) | `label.test.enterovirus` | 86328-2 |
| 12 | Xpert C. diff | `CDIFF` | `tcdB` (Toxin B), `cdt` (Binary Toxin) | `label.test.cDiff` | 77382-0 |

> **IMPORTANT:** These test codes are **recommendations**. The actual codes must match exactly between the GeneXpert "Define Test Code" configuration and the OpenELIS analyzer test mapping. Sites may use different codes — the critical requirement is bilateral consistency.

### 6.2 Result Value Mapping

| GX Qualitative Value | OpenELIS Result | Result Type | Notes |
|---------------------|----------------|-------------|-------|
| `POSITIVE` | `label.result.positive` | Dictionary | |
| `NEGATIVE` | `label.result.negative` | Dictionary | |
| `DETECTED` | `label.result.detected` | Dictionary | |
| `NOT DETECTED` | `label.result.notDetected` | Dictionary | |
| `TRACE` | `label.result.trace` | Dictionary | MTB/RIF Ultra trace positive |
| `INDETERMINATE` | `label.result.indeterminate` | Dictionary | |
| `INVALID` | `label.result.invalid` | Dictionary | |
| `ERROR` | `label.result.error` | Dictionary | Check Comment (C) record for details |
| `NO RESULT` | `label.result.noResult` | Dictionary | |
| `VERY LOW` | `label.result.veryLow` | Dictionary | Semi-quantitative (MTB/RIF Ultra) |
| `LOW` | `label.result.low` | Dictionary | Semi-quantitative |
| `MEDIUM` | `label.result.medium` | Dictionary | Semi-quantitative |
| `HIGH` | `label.result.high` | Dictionary | Semi-quantitative |
| `RESISTANT` | `label.result.resistant` | Dictionary | Resistance detection |
| `SUSCEPTIBLE` | `label.result.susceptible` | Dictionary | Resistance detection (RIF not detected) |
| `HOMOZYGOUS` | `label.result.homozygous` | Dictionary | Genetic variant assays |
| `HETEROZYGOUS` | `label.result.heterozygous` | Dictionary | Genetic variant assays |
| `NORMAL` | `label.result.normal` | Dictionary | Genetic variant assays |
| *(numeric)* | Stored as-is | Numeric | Viral load values, Ct values |

---

## 7. Complete Message Examples

### 7.1 Single-Result Qualitative (Xpert GBS)

```
H|@^\|URM-qad3hhUA-08||GeneXpert PC^GeneXpert^Dx10color_Demo|||||LIS||P|1394-97|20060124162001
P|1||||^^^^
O|1|06571||^^^GBS-TC|R|20060124105211|||||||||ORH|||^^|||||||F
R|1|^^^GBS-TC^GBS Clinical Trial^4^^|POSITIVE^|||||F||Ron Ferguson|20060124105211|20060124120634|^700434^^^^
L|1|N
```

**Parsing:** Single-result (R.3.2 empty). Main result: Test Code = `GBS-TC`, Qualitative = `POSITIVE`, Status = `F` (Final), Operator = `Ron Ferguson`, Instrument S/N = `700434`.

### 7.2 Single-Result Quantitative with LOG (Viral Load)

```
H|@^\|URM-X3DZKnUA-02||GeneXpert PC^GeneXpert^Dx4.7.310_Demo|||||LIS||P|1394-97|20141119153007
P|1||||^^^^
O|1|LQL-UQL.A1||^^^QUANT1|R|20130109151218|||||||||ORH|||^^|||||||F
R|1|^^^QUANT1^LQL-UQL^1^^|^20385215991.41|copies/mL|2000.00 to 200000000000.00|N||F||<None>|20130109151218|20130109151218|^-1^^^^
C|1|I|Notes^^ used for sw testing.|I
R|2|^^^QUANT1^LQL-UQL^1^^LOG|^10.31|copies/mL|3.30 to 11.30|N||F||<None>|20130109151218|20130109151218|^-1^^^^
C|1|I|Notes^^used for sw testing.|I
L|1|N
```

**Parsing:** Two main results. R|1: Quantitative = `20385215991.41` copies/mL, range `2000.00 to 200000000000.00`, Normal. R|2: LOG value = `10.31`, range `3.30 to 11.30` (identified by `LOG` in R.3.8).

### 7.3 Multi-Result (Flu A/B)

```
H|@^\|URM-/4KYKnUA-01||GeneXpert PC^GeneXpert^Dx4.7.310_Demo|||||LIS||P|1394-97|20141119152614
P|1||||^^^^
O|1|42392||^^^flu|R|20101111110456|||||||||ORH|||^^|||||||F
R|1|^flu^^fa^Flu A_B Clinical^2^Flu A^|ERROR^|||||F||James Bowden|20101111110456|20101111110713|^703278^^^^
C|1|I|Notes^^Testing for errors and notes|I
C|2|I|Error^^Error^^20101111110659|N
R|2|^flu^^f1^Flu A_B Clinical^2^2009 H1N1^|ERROR^|||||F||James Bowden|20101111110456|20101111110713|^703278^^^^
C|1|I|Notes^^Testing for errors and notes|I
C|2|I|Error^^Error^^20101111110659|N
R|3|^flu^^fb^Flu A_B Clinical^2^Flu B^|ERROR^|||||F||James Bowden|20101111110456|20101111110713|^703278^^^^
C|1|I|Notes^^Testing for errors and notes|I
C|2|I|Error^^Error^^20101111110659|N
L|1|N
```

**Parsing:** Multi-result (R.3.2 = `flu` = Panel ID). Three analyte results: `fa` (Flu A), `f1` (2009 H1N1), `fb` (Flu B). All have `ERROR` status with generic error in Comment records.

### 7.4 Host Query → Order Response → Result Upload (Full Workflow)

**Step 1 — GX queries for sample LAB-2025-001:**
```
H|@^\|query-001||ICU^GeneXpert^1.0|||||LIS||P|1394-97|20250225100000
Q|1|^LAB-2025-001||||||||||O@N
L|1|N
```

**Step 2 — OpenELIS responds with 1 order:**
```
H|@^\|resp-001||LIS|||||ICU^GeneXpert^1.0||P|1394-97|20250225100001
P|1|||PAT-001||NID-123|DOE^JANE^^^|19900315|F
O|1|LAB-2025-001||^^^MTB-RIF|R|20250225090000|||||A||||ORH||||||||||Q
L|1|F
```

**Step 3 — GX uploads result after test completes:**
```
H|@^\|result-001||ICU^GeneXpert^1.0|||||LIS||P|1394-97|20250225114500
P|1|||PAT-001||NID-123|DOE^JANE^^^|19900315|F
O|1|LAB-2025-001||^^^MTB-RIF|R|20250225090000|||||||||ORH|||^^|||||||F
R|1|^MTB-RIF^^MTB^Xpert MTB/RIF^4^MTB^|DETECTED^||||||F||Lab Tech 1|20250225100015|20250225114430|^GX-001^^^^
R|2|^MTB-RIF^^RIF^Xpert MTB/RIF^4^RIF Resistance^|NOT DETECTED^||||||F||Lab Tech 1|20250225100015|20250225114430|^GX-001^^^^
L|1|N
```

---

## 8. OpenELIS Implementation Requirements

### 8.1 ASTM Service Configuration

OpenELIS must provide an ASTM E-1381 listener service (or act as client, per configuration) with the following configurable parameters:

| Parameter | Tag | Description | Default |
|-----------|-----|-------------|---------|
| Host ID | `label.analyzer.hostId` | Identifier for OpenELIS (sent in H.5 or H.10) | `LIS` |
| Connection Mode | `label.analyzer.connectionMode` | `SERVER` or `CLIENT` | `SERVER` |
| Listen Port | `label.analyzer.listenPort` | TCP port for incoming connections | `9000` |
| Remote Host | `label.analyzer.remoteHost` | GX IP address (client mode only) | — |
| Remote Port | `label.analyzer.remotePort` | GX port (client mode only) | — |
| Response Timeout | `label.analyzer.responseTimeout` | Max time to respond to query (seconds) | `30` |
| ISID Enabled | `label.analyzer.isidEnabled` | Whether to expect/track Instrument Specimen IDs | `false` |
| Auto-Accept Results | `label.analyzer.autoAccept` | Automatically accept final results or queue for review | `false` |

### 8.2 Order Query Handler

When OpenELIS receives a Q record from the GeneXpert:

1. **Parse Q.3** for Specimen ID(s) and optional Patient ID / ISID
2. **Query OpenELIS orders** matching the Specimen ID where:
   - Analysis status = "Not Started" or "In Progress"
   - Test is mapped to this GeneXpert analyzer
3. **Build response message** with P and O records for matching orders
4. **Send response** within 60 seconds (or the GeneXpert will timeout)
5. If no matching orders, send `H...L|1|I` (empty response with `I` termination code)

### 8.3 Result Receive Handler

When OpenELIS receives a result upload:

1. **Match Specimen ID** (O.3) to `sample.accession_number`
2. **Match Test Code** (R.3.4 or O.5) to analyzer test mapping
3. **Determine result type** using parsing rules (Section 4.7)
4. **Extract values:**
   - Qualitative result from R.4.1
   - Quantitative result from R.4.2
   - Units from R.5
   - Reference range from R.6
   - Abnormal flags from R.7
   - Result status from R.9
5. **Detect QC samples** via O.12 = `Q` and route to QC module
6. **Store error information** from Comment records
7. **Handle result status:**
   - `F` → Final result; create result entry
   - `I` → Pending; create placeholder
   - `X` → Canceled/Cannot be done; flag as failed
   - `C` → Correction; update existing result
8. **Queue for validation** (or auto-accept if configured)

### 8.4 Unmatched Sample Handling

If a result arrives for a Specimen ID not found in OpenELIS:

| Configuration | Behavior | Tag |
|--------------|----------|-----|
| Reject Unknown | Log error, do not store | `label.analyzer.rejectUnknown` |
| Create Placeholder | Create a pending sample entry for manual resolution | `label.analyzer.createPlaceholder` |
| Auto-Register | Create sample and analysis from result data | `label.analyzer.autoRegister` |

### 8.5 Error and Rejection Handling

| Scenario | OpenELIS Action |
|----------|----------------|
| Result with Status `X` (cannot be done) | Mark analysis as "Technical Rejection", log error from C record |
| Result with `ERROR` qualitative value | Store result, flag for review, display error from C record |
| Malformed message (parse failure) | Log raw message to `analyzer_message_log`, alert admin |
| Duplicate result for same Specimen+Test | If status unchanged, ignore; if `C` (correction), update existing |
| ISID mismatch | Reject result, log error |

---

## 9. Validation Test Dataset

### 9.1 Normal Operations

| Test Case | Specimen ID | Test | Expected Result | Type |
|-----------|------------|------|----------------|------|
| TC-01 | `VAL-001` | MTB/RIF | MTB: DETECTED, RIF: NOT DETECTED | Multi-result qualitative |
| TC-02 | `VAL-002` | MTB/RIF Ultra | MTB: DETECTED (MEDIUM), RIF: NOT DETECTED | Multi-result semi-quantitative |
| TC-03 | `VAL-003` | HIV-1 VL | 45000 copies/mL (LOG: 4.65) | Single-result quantitative + LOG |
| TC-04 | `VAL-004` | GBS | NEGATIVE | Single-result qualitative |
| TC-05 | `VAL-005` | CT/NG | CT: DETECTED, NG: NOT DETECTED | Multi-result qualitative |
| TC-06 | `VAL-006` | Flu/RSV | FluA: DETECTED, FluB: NOT DETECTED, RSV: NOT DETECTED | Multi-result qualitative |

### 9.2 Edge Cases

| Test Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| TC-10 | Result with Status `X` and ERROR value | Store as failed, capture error message from C record |
| TC-11 | Result with Status `I` (pending) | Create placeholder, await final result |
| TC-12 | Correction (`F@C` in R.9) | Update existing result, maintain audit trail |
| TC-13 | QC specimen (`Q` in O.12) | Route to QC module, not patient results |
| TC-14 | Unknown Specimen ID | Handle per configuration (reject/placeholder/auto-register) |
| TC-15 | ISID-enabled result upload | Verify both Specimen ID and ISID match |
| TC-16 | HIV VL below lower limit of quantification | Qualitative = `< 20`, Quantitative empty or `< 20` |
| TC-17 | HIV VL above upper limit | Qualitative = `> 10000000`, check `>` abnormal flag |
| TC-18 | Multiple patients in single message | Correctly separate by P record boundaries |
| TC-19 | 60-second timeout on query | GX cancels; OpenELIS must respond faster |
| TC-20 | GX cancels query (Q followed by C record) | OpenELIS stops processing pending response |

---

## 10. Data Model Impact

### 10.1 New/Modified Tables

```sql
-- Analyzer instance configuration for GeneXpert
-- (extends existing analyzer table)
ALTER TABLE analyzer ADD COLUMN IF NOT EXISTS
  connection_mode VARCHAR(10) DEFAULT 'SERVER',   -- SERVER or CLIENT
  listen_port INTEGER,
  remote_host VARCHAR(255),
  remote_port INTEGER,
  host_id VARCHAR(20) DEFAULT 'LIS',
  isid_enabled BOOLEAN DEFAULT FALSE,
  auto_accept_results BOOLEAN DEFAULT FALSE,
  reject_unknown_samples BOOLEAN DEFAULT TRUE,
  response_timeout_seconds INTEGER DEFAULT 30;

-- Instrument Specimen ID mapping (for ISID-enabled sites)
CREATE TABLE IF NOT EXISTS instrument_specimen_id (
  id SERIAL PRIMARY KEY,
  sample_id INTEGER NOT NULL REFERENCES sample(id),
  analyzer_id INTEGER NOT NULL REFERENCES analyzer(id),
  instrument_specimen_id VARCHAR(32) NOT NULL,
  assigned_datetime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(analyzer_id, instrument_specimen_id)
);

-- Raw ASTM message log (for troubleshooting)
CREATE TABLE IF NOT EXISTS analyzer_message_log (
  id BIGSERIAL PRIMARY KEY,
  analyzer_id INTEGER REFERENCES analyzer(id),
  direction VARCHAR(10) NOT NULL,          -- UPLOAD or DOWNLOAD
  message_id VARCHAR(32),
  message_type VARCHAR(20),                -- QUERY, ORDER_RESPONSE, RESULT, ISID, CANCEL
  raw_message TEXT NOT NULL,
  parsed_successfully BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  received_datetime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GeneXpert-specific result metadata
CREATE TABLE IF NOT EXISTS result_instrument_detail (
  id SERIAL PRIMARY KEY,
  result_id INTEGER NOT NULL REFERENCES result(id),
  computer_system_name VARCHAR(20),
  instrument_serial VARCHAR(20),
  module_serial VARCHAR(20),
  cartridge_serial VARCHAR(20),
  reagent_lot_id VARCHAR(10),
  reagent_expiry_date DATE,
  complementary_type VARCHAR(10),          -- Ct, EndPt, DeltaCt, Conc/LOG
  complementary_value VARCHAR(20),
  error_code VARCHAR(50),
  error_description VARCHAR(500),
  error_details VARCHAR(500),
  error_timestamp TIMESTAMP WITH TIME ZONE
);
```

### 10.2 Analyzer Test Code Configuration

Configured via **Administration → Analyzer Test Code Mapping** (existing screen):

| Analyzer Code | OpenELIS Test | OpenELIS Result Type | Notes |
|---------------|---------------|---------------------|-------|
| `MTB-RIF` | `label.test.mtbRif` | Panel | Parent panel code |
| `MTB` | `label.test.mtbDetection` | Dictionary | Analyte within MTB-RIF |
| `RIF` | `label.test.rifResistance` | Dictionary | Analyte within MTB-RIF |
| `HIV-VL` | `label.test.hivViralLoad` | Numeric | Primary quantitative |
| `GBS-TC` | `label.test.gbs` | Dictionary | Single qualitative |

---

## 11. Confidence Assessment

| Component | Confidence | Basis |
|-----------|-----------|-------|
| ASTM E-1381 transport layer | HIGH | Fully documented in Cepheid spec (sections 2–3) |
| Message structure (H, P, O, R, C, L) | HIGH | Complete field definitions with examples in spec (section 6) |
| Result record parsing rules | HIGH | Explicit parsing logic with decision tables in spec (section 6.3.4.1.6.1) |
| Query/Response flow | HIGH | Sequence diagrams and examples in spec (sections 6.2, 6.3) |
| Test code mapping | MEDIUM | Recommended codes; actual values depend on per-site GX configuration |
| LOINC codes | MEDIUM | Standard mappings; may vary by jurisdiction and assay version |
| Ct/complementary result limitation | HIGH | Explicitly stated in spec: "Secondary and complementary results will not be uploaded to LIS" |
| Unsolicited order rejection | HIGH | Explicitly stated: "This system does not support operating in this way" |

---

## 12. Related Specifications

| Document | Description |
|----------|-------------|
| GeneXpert LIS Interface Protocol Spec (301-2002, Rev. E) | **Primary reference** — vendor protocol specification |
| GeneXpert Dx Operator Manual Rev. L (301-0045) | Host Communication Settings configuration |
| GeneXpert Service Manual (301-0569, Rev. A) | Hardware reference; minimal LIS content |
| Analyzer Results Import Page FRS | QC-first workflow for reviewing imported results |
| Test Catalog FRS v2 | Test definitions, LOINC mapping, analyzer linking |
| OpenELIS ASTM Service Architecture | Backend service for ASTM E-1381 TCP listener |

---

## 13. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-02-25 | Casey / Claude | Initial draft — ASTM protocol specification based on Cepheid LIS Interface Protocol Specification (301-2002, Rev. E). Complete field mapping for result upload, order query/response, ISID flow, result request. Includes parsing rules, test code mapping, validation dataset, and data model. |

---

## 14. Open Questions

| # | Question | Impact | Status |
|---|----------|--------|--------|
| 1 | Should OpenELIS support both ASTM and HL7 simultaneously for GeneXpert, or is ASTM-only sufficient? | Architecture decision — single vs. dual protocol handler | OPEN |
| 2 | Which assays are deployed at target sites? This determines the required test code mapping. | Configuration scoping | OPEN |
| 3 | Do target sites use "Instrument Specimen ID" (ISID)? This adds complexity to specimen matching. | Mapping logic, data model | OPEN |
| 4 | Should OpenELIS actively request results (section 3.6), or rely solely on GX auto-upload? | Determines if result pull is needed | OPEN |
| 5 | How should Ct values be handled? They are excluded from ASTM upload but available via result request. | Result request implementation scope | OPEN |
| 6 | What is the desired behavior for Xpert MTB/RIF Ultra "TRACE" result — separate dictionary entry or map to LOW? | Result dictionary configuration | OPEN |
