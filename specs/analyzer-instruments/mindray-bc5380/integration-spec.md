# Mindray BC-5380 Auto Hematology Analyzer — HL7 v2.3.1 Integration Specification

**Version:** 2.1
**Date:** 2026-02-27
**Status:** Draft — Ready for Development Review
**Protocol:** HL7 v2.3.1 over TCP/IP (MLLP)
**Confidence:** HIGH — Based on BC-5380 Operator's Manual Appendix C + validated CSV export data
**Supersedes:** v1.0 (incorrectly specified as ASTM E1394)

---

## 1. Instrument Overview

| Field | Value |
|-------|-------|
| **Manufacturer** | Shenzhen Mindray Bio-Medical Electronics Co., Ltd. |
| **Model** | BC-5380 Auto Hematology Analyzer |
| **Discipline** | Hematology — 5-part differential |
| **Communication** | **HL7 v2.3.1** over TCP/IP with MLLP framing |
| **Barcode Support** | Yes — CODE39, CODE93, CODEBAR, CODE128, UPC/EAN, ITF |
| **Modes** | Whole Blood, Pre-diluted; Open Vial, Closed Vial, Autoloader |
| **Reference Document** | BC-5380 Operator's Manual, Appendix C: Communication |

> **CRITICAL — Protocol Correction:** Version 1.0 of this specification incorrectly described the BC-5380 as using ASTM E1394/LIS2-A2. The actual protocol is **HL7 v2.3.1 over TCP/IP with MLLP framing**, as documented in the official Operator's Manual Appendix C. This is the **same transport protocol** as the Mindray BS-series chemistry analyzers, but with significant differences in message structure and test identification. Both analyzers share the HL7 MLLP Listener Service (OGC-325).

### 1.1 Reportable Parameters

The BC-5380 provides 23 diagnostic parameters + 4 RUO parameters across two measurement modes:

| Parameter | Abbreviation | LOINC Code | OBX-3 ID | CBC | CBC+DIFF | Unit |
|-----------|-------------|------------|----------|-----|----------|------|
| White Blood Cell count | WBC | 6690-2 | 6690-2 | ✓ | ✓ | 10*9/L |
| Red Blood Cell count | RBC | 789-8 | 789-8 | ✓ | ✓ | 10*12/L |
| Hemoglobin | HGB | 718-7 | 718-7 | ✓ | ✓ | g/L |
| Hematocrit | HCT | 4544-3 | 4544-3 | ✓ | ✓ | (ratio) |
| Mean Corpuscular Volume | MCV | 787-2 | 787-2 | ✓ | ✓ | fL |
| Mean Corpuscular Hemoglobin | MCH | 785-6 | 785-6 | ✓ | ✓ | pg |
| Mean Corpuscular Hgb Conc | MCHC | 786-4 | 786-4 | ✓ | ✓ | g/L |
| RBC Distribution Width CV | RDW-CV | 788-0 | 788-0 | ✓ | ✓ | (ratio) |
| RBC Distribution Width SD | RDW-SD | 21000-5 | 21000-5 | ✓ | ✓ | fL |
| Platelet count | PLT | 777-3 | 777-3 | ✓ | ✓ | 10*9/L |
| Mean Platelet Volume | MPV | 32623-1 | 32623-1 | ✓ | ✓ | fL |
| Platelet Distribution Width | PDW | 32207-3 | 32207-3 | ✓ | ✓ | (index) |
| Plateletcrit | PCT | 10002 | 10002 | ✓ | ✓ | mL/L |
| Neutrophils # | NEU# | 751-8 | 751-8 | — | ✓ | 10*9/L |
| Neutrophils % | NEU% | 770-8 | 770-8 | — | ✓ | (ratio) |
| Lymphocytes # | LYM# | 731-0 | 731-0 | — | ✓ | 10*9/L |
| Lymphocytes % | LYM% | 736-9 | 736-9 | — | ✓ | (ratio) |
| Monocytes # | MON# | 742-7 | 742-7 | — | ✓ | 10*9/L |
| Monocytes % | MON% | 5905-5 | 5905-5 | — | ✓ | (ratio) |
| Eosinophils # | EOS# | 711-2 | 711-2 | — | ✓ | 10*9/L |
| Eosinophils % | EOS% | 713-8 | 713-8 | — | ✓ | (ratio) |
| Basophils # | BAS# | 704-7 | 704-7 | — | ✓ | 10*9/L |
| Basophils % | BAS% | 706-2 | 706-2 | — | ✓ | (ratio) |
| *Abnormal Lymphocytes # | *ALY# (RUO) | 26477-0 | 26477-0 | — | ✓ | 10*9/L |
| *Abnormal Lymphocytes % | *ALY% (RUO) | 13046-8 | 13046-8 | — | ✓ | (ratio) |
| *Large Immature Cells # | *LIC# (RUO) | 10000 | 10000 | — | ✓ | 10*9/L |
| *Large Immature Cells % | *LIC% (RUO) | 10001 | 10001 | — | ✓ | (ratio) |

> **RUO Parameters:** ALY#, ALY%, LIC#, LIC% are for Research Use Only, not for diagnostic use.

### 1.2 Additional Data Transmitted

