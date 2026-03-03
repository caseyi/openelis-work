# bioMérieux VIDAS — Integration Companion Guide

**Version:** 1.0
**Date:** 2026-02-24
**Audience:** Laboratory technicians, IT support, bioMérieux service engineers
**Applies to:** VIDAS and mini VIDAS with VIDAS PC software and BCI RS232 or BCI NET

---

## 1. Prerequisites

### 1.1 Hardware Requirements

| Item | Description |
|------|-------------|
| VIDAS or mini VIDAS analyzer | With VIDAS PC pilot computer running VIDAS PC software |
| BCI RS232 cable | DB-9 serial cable from VIDAS PC COM port to OpenELIS server (if using serial) |
| Network cable | Ethernet cable from VIDAS PC to lab network (if using BCI NET) |
| OpenELIS server | Running OpenELIS Global with VIDAS adapter installed |
| USB drive (Phase 1 only) | For transferring CSV export files if BCI is not yet configured |

### 1.2 Information to Gather Before Setup

| Information | Where to Find | Example |
|-------------|--------------|---------|
| VIDAS model | Label on analytical module | VIDAS (30-slot) or mini VIDAS (12-slot) |
| VIDAS PC software version | VIDAS PC → About menu | Version X.X.X |
| BCI software version | BCI RS232 → About | Version X.X.X |
| Serial port (BCI RS232) | VIDAS PC → Device Manager | COM1 or COM2 |
| IP address (BCI NET) | VIDAS PC → Network settings | e.g., 192.168.1.50 |
| Active assay codes | VIDAS PC → Configuration → Assay assignment | e.g., TOXG, RUBG, HCG, HIV |
| Date format configured | VIDAS PC → Configuration → Routine | DD/MM/YYYY (default) |
| Demographics mode | VIDAS PC → Configuration → Routine | Simple, Complete, or Industrial |
| Currently active reagent lots | VIDAS PC → Calibrations → Valid calibrations | Lot numbers per assay |

### 1.3 User Account Requirements

BCI configuration requires **BCI_ADMIN** group membership. Verify your VIDAS PC user account:

| Action | Required Group |
|--------|---------------|
| View BCI status | BCI_ROUTINE or BCI_ADMIN |
| Configure BCI links | BCI_ADMIN |
| Start/stop BCI connection | BCI_ROUTINE or BCI_ADMIN |
| Validate and transmit results | VIDAS_ROUTINE or VIDAS_ADMIN |

---

## 2. Phase 1: CSV Export Integration (Recommended First Step)

This is the simplest integration path — no BCI configuration needed. Results are exported from VIDAS PC as CSV files and uploaded to OpenELIS via the Analyzer File Upload screen.

### 2.1 Exporting Results from VIDAS PC

**Step 1:** On the VIDAS PC, click the **Results** icon in the navigation tree.

**Step 2:** Set the **Finishing date** and **Duration** to select the results you want to export.

**Step 3:** Click the **Refresh** icon to load results.

**Step 4:** Select the results to export:
- Click individual results to select them, OR
- Select all results by not selecting any (the export will include all displayed results)

**Step 5:** Click the **Export** icon (floppy disk icon).

**Step 6:** In the Save dialog:
- Navigate to a USB drive or network share accessible to OpenELIS
- Enter a filename (e.g., `VIDAS_results_2026-02-24.csv`)
- Click **Save**

**Step 7:** The file is saved in CSV format (Comma Separated Value).

### 2.2 Uploading to OpenELIS

**Step 1:** Transfer the CSV file to the OpenELIS workstation (via USB or network share).

**Step 2:** In OpenELIS, navigate to **Results → Analyzer File Upload** (OGC-324).

**Step 3:** Select **bioMérieux VIDAS** from the analyzer dropdown.

**Step 4:** Click **Choose File** and select the CSV file.

**Step 5:** Click **Upload**. OpenELIS will parse the file and match results to orders.

**Step 6:** Review any unmatched results and resolve manually.

### 2.3 CSV Export Tips

- Export results daily to prevent backlog
- Always validate results on VIDAS PC before exporting (the "V" checkbox)
- The CSV file can be opened in Excel for inspection if needed
- File must be opened using Windows Explorer, not directly from VIDAS PC

---

## 3. Phase 2: BCI RS232 Real-Time Integration

### 3.1 Configuring the BCI Link on VIDAS PC

**⚠️ This requires BCI_ADMIN access. Have your laboratory administrator perform these steps.**

**Step 1:** On the VIDAS PC, click the **Navigation tree** → **Configuration** → **Link BCI**.

**Step 2:** Select the BCI link to configure (e.g., "BCI").

**Step 3:** Configure the link parameters:

| Parameter | Recommended Setting | Notes |
|-----------|-------------------|-------|
| Link name | `OpenELIS` | No accented characters |
| Enable | ☑ Enabled | Link must be enabled |
| Character set | ISO 8859-1 | Default — do not change |
| Case of data | As is | Default |
| Date format | DD/MM/YYYY | Must match OpenELIS parser config |
| Fixed length | ☐ Disabled (variable) | Variable-length fields recommended |
| Field separator | `\|` (pipe) | Default — do not change |
| Date separator | `/` | Default |
| Time separator | `:` | Default |

