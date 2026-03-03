# Mindray BS-Series Chemistry Analyzers — OpenELIS Software Companion Guide

**Version:** 2.0
**Date:** 2025-02-20
**Audience:** Laboratory IT staff, biomedical engineers, OpenELIS administrators
**Protocol:** HL7 v2.3.1 over TCP/IP (MLLP)
**Applicable Models:** BS-120 through BS-2000M

---

## 1. Introduction

This guide provides step-by-step instructions for connecting any Mindray BS-series clinical chemistry analyzer to OpenELIS Global using the HL7 v2.3.1 protocol over TCP/IP.

> **Important:** The BS-series chemistry analyzers use **HL7 v2.3.1**, which is a different protocol from the Mindray BC-5380 hematology analyzer (which uses ASTM). OpenELIS must have an HL7 MLLP listener enabled — the ASTM background service will NOT work for these instruments.

---

## 2. Prerequisites

### 2.1 Hardware Requirements

| Item | Details |
|------|---------|
| **Network cable** | Standard Cat5e/Cat6 Ethernet cable |
| **Network switch/router** | Analyzer and OpenELIS server must be on same network (or routable) |
| **OpenELIS server** | Network accessible from analyzer |

> **Note:** The BS-series HL7 interface is **TCP/IP only** — there is no RS-232 serial option for HL7 communication. If your site only has serial connectivity, contact Mindray to confirm if an ASTM serial interface is available as an alternative for your specific model.

### 2.2 Software Requirements

| Item | Version |
|------|---------|
| **BS-series firmware** | Check: Utility → System Info → Software Version |
| **OpenELIS Global** | v3.x+ with HL7 MLLP listener module enabled |
| **HL7 interface license** | Verify HL7 interface is enabled on your analyzer (some models require activation) |

### 2.3 Information to Gather Before Starting

| Item | Your Value | Notes |
|------|-----------|-------|
| BS model number | _____________ | e.g., BS-480 |
| Analyzer IP address | _____________ | Static IP recommended |
| OpenELIS server IP | _____________ | |
| HL7 listener port | _____________ | Choose unique port per analyzer |
| ISE module installed? | ☐ Yes ☐ No | Na/K/Cl availability |
| Test number assignments | _____________ | **Must document — see Section 3.5** |

---

## 3. Analyzer-Side Configuration

### 3.1 Accessing Communication Settings

1. On the BS-series main screen, navigate to **Utility → Communication Setup** (or **Setup → LIS**)
2. Enter the supervisor/admin password when prompted
3. Select the **LIS** or **HL7** tab

### 3.2 Configuring TCP/IP Connection

| Setting | Value | Notes |
|---------|-------|-------|
| Communication Protocol | **HL7** | Must select HL7, not ASTM |
| Server IP | *(OpenELIS server IP)* | The IP the analyzer will connect to |
| Server Port | *(configured HL7 listener port)* | Must match OpenELIS configuration |
| Connection Mode | **Client** | Analyzer initiates connection to OpenELIS |

### 3.3 Configuring Result Transmission

In **Utility → Communication Setup → Transmission** (or **LIS → Options**):

| Setting | Recommended | Purpose |
|---------|-------------|---------|
| Auto Transmit Results | **ON** | Send immediately when analysis completes |
| Transmission Mode | **Real-time** | Send results as they become available |
| Include QC Results | **ON** | Required for OpenELIS QC evaluation |
| Include Calibration Results | **OFF** | Not processed by OpenELIS (BS-120 through BS-350E do not support this anyway) |

### 3.4 Configuring Bidirectional Mode (Optional)

| Setting | Value | Purpose |
|---------|-------|---------|
| Bidirectional | **ON** | Enable order query / download |
| Download Mode | **Real-time** or **Batch** | Real-time = query on barcode scan; Batch = download all pending orders |
| Auto Query on Barcode | **ON** (if real-time) | Query OpenELIS when sample barcode is scanned |

### 3.5 Documenting Test Number Assignments (CRITICAL)

**This is the most important configuration step.** The BS-series transmits test results using numeric test IDs (not mnemonic names). You MUST document the exact test number → chemistry test mapping for your analyzer.

**How to find the test number assignments:**

1. Navigate to **Utility → Test Setup** (or **Calibration → Chemistry Test**)
2. For each test, note:
   - **Test Number** (the numeric ID — this is what gets transmitted in HL7 messages)
   - **Test Abbreviated Name** (informational, sent in OBX-4)
   - **Unit** (must match OpenELIS)
3. Record these in the mapping table below

**Test Number Mapping Worksheet:**