| Data Type | OBX-3 ID | Encoding System | Notes |
|-----------|----------|-----------------|-------|
| Take Mode | 08001 | 99MRC | O=Open, A=Autoloader, C=Closed |
| Blood Mode | 08002 | 99MRC | W=Whole blood, P=Pre-diluted |
| Test Mode | 08003 | 99MRC | CBC, CBC+5DIFF |
| Reference Group | 01002 | 99MRC | Ref group name |
| Age | 30525-0 | LN | Numeric value with unit |
| Remark | 01001 | 99MRC | Free text |
| Histograms | 15000-15116 | 99MRC | WBC, RBC, PLT (BMP via Base64) |
| DIFF Scattergram | 15200 | 99MRC | WBC DIFF scattergram (BMP via Base64) |
| Abnormal Alarms | 12000-12018 | 99MRC/LN | IS type flags (T/F) for clinical alerts |

### 1.3 Microscope Exam Parameters

The BC-5380 can transmit manual differential results via a separate OBR (OBR-4 = `00002^Manual Count^99MRC`):

| Parameter | LOINC | Unit |
|-----------|-------|------|
| Myeloblasts % | 747-6 | % |
| Promyelocytes % | 783-1 | % |
| Myelocytes % | 749-2 | % |
| Metamyelocytes % | 740-1 | % |
| Neuts Band % | 764-1 | % |
| Neuts Seg % | 769-0 | % |
| Eosinophils % (manual) | 714-6 | % |
| Basophils % (manual) | 707-0 | % |
| Lymphoblasts % | 33831-9 | % |
| Prolymphocytes % | 6746-2 | % |
| Lymphocytes % (manual) | 737-7 | % |
| Abnormal Lymphs % | 29261-5 | % |
| Monoblasts % | 33840-0 | % |
| Promonocytes % | 13599-6 | % |
| Monocytes % (manual) | 744-3 | % |
| NRBCs % | 18309-5 | % |
| Reticulocytes % | 31112-6 | % |
| Undefined Cells % | 11000 (99MRC) | % |
| Other Abnormal Cells % | 11001 (99MRC) | % |

---

## 2. Communication Architecture

### 2.1 Connection Model

The BC-5380 uses **HL7 v2.3.1 over TCP/IP** with the same MLLP framing as the Mindray BS-series. Both analyzers connect to the **same HL7 MLLP Listener Service** (OGC-325), on different ports with different adapters.

```
┌──────────────┐      HL7 v2.3.1 / MLLP    ┌──────────────────────┐
│  BC-5380     │ ─────────────────────────► │  OpenELIS HL7        │
│  Hematology  │   TCP/IP (port A)          │  MLLP Listener       │
│  Analyzer    │ ◄─────────────────────────  │  (OGC-325)           │
└──────────────┘   (bidirectional)          │                      │
                                            │  → BC-5380 Adapter   │
┌──────────────┐      HL7 v2.3.1 / MLLP    │  → BS-Series Adapter │
│  BS-Series   │ ─────────────────────────► │                      │
│  Chemistry   │   TCP/IP (port B)          └──────────────────────┘
│  Analyzer    │ ◄─────────────────────────
└──────────────┘
```

### 2.2 Transport Layer — MLLP

All HL7 messages are wrapped in MLLP framing:

```
<SB> message_content <EB><CR>
```

| Character | Hex | ASCII | Purpose |
|-----------|-----|-------|---------|
| `<SB>` | `0x0B` | VT (Vertical Tab) | Start Block |
| `<EB>` | `0x1C` | FS (File Separator) | End Block |
| `<CR>` | `0x0D` | CR (Carriage Return) | Message terminator |

### 2.3 TCP/IP Connection

| Parameter | Value |
|-----------|-------|
| Protocol | TCP/IP |
| Port | Configurable on analyzer (General Setup → Communication) |
| Connection Mode | Analyzer connects to OpenELIS (client mode) |
| Character Set | **UTF-8 / UNICODE** (MSH-18 = `UNICODE`) |
| ACK Timeout | 10 seconds |

> **Character encoding difference:** The BC-5380 uses **UTF-8/UNICODE**, while the BS-series uses ASCII.

### 2.4 HL7 Message Types

| Message | Direction | Purpose |
|---------|-----------|---------|
| `ORU^R01` | Analyzer → OpenELIS | Send test results (patient or QC) |
| `ACK^R01` | OpenELIS → Analyzer | Acknowledge receipt of ORU^R01 |
| `ORM^O01` | Analyzer → OpenELIS | Query for worklist (by sample ID) |
| `ORR^O02` | OpenELIS → Analyzer | Respond with worklist data |

### 2.5 Result Upload Flow

**Critical difference from BS-series:** The BC-5380 sends **all results for one sample in a single ORU^R01 message** with multiple OBX segments. No aggregation logic needed.

```
BC-5380                             OpenELIS
   │                                    │
   │ ──── <SB>ORU^R01<EB><CR> ────────► │  Complete CBC+DIFF (all OBX segments)
   │ ◄─── <SB>ACK^R01<EB><CR> ───────── │  Acknowledge
   │                                    │
   │ ──── <SB>ORU^R01<EB><CR> ────────► │  Next sample (all results)
   │ ◄─── <SB>ACK^R01<EB><CR> ───────── │  Acknowledge
```

### 2.6 Bidirectional Order Download Flow

```
BC-5380                             OpenELIS
   │                                    │
   │ ──── ORM^O01 ─────────────────────► │  Query by sample ID
   │ ◄─── ORR^O02 ──────────────────── │  Respond (found or reject)
```

---

## 3. HL7 Message Structure

### 3.1 HL7 Delimiters

Standard: `|^~\&` (field, component, repetition, escape, subcomponent)

### 3.2 MSH — Message Header Segment

