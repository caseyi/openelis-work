# Stago ST art (ST4) Coagulation Analyzer — Software Companion Guide

**Version:** 2.0
**Date:** 2026-02-23
**Audience:** Laboratory technicians, biomedical engineers, LIS administrators
**Related Spec:** Stago ST art Field Mapping & Integration Specification v2.0
**Source:** ST art Service Manual V1.0 (December 1999), Chapter 11

---

## 1. Overview

This guide provides step-by-step instructions for connecting the Stago ST art semi-automated coagulation analyzer to OpenELIS Global. The ST art transmits results automatically over a serial connection using a proprietary protocol (not ASTM or HL7).

Once connected, patient results (PT, APTT, Fibrinogen, TT, Factor assays, and others) are automatically transmitted from the ST art to OpenELIS as soon as the operator validates each result on the instrument.

### What You Need

| Item | Description |
|------|-------------|
| **Stago ST art analyzer** | With RS-232C port (rear panel) |
| **Serial cable** | Straight-through or custom 3-wire cable (see Section 3) |
| **USB-to-Serial adapter** | If the OpenELIS server has no native serial port |
| **OpenELIS server** | Version with Stago ST art adapter installed |
| **Admin access** | OpenELIS administrator credentials |

### Important Notes

- The ST art uses a **proprietary serial protocol** — it does NOT use the ASTM standard used by most other analyzers.
- Communication is **one-way only** (ST art → OpenELIS). OpenELIS cannot send orders to the instrument.
- There is **no handshaking** — the ST art sends data immediately when results are ready.
- If a message is lost (e.g., cable unplugged), you must **re-send the result from the instrument** manually.

---

## 2. ST art Instrument Settings

### 2.1 Verifying RS-232 Settings

The ST art's serial settings are fixed by the manufacturer. Verify they match:

| Parameter | Required Value |
|-----------|---------------|
| **Baud Rate** | 9600 |
| **Data Bits** | 8 |
| **Parity** | None |
| **Stop Bits** | 1 |
| **Handshaking** | None |

These settings are documented in the ST art Service Manual, Section 11.1. They are typically not user-changeable.

### 2.2 Transmission Behavior

The ST art transmits results **automatically** as soon as they are obtained. There is no "manual send" button — when a clotting time is measured and displayed on the ST art screen, it is simultaneously sent over the serial port.

Each result message includes:
- The **station number** (which measurement channel was used)
- The **analysis rank** (which test was performed — PT, APTT, etc.)
- The **patient ID** (entered via keypad or barcode)
- The **result values** (clotting time, %, INR, etc.)
- A **status code** indicating if the result is valid

---

## 3. Cable Connection

### 3.1 ST art Serial Port

The ST art has a **male 9-pin (DB-9) RS-232C connector** on the rear panel.

### 3.2 Wiring Diagram

The ST art only transmits data (it does not receive). You only need 2 wires:

```
ST art (DB-9 Male)              OpenELIS Server
───────────────────             ───────────────────
Pin 2 (TD) ─────────────────→  Pin 3 (RD)       ← Data line
Pin 5 (GND) ────────────────→  Pin 5 (GND)      ← Ground

Note: Pins 7 and 9 on the ST art are internally connected
to each other (CTS↔DSR loopback). Do not connect these
to the server.
```

> **Simple cable:** You can make a cable with just 2 connections: ST art Pin 2 → Server Pin 3, and ST art Pin 5 → Server Pin 5. A standard null modem cable will also work (it crosses pins 2 and 3 in both directions, which is fine since the ST art ignores received data).

### 3.3 Using a USB-to-Serial Adapter

If the OpenELIS server doesn't have a serial port:

1. Connect a USB-to-Serial adapter to the server
2. Install the adapter driver (most Linux distributions auto-detect)
3. Note the assigned port name:
   ```bash
   # Linux: check for the adapter
   ls /dev/ttyUSB*
   ```
4. Connect the serial cable from the ST art to the adapter

---

## 4. OpenELIS Configuration

### 4.1 Register the Analyzer

1. Log in to OpenELIS as an administrator
2. Navigate to **Admin → Analyzer Administration**
3. Click **Add Analyzer**
4. Configure:

| Field | Value |
|-------|-------|
| Name | `Stago ST art` |
| Description | `Stago ST art Semi-Automated Coagulation Analyzer` |
| Protocol | `Stago Proprietary Serial` |
| Connection Type | `Serial (RS-232)` |
| Serial Port | *(your port, e.g., `/dev/ttyUSB0`)* |
| Baud Rate | `9600` |
| Data/Stop/Parity | `8 / 1 / None` |
| Flow Control | `None` |
| Adapter | `StagoSTartAdapter` |
| Active | `Yes` |

5. Click **Save**

