# Cepheid GeneXpert Dx System — HL7 v2.5 Integration Specification

**Version:** 1.0  
**Date:** 2025-02-25  
**Status:** Draft — Ready for Development Review  
**Protocol:** HL7 v2.5 over TCP/IP (MLLP lower-level transport)  
**Confidence:** HIGH — Based on GeneXpert LIS Interface Protocol Specification (301-2002, Rev. E, Dec 2014)  
**Reference Documents:** GeneXpert LIS Interface Protocol Specification (301-2002 Rev. E); GeneXpert Dx System Operator Manual Rev. L (301-0045)  
**Companion Spec:** Cepheid GeneXpert Dx System — ASTM E1394-97 Integration Specification v1.0

---

## 1. Instrument Overview

| Field | Value |
|-------|-------|
| **Manufacturer** | Cepheid (a Danaher company) |
| **Model** | GeneXpert Dx System |
| **Discipline** | Molecular diagnostics — real-time PCR |
| **Communication Protocol** | HL7 v2.5 (message layer) over MLLP (transport layer) over TCP/IP |
| **Alternative Protocol** | ASTM E1394-97 (selectable, covered in companion spec) |
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

### 1.2 Protocol Selection: ASTM vs. HL7

The GeneXpert supports either ASTM E1394-97 or HL7 v2.5 — not both simultaneously on the same connection. The protocol is selected in GeneXpert LIS Communication Settings. Key differences:

| Aspect | ASTM E1394-97 | HL7 v2.5 |
|--------|---------------|----------|
| Transport | ASTM E-1381 (frame numbers, checksums, ENQ/ACK/NAK/EOT) | MLLP (simple start/end block characters) |
| Message structure | Record-based (H, P, O, R, C, L) | Segment-based (MSH, PID, ORC, OBR, OBX, SPM, NTE, TQ1) |
| Acknowledgment | Implicit (ACK/NAK per frame at transport level) | Explicit (MSA segment with CA/CR/CE/AA/AE/AR codes) |
| Result upload — OBX-18 | Instrument S/N only | Full equipment hierarchy (Expiration, Lot, Cartridge, Module, Instrument, Computer) |
| Result upload — Ct values | NOT uploaded (main result only) | NOT uploaded (main result only) — same limitation |
| Result request response | Full hierarchy (main + analyte + complementary) | Full hierarchy (main + analyte + complementary) |
| QC discrimination | O record field 12 = `Q` | SPM-11 = `Q` |
| ISID upload | O record with action code `P` | Separate SSU^U03 message |
| Order rejection | Separate rejection message in same session | ORU^R01 with OBR-25 = `X` and NTE error |
| Unsolicited orders | Rejected (H...L termination) | Rejected (ORL^O22 or ACK with error) |

> **Recommendation:** Start with ASTM as primary protocol. Add HL7 as alternative for sites that require it. Both protocols share the same result parsing logic, test code mapping, and data model — only the transport and message encoding differ.

---

## 2. Communication Architecture

### 2.1 Physical Layer

The GeneXpert LIS interface is built on TCP/IP. Both systems must reside on the same network. Data is transmitted in clear text (no TLS). A dedicated NIC on the GeneXpert PC is recommended for LIS connectivity.

### 2.2 Transport Layer — MLLP (Minimal Lower Layer Protocol)

HL7 messages are wrapped in MLLP framing for transmission over TCP/IP. MLLP is significantly simpler than ASTM E-1381 — no frame numbering, no checksums, no ENQ/EOT session management.

**MLLP frame structure:**

```
<SB> HL7 Message Data <EB> <CR>
```

| Character | Hex | Name | Purpose |
|-----------|-----|------|---------|
| `<SB>` | `0x0B` | Start Block (VT) | Signals start of HL7 message |
| `<EB>` | `0x1C` | End Block (FS) | Signals end of HL7 message |
| `<CR>` | `0x0D` | Carriage Return | Required after End Block |

**Connection behavior:**

- TCP connection is persistent (kept open between messages)
- Each HL7 message is a single MLLP frame
- No session establishment/termination protocol (unlike ASTM E-1381)
- Connection failures are handled by TCP keepalive and application-level timeouts

### 2.3 Message Layer — HL7 v2.5

**Delimiters (defined in MSH-1 and MSH-2):**