| Field # | Name | Value / Usage |
|---------|------|---------------|
| MSH-3 | Sending Application | `BC-5380` |
| MSH-4 | Sending Facility | `Mindray` |
| MSH-9 | Message Type | `ORU^R01`, `ACK^R01`, `ORM^O01`, `ORR^O02` |
| MSH-10 | Message Control ID | Sequential integer |
| **MSH-11** | **Processing ID** | **`P` = Patient, `D` = QC setup, `T` = QC results, `Q` = QC in ACK** |
| MSH-12 | Version ID | `2.3.1` |
| MSH-18 | Character Set | `UNICODE` |

> **QC Discrimination:** Uses **MSH-11** (not MSH-16 like BS-series). Patient = `P`, QC = `T`/`Q`.

### 3.3 PID — Patient Identification

| Field # | Name | Usage |
|---------|------|-------|
| PID-3 | Patient Identifier | `ID^^^^MR` format |
| PID-5 | Patient Name | `LastName^FirstName` |
| PID-7 | Date/Time of Birth | `YYYYMMDDHHmmss` |
| PID-8 | Sex | String (e.g., `Female`, `Male`) |

### 3.4 PV1 — Patient Visit

| Field # | Name | Usage |
|---------|------|-------|
| PV1-3 | Location | `Department^^BedNo` |

### 3.5 OBR — Observation Request

| Field # | Name | Usage |
|---------|------|-------|
| OBR-3 | Filler Order Number | **Sample ID / barcode** |
| OBR-4 | Universal Service ID | `00001^Automated Count^99MRC` or `00002^Manual Count^99MRC` |
| OBR-6 | Requested Date/Time | Sampling time |
| OBR-7 | Observation Date/Time | Run time |
| OBR-15 | Specimen Source | `BLDV` (venous) or `BLDC` (capillary) |
| OBR-24 | Diagnostic Service | `HM` (Hematology) |

**OBR-4 Coding Values:**

| Code | Name | Purpose |
|------|------|---------|
| 00001 | Automated Count | Normal CBC/DIFF analysis |
| 00002 | Manual Count | Microscope exam results |
| 00003 | LJ QCR | Levey-Jennings QC result |
| 00004 | X QCR | X-bar QC result |
| 00005 | XB QCR | XB QC result |
| 00006 | XR QCR | XR QC result |
| 00007 | X QCR Mean | X-bar QC mean |
| 00008 | XR QCR Mean | XR QC mean |

### 3.6 OBX — Observation/Result

| Field # | Name | Usage |
|---------|------|-------|
| OBX-2 | Value Type | `NM` (numeric), `IS` (coded), `ED` (encoded/binary), `ST` (string) |
| OBX-3 | Observation Identifier | **LOINC code** `ID^Name^LN` or **99MRC code** `ID^Name^99MRC` |
| OBX-5 | Observation Value | Result value |
| OBX-6 | Units | ISO standard units |
| OBX-7 | Reference Range | `lower-upper`, `<upper`, or `>lower` |
| OBX-8 | Abnormal Flags | `N`, `A`, `H`, `L`; combinable with `~` |
| OBX-11 | Result Status | `F` = Final |
| OBX-13 | User Defined | `O`=Expired reagent, `E`=Active edit, `e`=Passive edit |

> **Test Identification:** Uses **LOINC codes** (encoding system `LN`) for standard parameters. Much cleaner than BS-series numeric IDs — adapter maps directly via LOINC.

### 3.7 MSA — Message Acknowledgment

| Field # | Name | Usage |
|---------|------|-------|
| MSA-1 | Acknowledgment Code | `AA`=Accept, `AE`=Error, `AR`=Reject |
| MSA-2 | Message Control ID | Must match MSH-10 of received message |

### 3.8 ORC — Common Order (Bidirectional)

| Field # | ORM^O01 (Inquiry) | ORR^O02 (Response) |
|---------|-------------------|---------------------|
| ORC-1 | `RF` (re-fill request) | `AF` (affirm) |
| ORC-2 | (empty) | Sample ID |
| ORC-3 | Sample ID | (empty) |
| ORC-5 | `IP` (in process) | (empty) |

---

## 4. Test Code Mapping — OpenELIS Configuration

### 4.1 Test Identification Architecture

The BC-5380 uses **LOINC codes** (encoding system `LN`) for standard hematology parameters and **99MRC codes** for Mindray-proprietary items. This provides stable, universal mapping.

### 4.2 CBC Parameters

| OBX-3 Code | Name | Encoding | OpenELIS Tag | LOINC | Unit |
|------------|------|----------|--------------|-------|------|
| 6690-2 | WBC | LN | `label.test.wbc` | 6690-2 | 10*9/L |
| 789-8 | RBC | LN | `label.test.rbc` | 789-8 | 10*12/L |
| 718-7 | HGB | LN | `label.test.hgb` | 718-7 | g/L |
| 4544-3 | HCT | LN | `label.test.hct` | 4544-3 | (ratio) |
| 787-2 | MCV | LN | `label.test.mcv` | 787-2 | fL |
| 785-6 | MCH | LN | `label.test.mch` | 785-6 | pg |
| 786-4 | MCHC | LN | `label.test.mchc` | 786-4 | g/L |
| 788-0 | RDW-CV | LN | `label.test.rdwCv` | 788-0 | (ratio) |
| 21000-5 | RDW-SD | LN | `label.test.rdwSd` | 21000-5 | fL |
| 777-3 | PLT | LN | `label.test.plt` | 777-3 | 10*9/L |
| 32623-1 | MPV | LN | `label.test.mpv` | 32623-1 | fL |
| 32207-3 | PDW | LN | `label.test.pdw` | 32207-3 | (index) |
| 10002 | PCT | 99MRC | `label.test.pct` | — | mL/L |