**Step 4:** Configure **Field Selection** (which fields are transmitted):

**Fields sent to LIS (Upload — enable all):**
- ☑ pi (Patient ID)
- ☑ pn (Patient Name)
- ☑ pb (Birthdate)
- ☑ ps (Sex)
- ☑ ci (Sample Identifier) — **mandatory**
- ☑ rt (Requested Test) — **mandatory**
- ☑ rn (Result Name)
- ☑ tt (Test Time)
- ☑ td (Test Date)
- ☑ ql (Qualitative Result)
- ☑ qn (Quantitative Result) — **mandatory**
- ☑ y3 (Units)
- ☑ qd (Dilution)
- ☑ nc (Calibration Status) — **mandatory**

**Fields received from LIS (Download — for Phase 2 bidirectional only):**
- ☑ pi (Patient ID)
- ☑ pn (Patient Name)
- ☑ ci (Sample Identifier)
- ☑ rt (Requested Test)

**Step 5:** Click **Save** when prompted.

**Step 6:** Print the link configuration for your records (recommended).

### 3.2 Configuring Results Transmission Mode

**Step 1:** Navigate to **Configuration** → **Routine**.

**Step 2:** Under **Results validation before transmission**, select one of:

| Option | Behavior | Recommended? |
|--------|----------|-------------|
| Without validation | Results sent automatically after run completes | For trusted, high-volume workflows |
| Validate erroneous assays | Only flagged results require manual validation | **Recommended** |
| Validate all assays | All results must be manually validated before transmission | For maximum control |

**Step 3:** Click **Save**.

### 3.3 Starting the BCI RS232 Connection

**Step 1:** Double-click the **BCI RS232** icon on the Windows desktop.

**Step 2:** Enter your username and password.

**Step 3:** In the **Link Operations** submenu, select your link (e.g., "OpenELIS").

**Step 4:** Start the connection:
- Press **Start** → S indicator turns **green**
- Press **↑** (Upload) → U indicator turns **green**
- For unidirectional: leave **↓** (Download) **red** (disabled)
- For bidirectional: press **↓** (Download) → D indicator turns **green**

**Step 5:** Verify connection status:

| Indicator | Green | Red | Gray |
|-----------|-------|-----|------|
| S (Start/Stop) | Connected | Stopped | Unused |
| U (Upload) | Results transmitting | Upload disabled | Unused |
| D (Download) | Orders receiving | Download disabled | Unused |
| Alarm | No alarm | Alarm active! | Unused |

### 3.4 Validating and Transmitting Results

**Step 1:** In VIDAS PC, open the **Results** menu.

**Step 2:** Click **Refresh** to load new results.

**Step 3:** Review results. Select results to transmit.

**Step 4:** Click the **Validate** icon (checkmark). The "V" checkbox is enabled for each validated result.

**Step 5:** Results are automatically transmitted to OpenELIS via BCI based on the transmission mode configured in Section 3.2.

**Step 6:** If a transmission fails, select the result and click **Retransmit**.

---

## 4. OpenELIS Configuration

### 4.1 Analyzer Setup

In OpenELIS Admin → Analyzer Management:

| Field | Value |
|-------|-------|
| Analyzer Name | `label.analyzer.vidas` |
| Manufacturer | bioMérieux |
| Model | VIDAS / mini VIDAS (per deployed model) |
| Protocol | BCI RS232 (or BCI NET) |
| Connection Type | Serial (or TCP/IP) |
| Serial Port | /dev/ttyUSB0 or /dev/ttyS0 (Linux) |
| Baud Rate | 9600 (default for BCI RS232 — confirm with BCI configuration) |
| Data Bits / Parity / Stop | 8N1 (default — confirm) |

### 4.2 Test Code Mapping

For each VIDAS assay run at the site, create a mapping in OpenELIS:

| VIDAS Code (rt field) | OpenELIS Test | Result Type |
|----------------------|---------------|-------------|
| HCG | β-hCG | Quantitative |
| TOXG | Toxoplasma IgG | Quantitative |
| TOXM | Toxoplasma IgM | Qualitative |
| RUBG | Rubella IgG | Quantitative |
| HIV | HIV Combo | Qualitative |
| HBSG | HBs Antigen | Qualitative |
| TSH | TSH | Quantitative |
| *(add per site assay menu)* | | |

### 4.3 Linux Serial Port Setup (BCI RS232)

If using a USB-to-serial adapter on the OpenELIS server:

```bash
# Identify the device
dmesg | grep ttyUSB

# Create persistent udev rule
sudo nano /etc/udev/rules.d/99-vidas.rules
```

Add the rule:
```
SUBSYSTEM=="tty", ATTRS{idVendor}=="XXXX", ATTRS{idProduct}=="YYYY", SYMLINK+="vidas"
```