### 4.2 Configure Test Mappings

In **Analyzer Administration → [Stago ST art] → Test Mappings**, add mappings for each analysis your laboratory performs.

**Minimum mappings for a typical coagulation lab:**

| ST art Rank | Analysis | OpenELIS Test | LOINC |
|-------------|----------|--------------|-------|
| 01 | PT — Clotting Time | PT (Prothrombin Time) | 5902-2 |
| 01 | PT — % Activity | PT % Activity | 5894-1 |
| 01 | PT — INR | PT INR | 6301-6 |
| 02 | APTT — Clotting Time | APTT | 3173-2 |
| 03 | Fibrinogen | Fibrinogen (Clauss) | 3255-7 |
| 05 | TT — Clotting Time | Thrombin Time | 3243-3 |

**Additional mappings (if these tests are performed):**

| ST art Rank | Analysis | OpenELIS Test | LOINC |
|-------------|----------|--------------|-------|
| 04 | Unfrac. Heparin | Heparin Activity | 3656-0 |
| 07 | Reptilase Time | Reptilase Time | 6683-7 |
| 12 | Factor II | Factor II Activity | 3289-6 |
| 14 | Factor V | Factor V Activity | 3193-0 |
| 15 | Factor VII | Factor VII Activity | 3198-9 |
| 19 | Factor VIII | Factor VIII Activity | 3209-4 |
| 20 | Factor IX | Factor IX Activity | 3187-2 |
| 17 | Factor X | Factor X Activity | 3218-5 |

> **Only map what you use.** Unmapped rank codes are logged and skipped. You can add mappings later.

### 4.3 Configure QC Pattern

In **Analyzer Administration → [Stago ST art] → QC Settings**:

Set the QC Sample ID pattern to match your lab's QC naming convention. For example:
- `QC*` — any ID starting with "QC"
- `CTRL*` — any ID starting with "CTRL"

This ensures QC results go to the QC module instead of the patient results queue.

---

## 5. Daily Operation

### 5.1 Before Patient Testing

1. Confirm the serial cable is connected between the ST art and the OpenELIS server
2. Check that the OpenELIS Stago adapter is running: **Admin → System Status → Analyzer Services**
3. Run QC controls and verify they appear in OpenELIS QC module

### 5.2 Running Patient Samples

1. **Enter the sample ID on the ST art** — type the accession number using the keypad or scan the barcode
   > **CRITICAL:** The ID entered on the ST art must **exactly match** the accession number in OpenELIS. This is how results are linked to the correct patient.
2. Select the test (PT, APTT, etc.) on the ST art
3. Load the sample and reagent into the measurement station
4. The ST art measures the clotting time and displays the result
5. The result is **automatically transmitted** to OpenELIS
6. Check the **Analyzer Results** page in OpenELIS to review and accept the result

### 5.3 Understanding What Gets Sent

For a **PT** test (Rank 01), the ST art sends a single message containing:
- PT clotting time (in seconds)
- PT % Activity
- PT INR

OpenELIS splits this into 3 separate results. You'll see all 3 on the Analyzer Results page.

For **APTT** (Rank 02), you'll see:
- APTT clotting time (in seconds)
- APTT Ratio

### 5.4 Duplicate Determinations

If the ST art is configured for duplicate measurements, it sends:
1. First determination (status `D`)
2. Second determination (status `R`)
3. Mean value (status `F`)

OpenELIS uses the **mean value (F)** as the reported result. Both individual runs are stored for audit purposes.

---

## 6. Troubleshooting

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| **No results appearing in OpenELIS** | Cable disconnected | Check the serial cable connection |
| | Adapter service not running | Check Admin → System Status; restart if needed |
| | Wrong serial port configured | Verify the port in Analyzer Administration matches the actual device (e.g., `/dev/ttyUSB0`) |
| | USB adapter not recognized | Run `ls /dev/ttyUSB*` — if nothing shows, check adapter driver |
| **Results in "Unmatched" queue** | ID on ST art doesn't match OpenELIS accession | Re-enter the correct ID on the ST art and re-run |
| | Sample not yet ordered in OpenELIS | Create the order first, then re-send the result |
| **"Unknown rank code" in log** | Test mapping not configured | Add the rank code mapping in Analyzer Administration |
| **Checksum error in log** | Electrical interference | Check cable shielding; keep away from power cables |
| | Cable too long | Use cable < 5 meters; for longer distances, use a serial-to-TCP bridge |
| **Result shows error flag** | Status `E` (exceeds max time) | Sample may have a very prolonged clotting time; verify and re-run if needed |
| | Status `I` (refused) | Instrument refused the measurement; check sample quality and re-run |
| **QC results mixed with patient results** | QC ID pattern not configured | Configure QC pattern in Analyzer Administration |
| **Partial or garbled data** | Baud rate mismatch | Verify both the ST art and OpenELIS are set to 9600 baud, 8N1 |