| Test # | Test Name | Unit | OpenELIS Test | Verified? |
|--------|-----------|------|---------------|-----------|
| 1 | _____________ | _____________ | _____________ | ☐ |
| 2 | _____________ | _____________ | _____________ | ☐ |
| 3 | _____________ | _____________ | _____________ | ☐ |
| 4 | _____________ | _____________ | _____________ | ☐ |
| 5 | _____________ | _____________ | _____________ | ☐ |
| 6 | _____________ | _____________ | _____________ | ☐ |
| 7 | _____________ | _____________ | _____________ | ☐ |
| 8 | _____________ | _____________ | _____________ | ☐ |
| 9 | _____________ | _____________ | _____________ | ☐ |
| 10 | _____________ | _____________ | _____________ | ☐ |
| *(continue for all loaded tests)* | | | | |

> **If your test numbers don't match the OpenELIS mapping defaults:** You can either reconfigure the analyzer's test numbers via the `ItemID.ini` file, or adjust the OpenELIS test mapping to match your analyzer. Consult your Mindray service engineer for `ItemID.ini` modifications.

---

## 4. OpenELIS Configuration

### 4.1 Enabling the HL7 MLLP Listener

1. Navigate to **Admin → System Configuration** (or equivalent)
2. Ensure the **HL7 MLLP Listener** service is enabled
3. Configure a port for this analyzer (e.g., 5000, 5001, etc.)
4. Restart the listener service if needed

> **Note:** The HL7 listener is separate from the ASTM background service. Both can run simultaneously on different ports to support different analyzer types.

### 4.2 Adding the Analyzer

1. Navigate to **Admin → Analyzer Management → Add Analyzer**
2. Configure:

| Field | Value |
|-------|-------|
| Name | `Mindray BS-480 - Chemistry Lab` *(use your model and location)* |
| Protocol | **HL7 v2.3.1 (MLLP)** |
| Connection Type | **TCP/IP** |
| TCP Port | *(your assigned port)* |
| Bidirectional | Per site preference |
| Active | `Yes` |

3. Click **Save**

### 4.3 Configuring Test Mappings

1. Open the analyzer → **Test Mapping** tab
2. For each test on your mapping worksheet (Section 3.5), create a mapping:

| Analyzer Test # | → | OpenELIS Test |
|-----------------|---|---------------|
| *(from your worksheet)* | → | *(matching OpenELIS test)* |

3. For tests the analyzer reports that your lab does not use, set the mapping as **Inactive**
4. Click **Save Test Mappings**

**Example mappings (verify against YOUR analyzer):**

| Analyzer Test # | → | OpenELIS Test |
|-----------------|---|---------------|
| 1 | → | Glucose |
| 2 | → | BUN |
| 3 | → | Creatinine |
| 9 | → | ALT |
| 10 | → | AST |
| 14 | → | Total Cholesterol |
| ISE-1 | → | Sodium |
| ISE-2 | → | Potassium |
| ISE-3 | → | Chloride |

### 4.4 QC Configuration

QC results from the BS-series are identified by **MSH-16 = `2`** in the HL7 message header. OpenELIS should automatically route these to the QC module.

Verify the following QC information is correctly parsed:
- Control name (from OBR-13)
- Lot number (from OBR-14)
- Concentration level: H (High), M (Medium), L (Low) (from OBR-17)
- Mean value (from OBR-18) and SD (from OBR-19)
- QC result (from OBR-20)

---

## 5. Validation Procedure

### 5.1 Step 1 — TCP/IP Communication Test

1. Verify the analyzer can reach the OpenELIS server: on the analyzer, check **Utility → Communication → Status** for connection state
2. If the connection fails:
   - Verify IP addresses and port numbers
   - Verify no firewall blocking the port
   - Verify the OpenELIS HL7 listener is running on the correct port

### 5.2 Step 2 — Single Test Result