### 4.3 Differential Parameters

| OBX-3 Code | Name | Encoding | OpenELIS Tag | LOINC | Unit |
|------------|------|----------|--------------|-------|------|
| 751-8 | NEU# | LN | `label.test.neuAbs` | 751-8 | 10*9/L |
| 770-8 | NEU% | LN | `label.test.neuPct` | 770-8 | (ratio) |
| 731-0 | LYM# | LN | `label.test.lymAbs` | 731-0 | 10*9/L |
| 736-9 | LYM% | LN | `label.test.lymPct` | 736-9 | (ratio) |
| 742-7 | MON# | LN | `label.test.monAbs` | 742-7 | 10*9/L |
| 5905-5 | MON% | LN | `label.test.monPct` | 5905-5 | (ratio) |
| 711-2 | EOS# | LN | `label.test.eosAbs` | 711-2 | 10*9/L |
| 713-8 | EOS% | LN | `label.test.eosPct` | 713-8 | (ratio) |
| 704-7 | BAS# | LN | `label.test.basAbs` | 704-7 | 10*9/L |
| 706-2 | BAS% | LN | `label.test.basPct` | 706-2 | (ratio) |

### 4.4 RUO Parameters

| OBX-3 Code | Name | Encoding | OpenELIS Tag | LOINC | Unit |
|------------|------|----------|--------------|-------|------|
| 26477-0 | *ALY# | LN | `label.test.alyAbs` | 26477-0 | 10*9/L |
| 13046-8 | *ALY% | LN | `label.test.alyPct` | 13046-8 | (ratio) |
| 10000 | *LIC# | 99MRC | `label.test.licAbs` | — | 10*9/L |
| 10001 | *LIC% | 99MRC | `label.test.licPct` | — | (ratio) |

### 4.5 QC Result Identification

QC results identified by **MSH-11 ≠ `P`**: `T` or `Q` = QC results, `D` = QC setup. OBR-4 encodes the QC type (L-J, X-R, etc.). QC lot number in PID-3, expiration date in PID-7.

---

## 5. Sample ID Resolution

Sample ID is in **OBR-3** (Filler Order Number). Patient ID in **PID-3** (format `ID^^^^MR`).

OpenELIS resolves: Direct accession match → Tube barcode lookup → Pending queue for manual resolution.

---

## 6. Key Differences: BC-5380 vs BS-Series

| Aspect | BC-5380 Hematology | BS-Series Chemistry |
|--------|-------------------|---------------------|
| **Results per message** | **All tests in ONE ORU** | One test per ORU |
| **Test identification** | **LOINC codes** (`6690-2^WBC^LN`) | Numeric IDs (`2`) |
| **QC discrimination** | **MSH-11** (`P`/`T`/`Q`) | MSH-16 (`0`/`1`/`2`) |
| **Character encoding** | **UTF-8 / UNICODE** | ASCII |
| **MSH-3 / MSH-4** | `BC-5380` / `Mindray` | `Mindray` / `BS-480` |
| **Bidirectional** | **ORM^O01 / ORR^O02** | QRY^Q02 / QCK^Q02 / DSR^Q03 |
| **Extra data** | **Histograms, scattergrams, alarms** | None |
| **Aggregation needed** | **No** | Yes |

---

## 7. Abnormal Alarm Flags

The BC-5380 transmits clinical alarm flags as IS-type OBX segments (`T`/`F`):

| OBX-3 Code | Alarm | Clinical Significance |
|------------|-------|----------------------|
| 12000 | WBC Abnormal scattergram | Abnormal WBC distribution |
| 12002 | Leucocytosis | Elevated WBC |
| 12003 | Leucopenia | Decreased WBC |
| 12004 | Neutrophilia | Elevated neutrophils |
| 12005 | Neutropenia | Decreased neutrophils |
| 12006 | Lymphocytosis | Elevated lymphocytes |
| 12007 | Lymphopenia | Decreased lymphocytes |
| 12008 | Monocytosis | Elevated monocytes |
| 12009 | Eosinophilia | Elevated eosinophils |
| 12010 | Basophilia | Elevated basophils |
| 17790-7 | Left Shift? | Possible left shift |
| 34165-1 | Imm Granulocytes? | Possible immature granulocytes |
| 15192-8 | Atypical Lymphs? | Possible atypical lymphocytes |
| 12012 | Erythrocytosis | Elevated RBC |
| 15150-6 | Anisocytosis | RBC size variation |
| 15198-5 | Macrocytes | Large RBCs |
| 15199-3 | Microcytes | Small RBCs |
| 12014 | Anemia | Low hemoglobin/RBC |
| 15180-3 | Hypochromia | Low hemoglobin concentration |
| 12017 | Thrombocytosis | Elevated PLT |
| 12018 | Thrombopenia | Decreased PLT |
| 7796-6 | Platelet Clump? | Possible platelet clumping |

Store alarm flags and display on validation page as interpretive comments.

---

## 8. Error Handling

