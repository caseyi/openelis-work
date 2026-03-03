# Mindray BC-5380 — Companion Guide for Lab Technicians

**Version:** 2.0
**Date:** 2025-02-20
**Instrument:** Mindray BC-5380 Auto Hematology Analyzer
**Connection:** HL7 v2.3.1 over TCP/IP (Network cable)

---

## 1. What This Guide Covers

This guide helps lab technicians and IT staff configure the BC-5380 hematology analyzer to send results to OpenELIS automatically over the network. Once configured, every CBC and CBC+DIFF result will appear on the Analyzer Import page in OpenELIS for review and acceptance.

---

## 2. What You Need

- BC-5380 analyzer with IPU software running
- Network cable (Ethernet) connecting the analyzer to the lab network
- The OpenELIS server IP address and assigned port number (get from IT)
- Administrator access on the BC-5380

---

## 3. Analyzer Network Setup

### Step 1: Open Communication Settings

1. On the BC-5380, go to **Setup** → **General Setup** → **Communication**
2. You will see the LIS communication configuration screen

### Step 2: Configure Connection

| Setting | What to Enter |
|---------|---------------|
| **Communication Protocol** | Select **HL7** |
| **Server IP Address** | Enter the OpenELIS server IP (e.g., `192.168.1.100`) |
| **Server Port** | Enter the port assigned for this analyzer (get from IT) |
| **Bidirectional LIS** | Enable if you want the analyzer to download worklists from OpenELIS |
| **Auto Communication** | Enable to automatically send results after each analysis |

### Step 3: Test the Connection

1. After saving settings, the IPU software will attempt to connect to OpenELIS
2. If the connection icon shows green/connected, the link is established
3. Run a known control sample and verify the result appears in OpenELIS

---

## 4. How Results Get to OpenELIS

### Automatic Mode (Recommended)
When **Auto Communication** is enabled, every completed analysis is automatically sent to OpenELIS. You don't need to do anything extra — just run samples normally.

### Manual Mode
If Auto Communication is off, you can manually send results:
1. Open the sample result on the analyzer
2. Select **Send to LIS** (or equivalent function)
3. The result will be transmitted to OpenELIS

### What Gets Sent
- All CBC parameters (WBC, RBC, HGB, HCT, MCV, MCH, MCHC, RDW-CV, RDW-SD, PLT, MPV, PDW, PCT)
- All differential parameters if CBC+DIFF mode (NEU, LYM, MON, EOS, BAS — both # and %)
- RUO parameters (ALY, LIC) — marked as Research Use Only
- Abnormal alarm flags (e.g., Anemia, Left Shift?, Platelet Clump?)
- Specimen type (venous or capillary)
- Sample mode information (open vial, closed vial, or autoloader)

### What Does NOT Get Sent (by default)
- Histogram and scattergram images (can be enabled, but typically not needed by LIS)
- These remain viewable on the analyzer screen

---

## 5. Sample ID / Barcode Requirements

### With Barcode Scanner
- The barcode on the sample tube becomes the sample ID
- This MUST match the accession number in OpenELIS
- Supported barcode types: CODE39, CODE93, CODEBAR, CODE128, UPC/EAN, ITF

### Without Barcode Scanner (Manual Entry)
- Enter the sample ID manually on the analyzer worklist
- Use the exact OpenELIS accession number

### Autoloader Mode
- The autoloader reads tube barcodes automatically
- If a barcode cannot be read, the sample ID will show as "Invalid"
- Invalid barcodes will need manual resolution in OpenELIS

---

## 6. QC Results

QC results are transmitted separately from patient results. OpenELIS automatically identifies QC data and routes it to the QC module — you don't need to do anything different when running controls.

The analyzer sends:
- L-J (Levey-Jennings) QC results
- X-bar, XB, and X-R QC results
- QC lot number and expiration date
- Control level information

---

## 7. Bidirectional Mode (Optional)

If bidirectional is enabled, the analyzer can download patient information and test orders from OpenELIS:

1. **Before running a sample**, the analyzer queries OpenELIS using the sample barcode
2. If a matching order exists, patient demographics and ordered tests are downloaded
3. The analyzer pre-populates the worklist with this information
4. After analysis, results are sent back to OpenELIS linked to the original order

This reduces manual data entry and ensures results are correctly linked to orders.

---

## 8. Troubleshooting

| Problem | Check |
|---------|-------|
| **Results not appearing in OpenELIS** | Verify network cable is connected; check IP address and port; confirm Auto Communication is on |
| **Connection drops frequently** | Check network stability; verify no firewall blocking the port |
| **"Communication failed" on analyzer** | OpenELIS server may be down or port not listening; contact IT |
| **Results show as "unmatched" in OpenELIS** | Sample ID/barcode doesn't match any accession number — verify the barcode matches |
| **QC results mixed with patient results** | Should not happen — OpenELIS uses MSH-11 field to separate QC. Contact support if this occurs |
| **Some parameters missing** | Check test mode: CBC mode only sends 13 parameters; CBC+DIFF sends all 27 |
| **Alarm flags not showing** | Verify OpenELIS is configured to display interpretive comments from analyzers |

---

## 9. Quick Reference

| Item | Value |
|------|-------|
| Protocol | HL7 v2.3.1 |
| Connection | TCP/IP (network cable) |
| Character encoding | UTF-8 / UNICODE |
| Results per transmission | All tests in one message per sample |
| ACK timeout | 10 seconds |
| Sample ID location | OBR-3 (Filler Order Number) |
| QC identification | MSH-11 field (P=patient, T/Q=QC) |
| Test codes | LOINC-based (e.g., 6690-2 for WBC) |

---

## 10. Contact

For OpenELIS configuration issues: Contact your OpenELIS administrator
For analyzer communication setup: Contact Mindray service engineer
For network/firewall issues: Contact IT department