1. Run a single test (e.g., Glucose) on a sample
2. Verify the result appears on the OpenELIS Analyzer Import page
3. Confirm:
   - Test is correctly identified (mapped from numeric test #)
   - Result value matches analyzer display
   - Unit is correct
   - Sample barcode is resolved to the correct patient/order

### 5.3 Step 3 — Multi-Test Result

1. Run a sample with multiple tests (e.g., BMP: 8 tests)
2. Verify **all 8 results** arrive on the Analyzer Import page
3. Confirm all are linked to the same sample/order
4. Remember: each test arrives as a separate HL7 message — verify none are missing

### 5.4 Step 4 — QC Transmission

1. Run daily QC on the BS-series
2. Verify QC results appear in the QC module (not mixed with patient results)
3. Confirm control name, lot number, level, and result are correctly parsed

### 5.5 Step 5 — Abnormal Flag Handling

1. Run a sample with known abnormal values
2. Verify abnormal flags (from OBX-8) display correctly on the import page

### 5.6 Step 6 — Bidirectional Validation (if enabled)

1. Create an order in OpenELIS with specific tests
2. Scan the sample barcode on the analyzer
3. Verify the query succeeds and correct tests are downloaded
4. Run the sample and verify results return correctly

### 5.7 Validation Checklist

| # | Test | Expected Result | Pass/Fail | Date | Initials |
|---|------|----------------|-----------|------|----------|
| 1 | TCP/IP connection established | Analyzer shows Connected | ☐ | | |
| 2 | Single test result received | Correct test, value, unit | ☐ | | |
| 3 | Multi-test results received (8+ tests) | All results arrive, none missing | ☐ | | |
| 4 | Sample barcode resolved | Linked to correct patient/order | ☐ | | |
| 5 | QC result routed to QC module | Not mixed with patient results | ☐ | | |
| 6 | QC control name/lot/level parsed | Matches analyzer display | ☐ | | |
| 7 | Abnormal flags displayed | H/L flags show correctly | ☐ | | |
| 8 | Qualitative result stored | +/- stored as text | ☐ | | |
| 9 | ISE results received (if module installed) | Na/K/Cl values correct | ☐ | | |
| 10 | Unmapped test number | Warning logged, other results OK | ☐ | | |
| 11 | Unmatched barcode | Held in pending queue | ☐ | | |
| 12 | ACK response timing | No timeout errors on analyzer | ☐ | | |
| 13 | Connection recovery after drop | Results resume after reconnect | ☐ | | |
| 14 | Bidirectional order download (if enabled) | Correct tests downloaded to analyzer | ☐ | | |
| 15 | Batch download (if enabled) | Multiple orders downloaded correctly | ☐ | | |

---

## 6. Multi-Analyzer Setup

### 6.1 Port Assignment Strategy

Each BS-series analyzer requires its own HL7 listener port:

| Analyzer | OpenELIS Name | HL7 Port |
|----------|--------------|----------|
| BS-480 Chemistry Lab 1 | `BS-480 Chem Routine` | 5001 |
| BS-480 Chemistry Lab 2 | `BS-480 Chem Backup` | 5002 |
| BS-240 STAT | `BS-240 STAT Chem` | 5003 |

### 6.2 Test Mapping Per Analyzer

**Each analyzer may have different test number assignments.** If you have multiple BS-series analyzers, verify the test number mapping independently for each one. Do not assume analyzer A and analyzer B use the same test numbers unless you have confirmed this.

---

## 7. Daily Operations

### 7.1 Startup Checklist

1. Power on analyzer and allow initialization to complete
2. Verify HL7 connection status shows **Connected**
3. Run daily QC (all levels for each test group)
4. Check OpenELIS QC module for received QC results
5. Verify QC passes before processing patient samples

### 7.2 Common Troubleshooting

**No results arriving in OpenELIS:**

1. Check analyzer connection status (Utility → Communication → Status)
2. Verify OpenELIS HL7 MLLP listener is running on the correct port
3. Ping the OpenELIS server IP from the analyzer network
4. Check firewall rules for the HL7 port
5. Check OpenELIS logs for HL7 parsing errors

**Results arriving but not matching to orders:**

1. Verify the barcode value in OBR-2 matches the accession number format in OpenELIS
2. Check if the barcode reader is adding prefix/suffix characters
3. Verify the sample was registered in OpenELIS before running on the analyzer

**Some test results missing from a multi-test sample:**

1. Each test is a separate HL7 message — check if all messages were received
2. Verify all tests have active mappings in OpenELIS (unmapped test numbers are logged but not imported)
3. Check for ACK timeout errors on the analyzer — if OpenELIS doesn't ACK fast enough, some messages may not send

**QC results appearing as patient results:**

1. Verify OpenELIS is checking MSH-16 to distinguish patient (0) from QC (2) results
2. This is a software implementation issue — report to OpenELIS development team

**Wrong test mapped to result:**

1. The most likely cause is a mismatch between the analyzer's test numbers and the OpenELIS mapping
2. Re-verify the test number worksheet (Section 3.5) against actual analyzer configuration
3. Look at the raw HL7 message in OpenELIS logs — check OBX-3 (test number) and OBX-4 (test name)

---

## 8. Mindray Software & Documentation Resources

| Resource | Location |
|----------|----------|
| **Host Interface Manual v5** | P/N: BA20-20-75337 — provided by Mindray service |
| **BS-Series Operator's Manual** | Model-specific, provided with instrument |
| **Mindray Service Portal** | https://www.mindray.com/en/support |
| **Firmware Updates** | Contact Mindray service engineer (on-site installation) |
| **ItemID.ini Configuration** | Located in the operating software folder on the analyzer PC |

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-02-20 | Casey / Claude | Initial draft (incorrectly described ASTM protocol) |
| **2.0** | **2025-02-20** | **Casey / Claude** | **Complete rewrite: HL7 v2.3.1 protocol, MLLP framing, numeric test IDs, MSH-16 QC identification, DSP-based order download. Added test number mapping worksheet.** |