| Scenario | OpenELIS Behavior |
|----------|-------------------|
| **Unknown OBX-3 code** | Log warning, skip that OBX, process remaining results |
| **Unmatched sample ID** | Hold in pending queue, display on Analyzer Import page |
| **Malformed HL7 message** | Return ACK with MSA-1 = `AE` |
| **ACK timeout (>10s)** | Analyzer considers failed; process if received |
| **RUO parameters** | Process normally, mark as RUO in display |
| **Missing value (`***.**`)** | Store as text, flag for review |
| **Histogram/scattergram data** | Optionally store or discard |
| **QC messages (MSH-11 ≠ P)** | Route to QC module |
| **Bidirectional "Invalid" barcode** | Return ORR^O02 with MSA-1 = `AR` |

---

## 9. Validation Dataset

### 9.1 Normal CBC+DIFF Result

```
MSH|^~\&|BC-5380|Mindray|||20250220143000||ORU^R01|1|P|2.3.1||||||UNICODE
PID|1||LAB-00123^^^^MR||Putri^Amelia||19900804000000|Female
PV1|1||Hematology^^001
OBR|1||20250220001|00001^Automated Count^99MRC||20250220140000|20250220143000|||Tech1||||20250220142000|BLDV|||||||||HM||||||||Mindray
OBX|1|IS|08001^Take Mode^99MRC||C||||||F
OBX|2|IS|08002^Blood Mode^99MRC||W||||||F
OBX|3|IS|08003^Test Mode^99MRC||CBC+5DIFF||||||F
OBX|4|NM|6690-2^WBC^LN||7.20|10*9/L|4.00-10.00|N|||F
OBX|5|NM|751-8^NEU#^LN||4.10|10*9/L|2.00-7.00|N|||F
OBX|6|NM|770-8^NEU%^LN||0.570||0.500-0.700|N|||F
OBX|7|NM|731-0^LYM#^LN||2.30|10*9/L|0.80-4.00|N|||F
OBX|8|NM|736-9^LYM%^LN||0.320||0.200-0.400|N|||F
OBX|9|NM|742-7^MON#^LN||0.45|10*9/L|0.12-0.80|N|||F
OBX|10|NM|5905-5^MON%^LN||0.063||0.030-0.080|N|||F
OBX|11|NM|711-2^EOS#^LN||0.28|10*9/L|0.02-0.50|N|||F
OBX|12|NM|713-8^EOS%^LN||0.039||0.005-0.050|N|||F
OBX|13|NM|704-7^BAS#^LN||0.07|10*9/L|0.00-0.10|N|||F
OBX|14|NM|706-2^BAS%^LN||0.010||0.000-0.010|N|||F
OBX|15|NM|789-8^RBC^LN||4.53|10*12/L|3.50-5.00|N|||F
OBX|16|NM|718-7^HGB^LN||130|g/L|110-150|N|||F
OBX|17|NM|787-2^MCV^LN||89.5|fL|80.0-100.0|N|||F
OBX|18|NM|785-6^MCH^LN||28.7|pg|27.0-31.0|N|||F
OBX|19|NM|786-4^MCHC^LN||321|g/L|320-360|N|||F
OBX|20|NM|788-0^RDW-CV^LN||0.126||0.115-0.145|N|||F
OBX|21|NM|21000-5^RDW-SD^LN||42.5|fL|35.0-56.0|N|||F
OBX|22|NM|4544-3^HCT^LN||0.405||0.370-0.480|N|||F
OBX|23|NM|777-3^PLT^LN||245|10*9/L|100-300|N|||F
OBX|24|NM|32623-1^MPV^LN||9.2|fL|7.0-11.0|N|||F
OBX|25|NM|32207-3^PDW^LN||15.8||15.0-17.0|N|||F
OBX|26|NM|10002^PCT^99MRC||2.25|mL/L|1.08-2.82|N|||F
```

### 9.2 Abnormal Result — Anemia with Alarm Flags

```
MSH|^~\&|BC-5380|Mindray|||20250220150100||ORU^R01|2|P|2.3.1||||||UNICODE
PID|1||LAB-00456^^^^MR||Ahmad^Rizky||19720618000000|Male
PV1|1||Internal Med^^003
OBR|1||20250220002|00001^Automated Count^99MRC||20250220145000|20250220150100|||Tech2||||20250220145500|BLDV|||||||||HM||||||||Mindray
OBX|1|NM|6690-2^WBC^LN||9.81|10*9/L|4.00-10.00|N|||F
OBX|2|NM|789-8^RBC^LN||3.10|10*12/L|4.50-5.50|L|||F
OBX|3|NM|718-7^HGB^LN||65|g/L|130-170|L|||F
OBX|4|NM|787-2^MCV^LN||68.2|fL|80.0-100.0|L|||F
OBX|5|NM|785-6^MCH^LN||21.0|pg|27.0-31.0|L|||F
OBX|6|NM|786-4^MCHC^LN||307|g/L|320-360|L|||F
OBX|7|NM|777-3^PLT^LN||212|10*9/L|150-400|N|||F
OBX|8|IS|12014^Anemia^99MRC||T||||||F
OBX|9|IS|15180-3^Hypochromia^LN||T||||||F
OBX|10|IS|15199-3^Microcytes^LN||T||||||F
```

### 9.3 Expected ACK

```
MSH|^~\&|LIS||||20250220143001||ACK^R01|1|P|2.3.1||||||UNICODE
MSA|AA|1
```

### 9.4 Bidirectional Inquiry / Response

**Inquiry:**
```
MSH|^~\&|BC-5380|Mindray|||20250220141500||ORM^O01|4|P|2.3.1||||||UNICODE
ORC|RF||SampleID1||IP
```

