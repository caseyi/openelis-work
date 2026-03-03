# Thermo Scientific Indiko / Gallery — OpenELIS Integration Companion Guide

**Applicable Instruments:** Indiko, Indiko Plus, Gallery, Gallery Plus  
**Protocol:** ASTM (CLSI LIS1-A2 / LIS2-A2) over TCP/IP or RS-232  
**Version:** 1.0  
**Date:** 2026-02-23  
**Audience:** Laboratory technicians, IT staff, OpenELIS administrators

---

## 1. Prerequisites

### 1.1 Hardware Requirements

| Item | Requirement |
|------|-------------|
| Analyzer | Thermo Scientific Indiko, Indiko Plus, Gallery, or Gallery Plus with LIS option enabled |
| Network | Ethernet cable (CAT5e or better) from analyzer PC to lab network |
| Network card | Dedicated NIC on analyzer PC recommended for ASTM traffic |
| OpenELIS server | Accessible on the same network as the analyzer |

### 1.2 Information to Gather Before Starting

| Item | Where to Find It | Example |
|------|-------------------|---------|
| Analyzer IP address | Analyzer PC → Network settings | `192.168.1.100` |
| Analyzer software version | Analyzer → About or F5 → System Info | `5.02.00` |
| OpenELIS server IP address | IT department | `192.168.1.50` |
| ASTM port number | IT department (assign unique port) | `12000` |
| Test menu | Analyzer → Test Setup → Online Names | `Glucose`, `ALT`, `CRP`, etc. |
| QC material lot numbers | QC material packaging | `LOT2026A` |
| Barcode format | Laboratory SOP | CODE128 |

### 1.3 Software Versions

| Component | Minimum Version | Notes |
|-----------|----------------|-------|
| Indiko/Gallery analyzer software | 4.x or later | LIS interface included in standard install |
| OpenELIS Global | 3.x | ASTM listener must be deployed |

---

## 2. Analyzer-Side Configuration

### 2.1 Accessing LIS Settings

1. On the analyzer PC, press **F5** to open the Service menu
2. Navigate to **Configuration** → **LIS Setup** (or **Host Communication**)
3. You may need the service password to access these settings

### 2.2 Connection Type Setup

**For TCP/IP (recommended):**

| Setting | Value | Notes |
|---------|-------|-------|
| Connection Type | **TCP/IP** | Select TCP/IP |
| Role | **Client** or **Server** | Client = analyzer initiates connection; Server = analyzer listens. Use **Client** if the OpenELIS ASTM listener is running as server. |
| Host IP Address | OpenELIS server IP | e.g., `192.168.1.50` |
| Port | Assigned ASTM port | e.g., `12000` |

**For RS-232 Serial (alternative):**

| Setting | Value |
|---------|-------|
| Connection Type | Serial |
| Baud Rate | 9600 |
| Data Bits | 8 |
| Stop Bits | 1 |
| Parity | None |
| Flow Control | None |

### 2.3 Result Sending Configuration

| Setting | Recommended Value | Notes |
|---------|------------------|-------|
| Automatic result sending | **Yes** | Results sent automatically upon completion |
| Result sending by Request | **No** | Not needed when automatic is enabled |
| Host query on new sample | **Yes** | Analyzer queries OpenELIS for orders when a barcode is scanned |
| Sample sending delay | **0** ms | Increase (e.g., 200 ms) only if OpenELIS drops messages |
| Result sending delay | **0** ms | Increase only if needed |

### 2.4 Test Online Names Configuration

This is the most critical step — the test names configured on the analyzer **must match exactly** with the names configured in OpenELIS.

1. On the analyzer, go to **Test Setup** → **Online Name** (or **LIS Name**)
2. For each test, note the exact online name (case-sensitive)
3. Record all test online names — you will need them for OpenELIS configuration

**Example test online names:**

| Test | Online Name | Notes |
|------|-------------|-------|
| Glucose | `Glucose` | Case-sensitive |
| ALT (GPT) | `ALT` | May vary by site — some use `GPT` |
| CRP | `CRP` | — |
| Sodium (ISE) | `Na` | Indiko ISE module only |

> **Tip:** Export or screenshot the complete test online name list from the analyzer for reference during OpenELIS configuration.

### 2.5 Network Routing (if using dedicated NIC)

If the analyzer PC has multiple network cards, add a route to ensure ASTM traffic goes through the correct one:

1. Open **Command Prompt** as Administrator on the analyzer PC
2. Identify the interface number for the dedicated NIC: `route print`
3. Add the route:

```
route add <OpenELIS_IP> mask 255.255.255.255 <Gateway_IP> metric 1 if <NIC_number>
```

4. Make the route persistent (survives reboot):

```
route -p add <OpenELIS_IP> mask 255.255.255.255 <Gateway_IP> metric 1 if <NIC_number>
```

---

## 3. OpenELIS Configuration

### 3.1 Analyzer Registration

1. Navigate to **Administration** → **Analyzer Management**
2. Click **Add New Analyzer**
3. Configure:

| Field | Value |
|-------|-------|
| Analyzer Name | `Thermo Indiko Plus` (or model-specific name) |
| Protocol | ASTM (LIS2-A2) |
| Transport | TCP/IP |
| IP Address | Analyzer's IP (or `0.0.0.0` if OpenELIS is server) |
| Port | Same port as configured on analyzer (e.g., `12000`) |
| Character Encoding | Windows-1252 |
| Active | Yes |

### 3.2 Test Mapping

For each test on the analyzer, create a mapping in OpenELIS:

1. Navigate to **Administration** → **Analyzer Management** → select the Indiko analyzer → **Test Mapping**
2. For each test:

| Analyzer Test Name | OpenELIS Test | LOINC | Units |
|-------------------|---------------|-------|-------|
| `Glucose` | Glucose | 2345-7 | mmol/L |
| `BUN` | BUN | 3094-0 | mmol/L |
| `Creatinine` | Creatinine | 2160-0 | µmol/L |
| *(continue for all tests)* | | | |

> **The analyzer test name must match exactly** (case-sensitive) with the test online name configured on the analyzer.

### 3.3 QC Configuration

1. Navigate to **Administration** → **QC Management**
2. Create QC lots for each control material used on the Indiko
3. Configure QC sample ID patterns so OpenELIS can match incoming QC results:

| QC Material | Sample ID Pattern | Level |
|-------------|-------------------|-------|
| Control Level 1 | `QC-L1-*` | Low |
| Control Level 2 | `QC-L2-*` | Normal |
| Control Level 3 | `QC-L3-*` | High |

4. Set Westgard rules and acceptable SD ranges for each test

### 3.4 Error Flag Configuration

Configure which error flags trigger automatic rejection vs. warning:

| Error Code Group | Action | Codes |
|-----------------|--------|-------|
| Auto-reject | Result not imported | 1, 2, 16, 25, 28, 29, 37 |
| Critical alert | Import with critical notification | 22, 23 |
| Warning | Import with flag — tech must acknowledge | 3-15, 17, 20, 21, 24, 26, 27, 30-36 |
| Information | Import normally with note | 18, 19, 38, 39 |

---

## 4. Validation Procedure

### 4.1 Pre-Validation Checklist

- [ ] Analyzer and OpenELIS are on the same network
- [ ] Ping test passes between analyzer PC and OpenELIS server
- [ ] ASTM port is not blocked by firewall
- [ ] Test online names recorded from analyzer
- [ ] All test mappings configured in OpenELIS
- [ ] QC lots configured in OpenELIS
- [ ] Debug logging enabled on both sides

### 4.2 Validation Steps

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Start OpenELIS ASTM listener | Listener active on configured port | |
| 2 | Restart analyzer LIS connection | Analyzer connects (check analyzer status screen) | |
| 3 | Create test order in OpenELIS for known sample | Order visible in OpenELIS | |
| 4 | Scan sample barcode on analyzer | Analyzer queries host and receives orders (if bidirectional enabled) | |
| 5 | Run sample on analyzer | Results generated | |
| 6 | Check OpenELIS Analyzer Results Import page | Results appear for the correct sample and tests | |
| 7 | Verify result values match analyzer display | Values, units, and flags identical | |
| 8 | Run QC sample | QC results appear in OpenELIS QC module, not in patient results | |
| 9 | Create a sample with a critical result | Critical alert triggered in OpenELIS | |
| 10 | Force an error condition (e.g., short sample) | Result rejected with correct error flag | |

### 4.3 Debug Log Verification

**Analyzer side:** Check `c:\ARC\tmp\lsdebug.txt` for sent/received frames

To enable debug logging:
1. Press **F5** on the analyzer
2. Go to **Actions** → **Change debug status**
3. Set to enabled
4. Reproduce the issue
5. Examine `c:\ARC\tmp\lsdebug.txt`

**OpenELIS side:** Check ASTM listener logs for received messages and any parsing errors.

---

## 5. Daily Operations

### 5.1 Normal Workflow

1. Technician creates orders in OpenELIS (or orders arrive from Order Entry)
2. Sample barcodes are printed and affixed to tubes
3. Samples are loaded on the Indiko/Gallery rack
4. Analyzer scans barcode → queries OpenELIS for orders → loads test list
5. Analyzer runs tests → sends results automatically to OpenELIS
6. Technician reviews results on the Analyzer Results Import page
7. QC results are evaluated first; patient results released if QC passes

### 5.2 Troubleshooting

| Symptom | Possible Cause | Resolution |
|---------|---------------|------------|
| No results appearing in OpenELIS | Connection down | Check network; verify analyzer shows "Connected" status; check firewall |
| Results appear but test names don't match | Test online name mismatch | Compare analyzer online names with OpenELIS test mapping — must be exact match |
| QC results mixed with patient results | QC identification not configured | Verify QC sample ID patterns in OpenELIS match the IDs used on the analyzer |
| All results show error flags | Analyzer issue | Check analyzer error log; may need calibration or maintenance |
| Sample ID not matching in OpenELIS | Composite ID parsing | Verify OpenELIS is extracting only the first component of the composite sample ID (before first `/`) |
| Characters display incorrectly | Encoding mismatch | Ensure OpenELIS ASTM listener is set to Windows-1252 encoding |
| Results delayed | Sending delay configured | Check analyzer LIS settings; set sample/result sending delay to 0 ms |
| "No orders" on analyzer after barcode scan | Bidirectional not configured or order not in OpenELIS | Verify host query is enabled on analyzer; verify order exists in OpenELIS for that accession number |

---

## 6. Vendor Resources

| Resource | Description |
|----------|-------------|
| Gallery-Indiko LIS Interface Manual (N12027 Rev 5.0) | Complete ASTM protocol specification |
| Thermo Scientific Technical Support | [thermofisher.com/support](https://www.thermofisher.com/support) |
| Indiko Plus Product Page | [thermofisher.com/indiko](https://www.thermofisher.com/order/catalog/product/981900) |
| Gallery Plus Product Page | [thermofisher.com/gallery](https://www.thermofisher.com/order/catalog/product/981800) |
| CLSI LIS1-A2 Standard | Low-level ASTM framing specification |
| CLSI LIS2-A2 Standard | Message structure specification |

---

## 7. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-23 | Casey / Claude | Initial companion guide based on vendor LIS Interface Manual (N12027 Rev 5.0). Covers TCP/IP and serial setup, test name configuration, OpenELIS mapping, QC setup, validation checklist, troubleshooting. |