| Delimiter | Character | ASCII | Purpose |
|-----------|-----------|-------|---------|
| Field | `\|` (pipe) | 124 | Separates adjacent fields |
| Component | `^` (caret) | 94 | Separates components within a field |
| Repeat | `~` (tilde) | 126 | Separates repeated values within a field |
| Escape | `\` (backslash) | 92 | Escape character for special sequences |
| Subcomponent | `&` (ampersand) | 38 | Separates subcomponents within a component |
| Segment | `<CR>` | 13 | Terminates each segment |

**Standard encoding characters string (MSH-2):** `^~\&`

**Character encoding:** ISO 8859-1 (Latin-1), single-byte. Allowed characters: 9, 13, 32–126, 128–254. Characters outside the configured codepage are escaped using `\Zcccc\` (UTF-16 hex).

**Escape sequences:**

| Sequence | Meaning |
|----------|---------|
| `\F\` | Embedded field delimiter |
| `\S\` | Embedded component delimiter |
| `\R\` | Embedded repeat delimiter |
| `\E\` | Embedded escape delimiter |
| `\T\` | Embedded subcomponent delimiter |
| `\Xhhhh\` | Hexadecimal data |
| `\Zcccc\` | Local escape (UTF-16 for non-codepage characters) |

### 2.4 Acknowledgment Model

The GeneXpert supports both original and enhanced HL7 acknowledgment modes.

**Acknowledgment codes (MSA-1):**

| Code | Meaning | Context |
|------|---------|---------|
| `CA` | Commit Accept | Accept acknowledgment — message accepted for processing |
| `CR` | Commit Reject | Message type, version, or processing ID unacceptable |
| `CE` | Commit Error | Message cannot be accepted (e.g., missing required field) |
| `AA` | Application Accept | Message processed successfully |
| `AE` | Application Error | Error in functional processing |
| `AR` | Application Reject | Processing failed for system reasons (may succeed later) |

**MSH-15/16 control:**

| Field | Value | Meaning |
|-------|-------|---------|
| MSH-15 (Accept Ack) | `AL` | Always require accept acknowledgment |
| MSH-15 | `NE` | Never require accept acknowledgment |
| MSH-16 (Application Ack) | `AL` | Always require application acknowledgment |
| MSH-16 | `NE` | Never require application acknowledgment |

### 2.5 Timeouts and Error Recovery

| Timeout | Duration | Action |
|---------|----------|--------|
| Accept acknowledgment not received | 60 seconds | Resend message (max 3 attempts total) |
| Query response not received | 60 seconds | GX cancels query with QCN^J01 |
| Non-expected message received | — | Reply with ACK containing `CR` and error text "Non-expected message received" |

### 2.6 Data Flow Summary

```
┌─────────────────┐                              ┌──────────────┐
│   OpenELIS       │                              │  GeneXpert   │
│   (LIS Host)     │                              │  Dx System   │
│                  │                              │              │
│  ┌────────────┐  │  ←── QBP^Z01 (Query All) ──  │  Auto/Manual │
│  │ Order      │  │  ── RSP^Z02 (Orders) ──────→ │  Download    │
│  │ Response   │  │                              │              │
│  └────────────┘  │  ←── QBP^Z03 (Host Query) ── │  Barcode     │
│  ┌────────────┐  │  ── RSP^Z02 (Orders) ──────→ │  Scan        │
│  │ Order      │  │                              │              │
│  │ Response   │  │  ←── SSU^U03 (ISID Upload) ── │  ISID        │
│  └────────────┘  │  ── ACK^U03 ──────────────→  │  Mapping     │
│  ┌────────────┐  │                              │              │
│  │ ISID       │  │  ←── ORU^R01 (Results) ─────  │  Result      │
│  │ Store      │  │  ── ACK^R01 ──────────────→  │  Upload      │
│  └────────────┘  │                              │              │
│  ┌────────────┐  │  ── QRY^R02 (Result Req) ──→ │              │
│  │ Result     │  │  ←── ORF^R04 (Results) ─────  │  Result      │
│  │ Request    │  │                              │  Response    │
│  └────────────┘  │                              │              │
│                  │  ── OML^O21 ────────────────→ │  REJECTED    │
│                  │  ←── ORL^O22 / ACK (error) ── │  (NOT        │
│                  │     (Unsolicited Orders)       │  SUPPORTED)  │
└─────────────────┘                              └──────────────┘
```

> **CRITICAL:** The GeneXpert does **not** support unsolicited order download from the LIS. All order download is GeneXpert-initiated via query. If OpenELIS sends OML^O21 orders without a pending query, the GeneXpert rejects them with ORL^O22 or ACK with error.

---

## 3. HL7 Message Scenarios

### 3.1 Scenario Matrix

| # | Scenario | Initiator | Message Types | OpenELIS Role | Section |
|---|----------|-----------|---------------|---------------|---------|
| 1 | Query for all test orders | GeneXpert | QBP^Z01 → RSP^Z02 | Respond with available orders | 3.2 |
| 2 | Cancel query | GeneXpert | QCN^J01 → ACK^J01 | Acknowledge cancellation | 3.3 |
| 3 | Host Query for specific sample | GeneXpert | QBP^Z03 → RSP^Z02 | Respond with matching orders | 3.4 |
| 4 | Reject invalid order from query | GeneXpert | ORU^R01 → ACK^R01 | Acknowledge rejection, log error | 3.5 |
| 5 | Return Instrument Specimen ID | GeneXpert | SSU^U03 → ACK^U03 | Store ISID mapping | 3.6 |
| 6 | Upload test results | GeneXpert | ORU^R01 → ACK^R01 | Receive and store results | 3.7 |
| 7 | Request test results | LIS | QRY^R02 → ORF^R04 | Query GX for results | 3.8 |
| 8 | Unsolicited order download | LIS | OML^O21 → ORL^O22/ACK | **NOT SUPPORTED — do not send** | 3.9 |

### 3.2 GeneXpert Queries for All Test Orders (QBP^Z01 → RSP^Z02)

**Trigger:** Automatic timer or manual "Query All" on GeneXpert.

**Step 1 — GX sends QBP^Z01 (Upload):**

```
MSH|^~\&|ICU^GeneXpert^1.0||LIS||20070521100245||QBP^Z01^QBP_Z01|<MessageID>|P|2.5
QPD|Z01^REQUEST TEST ORDERS|<QueryTag>|ALL
RCP|I
```

**Segment summary:**

| Segment | Purpose |
|---------|---------|
| MSH | Message header — sender = GX System ID, receiver = Host ID |
| QPD | Query parameter — Z01 = query all orders, QPD-3 = `ALL` |
| RCP | Response control — `I` = Immediate priority |

**Step 2 — OpenELIS responds with RSP^Z02 (orders available):**

```
MSH|^~\&|LIS||ICU^GeneXpert^1.0||20070521100245||RSP^Z02|<ResponseID>|P|2.5|||NE|NE
MSA|AA|<OriginalMessageID>
QAK|<QueryTag>|OK|Z01^REQUEST TEST ORDERS
QPD|Z01^REQUEST TEST ORDERS|<QueryTag>|ALL
PID|1||<PatientID1>
ORC|NW|1|||||||<OrderDateTime>
OBR|1|||<TestCode>|||||||A
TQ1|||||||||R
SPM|1|<SpecimenID>^<ISID>||ORH|||||||P
ORC|NW|2|||||||<OrderDateTime>
OBR|2|||<TestCode2>|||||||A
TQ1|||||||||S
SPM|2|<SpecimenID2>^||ORH|||||||P
PID|2||<PatientID1-B>
ORC|NW|1|||||||<OrderDateTime>
OBR|1|||<TestCode>|||||||A
TQ1|||||||||R
SPM|1|<SpecimenID-B>^||ORH|||||||P
```

**Step 2 (alt) — OpenELIS responds with RSP^Z02 (no orders):**

```
MSH|^~\&|LIS||ICU^GeneXpert^1.0||20070521100245||RSP^Z02|<ResponseID>|P|2.5|||NE|NE
MSA|AA|<OriginalMessageID>
QAK|<QueryTag>|OK|Z01^REQUEST TEST ORDERS
QPD|Z01^REQUEST TEST ORDERS|<QueryTag>|ALL
```

> **Timeout:** If OpenELIS does not respond within 60 seconds, the GeneXpert cancels the request with QCN^J01. Always respond promptly, even if no orders exist.

### 3.3 GeneXpert Cancels Query (QCN^J01 → ACK^J01)

**Trigger:** No response received within 60 seconds, or higher-priority query needed.

**GX sends QCN^J01:**

```
MSH|^~\&|ICU^GeneXpert^1.0||LIS||20070713114254||QCN^J01^QCN_J01|<MessageID>|P|2.5|||AL|NE
QID|<QueryTag>|N/D
```

**OpenELIS responds with ACK^J01:**

```
MSH|^~\&|LIS||ICU^GeneXpert^1.0||20070521101245||ACK|<ResponseID>|P|2.5|||NE|NE
MSA|CA|<OriginalMessageID>
```

### 3.4 GeneXpert Host Query for Specific Sample (QBP^Z03 → RSP^Z02)

**Trigger:** User scans barcode or enters Sample ID on GeneXpert (when "Automatic Host Query After Sample ID Scan" is enabled).

**Step 1 — GX sends QBP^Z03 (Upload):**

```
MSH|^~\&|ICU^GeneXpert^1.0||LIS||20070521100245||QBP^Z03^QBP_Z03|<MessageID>|P|2.5
QPD|Z03^HOST QUERY|<QueryTag>|<PatientID1>|<SpecimenID>|<PatientID2>
RCP|I
```

**QPD parameters:**

| QPD Field | Content | Required |
|-----------|---------|----------|
| QPD-1 | `Z03^HOST QUERY` | R |
| QPD-2 | Query Tag (unique ID, echoed in QAK-1) | R |
| QPD-3 | Patient ID 1 | O |
| QPD-4 | Specimen ID | R |
| QPD-5 | Patient ID 2 (Practice-assigned) | O |

**Step 2 — OpenELIS responds** using the same RSP^Z02 structure as section 3.2. If the specimen has no orders, send the empty response format (MSH + MSA + QAK + QPD, no PID/ORC/OBR/SPM segments).

> **Note:** For multiple host queries, if some specimens have pending orders and others don't, only include the specimens with pending orders in the response. The GeneXpert assumes no orders exist for unlisted specimens.

### 3.5 GeneXpert Rejects Invalid Order (ORU^R01 → ACK^R01)

**Trigger:** GeneXpert receives an order from query response that has invalid data.

**GX sends ORU^R01 (rejection):**

```
MSH|^~\&|ICU^GeneXpert^1.0||LIS||20070521100245||ORU^R32^ORU_R30|<MessageID>|P|2.5|||AL|NE
PID|1||<PatientID1>
ORC|OC|1|||||||<OrderDateTime>
OBR|1|||<TestCode>|||||||||||||||||||||X
NTE|1|L|Error^<ErrorCode>^<ErrorDescription>
TQ1|||||||||R
SPM|1|<SpecimenID>^<ISID>||ORH|||||||P
```

**Error codes in NTE-3:**

| NTE-3.2 (Error Code) | NTE-3.3 (Description) |
|----------------------|-----------------------|
| `invalidSpecimenData` | Invalid Instrument Specimen ID or Specimen ID |
| `DuplicatedTest` | Duplicated test order |
| `InvalidTestData` | Test unknown, test disabled or inconsistent test |
| `InvalidPatientData` | Invalid Patient identification |
| `InvalidTransmissionInformation` | The order has a bad format |

**OpenELIS responds with ACK^R01:**

```
MSH|^~\&|LIS||ICU^GeneXpert^1.0||<DateTime>||ACK|<ResponseID>|P|2.5|||NE|NE
MSA|CA|<OriginalMessageID>
```

### 3.6 GeneXpert Returns Instrument Specimen ID (SSU^U03 → ACK^U03)

**Trigger:** After order download, if "Use Instrument Specimen ID" is enabled.

**GX sends SSU^U03:**

```
MSH|^~\&|ICU^GeneXpert^1.0||LIS||20070521100245||SSU^U03^SSU_U03|<MessageID>|P|2.5|||AL|NE
EQU|N/D|<CurrentDateTime>
SAC|N/D
SPM|1|<SpecimenID1>^<ISID1>||ORH|||||||P
SAC|N/D
SPM|2|<SpecimenID2>^<ISID2>||ORH|||||||P
```

| Segment | Purpose |
|---------|---------|
| EQU | Equipment detail — EQU-1 = not used (`N/D`), EQU-2 = current datetime |
| SAC | Specimen Container Detail — dummy field for HL7 compliance (`N/D`) |
| SPM | Specimen — SPM-2.1 = Specimen ID, SPM-2.2 = Instrument Specimen ID |

**OpenELIS responds with ACK^U03:**

```
MSH|^~\&|LIS||ICU^GeneXpert^1.0||<DateTime>||ACK|<ResponseID>|P|2.5|||NE|NE
MSA|CA|<OriginalMessageID>
```

OpenELIS must store the Specimen ID ↔ ISID mapping. All subsequent messages will reference both identifiers.

### 3.7 GeneXpert Uploads Test Results (ORU^R01 → ACK^R01)

**Trigger:** Automatic (after test completion) or manual upload.

This is the primary result flow. See Section 4 for detailed field mappings.

**Key limitations for HL7 result upload (same as ASTM):**

- Secondary/analyte results and complementary results (Ct, EndPt, DeltaCt) are **NOT** uploaded
- LDA total values for LDA assays are **NOT** uploaded
- Instrument identification beyond Instrument S/N is **NOT** uploaded (no module S/N, cartridge S/N, reagent lot, expiration)
- Individual test errors are replaced with generic "Error" in NTE comment segment
- For quantitative assays, two main results are uploaded: primary value + LOG value

> **Note:** When results are requested by the LIS (section 3.8), the **full** result hierarchy including analyte and complementary results, plus complete equipment identification (OBX-18), IS returned.

### 3.8 LIS Requests Test Results (QRY^R02 → ORF^R04)

**Trigger:** OpenELIS initiates a result query to the GeneXpert.

**Step 1 — OpenELIS sends QRY^R02 (Download):**

```
MSH|^~\&|LIS||ICU^GeneXpert^1.0||20070521100245||QRY^R02^QRY_R02|<MessageID>|P|2.5
QRD|<QueryDateTime>|R|I|<QueryID>|||20^RD|N/D|RES|N/D|<PatID1>^<SpecimenID>^<ISID>^<TestID>^<PatID2>
```

**QRD-11 components (repeatable with `~` delimiter):**

| Component | Content | Required |
|-----------|---------|----------|
| 1 | Patient ID 1 | O (must repeat per specimen) |
| 2 | Specimen ID | R |
| 3 | Instrument Specimen ID | O (required if ISID enabled) |
| 4 | Test ID | O |
| 5 | Patient ID 2 (Practice) | O (must repeat per specimen) |

**Multiple specimens:** `PatID^Spec1^ISID1^Test1^PatID2~PatID^Spec2^ISID2^Test2^PatID2`

**Step 2 — GeneXpert responds with ORF^R04:**

The response uses the same ORU^R01 result structure (PID, ORC, OBR, NTE, TQ1, OBX, SPM) but wrapped in ORF^R04 with MSA, QRD segments prepended. Maximum 20 results returned per request.

**Step 2 (alt) — GeneXpert returns error for unidentified specimen/patient:**

```
MSH|^~\&|ICU^GeneXpert^1.0||LIS||<DateTime>||ORF^R04^ORF_R04|<ResponseID>|P|2.5|||NE|NE
MSA|AA|<OriginalMessageID>
QRD|<QueryDateTime>|R|I|<QueryID>|||20^RD|N/D|RES|N/D|<PatID>^<SpecID>^<ISID>^<TestID>
PID|1||
ORC|OC|1|||||||<DateTime>
OBR|1||||||||||||||||||||||||<ErrorCode>
```

**OBR-25 error codes (result request only):**

| Code | Meaning |
|------|---------|
| `V` | Invalid Specimen ID or Instrument Specimen ID |
| `Y` | Invalid Test ID |
| `Z` | Invalid Patient ID |
| `E` | Query has bad format |
| `F` | Final results (normal) |
| `I` | Results pending |
| `X` | Cannot be done / canceled |
| `A` | Some results available |

### 3.9 Unsolicited Order Download (OML^O21 — REJECTED)

**CRITICAL:** The GeneXpert does **not** support unsolicited order download. If OpenELIS sends OML^O21 without a pending query, the GeneXpert rejects with either:

**Option I — ACK only (no application acknowledgment):**
If OML^O21 has MSH-15=`AL`, MSH-16=`NE`, the GX returns a generic ACK. The LIS is NOT informed of the rejection via this message — it must be notified by other means.

**Option II — ORL^O22 (application acknowledgment with rejection):**
If OML^O21 has MSH-15=`NE`, MSH-16=`AL`, the GX returns ORL^O22 with rejection code and explanation.

> **Implementation:** OpenELIS must **never** send OML^O21 to the GeneXpert. All order download must be initiated by GeneXpert queries (QBP^Z01 or QBP^Z03).

---

## 4. HL7 Field Mapping — Result Upload (GX → OpenELIS)

This section defines the complete field-level mapping for the primary result upload message (ORU^R01).

### 4.1 Message Structure

```
ORU^R01 Message Structure:

MSH           Message Header
{
  PID         Patient Identification
  {
    ORC       Common Order
    OBR       Observation Request
    [NTE]     Notes and comments (order-level errors)
    TQ1       Timing/Quantity
    {
      OBX     Observation Result
      [NTE]   Notes and comments (result-level notes/errors)
    }
    SPM       Specimen
  }
}
```

### 4.2 Message Header Segment (MSH) — Result Upload

| Field # | Field Name | Comp | Type | Max Len | Req | OpenELIS Mapping | Notes |
|---------|-----------|------|------|---------|-----|-----------------|-------|
| 1 | Field Separator | — | ST | 1 | R | — | Always `\|` |
| 2 | Encoding Characters | — | ST | 4 | R | — | `^~\&` |
| 3.1 | Sending Application — System ID | 1 | ST | 50 | R | `analyzer.serial_number` | GX System Name from config |
| 3.2 | Sending Application — System Name | 2 | ST | 50 | R | — | Always `GeneXpert` |
| 3.3 | Sending Application — Software Version | 3 | ST | 16 | R | `analyzer_message.software_version` | e.g., `Dx4.6a.5_Demo` |
| 5 | Receiver ID | 1 | ST | 50 | R | — | Host ID from GX config; must match OpenELIS config |
| 7 | Date/Time of Message | 1 | TS | — | R | `analyzer_message.sent_datetime` | `YYYYMMDDHHMMSS` |
| 9.1 | Message Type | 1 | ID | 3 | R | — | `ORU` |
| 9.2 | Trigger Event | 2 | ID | 3 | R | — | `R32` |
| 9.3 | Message Structure | 3 | ID | 7 | O | — | `ORU_R30` |
| 10 | Message ID | 1 | ST | 32 | R | `analyzer_message.message_id` | Unique per message |
| 11 | Processing ID | 1 | ID | 3 | R | — | `P` = Production |
| 12 | Version Number | 1 | ID | 60 | R | — | `2.5` |
| 15 | Accept Ack | 1 | ID | 2 | O | — | `AL` (Always) |
| 16 | Application Ack | 1 | ID | 2 | O | — | `NE` (Never) |

### 4.3 Patient Identification Segment (PID) — Result Upload

| Field # | Field Name | Comp | Type | Max Len | Req | OpenELIS Mapping | Notes |
|---------|-----------|------|------|---------|-----|-----------------|-------|
| 1 | Sequence Number | 1 | SI | — | R | — | 1, 2, 3… n |
| 2 | Patient ID 2 | 1 | ST | 32 | O | `patient.external_id` | Practice-assigned patient ID |
| 3 | Patient ID 1 | 1 | ST | 32 | O | `patient.national_id` | Patient identification |
| 5.1 | Family Name | 1 | ST | 192 | O | `person.last_name` | |
| 5.2 | Given Name | 2 | ST | 30 | O | `person.first_name` | |
| 5.3 | Second Given Name | 3 | ST | 30 | O | `person.middle_name` | |
| 5.4 | Suffix | 4 | ST | 20 | O | — | e.g., JR, III |
| 5.5 | Prefix | 5 | ST | 20 | O | — | e.g., DR |
| 7 | Date/Time of Birth | 1 | TS | — | O | `patient.birth_date` | `YYYYMMDD[HHMMSS]` |
| 8 | Administrative Sex | 1 | ST | 1 | O | `patient.gender` | `F`, `M`, `U` |
| 10 | Race | 1 | ST | 1 | O | — | `A`, `B`, `H`, `I`, `O`, `U`, `W` — not mapped in OpenELIS |
| 11.5 | Patient Address — ZIP | 5 | ST | 12 | O | `person.zip_code` | Zip/postal code only |

### 4.4 Common Order Segment (ORC) — Result Upload

| Field # | Field Name | Comp | Type | Max Len | Req | OpenELIS Mapping | Notes |
|---------|-----------|------|------|---------|-----|-----------------|-------|
| 1 | Order Control | 1 | ID | 2 | R | — | `RE` = Observations, `OC` = Order canceled |
| 2 | Order Number | 1 | SI | — | R | — | 1, 2, 3… n |
| 9 | Date/Time of Order | 1 | TS | — | O | `sample.order_datetime` | If empty, current datetime used |

### 4.5 Observation Request Segment (OBR) — Result Upload

| Field # | Field Name | Comp | Type | Max Len | Req | OpenELIS Mapping | Notes |
|---------|-----------|------|------|---------|-----|-----------------|-------|
| 1 | Sequence Number | 1 | SI | — | R | — | 1, 2, 3… n |
| 4 | Universal Test ID | 1 | ID | 15 | R | `test.analyzer_test_code` | Assay Host Test Code — maps to OpenELIS test |
| 25 | Order Status | 1 | ID | 1 | R | `result.result_type` | `F` = Final, `X` = Canceled, `I` = Pending |

### 4.6 Notes and Comment Segment (NTE) — Errors and Notes

NTE segments appear after OBR (order-level errors) or after OBX (result-level notes/errors).

| Field # | Field Name | Comp | Type | Max Len | Req | OpenELIS Mapping | Notes |
|---------|-----------|------|------|---------|-----|-----------------|-------|
| 1 | Sequence Number | 1 | SI | — | R | — | 1, 2, 3… n |
| 2 | Source of Comment | 1 | ID | 1 | R | — | `L` = LIS/Instrument |
| 3.1 | Comment ID | 1 | ID | 50 | R | — | `Notes` or `Error` |
| 3.2 | Comment Code | 2 | ST | 50 | O | `result.error_code` | Error code if applicable |
| 3.3 | Comment Description | 3 | ST | 500 | O/R | `result.note` or `result.error_description` | Error description or note text (repeatable) |
| 3.4 | Comment Details | 4 | ST | 500 | O | `result.error_details` | Additional error details |
| 3.5 | Comment Timestamp | 5 | TS | — | O | `result.error_timestamp` | Required if Comment ID = `Error` |

### 4.7 Timing/Quantity Segment (TQ1) — Result Upload

| Field # | Field Name | Comp | Type | Max Len | Req | OpenELIS Mapping | Notes |
|---------|-----------|------|------|---------|-----|-----------------|-------|
| 7 | Start Date/Time | 1 | TS | — | O | `result.started_datetime` | Date/time system started the test |
| 8 | End Date/Time | 1 | TS | — | O | `result.completed_datetime` | Date/time system completed the test |
| 9 | Priority | 1 | ID | 1 | R | `analysis.priority` | `S` = Stat, `R` = Routine |

### 4.8 Observation Result Segment (OBX) — Test Results

This is the most complex segment. Results come in a three-level hierarchy: Main → Analyte → Complementary.

| Field # | Field Name | Comp/Sub | Type | Max Len | Req | OpenELIS Mapping | Notes |
|---------|-----------|----------|------|---------|-----|-----------------|-------|
| 1 | Sequence Number | 1 | SI | — | R | — | 1, 2, 3… n |
| 2 | Value Type | 1 | ID | 2 | R | — | `ST` (String) |
| 3.1.1 | Panel Test ID | 1.1 | ST | 15 | O | `test.panel_code` | Empty for single-result; Assay Panel ID for multi-result |
| 3.1.2 | Test ID | 1.2 | ST | 15 | R | `test.analyzer_test_code` | Host Test Code (single) or Result Test Code (multi) |
| 3.1.3 | Test Name | 1.3 | ST | 20 | O* | `test.assay_name` | Assay name — only on Main result |
| 3.1.4 | Test Version | 1.4 | ST | 4 | O* | — | Assay version from GX config |
| 4.1.1 | Analyte/Result Name | 1.1 | ST | 20 | O | `result.analyte_name` | Test Code for main result in multi; Analyte name for analyte/complementary |
| 4.1.2 | Complementary Name | 1.2 | ST | 10 | O | `result.complementary_type` | `Ct`, `EndPt`, `Delta Ct`, `Conc/LOG`, or empty |
| 5.1 | Qualitative Value | 1 | ST | 150 | O | `result.value` (qualitative) | e.g., `POSITIVE`, `NEGATIVE`, `DETECTED`, `ERROR` |
| 5.2 | Quantitative Value | 2 | ST | 20 | O | `result.value` (quantitative) | Numeric value |
| 6 | Units | 1 | ST | 20 | O | `result.unit_of_measure` | `Copies/mL`, `IU/mL`, `Copies`, `%`, `% (IS)`, `IS`, `IU`, or empty |
| 7 | Reference Ranges | 1 | ST | 60 | O | `result.reference_range` | Format: `"3.5 - 4.5"`, `"< 4.5"`, `"> 3.5"` — only on main quantitative result |
| 8 | Abnormal Flags | 1 | IS | 2 | O** | `result.abnormal_flag` | See table below |
| 11 | Result Status | 1 | ID | 1 | O* | `result.result_status` | `F` = Final, `X` = Cannot be done, `C` = Correction |
| 16.2 | Responsible Observer — Family Name | 2 | ST | 32 | O* | `result.performed_by` | Full name of test performer |
| 18 | Equipment Instance | 1-n | ST | 10 | O* | See below | Repeating field — instrument hierarchy (Y = allow repeat) |

> **Fields marked O*** are required for the main/overall result record, optional for analyte and complementary results.  
> **Fields marked O**** — Complementary results `Ct` and `EndPt` do not have abnormal flag interpretation.

#### OBX-18 Equipment Instance Hierarchy

OBX-18 uses the HL7 repeat delimiter (`~`) to represent the equipment hierarchy from lowest to highest level:

```
<ExpirationDate>~<ReagentLotID>~<CartridgeSerial>~<ModuleSerial>~<InstrumentSerial>~<ComputerSystemName>
```

| Repeat | Content | OpenELIS Mapping | Notes |
|--------|---------|-----------------|-------|
| 1 | Expiration Date | `result.reagent_expiry` | `YYYYMMDD` format, optional |
| 2 | Reagent Lot ID | `result.reagent_lot_id` | Optional |
| 3 | Cartridge Serial Number | `result.cartridge_serial` | Required |
| 4 | Module Serial Number | `result.module_serial` | Required |
| 5 | Instrument Serial Number | `analyzer.instrument_serial` | Required |
| 6 | Computer System Name | `analyzer.computer_name` | Required |

> **Note for auto-upload:** Per the Cepheid spec, only Instrument S/N is uploaded via the automatic result upload (ORU^R01). The full equipment hierarchy (all 6 fields) is only available via result request response (ORF^R04). During auto-upload, the format is: `~~~~<InstrumentSerial>~`

#### Abnormal Flag Values

| Flag | Meaning | OpenELIS Mapping |
|------|---------|--------------------|
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

### 4.9 OBX Result Record Parsing Rules

The GeneXpert uses the same three-level hierarchical result structure in HL7 as in ASTM. OpenELIS must parse according to these rules:

#### Determining Single vs. Multi-Result Test

| Condition | Test Type |
|-----------|-----------|
| OBX-3, component 1, **subcomponent 1 = empty** | Single-result test |
| OBX-3, component 1, **subcomponent 1 = not empty** (contains assay panel ID) | Multi-result test |

#### Determining Result Level

| Level | Condition | What to Extract |
|-------|-----------|-----------------|
| **Main Result** | OBX-3.1.3 ≠ empty (contains assay name) | Qualitative (5.1), Quantitative (5.2), Units (6), Reference Range (7), Status (11), Observer (16), Equipment (18) |
| **Analyte Result** | OBX-3.1.3 = empty AND OBX-4.1.1 ≠ empty AND OBX-4.1.2 = empty | Qualitative result (5.1) — individual target detection |
| **Complementary Result** | OBX-3.1.3 = empty AND OBX-4.1.1 ≠ empty AND OBX-4.1.2 ≠ empty | Quantitative result (5.2) — Ct values, EndPt values, concentrations |

#### Quantitative Result Handling

For quantitative assays (viral load, etc.), the GeneXpert uploads **two main results** as separate OBX segments:

1. **Primary result:** OBX-3.1.2 = Test Code, OBX-5.1 = qualitative, OBX-5.2 = quantitative value
2. **LOG result:** Same Test Code, OBX-4.1.2 = `LOG`, OBX-5.2 = LOG value

OpenELIS should store both and display the primary result with the LOG value as a secondary field.

#### What Is NOT Uploaded (auto-upload)

Per the Cepheid specification, the following data is **not transmitted** via HL7 auto-upload (ORU^R01):

- Secondary/analyte results and complementary results (Ct, EndPt, DeltaCt)
- LDA total values for LDA assays
- Full equipment hierarchy (only Instrument S/N is sent in OBX-18)
- Individual test errors — replaced with generic "Error" in NTE

> **Note:** When results are requested by the LIS via QRY^R02 (section 3.8), the **full** result hierarchy including analyte results, complementary results, and the complete equipment instance hierarchy IS returned in the ORF^R04 response.

### 4.10 Specimen Segment (SPM) — Result Upload

| Field # | Field Name | Comp | Type | Max Len | Req | OpenELIS Mapping | Notes |
|---------|-----------|------|------|---------|-----|-----------------|-------|
| 1 | Sequence Number | 1 | SI | 64 | R | — | 1, 2, 3… n |
| 2.1 | Specimen ID | 1 | ST | 25 | R | `sample.accession_number` | Host-assigned specimen ID — **primary matching key** |
| 2.2 | Instrument Specimen ID | 2 | ST | 32 | O | `sample.instrument_specimen_id` | Only if ISID enabled; ignored otherwise |
| 4 | Specimen Type | 1 | ID | 5 | R | — | Always `ORH` (Other per POCT1-A) |
| 11 | Specimen Role | 1 | ID | 1 | R | — | `P` = Patient, `Q` = Quality Control |

> **QC Detection:** When SPM-11 = `Q`, the specimen is a Quality Control sample. OpenELIS must route these to the QC module rather than patient results.

---

## 5. HL7 Field Mapping — Order Response (OpenELIS → GX)

When OpenELIS responds to a query with available orders, it must construct RSP^Z02 messages using these field definitions.

### 5.1 Message Header Segment (MSH) — Order Download

| Field # | Field Name | Comp | Value / Source | Notes |
|---------|-----------|------|---------------|-------|
| 1 | Field Separator | — | `\|` | |
| 2 | Encoding Characters | — | `^~\&` | |
| 3 | Sending Application | 1 | OpenELIS Host ID | Must match GX "Receiver ID" config |
| 5.1 | Receiver ID — System ID | 1 | GX System Name | From GX config |
| 5.2 | Receiver ID — System Name | 2 | `GeneXpert` | |
| 5.3 | Receiver ID — Software Version | 3 | GX software version | |
| 7 | Date/Time | 1 | Current timestamp | `YYYYMMDDHHMMSS` |
| 9 | Message Type | 1-2 | `RSP^Z02` | |
| 10 | Message ID | 1 | Generated UUID or counter | Unique per message |
| 11 | Processing ID | 1 | `P` | Production |
| 12 | Version Number | 1 | `2.5` | |
| 15 | Accept Ack | 1 | `NE` | Never |
| 16 | Application Ack | 1 | `NE` | Never |

### 5.2 Message Acknowledgment (MSA) — Order Download

| Field # | Field Name | Value / Source | Notes |
|---------|-----------|---------------|-------|
| 1 | Acknowledgment Code | `AA` | Application Accept |
| 2 | Message Control ID | From original QBP MSH-10 | Echo back original message ID |

### 5.3 Query Acknowledgment (QAK) — Order Download

| Field # | Field Name | Value / Source | Notes |
|---------|-----------|---------------|-------|
| 1 | Query Tag | From original QPD-2 | Echo back query tag |
| 2 | Query Response Status | `OK` | Data found (use `OK` even if no orders — NF/AE/AR sent via MSA) |
| 3.1 | Message Query Name | `Z01` or `Z03` | Match original query type |
| 3.2 | Query Description | `REQUEST TEST ORDERS` or `HOST QUERY` | Match original |

### 5.4 Patient Identification (PID) — Order Download

| Field # | Field Name | Comp | Value / Source | Notes |
|---------|-----------|------|---------------|-------|
| 1 | Sequence Number | 1 | Sequential (1, 2, 3…) | One per patient |
| 2 | Patient ID 2 | 1 | `patient.external_id` | Practice-assigned |
| 3 | Patient ID 1 | 1 | `patient.national_id` | |
| 5 | Patient Name | 1-5 | `Last^First^Middle^Suffix^Prefix` | |
| 7 | DOB | 1 | `patient.birth_date` | `YYYYMMDD` |
| 8 | Sex | 1 | `patient.gender` | `F`, `M`, `U` |
| 11.5 | Address ZIP | 5 | `person.zip_code` | |

### 5.5 Common Order (ORC) — Order Download

| Field # | Field Name | Comp | Value / Source | Notes |
|---------|-----------|------|---------------|-------|
| 1 | Order Control | 1 | `NW` or `OC` | `NW` = New, `OC` = Cancel |
| 2 | Order Number | 1 | Sequential per patient | |
| 9 | Date/Time | 1 | `sample.order_datetime` | `YYYYMMDDHHMMSS` |

### 5.6 Observation Request (OBR) — Order Download

| Field # | Field Name | Comp | Value / Source | Notes |
|---------|-----------|------|---------------|-------|
| 1 | Sequence Number | 1 | Sequential | |
| 4 | Universal Test ID | 1 | `test.analyzer_test_code` | Must match GX "Assay Host Test Code" |
| 11 | Specimen Action Code | 1 | `A` | Added (new specimen or added to existing) |

### 5.7 Timing/Quantity (TQ1) — Order Download

| Field # | Field Name | Value / Source | Notes |
|---------|-----------|---------------|-------|
| 9 | Priority | `S` or `R` | From `analysis.priority` |

### 5.8 Specimen (SPM) — Order Download

| Field # | Field Name | Comp | Value / Source | Notes |
|---------|-----------|------|---------------|-------|
| 1 | Sequence Number | 1 | Sequential | |
| 2.1 | Specimen ID | 1 | `sample.accession_number` | **Required** |
| 2.2 | Instrument Specimen ID | 2 | `sample.instrument_specimen_id` | Required if ISID enabled and previously assigned |
| 4 | Specimen Type | 1 | `ORH` | Always |
| 11 | Specimen Role | 1 | `P` or `Q` | Patient or QC |

---

## 6. Test Code Mapping — OpenELIS Configuration

The test code mapping is identical between ASTM and HL7 protocols. See the companion ASTM specification (Section 6) for the complete mapping table. Summary:

### 6.1 Recommended Test Code Mapping

| # | GX Assay Name | Host Test Code | Result Test Codes (multi-result) | OpenELIS Test Name Tag | LOINC |
|---|--------------|----------------|----------------------------------|----------------------|-------|
| 1 | Xpert MTB/RIF | `MTB-RIF` | `MTB`, `RIF` | `label.test.mtbRif` | 94500-6, 94557-6 |
| 2 | Xpert MTB/RIF Ultra | `MTB-ULTRA` | `MTB-U`, `RIF-U` | `label.test.mtbRifUltra` | 94500-6, 94557-6 |
| 3 | Xpert HIV-1 Viral Load | `HIV-VL` | — (single + LOG) | `label.test.hivViralLoad` | 25836-8 |
| 4 | Xpert HCV Viral Load | `HCV-VL` | — (single + LOG) | `label.test.hcvViralLoad` | 11259-9 |
| 5 | Xpert HBV Viral Load | `HBV-VL` | — (single + LOG) | `label.test.hbvViralLoad` | 42595-9 |
| 6 | Xpert CT/NG | `CT-NG` | `CT`, `NG` | `label.test.ctNg` | 21613-5, 21415-5 |
| 7 | Xpert Flu/RSV | `FLU-RSV` | `FluA`, `FluB`, `RSV` | `label.test.fluRsv` | 92142-9, 92141-1, 92131-2 |
| 8 | Xpert GBS | `GBS-TC` | — (single) | `label.test.gbs` | 92145-2 |
| 9 | Xpert SARS-CoV-2 | `COV2` | `COV2` | `label.test.sarsCov2` | 94500-6 |
| 10 | Xpert Carba-R | `CARBA-R` | `KPC`, `NDM`, `VIM`, `IMP1`, `OXA48` | `label.test.carbaR` | 85827-4 |
| 11 | Xpert EV | `EV-TC` | — (single) | `label.test.enterovirus` | 86328-2 |
| 12 | Xpert C. diff | `CDIFF` | `tcdB`, `cdt` | `label.test.cDiff` | 77382-0 |

### 6.2 Result Value Mapping

Result value mapping is protocol-independent. See ASTM specification Section 6.2 for the complete dictionary mapping table.

Key entries:

| GX Qualitative Value | OpenELIS Result Tag | Notes |
|---------------------|---------------------|-------|
| `DETECTED` | `label.result.detected` | |
| `NOT DETECTED` | `label.result.notDetected` | |
| `TRACE` | `label.result.trace` | MTB/RIF Ultra trace — **new dictionary entry** |
| `POSITIVE` / `NEGATIVE` | `label.result.positive` / `label.result.negative` | |
| `ERROR` | `label.result.error` | Check NTE for details |
| `INVALID` | `label.result.invalid` | |
| `VERY LOW` / `LOW` / `MEDIUM` / `HIGH` | `label.result.veryLow` etc. | Semi-quantitative (Ultra) |
| `RESISTANT` / `SUSCEPTIBLE` | `label.result.resistant` / `label.result.susceptible` | Resistance detection |

---

## 7. Complete Message Examples

### 7.1 Single-Result Qualitative (Xpert GBS)

```
MSH|^~\&|GeneXpert PC^GeneXpert^Dx4.6a.5_Demo||LIS||20141027171453||ORU^R32^ORU_R30|URM-/TvGUlUA-01|P|2.5
PID|1||||^^^^
ORC|RE|1|||||||20060124131136
OBR|1|||GBS TC|||||||||||||||||||||F
TQ1|||||||20060124131136|20060124142551|R
OBX|1|ST|&GBS TC&GBS Clinical Trial&4||NEGATIVE^||||||F|||||^Teresa Boswell||~~~~700844~
SPM|1|03594r^||ORH|||||||P
```

**Parsing:** Single-result (OBX-3.1.1 empty). Main result: Test Code = `GBS TC`, Qualitative = `NEGATIVE`, Status = `F`, Observer = `Teresa Boswell`, Instrument S/N = `700844`.

### 7.2 Single-Result Quantitative with LOG (Viral Load)

```
MSH|^~\&|GeneXpert PC^GeneXpert^Dx4.7.310_Demo||LIS||20141119153654||ORU^R32^ORU_R30|URM-bOnaKnUA-03|P|2.5
PID|1||||^^^^
ORC|RE|1|||||||20130109151218
OBR|1|||QUANT1|||||||||||||||||||||F
TQ1|||||||20130109151218|20130109151218|R
OBX|1|ST|&QUANT1&LQL-UQL&1||^20385215991.41|copies/mL|2000.00-200000000000.00|N|||F|||||^<None>||~~~~-1~
NTE|1|L|Notes^^ used for sw testing.
OBX|2|ST|&QUANT1&LQL-UQL&1|&LOG|^10.31|copies/mL|3.30-11.30|N|||F|||||^<None>||~~~~-1~
NTE|1|L|Notes^^
SPM|1|LQL-UQL.A1^||ORH|||||||P
```

**Parsing:** Two main OBX segments. OBX|1: Quantitative = `20385215991.41` copies/mL, range `2000.00-200000000000.00`, Normal. OBX|2: LOG value = `10.31`, range `3.30-11.30` (identified by `LOG` in OBX-4.1.2).

### 7.3 Multi-Result (Xpert FII & FV)

```
MSH|^~\&|GeneXpert PC^GeneXpert^Dx4.6a.5_Demo||LIS||20141027153347||ORU^R32^ORU_R30|URM-YgmvTlUA-01|P|2.5
PID|1||||^^^^
ORC|RE|1|||||||20071212105112
OBR|1|||FIIFV TC|||||||||||||||||||||F
TQ1|||||||20071212105112|20071212112100|R
OBX|1|ST|FIIFV TC&FII TC&Xpert HemosIL FII \T\ FV IUO&1|FII|NORMAL^||||||F|||||^Jana Gausman||~~~~700844~
OBX|2|ST|FIIFV TC&FV TC&Xpert HemosIL FII \T\ FV IUO&1|FV|NORMAL^||||||F|||||^Jana Gausman||~~~~700844~
SPM|1|Norm^||ORH|||||||P
```

**Parsing:** Multi-result (OBX-3.1.1 = `FIIFV TC` = Panel ID). Two analyte main results: FII = `NORMAL`, FV = `NORMAL`.

### 7.4 Query → Order Response → Result Upload (Full Workflow)

**Step 1 — GX queries for all orders (QBP^Z01):**
```
MSH|^~\&|ICU^GeneXpert^1.0||LIS||20250225100000||QBP^Z01^QBP_Z01|query-uuid-001|P|2.5
QPD|Z01^REQUEST TEST ORDERS|query-uuid-001|ALL
RCP|I
```

**Step 2 — OpenELIS responds with 2 orders for 1 patient (RSP^Z02):**
```
MSH|^~\&|LIS||ICU^GeneXpert^1.0||20250225100001||RSP^Z02|resp-uuid-001|P|2.5|||NE|NE
MSA|AA|query-uuid-001
QAK|query-uuid-001|OK|Z01^REQUEST TEST ORDERS
QPD|Z01^REQUEST TEST ORDERS|query-uuid-001|ALL
PID|1||NID-12345
ORC|NW|1|||||||20250225090000
OBR|1|||MTB-RIF|||||||A
TQ1|||||||||R
SPM|1|LAB-2025-00818^||ORH|||||||P
ORC|NW|2|||||||20250225090100
OBR|2|||HIV-VL|||||||A
TQ1|||||||||R
SPM|2|LAB-2025-00818^||ORH|||||||P
```

**Step 3 — GX uploads MTB/RIF result (ORU^R01):**
```
MSH|^~\&|ICU^GeneXpert^1.0||LIS||20250225114500||ORU^R32^ORU_R30|result-uuid-001|P|2.5|||AL|NE
PID|1|||NID-12345|DOE^JANE^^^||19900315|F
ORC|RE|1|||||||20250225090000
OBR|1|||MTB-RIF|||||||||||||||||||||F
TQ1|||||||20250225100015|20250225114430|R
OBX|1|ST|MTB-RIF&MTB&Xpert MTB/RIF&4|MTB|DETECTED^||||||F|||||^Lab Tech 1||~~~~GX-001~
OBX|2|ST|MTB-RIF&RIF&Xpert MTB/RIF&4|RIF Resistance|NOT DETECTED^||||||F|||||^Lab Tech 1||~~~~GX-001~
SPM|1|LAB-2025-00818^||ORH|||||||P
```

**Step 4 — OpenELIS acknowledges (ACK^R01):**
```
MSH|^~\&|LIS||ICU^GeneXpert^1.0||20250225114501||ACK|ack-uuid-001|P|2.5|||NE|NE
MSA|CA|result-uuid-001
```

### 7.5 Host Query with ISID (Full Workflow)

**Step 1 — GX sends Host Query for specimen (QBP^Z03):**
```
MSH|^~\&|ICU^GeneXpert^1.0||LIS||20250225120000||QBP^Z03^QBP_Z03|hq-uuid-001|P|2.5
QPD|Z03^HOST QUERY|hq-uuid-001||LAB-2025-00820
RCP|I
```

**Step 2 — OpenELIS responds with order (RSP^Z02):**
```
MSH|^~\&|LIS||ICU^GeneXpert^1.0||20250225120001||RSP^Z02|resp-uuid-002|P|2.5|||NE|NE
MSA|AA|hq-uuid-001
QAK|hq-uuid-001|OK|Z03^HOST QUERY
QPD|Z03^HOST QUERY|hq-uuid-001||LAB-2025-00820
PID|1||NID-67890
ORC|NW|1|||||||20250225110000
OBR|1|||MTB-ULTRA|||||||A
TQ1|||||||||S
SPM|1|LAB-2025-00820^||ORH|||||||P
```

**Step 3 — GX returns ISID mapping (SSU^U03):**
```
MSH|^~\&|ICU^GeneXpert^1.0||LIS||20250225120100||SSU^U03^SSU_U03|isid-uuid-001|P|2.5|||AL|NE
EQU|N/D|20250225120100
SAC|N/D
SPM|1|LAB-2025-00820^ISID-A1B2C3||ORH|||||||P
```

**Step 4 — OpenELIS acknowledges ISID (ACK^U03):**
```
MSH|^~\&|LIS||ICU^GeneXpert^1.0||20250225120101||ACK|ack-isid-001|P|2.5|||NE|NE
MSA|CA|isid-uuid-001
```

### 7.6 LIS Result Request with Full Hierarchy (QRY^R02 → ORF^R04)

**Step 1 — OpenELIS requests results (QRY^R02):**
```
MSH|^~\&|LIS||ICU^GeneXpert^1.0||20250225150000||QRY^R02^QRY_R02|rr-uuid-001|P|2.5
QRD|20250225150000|R|I|rr-uuid-001|||20^RD|N/D|RES|N/D|NID-12345^LAB-2025-00818^^MTB-RIF
```

**Step 2 — GeneXpert responds with full result hierarchy (ORF^R04):**
```
MSH|^~\&|ICU^GeneXpert^1.0||LIS||20250225150001||ORF^R04^ORF_R04|orf-uuid-001|P|2.5|||NE|NE
MSA|AA|rr-uuid-001
QRD|20250225150000|R|I|rr-uuid-001|||20^RD|N/D|RES|N/D|NID-12345^LAB-2025-00818^^MTB-RIF
PID|1|||NID-12345|DOE^JANE^^^||19900315|F
ORC|RE|1|||||||20250225090000
OBR|1|||MTB-RIF|||||||||||||||||||||F
TQ1|||||||20250225100015|20250225114430|R
OBX|1|ST|MTB-RIF&MTB&Xpert MTB/RIF&4|MTB|DETECTED^||||||F|||||^Lab Tech 1||20260101~LOT-A123~CART-5678~MOD-9012~GX-001~GXPC-LAB1
OBX|2|ST||Probe A&Ct||^18.7||||||F
OBX|3|ST||Probe A&EndPt||^1250.3||||||F
OBX|4|ST||Probe B&Ct||^16.2||||||F
OBX|5|ST||Probe B&EndPt||^1680.1||||||F
OBX|6|ST|MTB-RIF&RIF&Xpert MTB/RIF&4|RIF Resistance|NOT DETECTED^||||||F|||||^Lab Tech 1
OBX|7|ST||Probe D&Ct||^21.4||||||F
OBX|8|ST||Probe D&EndPt||^920.7||||||F
SPM|1|LAB-2025-00818^||ORH|||||||P
```

> **Note:** The ORF^R04 response includes the full hierarchy with analyte results (Probe-level Ct and EndPt values) and complete equipment identification — data that is NOT included in the auto-upload ORU^R01.

---

## 8. OpenELIS Implementation Requirements

### 8.1 HL7 MLLP Service Configuration

OpenELIS must provide an HL7 MLLP listener service with the following configurable parameters:

| Parameter | Tag | Description | Default |
|-----------|-----|-------------|---------| 
| Host ID | `label.analyzer.hostId` | Identifier for OpenELIS (sent in MSH-3) | `LIS` |
| Connection Mode | `label.analyzer.connectionMode` | `SERVER` or `CLIENT` | `SERVER` |
| Listen Port | `label.analyzer.listenPort` | TCP port for incoming MLLP connections | `9000` |
| Remote Host | `label.analyzer.remoteHost` | GX IP address (client mode only) | — |
| Remote Port | `label.analyzer.remotePort` | GX port (client mode only) | — |
| Response Timeout | `label.analyzer.responseTimeout` | Max time to respond to query (seconds) | `30` |
| ISID Enabled | `label.analyzer.isidEnabled` | Whether to expect/track Instrument Specimen IDs | `false` |
| Auto-Accept Results | `label.analyzer.autoAccept` | Automatically accept final results or queue for review | `false` |
| Protocol | `label.analyzer.protocol` | `ASTM` or `HL7` | `ASTM` |

### 8.2 MLLP Message Handler

The MLLP service must:

1. **Listen for `<SB>` (0x0B)** to detect start of message
2. **Read until `<EB><CR>` (0x1C 0x0D)** to capture complete HL7 message
3. **Parse MSH segment** to determine message type and trigger event
4. **Route by MSH-9** (Message Type):

| MSH-9 | Handler | Description |
|-------|---------|-------------|
| `QBP^Z01` | Order Query Handler | Return all pending orders |
| `QBP^Z03` | Host Query Handler | Return orders for specific specimen |
| `QCN^J01` | Cancel Handler | Acknowledge, stop pending response |
| `SSU^U03` | ISID Handler | Store ISID mapping |
| `ORU^R01` / `ORU^R32` | Result Handler or Rejection Handler | Parse OBR-25: `F`/`I` = result, `X` with NTE = rejection |
| Other | Error Handler | Return ACK with `CR` code |

5. **Build acknowledgment** (MSH + MSA, with appropriate ACK code)
6. **Send response** wrapped in MLLP framing: `<SB> response <EB> <CR>`

### 8.3 Order Query Handler

When OpenELIS receives a QBP^Z01 or QBP^Z03 from the GeneXpert:

1. **Parse QPD** to determine query type:
   - Z01: Return all pending orders for this analyzer
   - Z03: Return orders matching specific Specimen ID (QPD-4) and optional Patient ID (QPD-3, QPD-5)
2. **Query OpenELIS orders** where:
   - Analysis status = "Not Started" or "In Progress"
   - Test is mapped to this GeneXpert analyzer
   - For Z03: Specimen ID matches QPD-4
3. **Build RSP^Z02 response** with MSH, MSA, QAK, QPD, and PID/ORC/OBR/TQ1/SPM per order
4. **Send response** within 60 seconds
5. If no matching orders, send RSP^Z02 with only MSH, MSA, QAK, QPD (no PID/ORC segments)

### 8.4 Result Receive Handler

When OpenELIS receives an ORU^R01 result upload:

1. **Match Specimen ID** (SPM-2.1) to `sample.accession_number`
2. **Match Test Code** (OBR-4 or OBX-3.1.2) to analyzer test mapping
3. **Determine result type** using OBX parsing rules (Section 4.9)
4. **Extract values** from OBX segments:
   - Qualitative result from OBX-5.1
   - Quantitative result from OBX-5.2
   - Units from OBX-6
   - Reference range from OBX-7
   - Abnormal flags from OBX-8
   - Result status from OBX-11
5. **Detect QC samples** via SPM-11 = `Q` and route to QC module
6. **Store error information** from NTE segments
7. **Handle result status** (same logic as ASTM):
   - `F` → Final result; create result entry
   - `I` → Pending; create placeholder
   - `X` → Canceled/Cannot be done; flag as failed
   - `C` → Correction; update existing result
8. **Queue for validation** (or auto-accept if configured)
9. **Send ACK^R01** with `CA` acknowledgment code

### 8.5 Shared Implementation with ASTM

Since the result parsing logic, test code mapping, and data model are identical between ASTM and HL7, OpenELIS should implement a **shared result processing layer** with protocol-specific message parsers:

```
┌────────────────────┐     ┌────────────────────┐
│  ASTM E-1381       │     │  HL7 MLLP          │
│  Transport Layer    │     │  Transport Layer    │
└────────┬───────────┘     └────────┬───────────┘
         │                          │