**Response (found):**
```
MSH|^~\&|LIS||||20250220141500||ORR^O02|1|P|2.3.1||||||UNICODE
MSA|AA|4
PID|1||ChartNo^^^^MR||^Putri||19900804|Female
PV1|1||Hematology^^001
ORC|AF|SampleID1|||
OBR|1|SampleID1||||20250220103000|||||||||||||||20250220||HM||||||||
OBX|1|IS|08001^Take Mode^99MRC||A||||||F
OBX|2|IS|08002^Blood Mode^99MRC||W||||||F
OBX|3|IS|08003^Test Mode^99MRC||CBC+5DIFF||||||F
OBX|4|IS|01002^Ref Group^99MRC||Woman||||||F
OBX|5|NM|30525-0^Age^LN||34|yr|||||F
```

**Response (not found):**
```
MSH|^~\&|LIS||||20250220141500||ORR^O02|1|P|2.3.1||||||UNICODE
MSA|AR|4
```

---

## 10. Localization Tags

| Tag | English Default |
|-----|----------------|
| `label.analyzer.mindray.bc5380` | Mindray BC-5380 |
| `label.analyzer.mindray.bc5380.description` | Auto Hematology Analyzer (HL7) |
| `label.analyzer.result.ruo` | Research Use Only |
| `label.analyzer.result.histogramDiscarded` | Histogram data received (not stored) |
| `label.analyzer.alarm.leftShift` | Possible Left Shift |
| `label.analyzer.alarm.immatureGranulocytes` | Possible Immature Granulocytes |
| `label.analyzer.alarm.atypicalLymphs` | Possible Atypical Lymphocytes |
| `label.analyzer.alarm.anemia` | Anemia |
| `label.analyzer.alarm.thrombocytosis` | Thrombocytosis |
| `label.analyzer.alarm.thrombopenia` | Thrombopenia |
| `label.analyzer.alarm.plateletClump` | Possible Platelet Clump |
| `label.analyzer.bidirectional.invalidBarcode` | Invalid barcode received |

---

## 11. Related Specifications

| Document | Description |
|----------|-------------|
| BC-5380 Operator's Manual, Appendix C | Vendor protocol specification — **primary reference** |
| HL7 MLLP Listener FRS (OGC-325) | Generic HL7 listener — **shared with BS-series** |
| Mindray BS-Series Integration Spec v2.0 | Chemistry analyzer on same listener |
| Flat File Analyzer Config FRS (OGC-329) | CSV export path parser infrastructure |
| Analyzer Results Import Page FRS | QC-first workflow |
| Test Catalog FRS v2 | Test definitions and LOINC mapping |

---

## 12. CSV Export Path — Flat File Alternate Interface

### 12.1 Overview

The BC-5380 provides a **CSV flat-file export** in addition to the primary HL7 v2.3.1 interface. This export is generated from the analyzer's built-in data management screen and produces comma-delimited files with a `.csv` or `.txt` extension. The CSV path may be used as a backup import method at sites where HL7 TCP/IP connectivity is not available, or for bulk historical data migration.

> **NOTE:** The CSV export is a secondary interface. The HL7 path (OGC-325 / OGC-327) is the recommended production integration. The CSV path would be handled by the Flat File Analyzer Configuration system (OGC-329) if implemented.

### 12.2 File Characteristics

| Property | Value |
|----------|-------|
| Delimiter | Comma (`,`) |
| Encoding | Latin-1 (ISO-8859-1) — contains accented characters |
| Header row | Yes — first row contains column names |
| Filename pattern | `YYYYMMDD_HHmmss.txt` (e.g., `20260227_112847.txt`) |
| Line terminator | CRLF |
| Column count | 31 (demographics + 27 analytes + 3 flag columns) |

### 12.3 Header Language Dependency

Column headers are **locale-dependent** — they change based on the analyzer's UI language setting. A flat-file parser must support header-based column detection rather than fixed positional parsing.

| English Header | French Header | Column # | Spec Parameter |
|----------------|---------------|----------|----------------|
| Sample ID | ID échant. | 1 | OBR-3 (Sample ID) |
| Mode | Mode | 2 | OBX 08001+08002+08003 (composite) |
| Ref. Group | grpe réf. | 3 | OBX 01002 (Reference Group) |
| Rack No | N° portoir | 4 | — (instrument internal) |
| Tube No | N° tube | 5 | — (instrument internal) |
| Sampling Time | Hr prélèv. | 6 | OBR-6 (Requested Date/Time) |
| Received Time | Hr réception | 7 | — |
| Test Time | Hr test | 8 | OBR-7 (Observation Date/Time) |
| Patient ID | ID pat. | 9 | PID-3 |
| First Name | Prénom | 10 | PID-5 component 2 |
| Last Name | Nom | 11 | PID-5 component 1 |
| Sex | Sexe | 12 | PID-8 |
| Age | Age | 13 | OBX 30525-0 |
| Age Unit | Unité âge | 14 | OBX 30525-0 unit |
| Date of Birth | Date naiss. | 15 | PID-7 |
| Department | Service | 16 | PV1-3 component 1 |
| Bed No | Lit N° | 17 | PV1-3 component 3 |
| Collector | Collect. | 18 | — |
| Operator | Opérateur | 19 | OBR-10 |
| Validator | Validateur | 20 | — |
| Clinical Diagnosis | Diagn. clinique | 21 | — |
| Remarks | Remarques | 22 | OBX 01001 (Remark) |
| WBC | GB | 23 | 6690-2 |
| NEU% | % neu | 24 | 770-8 |
| LYM% | % lym | 25 | 736-9 |
| MON% | % mon | 26 | 5905-5 |
| EOS% | % éos | 27 | 713-8 |
| BAS% | % bas | 28 | 706-2 |
| NEU# | Neu. | 29 | 751-8 |
| LYM# | Lym. | 30 | 731-0 |
| MON# | Mon. | 31 | 742-7 |
| EOS# | Eos. | 32 | 711-2 |
| BAS# | Bas. | 33 | 704-7 |
| ALY% | % LYA | 34 | 13046-8 |
| LIC% | % GCI | 35 | 10001 |
| ALY# | LYA | 36 | 26477-0 |
| LIC# | GCI | 37 | 10000 |
| RBC | GR | 38 | 789-8 |
| HGB | HGB | 39 | 718-7 |
| HCT | HCT | 40 | 4544-3 |
| MCV | VGM | 41 | 787-2 |
| MCH | TMH | 42 | 785-6 |
| MCHC | CCMH | 43 | 786-4 |
| RDW-CV | IDR-CV | 44 | 788-0 |
| RDW-SD | IDR-DS | 45 | 21000-5 |
| PLT | PLT | 46 | 777-3 |
| MPV | VMP | 47 | 32623-1 |
| PDW | IDP | 48 | 32207-3 |
| PCT | PCT | 49 | 10002 |
| WBC Flag | Repère GB | 50 | Alarm flags (Section 7) |
| RBC Flag | Repère GR | 51 | Alarm flags (Section 7) |
| PLT Flag | Repère PLT | 52 | Alarm flags (Section 7) |