Replace `XXXX` and `YYYY` with the adapter's USB vendor/product IDs.

```bash
# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Verify
ls -la /dev/vidas
```

---

## 5. Daily Operations

### 5.1 Daily Checklist

| # | Task | How |
|---|------|-----|
| 1 | Verify BCI connection is active | Check S and U indicators are green in BCI RS232 window |
| 2 | Run analyses normally | Standard VIDAS workflow — load SPR/strips, start sections |
| 3 | Review results on VIDAS PC | Results menu → Refresh |
| 4 | Validate results | Click Validate icon for results to transmit |
| 5 | Confirm results in OpenELIS | Check Validation page for new VIDAS results |
| 6 | Resolve any unmatched results | Check Unmatched Results Queue in OpenELIS |

### 5.2 Result Validation Workflow

```
VIDAS run completes
        │
        ▼
Results appear in VIDAS PC Results menu
        │
        ▼
  Technician reviews results
        │
   ┌────┴────┐
   │         │
Normal    Flagged (nc ≠ valid)
   │         │
   ▼         ▼
Validate   Investigate
   │      (rerun QC, check lot)
   │         │
   ▼         ▼
Auto-transmitted    Validate after resolution
to OpenELIS         │
   │                ▼
   ▼         Transmitted to OpenELIS
Review in OpenELIS
Validation page
```

---

## 6. Troubleshooting

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| BCI S indicator is red | Connection not started | Press Start button in Link Operations |
| BCI Alarm indicator is red | Communication error | Click alarm button, check Event viewer, verify cable/network |
| Results not appearing in OpenELIS | Upload (U) indicator is red | Press ↑ button to enable upload |
| Results not appearing in OpenELIS | Results not validated on VIDAS PC | Validate results in VIDAS PC Results menu |
| "Retransmit" needed | First transmission failed | Select result, click Retransmit icon |
| Sample ID not matching | Barcode mismatch between VIDAS and OpenELIS | Verify same barcode used in both systems; check ci field |
| Date format errors | VIDAS PC and OpenELIS date formats don't match | Align date format in BCI Link config and OpenELIS parser |
| European decimal issue | VIDAS sends comma, OpenELIS expects period | Verify VidasQnParser handles comma-decimal |
| BCI RS232 locks after 10 min | Normal auto-lock behavior | Enter credentials to unlock; this does not affect the LIS connection |
| CSV export file empty | No results selected or no results in date range | Adjust Finishing date and Duration, then Refresh |

---

## 7. Maintenance Schedule

| Frequency | VIDAS Task | Integration Task |
|-----------|-----------|-----------------|
| **Daily** | Review/validate results | Verify results appear in OpenELIS |
| **Monthly** | Clean SPR block, optical lenses, run QCV | Verify QC routing in OpenELIS |
| **Every 6 months** | Clean reagent strip area | Review BCI connection logs |
| **Yearly** | bioMérieux preventive maintenance | Update test code mappings if new assays added |
| **As needed** | Protocol Test Change (PTC) updates | Update OpenELIS test catalog if assay codes change |

---

## 8. Vendor Resources

| Resource | Details |
|----------|---------|
| bioMérieux Technical Assistance | Contact your local bioMérieux representative |
| VIDAS PC User's Manual | Chapter 10: Bidirectional Computer Interface (BCI) |
| BCI NET User's Manual | Separate document — request from bioMérieux if using network connection |
| VIDAS Instrument User's Manual | Chapter 6: Maintenance procedures |
| bioMérieux website | www.biomerieux.com |

---

## 9. Quick Reference Card

### BCI Status Indicators

| Indicator | 🟢 Green | 🔴 Red | ⚫ Gray |
|-----------|---------|--------|---------|
| **S** | Connection active | Connection stopped | Not configured |
| **U** | Uploading results | Upload disabled | Not configured |
| **D** | Downloading orders | Download disabled | Not configured |
| **Alarm** | No errors | Error — check logs! | Not configured |

### Calibration Status Codes (nc field)

| Code | Meaning | Action Required |
|------|---------|----------------|
| `valid` | All OK | None — result can be released |
| `lotexp` | Reagent lot expired | Replace kit, recalibrate |
| `calexp` | Calibration expired | Recalibrate |
| `contneff` | Control not run | Run controls before releasing results |
| `calinc` | Calibration incomplete | Complete calibration |
| `conthnor` | Control out of range | Investigate; may need recalibration |
| `conthwst` | Westgard violation | Investigate; do not release results |

### Common VIDAS Assay Codes

| Code | Test | Type |
|------|------|------|
| TOXG | Toxoplasma IgG | Quant |
| TOXM | Toxoplasma IgM | Qual |
| RUBG | Rubella IgG | Quant |
| HBSG | HBs Ag | Qual |
| HCV | Anti-HCV | Qual |
| HIV | HIV Combo | Qual |
| HCG | β-hCG | Quant |
| TSH | TSH | Quant |
| PCT | Procalcitonin | Quant |
| TNIU | Troponin I | Quant |
| DDIR | D-Dimer | Quant |