┌────────▼───────────┐     ┌────────▼───────────┐
│  ASTM E1394-97     │     │  HL7 v2.5          │
│  Message Parser    │     │  Message Parser    │
│  (H,P,O,R,C,L)    │     │  (MSH,PID,ORC,OBR, │
│                    │     │   OBX,NTE,SPM,TQ1) │
└────────┬───────────┘     └────────┬───────────┘
         │                          │
         └──────────┬───────────────┘
                    │
         ┌──────────▼───────────┐
         │  GeneXpert Result    │
         │  Processing Engine   │
         │  (shared logic)      │
         │  - Result hierarchy  │
         │  - Test code mapping │
         │  - QC routing        │
         │  - Error handling    │
         └──────────┬───────────┘
                    │
         ┌──────────▼───────────┐
         │  OpenELIS Data Model │
         └──────────────────────┘
```

### 8.6 Unmatched Sample and Error Handling

Same as ASTM specification (Section 8.4 and 8.5). Protocol-independent behavior.

---

## 9. Validation Test Dataset

### 9.1 Normal Operations

| Test Case | Specimen ID | Test | Expected Result | Protocol Notes |
|-----------|------------|------|----------------|----------------|
| TC-01 | `VAL-001` | MTB/RIF | MTB: DETECTED, RIF: NOT DETECTED | Multi-result — 2 OBX main segments |
| TC-02 | `VAL-002` | MTB/RIF Ultra | MTB: DETECTED (MEDIUM), RIF: NOT DETECTED | TRACE dictionary entry for Ultra |
| TC-03 | `VAL-003` | HIV-1 VL | 45000 copies/mL (LOG: 4.65) | Two OBX segments: primary + LOG |
| TC-04 | `VAL-004` | GBS | NEGATIVE | Single OBX segment |
| TC-05 | `VAL-005` | CT/NG | CT: DETECTED, NG: NOT DETECTED | Multi-result — 2 OBX segments |
| TC-06 | `VAL-006` | Flu/RSV | FluA: DETECTED, FluB: NOT DETECTED, RSV: NOT DETECTED | Multi-result — 3 OBX segments |

### 9.2 HL7-Specific Edge Cases

| Test Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| TC-10 | Result with OBR-25 = `X` and NTE error | Store as failed, capture error from NTE-3 |
| TC-11 | Result with OBR-25 = `I` (pending) | Create placeholder, await final result |
| TC-12 | Correction (OBX-11 = `C`) | Update existing result, maintain audit trail |
| TC-13 | QC specimen (SPM-11 = `Q`) | Route to QC module, not patient results |
| TC-14 | Unknown Specimen ID | Handle per configuration (reject/placeholder/auto-register) |
| TC-15 | ISID mapping via SSU^U03 | Store ISID, verify in subsequent result match |
| TC-16 | HIV VL below lower limit of quantification | OBX-5.1 = `< 20`, OBX-5.2 empty or `< 20` |
| TC-17 | HIV VL above upper limit | OBX-8 = `>` (above absolute high) |
| TC-18 | Multiple patients in single ORU^R01 | Correctly separate by PID segment boundaries |
| TC-19 | 60-second query timeout → QCN^J01 | OpenELIS handles cancel, stops processing |
| TC-20 | Non-expected message received | Return ACK with `CR` and "Non-expected message received" |
| TC-21 | Order rejection via ORU^R01 (OBR-25=X, NTE with error) | Log rejection error code, mark order as rejected |
| TC-22 | Result request via QRY^R02 | Verify full result hierarchy returned in ORF^R04 |
| TC-23 | Result request for unidentified specimen | Verify ORF^R04 with OBR-25=`V` returned |
| TC-24 | MLLP framing — incomplete message (no EB/CR) | TCP timeout, log error, do not process partial data |

---

## 10. Data Model Impact

The data model impact is shared between ASTM and HL7 protocols. See the companion ASTM specification (Section 10) for the complete SQL schema including:

- `analyzer` table extensions (connection_mode, listen_port, host_id, isid_enabled, protocol)
- `instrument_specimen_id` table (ISID mapping)
- `analyzer_message_log` table (raw message logging — stores HL7 messages as-is)
- `result_instrument_detail` table (equipment hierarchy from OBX-18)

**Additional HL7-specific note:** The `analyzer_message_log.message_type` field should include HL7-specific values: `QBP_Z01`, `QBP_Z03`, `RSP_Z02`, `QCN_J01`, `SSU_U03`, `ORU_R01`, `QRY_R02`, `ORF_R04`.

---

## 11. Confidence Assessment

| Component | Confidence | Basis |
|-----------|-----------|-------|
| MLLP transport layer | HIGH | Simple framing protocol, well-documented in Cepheid spec (section 8) |
| Message structure (MSH, PID, ORC, OBR, OBX, SPM, TQ1, NTE) | HIGH | Complete field definitions with examples in spec (section 9) |
| OBX result record parsing rules | HIGH | Explicit parsing logic with decision tables in spec (section 9.3.4.1.8.1) |
| Query/Response flow (QBP/RSP, QCN, SSU) | HIGH | Sequence diagrams and examples in spec (sections 9.2, 9.3) |
| Result request (QRY^R02 / ORF^R04) | HIGH | Full segment definitions and examples in spec (section 9.3.5) |
| Acknowledgment model (MSA codes, MSH-15/16) | HIGH | Documented original and enhanced modes (section 8.1) |
| OBX-18 Equipment Instance hierarchy | HIGH | Explicit field format with examples in spec (section 9.3.4.1.8, 9.3.5.2.10) |
| Test code mapping | MEDIUM | Recommended codes; actual values depend on per-site GX configuration |
| LOINC codes | MEDIUM | Standard mappings; may vary by jurisdiction and assay version |
| Ct/complementary result limitation | HIGH | Explicitly stated: "Secondary results will not be uploaded to LIS" |
| Unsolicited order rejection | HIGH | Explicitly stated: "This system does not support operating in this way" |
| ISID flow (SSU^U03) | HIGH | Complete message structure and examples in spec (section 9.3.3) |

---

## 12. ASTM ↔ HL7 Cross-Reference

For implementers supporting both protocols, this table maps equivalent concepts:

| Concept | ASTM E1394-97 | HL7 v2.5 |
|---------|---------------|----------|
| Message framing | ASTM E-1381 (ENQ/ACK/NAK/EOT, frame numbers, checksums) | MLLP (SB/EB/CR) |
| Message delimiter | `@^\` (repeat, component, escape) | `^~\&` (component, repeat, escape, subcomponent) |
| Header record | H record | MSH segment |
| Patient record | P record | PID segment |
| Order record | O record | ORC + OBR + TQ1 + SPM segments |
| Result record | R record | OBX segment |
| Comment record | C record | NTE segment |
| Terminator | L record (N/I/F codes) | No equivalent — message completeness implied by MLLP framing |
| Query for all orders | Q record with `O@N` in field 13 | QBP^Z01 with QPD-3 = `ALL` |
| Host query | Q record with PatID^SpecID^ISID in field 3 | QBP^Z03 with QPD-3/4/5 = PatID/SpecID/PatID2 |
| Cancel query | — (no explicit cancel in ASTM) | QCN^J01 |
| ISID upload | O record with action code `P` | SSU^U03 message |
| Result upload | H\|P\|O\|C\|R\|L message | ORU^R01 message |
| Result request | Q record with field 13 = `F` | QRY^R02 message |
| Result response | H\|P\|O\|R\|C\|L with report type `Q@F` | ORF^R04 message |
| QC discrimination | O record field 12 = `Q` | SPM-11 = `Q` |
| Order rejection | Order response with rejection records | ORU^R01 with OBR-25=`X` + NTE error |
| Unsolicited order rejection | L record termination | ORL^O22 or ACK with error |
| Acknowledgment | Implicit (frame-level ACK/NAK) | Explicit (MSA segment with coded response) |
| Specimen ID | O record field 3 | SPM-2.1 |
| Instrument Specimen ID | O record field 4 | SPM-2.2 |
| Test Code | O field 5.4 / R field 3.4 | OBR-4.1 / OBX-3.1.2 |
| Equipment instance | R field 14 (5 components separated by `^`) | OBX-18 (6 repetitions separated by `~`) |

---

## 13. Related Specifications

| Document | Description |
|----------|-------------|
| GeneXpert LIS Interface Protocol Spec (301-2002, Rev. E) | **Primary reference** — vendor protocol specification |
| GeneXpert Dx Operator Manual Rev. L (301-0045) | Host Communication Settings configuration |
| GeneXpert Service Manual (301-0569, Rev. A) | Hardware reference; minimal LIS content |
| Cepheid GeneXpert Dx — ASTM E1394-97 Integration Spec v1.0 | **Companion spec** — ASTM protocol specification |
| Analyzer Results Import Page FRS | QC-first workflow for reviewing imported results |
| Test Catalog FRS v2 | Test definitions, LOINC mapping, analyzer linking |
| OpenELIS HL7 MLLP Listener Service Architecture | Backend service for HL7 MLLP TCP listener (OGC-325) |

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-02-25 | Casey / Claude | Initial draft — HL7 v2.5 protocol specification based on Cepheid LIS Interface Protocol Specification (301-2002, Rev. E). Complete segment mapping for result upload (ORU^R01), order query/response (QBP/RSP), ISID (SSU^U03), result request (QRY^R02/ORF^R04), cancel (QCN^J01), and order rejection. Includes OBX parsing rules, equipment instance hierarchy, ASTM cross-reference, test code mapping, validation dataset. |

---

## 15. Open Questions

| # | Question | Impact | Status |
|---|----------|--------|--------|
| 1 | ~~Should OpenELIS support both ASTM and HL7 simultaneously?~~ | Architecture | **RESOLVED** — Start with ASTM, add HL7 as alternative. Shared processing engine. |
| 2 | ~~Which assays are deployed at target sites?~~ | Configuration | **RESOLVED** — Supporting hundreds/thousands of sites, likely all assays. |
| 3 | ~~Do target sites use ISID?~~ | Mapping logic | **RESOLVED** — ISID disabled for initial deployment. |
| 4 | ~~Should OpenELIS actively request results?~~ | Implementation scope | **RESOLVED** — Recommended, decision pending on implementation priority. |
| 5 | ~~How should Ct values be handled?~~ | Result request scope | **RESOLVED** — Pull via result request (QRY^R02) for sites that need Ct data. |
| 6 | ~~What behavior for MTB/RIF Ultra TRACE result?~~ | Dictionary config | **RESOLVED** — Create new dictionary entry `label.result.trace`. |
| 7 | Should the HL7 MLLP listener share the same TCP port with the existing ASTM listener service (OGC-325), or use a separate port? | Network configuration | OPEN |
| 8 | For sites migrating from ASTM to HL7, is a dual-protocol transition period required? | Deployment strategy | OPEN |