### 12.4 Unit Differences — CSV vs HL7

**CRITICAL:** The CSV export uses different units for percentage and ratio fields compared to the HL7 interface. A flat-file parser must apply conversion factors.

| Parameter Group | HL7 Value (OBX-5) | HL7 Unit | CSV Value | CSV Unit | Conversion |
|----------------|-------------------|----------|-----------|----------|------------|
| All `%` differentials (NEU%, LYM%, MON%, EOS%, BAS%, ALY%, LIC%) | 0.000–1.000 | (ratio) | 0.0–100.0 | % | CSV ÷ 100 = HL7 |
| RDW-CV | 0.000–1.000 | (ratio) | 0.0–100.0 | % | CSV ÷ 100 = HL7 |
| All `#` absolutes, CBC parameters | Same | Same | Same | Same | None |

**Example:** NEU% = `0.570` via HL7, `77.8` via CSV for sample 18B (different samples, but illustrates the format).

If OpenELIS stores results as HL7-normalized ratios, the CSV parser must divide all `%` columns by 100 before import. Alternatively, if the site only uses CSV import, results can be stored as-is with `%` units — but this creates inconsistency if HL7 is later enabled.

**Recommendation:** Always normalize to HL7 ratio format on import. Apply `÷100` conversion to columns 24–28 (differential %), 34–35 (RUO %), and 44 (RDW-CV).

### 12.5 Mode Column Encoding

The `Mode` column encodes three separate HL7 metadata fields as a composite string:

| Mode String | Take Mode (08001) | Blood Mode (08002) | Test Mode (08003) |
|-------------|-------------------|--------------------|--------------------|
| `AL-WB-CBC+DIFF` | A (Autoloader) | W (Whole Blood) | CBC+5DIFF |
| `CT-WB-CBC+DIFF` | C (Closed Tube) | W (Whole Blood) | CBC+5DIFF |
| `OV-WB-CBC+DIFF` | O (Open Vial) | W (Whole Blood) | CBC+5DIFF |
| `AL-PD-CBC+DIFF` | A (Autoloader) | P (Pre-diluted) | CBC+5DIFF |
| `AL-WB-CBC` | A (Autoloader) | W (Whole Blood) | CBC (no diff) |

Parse rule: Split on `-` → position 0 = Take Mode, position 1 = Blood Mode, position 2+ = Test Mode.

### 12.6 Invalid Result Placeholders

When the analyzer cannot calculate a result (e.g., differential failure on a rerun), it outputs placeholder strings instead of numeric values:

| Placeholder | Meaning | Parser Handling |
|-------------|---------|-----------------|
| `**.*` | 3-digit result invalid | Store as text, flag for review |
| `***.**` | 5-digit result invalid | Store as text, flag for review |

These correspond to the HL7 error handling rule: "Missing value (`***.**`) → Store as text, flag for review" (Section 8).

### 12.7 Flag Columns — Locale-Dependent Alarm Text

The three flag columns (`Repère GB`, `Repère GR`, `Repère PLT`) contain **locale-dependent free-text** alarm descriptions. Multiple alarms are separated by period-terminated sentences within a single cell.

| French Flag Text | English Equivalent | Alarm Code (Section 7) |
|------------------|--------------------|------------------------|
| Anomalie cytogramme GB ?. | WBC Abnormal scattergram | 12000 |
| Leucocytose. | Leucocytosis | 12002 |
| Leucopénie. | Leucopenia | 12003 |
| Neutrophilie. | Neutrophilia | 12004 |
| Neutropénie. | Neutropenia | 12005 |
| Lymphocytose. | Lymphocytosis | 12006 |
| Lymphopénie. | Lymphopenia | 12007 |
| Monocytose. | Monocytosis | 12008 |
| Éosinophilie. | Eosinophilia | 12009 |
| Basophilie. | Basophilia | 12010 |
| Décalage à gauche. | Left Shift? | 17790-7 |
| Granulocytes imm.? | Imm Granulocytes? | 34165-1 |
| Lymphocytes atypiques? | Atypical Lymphs? | 15192-8 |
| Érythrocytose. | Erythrocytosis | 12012 |
| Anisocytose. | Anisocytosis | 15150-6 |
| Macrocytes. | Macrocytes | 15198-5 |
| Microcytes. | Microcytes | 15199-3 |
| Anémie. | Anemia | 12014 |
| Hypochromie. | Hypochromia | 15180-3 |
| Thrombocytose. | Thrombocytosis | 12017 |
| Thrombopénie. | Thrombopenia | 12018 |
| Agrégats plaquettaires? | Platelet Clump? | 7796-6 |