### 6.1 Viewing the Raw Serial Data (for Debugging)

If results are not appearing at all, you can check if data is being received on the serial port:

```bash
# Linux: monitor raw serial data (press Ctrl+C to stop)
cat /dev/ttyUSB0

# Or use screen for a more readable view
screen /dev/ttyUSB0 9600

# Check if the port is in use by another process
lsof /dev/ttyUSB0
```

When a result is sent, you should see data starting with a `STX` character (may appear as a special character) followed by `ST4` and ending with `ETX`.

### 6.2 Re-Sending Results from the ST art

If a result was lost (cable disconnected, checksum error, etc.):

1. On the ST art, navigate to the result memory/log
2. Select the result to re-send
3. Use the instrument's re-print/re-transmit function
4. The result will be sent again over the serial port

> **Note:** The exact steps for re-sending vary by firmware version. Consult the ST art Operator's Manual for your specific instrument.

---

## 7. Serial Port Setup on Linux

### 7.1 Granting Access

The OpenELIS service user must have permission to access the serial port:

```bash
# Add the OpenELIS user to the dialout group
sudo usermod -a -G dialout openelis

# Verify group membership
groups openelis

# Restart the OpenELIS service for the group change to take effect
sudo systemctl restart openelis
```

### 7.2 Persistent Device Names (udev Rules)

USB-to-Serial adapters may get different `/dev/ttyUSB` numbers after a reboot. To assign a fixed name:

```bash
# Find the adapter's unique attributes
udevadm info -a -n /dev/ttyUSB0 | grep '{serial}'

# Create a udev rule (replace SERIAL_NUMBER with your adapter's serial)
sudo nano /etc/udev/rules.d/99-stago.rules
```

Add this line:
```
SUBSYSTEM=="tty", ATTRS{serial}=="SERIAL_NUMBER", SYMLINK+="stago-start"
```

Then reload udev and use `/dev/stago-start` as the port name in OpenELIS:
```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
ls -la /dev/stago-start
```

---

## 8. Understanding the ST art Result Status Codes

When reviewing results in OpenELIS, you may see status flags from the instrument:

| Code | Meaning | What to Do |
|------|---------|------------|
| **S** | Single determination, completed | Normal — result is valid |
| **D** | First of duplicate pair | Normal — wait for second run and mean |
| **R** | Second of duplicate pair | Normal — paired with first run |
| **F** | Mean of duplicate pair | Normal — this is the reported value |
| **E** | Exceeds maximum clotting time | Investigate — sample may be severely anticoagulated or degraded |
| **I** | Refused by instrument | Re-run the sample — check reagent and sample quality |
| **!** | Exceeds acceptable margin | Review — duplicate runs had high variability; consider re-running |

---

## 9. Quick Reference Card

Print this and keep near the ST art for the operator:

```
┌──────────────────────────────────────────────────────┐
│              STAGO ST art → OpenELIS                 │
│              Quick Reference                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. Enter accession number on ST art                 │
│     (MUST match OpenELIS exactly)                    │
│                                                      │
│  2. Run test as normal                               │
│                                                      │
│  3. Result auto-sends to OpenELIS                    │
│                                                      │
│  4. Check Analyzer Results page in OpenELIS          │
│                                                      │
├──────────────────────────────────────────────────────┤
│  IF RESULT NOT IN OPENELIS:                          │
│  □ Check cable connection                            │
│  □ Verify accession number matches                   │
│  □ Check Admin → System Status                       │
│  □ Contact LIS administrator                         │
├──────────────────────────────────────────────────────┤
│  Serial: 9600 baud, 8N1, no handshaking              │
│  Protocol: Stago proprietary (NOT ASTM)              │
└──────────────────────────────────────────────────────┘
```

---

## 10. Stago Documentation Resources

| Resource | Description | How to Obtain |
|----------|-------------|---------------|
| **ST art Service Manual** | Contains Chapter 11 (RS-232C Interface) with protocol details | Should be on-site with biomedical engineering |
| **ST art Operator's Manual** | Day-to-day operation, result memory, re-transmission | Shipped with instrument |
| **Stago Technical Support** | For protocol questions, firmware updates | Contact local Stago distributor |

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-23 | Claude / Casey | Initial draft — incorrectly assumed ASTM protocol |
| **2.0** | **2026-02-23** | **Claude / Casey** | **Complete rewrite. Protocol corrected to proprietary serial per ST art Service Manual Ch.11. Cable diagram updated (3-wire, no crossover needed). All ASTM references removed. Added result status code reference, quick reference card, udev instructions.** |