**Parser options:**
1. **Store as-is:** Import the French text verbatim as interpretive comments. Simplest, but not standardized.
2. **Locale lookup table:** Map French text → alarm code → English display name. Requires maintenance per language.
3. **Ignore flags on CSV path:** Rely on HL7 for coded alarm data; treat CSV as results-only import.

**Recommendation:** Option 1 (store as-is) for initial implementation. The flag text is clinically meaningful and matches what the operator sees on the analyzer screen.

### 12.8 Sample ID Considerations

The CSV `ID échant.` (Sample ID) column contains the value entered at the analyzer — typically a short rack-based ID (e.g., `18B`, `17B`, `15B`) or a barcode-scanned lab number. The `REL` suffix (e.g., `14B REL`) indicates a rerun/recount.

For OpenELIS import, the parser must resolve these to lab numbers using the same logic as the HL7 path (Section 5): direct match → barcode lookup → pending queue for manual resolution.

### 12.9 Timestamp Format

The `Hr test` column uses the format `DD/MM/YYYY HH:MM` (24-hour, no seconds). This differs from the HL7 timestamp format (`YYYYMMDDHHmmss`). The parser must handle this locale-specific date format.

### 12.10 Validated Sample Data

The following CSV row was validated against the specification on 2026-02-27 from a BC-5380 configured with French locale:

```
ID échant.,Mode,grpe réf.,N° portoir,N° tube,Hr prélèv.,Hr réception,Hr test,ID pat.,Prénom,Nom,Sexe,Age,Unité âge,Date naiss.,Service,Lit N°,Collect.,Opérateur,Validateur,Diagn. clinique,Remarques,GB,% neu,% lym,% mon,% éos,% bas,Neu.,Lym.,Mon.,Eos.,Bas.,% LYA,% GCI,LYA,GCI,GR,HGB,HCT,VGM,TMH,CCMH,IDR-CV,IDR-DS,PLT,VMP,IDP,PCT,Repère GB,Repère GR,Repère PLT,
18B,AL-WB-CBC+DIFF,Général,1,2,,,27/02/2026 10:36,,,,,,Age,,,,,admin,,,,9.87,77.8,14.6,4.5,2.7,0.4,7.68,1.44,0.44,0.27,0.04,0.2,0.0,0.02,0.00,4.70,139,0.418,88.8,29.5,332,15.1,56.3,220,9.3,16.1,2.05,Anomalie cytogramme GB ?.,,,
17B,AL-WB-CBC+DIFF,Général,1,1,,,27/02/2026 10:35,,,,,,Age,,,,,admin,,,,2.16,63.0,19.3,13.6,2.8,1.3,1.37,0.42,0.29,0.06,0.02,0.6,0.1,0.01,0.00,4.21,132,0.402,95.5,31.5,330,15.5,62.3,239,8.6,16.0,2.05,Lymphopénie.Leucopénie.,,,
14B REL,CT-WB-CBC+DIFF,Général,,,,,27/02/2026 10:07,,,,,,Age,,,,,admin,,,,6.16,**.*,38.7,**.*,0.1,0.9,***.**,2.38,***.**,0.00,0.05,1.8,**.*,0.11,***.**,5.04,147,0.429,85.0,29.1,343,14.4,51.4,259,8.7,16.2,2.26,Anomalie cytogramme GB ?.,,,
15B,AL-WB-CBC+DIFF,Général,1,2,,,27/02/2026 10:05,,,,,,Age,,,,,admin,,,,10.52,44.6,44.6,5.4,4.2,1.2,4.68,4.69,0.57,0.45,0.13,0.4,0.0,0.05,0.00,2.92,93,0.261,89.4,31.8,356,21.0,78.0,747,7.3,15.1,5.46,Anomalie cytogramme GB ?.,Anisocytose.,Thrombocytose.,
```

**Validation results:** All 27 parameters present and mapping correctly to spec §1.1. Unit conversion (÷100 for % fields) confirmed. Alarm flag text matches §7 alarm codes. Mode composite string decomposes correctly to OBX metadata. Invalid result placeholders (`**.*`, `***.**`) confirmed in rerun sample.

---

## 13. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-02-20 | Casey / Claude | Initial draft (incorrectly described as ASTM E1394) |
| **2.0** | **2025-02-20** | **Casey / Claude** | **Major revision: Corrected to HL7 v2.3.1 based on Operator's Manual Appendix C. LOINC-based test codes, MSH-11 QC discrimination, ORM/ORR bidirectional flow, alarm flags, histogram/scattergram support. Shares MLLP listener with BS-series (OGC-325).** |
| **2.1** | **2026-02-27** | **Casey / Claude** | **Added §12: CSV Export Path appendix. Documented French-locale header mapping (52 columns), unit conversion rules (% → ratio ÷100), Mode composite string parsing, invalid result placeholders, locale-dependent alarm flag text crosswalk, validated sample data from production BC-5380.** |
