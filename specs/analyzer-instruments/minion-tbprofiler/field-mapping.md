# MinION + TB-Profiler — Field Mapping & Integration Specification

**Target Instrument:** Oxford Nanopore MinION (Mk1C / Mk1B)  
**Bioinformatics Pipeline:** TB-Profiler (https://github.com/jodyphelan/TBProfiler)  
**Resistance Database:** WHO Catalogue of Mutations in *M. tuberculosis* (2023 edition)  
**OpenELIS Module:** Pipeline Result Import (JSON / CSV)  
**Version:** 1.0  
**Date:** 2025-02-19

---

## Architectural Note

This is a **Pattern B: Pipeline Output Import** instrument. Unlike QuantStudio, MALDI, and Attune which produce analyzer-native exports, the MinION produces raw sequencing data (FAST5/POD5/FASTQ) that must be processed through a bioinformatics pipeline before results reach OpenELIS.

OpenELIS does **not** interact with the MinION hardware or MinKNOW software directly. Instead, it imports the structured output from TB-Profiler (or equivalent pipeline) after bioinformatics analysis is complete. The complexity in this integration is not in the parser (the JSON/CSV structures are well-defined), but in supporting the richness of the data: per-drug resistance with mutation-level detail, lineage information, variant allele frequencies, and per-target QC depth.

---

## Important: Validation Status

### What is high-confidence

- TB-Profiler's JSON output structure — this is open source, well-documented, and stable across recent versions (5.x-6.x). The test files closely follow the actual output schema.
- Drug resistance calling logic — directly maps to the WHO 2023 catalogue; mutation names, gene names, and amino acid change formats are standardized.
- WHO classification definitions (MDR-TB, Pre-XDR-TB, XDR-TB) — published international standards.
- QC metrics (depth, coverage, mapping rate) — standard bioinformatics outputs.

### What may need adjustment

- **Exact JSON field names** — TB-Profiler's output schema has evolved between versions; field names like `dr_resistances` vs `dr_variants` or `drtype` vs `drug_resistance_type` may differ. The test files use a representative schema.
- **Batch summary CSV format** — TB-Profiler can generate various tabular summaries via `tb-profiler collate`; the exact column names depend on the version and options used.
- **Additional pipeline outputs** — some implementations add custom fields (e.g., cluster assignment, transmission network ID, phylogenetic placement) that are site-specific.
- **WHO catalogue version** — the database version string format may differ.

### Recommended validation process

1. Run `tb-profiler profile` on a test sample and examine the `results/` JSON output
2. Run `tb-profiler collate` to generate the batch CSV summary and compare column headers
3. Confirm JSON field names match the parser configuration
4. Verify WHO catalogue version string format

---

## 1. Overview

### Data Flow: MinION to OpenELIS

```
  ┌─────────────────────────┐
  │  MinION Hardware         │
  │  - Nanopore sequencing   │
  │  - Real-time basecalling │
  └──────────┬──────────────┘
             │ FAST5/POD5 (raw signal)
  ┌──────────▼──────────────┐
  │  MinKNOW / Dorado        │
  │  - Basecalling           │
  │  - Demultiplexing        │
  │  - FASTQ output          │
  └──────────┬──────────────┘
             │ FASTQ files (per barcode)
  ┌──────────▼──────────────┐
  │  TB-Profiler Pipeline    │
  │  - Read mapping (minimap2)│
  │  - Variant calling       │
  │  - Resistance prediction │
  │  - Lineage typing        │
  │  - QC metrics            │
  └─────┬──────────┬────────┘
        │          │
   ┌────▼───┐  ┌──▼──────────┐
   │ JSON   │  │ CSV Summary  │
   │ (per   │  │ (batch)      │
   │ sample)│  │              │
   └────┬───┘  └──┬──────────┘
        │         │
  ┌─────▼─────────▼──────────┐
  │  OpenELIS Global          │
  │  - Pipeline Import Parser │
  │  - AMR Module Integration │
  │  - WHONET Export           │
  │  - Surveillance Dashboard  │
  └───────────────────────────┘
```

### Two Import Formats

TB-Profiler produces two consumable output formats:

| Format | File | Use Case | Granularity |
|--------|------|----------|-------------|
| **JSON** (per-sample) | `results/{sample_id}.results.json` | Primary import — full detail | Complete: mutations, frequencies, depths, lineage, QC |
| **CSV** (batch summary) | `tb-profiler collate` output | Batch review / surveillance dashboard | Summary: S/R per drug, lineage, top-level QC |

OpenELIS should support **both** formats. JSON is preferred for clinical reporting (full mutation detail); CSV is useful for batch surveillance import.

---

## 2. JSON Per-Sample Output — Field Mapping

### 2.1 Top-Level Fields

| JSON Path | Data Type | Example | OpenELIS Mapping |
|-----------|-----------|---------|------------------|
| `id` | String | `2502190001` | **`accession_number`** |
| `timestamp` | ISO DateTime | `2025-02-19T09:45:23Z` | Analysis completion time |
| `species` | String | `Mycobacterium tuberculosis` | Organism identification |
| `drtype` | String | `MDR-TB` | Overall resistance classification |
| `main_lineage` | String | `lineage2` | MTB lineage (epidemiological) |
| `sub_lineage` | String | `lineage2.2.1` | Sub-lineage |
| `family` | String | `Beijing` | Lineage family name |
| `spoligotype` | String | `SIT1` | Spoligotype international type (if available) |

### 2.2 Pipeline Metadata

| JSON Path | Data Type | Example | Purpose |
|-----------|-----------|---------|---------|
| `pipeline.software` | String | `TB-Profiler` | Pipeline name |
| `pipeline.version` | String | `6.3.0` | Software version — store for reproducibility |
| `pipeline.db_version` | String | `WHO-UCN-GTB-PCI-2023.5` | Resistance database version |
| `pipeline.analysis_date` | Date | `2025-02-19` | Date of analysis |
| `pipeline.commit` | String | `a8f3c2d` | Git commit hash (reproducibility) |

### 2.3 Sequencing Metadata

| JSON Path | Data Type | Example | OpenELIS Mapping |
|-----------|-----------|---------|------------------|
| `sequencing.platform` | String | `MinION` | Instrument type |
| `sequencing.instrument_id` | String | `MN42781` | Instrument serial |
| `sequencing.flowcell` | String | `FLO-MIN114` | Flowcell type (reagent tracking) |
| `sequencing.kit` | String | `SQK-RBK114.96` | Library prep kit (reagent tracking) |
| `sequencing.basecaller` | String | `Dorado` | Basecaller software |
| `sequencing.basecaller_version` | String | `0.5.3` | Basecaller version |
| `sequencing.basecaller_model` | String | `dna_r10.4.1_e8.2_400bps_sup@v4.3.0` | Basecalling model |

### 2.4 QC Metrics

| JSON Path | Data Type | Example | Threshold | Purpose |
|-----------|-----------|---------|-----------|---------|
| `qc.num_reads` | Integer | `245678` | ≥ 50,000 | Total reads sequenced |
| `qc.num_reads_mapped` | Integer | `234521` | — | Reads mapping to H37Rv reference |
| `qc.pct_reads_mapped` | Float | `95.46` | ≥ 90% | Mapping rate — low = possible NTM or contamination |
| `qc.median_depth` | Integer | `87` | **≥ 30x** | Overall sequencing depth |
| `qc.genome_coverage_10x` | Float | `98.7` | ≥ 95% | % of genome at ≥10x depth |
| `qc.genome_coverage_30x` | Float | `96.2` | **≥ 90%** | % of genome at ≥30x — primary QC gate |
| `qc.mean_read_length` | Integer | `4523` | — | Read length (quality indicator) |
| `qc.median_read_length` | Integer | `3876` | — | Median read length |
| `qc.n50` | Integer | `6234` | — | N50 read length |
| `qc.target_median_depth.*` | Integer | `112` (rpoB) | ≥ 30x per target | Per-gene depth for resistance targets |

### 2.5 Drug Resistance Array

The `dr_resistances` array is the core clinical result. Each element represents one drug:

| JSON Path | Data Type | Example | OpenELIS Mapping |
|-----------|-----------|---------|------------------|
| `dr_resistances[].drug` | String | `rifampicin` | Drug name (maps to WHONET antibiotic code) |
| `dr_resistances[].status` | String | `Resistant` | **S/R/Insufficient coverage** |
| `dr_resistances[].mutations[]` | Array | (see below) | Mutation details |

#### Resistance Status Values

| Value | Meaning | OpenELIS Result |
|-------|---------|-----------------|
| `Sensitive` | No resistance mutations found at sufficient depth | S |
| `Resistant` | One or more resistance mutations detected (frequency ≥ threshold) | R |
| `Insufficient coverage` | Target gene depth below reporting threshold | **IC** — cannot determine; re-sequence |

#### Mutation Detail Fields

| JSON Path | Data Type | Example | Purpose |
|-----------|-----------|---------|---------|
| `mutations[].gene` | String | `rpoB` | Gene harboring the mutation |
| `mutations[].nucleotide_change` | String | `c.1349C>T` | HGVS nucleotide notation |
| `mutations[].amino_acid_change` | String | `p.Ser450Leu` | HGVS protein notation (empty for promoter/rRNA) |
| `mutations[].type` | String | `missense` | Variant type: missense, frameshift, promoter, rRNA |
| `mutations[].frequency` | Float | `1.0` | Variant allele frequency (0.0-1.0) |
| `mutations[].depth` | Integer | `145` | Read depth at this position |
| `mutations[].confidence` | String | `high` | Pipeline confidence: high/moderate/low |
| `mutations[].who_confidence` | String | `Assoc w R - High confidence` | WHO catalogue grading |
| `mutations[].annotation` | String | `WHO catalogue 2023` | Source annotation |

### 2.6 Other Variants

The `other_variants` array contains mutations detected but below the reporting threshold (e.g., heteroresistance at < 75% frequency):

| JSON Path | Data Type | Example |
|-----------|-----------|---------|
| `other_variants[].gene` | String | `rpoB` |
| `other_variants[].amino_acid_change` | String | `p.Ser450Leu` |
| `other_variants[].frequency` | Float | `0.23` |
| `other_variants[].depth` | Integer | `95` |
| `other_variants[].annotation` | String | `Sub-threshold variant` |

---

## 3. CSV Batch Summary — Column Mapping

The batch CSV is produced by `tb-profiler collate` and provides a flat table for all samples in a run:

| Column | Data Type | Example | OpenELIS Mapping |
|--------|-----------|---------|------------------|
| `sample_id` | String | `2502190001` | `accession_number` |
| `species` | String | `Mycobacterium tuberculosis` | Organism ID |
| `main_lineage` | String | `lineage2` | Epidemiological lineage |
| `sub_lineage` | String | `lineage2.2.1` | Sub-lineage |
| `family` | String | `Beijing` | Family name |
| `drtype` | String | `MDR-TB` | Resistance classification |
| `rifampicin` | Char | `R` / `S` / `IC` | Per-drug resistance call |
| `isoniazid` | Char | `R` / `S` / `IC` | |
| `ethambutol` | Char | `R` / `S` / `IC` | |
| `pyrazinamide` | Char | `R` / `S` / `IC` | |
| `streptomycin` | Char | `R` / `S` / `IC` | |
| `fluoroquinolones` | Char | `R` / `S` / `IC` | |
| `amikacin` | Char | `R` / `S` / `IC` | |
| `kanamycin` | Char | `R` / `S` / `IC` | |
| `capreomycin` | Char | `R` / `S` / `IC` | |
| `ethionamide` | Char | `R` / `S` / `IC` | |
| `linezolid` | Char | `R` / `S` / `IC` | |
| `bedaquiline` | Char | `R` / `S` / `IC` | |
| `clofazimine` | Char | `R` / `S` / `IC` | |
| `delamanid` | Char | `R` / `S` / `IC` | |
| `num_reads` | Integer | `245678` | QC metric |
| `pct_reads_mapped` | Float | `95.46` | QC metric |
| `median_depth` | Integer | `87` | QC metric |
| `genome_coverage_30x` | Float | `96.2` | QC metric |
| `rifampicin_mutations` | String | `rpoB_S450L` | Mutation shorthand |
| `isoniazid_mutations` | String | `katG_S315T;inhA_-15C>T` | Semicolon-separated if multiple |
| `ethambutol_mutations` | String | `embB_M306V` | |
| `pyrazinamide_mutations` | String | `pncA_D131Y` | |
| `fluoroquinolone_mutations` | String | `gyrA_D94A` | |
| `linezolid_mutations` | String | `rplC_C154R` | |
| `bedaquiline_mutations` | String | `Rv0678_D65fs` | |
| `other_mutations` | String | `rrs_A514C` | Non-primary drug mutations |
| `pipeline_version` | String | `6.3.0` | |
| `db_version` | String | `WHO-UCN-GTB-PCI-2023.5` | |
| `analysis_date` | Date | `2025-02-19` | |

**Special value `IC`** = Insufficient Coverage. Present when target gene depth is below reporting threshold.

**Heteroresistance notation:** Sub-threshold variants in the mutation columns are annotated with frequency and "het" flag: `rpoB_S450L(0.23;het)`

---

## 4. WHO Resistance Classification (2021 Updated Definitions)

| Classification | Definition | Clinical Significance |
|---------------|------------|----------------------|
| **Sensitive** | Susceptible to all first-line and second-line drugs | Standard first-line regimen |
| **RR-TB** | Rifampicin-resistant (regardless of other drugs) | Requires second-line regimen |
| **HR-TB** | Isoniazid-resistant, rifampicin-susceptible | Modified first-line or INH-R regimen |
| **MDR-TB** | Resistant to at least rifampicin AND isoniazid | Requires MDR-TB regimen (BPaL or injection-based) |
| **Pre-XDR-TB** | MDR-TB + resistance to any fluoroquinolone | BPaL or individualized regimen |
| **XDR-TB** | MDR-TB + fluoroquinolone resistance + bedaquiline and/or linezolid resistance | Extremely limited options; individualized regimen |

### Classification Logic for Parser

```
IF rifampicin = R AND isoniazid = R:
    IF fluoroquinolones = R:
        IF bedaquiline = R OR linezolid = R:
            drtype = "XDR-TB"
        ELSE:
            drtype = "Pre-XDR-TB"
    ELSE:
        drtype = "MDR-TB"
ELIF rifampicin = R:
    drtype = "RR-TB"
ELIF isoniazid = R:
    drtype = "HR-TB"
ELIF any_drug = R:
    drtype = "Other resistance"
ELSE:
    drtype = "Sensitive"
```

---

## 5. Drug → WHONET Antibiotic Code Mapping

| TB-Profiler Drug Name | WHONET Code | WHO Group | Primary Resistance Genes |
|-----------------------|-------------|-----------|-------------------------|
| `rifampicin` | RIF | Group A (1st line) | rpoB |
| `isoniazid` | INH | Group A (1st line) | katG, inhA promoter |
| `ethambutol` | EMB | Group A (1st line) | embB |
| `pyrazinamide` | PZA | Group A (1st line) | pncA |
| `streptomycin` | STR | (1st line, older) | rrs, rpsL, gid |
| `fluoroquinolones` | FLQ | Group A (2nd line) | gyrA, gyrB |
| `amikacin` | AMK | Group B (2nd line) | rrs |
| `kanamycin` | KAN | Group B (2nd line) | rrs, eis promoter |
| `capreomycin` | CAP | Group B (2nd line) | rrs, tlyA |
| `ethionamide` | ETH | Group C (2nd line) | inhA promoter, ethA |
| `linezolid` | LZD | Group A (2nd line) | rplC, rrl |
| `bedaquiline` | BDQ | Group A (2nd line) | Rv0678, atpE, pepQ |
| `clofazimine` | CFZ | Group B (2nd line) | Rv0678 |
| `delamanid` | DLM | Group C (2nd line) | ddn, fbiA, fbiB, fbiC, fgd1 |

### Cross-Resistance Notes

| Mutation | Primary Drug | Cross-Resistant To | Mechanism |
|----------|-------------|-------------------|-----------|
| inhA promoter c.-15C>T | Isoniazid | **Ethionamide** | Shared target (InhA enzyme) |
| Rv0678 mutations | Bedaquiline | **Clofazimine** | Shared efflux pump (MmpL5) |
| rrs A1401G | Amikacin | **Kanamycin, Capreomycin** | Shared ribosomal target |

---

## 6. QC Validation Rules

### 6.1 Sample-Level QC Gates

| Check | Threshold | Action |
|-------|-----------|--------|
| `pct_reads_mapped` | ≥ 90% | < 90% → **Warning**: possible NTM, contamination, or mixed sample |
| `pct_reads_mapped` | ≥ 10% | < 10% → **Reject**: not MTB; flag as NTM or non-mycobacterial |
| `median_depth` | ≥ 30x | < 30x → **Warning**: low overall depth; some drug targets may be unreliable |
| `median_depth` | ≥ 10x | < 10x → **Reject**: insufficient for any reliable resistance calling |
| `genome_coverage_30x` | ≥ 90% | < 90% → **Warning**: gaps in coverage may affect some targets |
| `num_reads` | ≥ 50,000 | < 50,000 → **Warning**: low total reads; check library prep |

### 6.2 Per-Target QC

| Check | Threshold | Action |
|-------|-----------|--------|
| `target_median_depth.*` | ≥ 30x | < 30x → **Insufficient coverage** for that drug |
| `target_median_depth.*` | ≥ 10x | < 10x → **Cannot call** — mark drug as IC |
| Variant depth | ≥ 10 reads | < 10 → Variant call unreliable regardless of frequency |

### 6.3 Variant-Level QC

| Check | Threshold | Action |
|-------|-----------|--------|
| `frequency` | ≥ 0.75 | ≥ 0.75 → Report as Resistant |
| `frequency` | 0.25 - 0.74 | **Heteroresistance** — flag for clinical review |
| `frequency` | < 0.25 | Below threshold — report in `other_variants` only |
| `depth` at variant site | ≥ 30x | < 30x → Low confidence; annotate |
| WHO confidence | "High confidence" | Direct resistance call |
| WHO confidence | "Moderate confidence" | Resistance call with note |
| WHO confidence | "Low confidence" / "Uncertain" | Report variant but do not call resistance |

---

## 7. OpenELIS AMR Module Integration

### 7.1 Result Mapping to AMR Workbench

TB-Profiler results map to the OpenELIS AMR/Microbiology Case Workbench:

| TB-Profiler Field | AMR Workbench Field |
|-------------------|---------------------|
| `species` | Organism identification |
| `drtype` | Resistance classification label |
| Per-drug `status` (S/R/IC) | Antibiotic susceptibility result |
| Per-drug `mutations[]` | Resistance mechanism detail |
| `main_lineage` + `family` | Epidemiological metadata (displayed, not stored as test result) |

### 7.2 Multi-Result Structure

Unlike phenotypic AST (one result per antibiotic), WGS-based resistance produces a **complex, multi-layered result** per sample:

- **Level 1 — Classification:** `drtype` = MDR-TB, XDR-TB, etc.
- **Level 2 — Per-drug S/R:** 14 individual drug susceptibility results
- **Level 3 — Mutation detail:** For each resistant drug, the specific mutation(s) with gene, amino acid change, frequency, and WHO confidence
- **Level 4 — QC metadata:** Per-target coverage depth, overall QC metrics

OpenELIS must store all four levels. Level 1 and 2 map to standard AST result fields. Level 3 and 4 require structured comment/detail fields or a dedicated molecular DST result model.

### 7.3 WHONET Export

For surveillance export to WHONET/WHO GLASS:

| WHONET Field | Source |
|-------------|--------|
| ORGANISM | `species` → WHONET organism code (`mtu`) |
| SPEC_TYPE | From OpenELIS sample record |
| All antibiotic columns (RIF, INH, etc.) | Per-drug `status` → S, R, or blank for IC |
| GENOTYPE | `main_lineage` + `sub_lineage` |
| MECHANISM | Mutation shorthand (e.g., `rpoB_S450L`) |
| METHOD | `WGS` (whole genome sequencing) |

---

## 8. Alert Rules

| Condition | Alert | Action |
|-----------|-------|--------|
| `drtype` = MDR-TB or higher | MDR alert | Notify TB program; initiate MDR-TB regimen evaluation |
| `drtype` = Pre-XDR-TB | Pre-XDR alert | Urgent — limited regimen options |
| `drtype` = XDR-TB | XDR alert | Critical — individual regimen design required |
| `bedaquiline` = R | BDQ resistance alert | Critical for BPaL regimen eligibility |
| `linezolid` = R | LZD resistance alert | Critical for BPaL regimen eligibility |
| Heteroresistance detected | Heteroresistance flag | Clinical review; possible emerging resistance |
| `species` = NTM | Not MTB | TB-Profiler DST not applicable; refer for NTM workup |
| `pct_reads_mapped` < 10% | Species mismatch | Not MTB — review culture/sample |
| Multiple drugs IC | Insufficient data | Re-sequence recommended |

---

## 9. Parser Configuration Schema

### 9.1 JSON Import Configuration

```json
{
  "import_format": "JSON",
  "pipeline_name": "TB-Profiler",
  "supported_versions": ["5.0.0+", "6.0.0+"],
  
  "field_mapping": {
    "accession": "id",
    "timestamp": "timestamp",
    "species": "species",
    "drtype": "drtype",
    "lineage": "main_lineage",
    "sub_lineage": "sub_lineage",
    "family": "family",
    "spoligotype": "spoligotype",
    "pipeline_version": "pipeline.version",
    "db_version": "pipeline.db_version",
    "instrument_id": "sequencing.instrument_id"
  },
  
  "qc_field_mapping": {
    "num_reads": "qc.num_reads",
    "pct_reads_mapped": "qc.pct_reads_mapped",
    "median_depth": "qc.median_depth",
    "genome_coverage_30x": "qc.genome_coverage_30x",
    "target_depths": "qc.target_median_depth"
  },
  
  "resistance_array_path": "dr_resistances",
  "other_variants_path": "other_variants",
  "notes_path": "notes",
  
  "resistance_field_mapping": {
    "drug": "drug",
    "status": "status",
    "mutations": "mutations"
  },
  
  "mutation_field_mapping": {
    "gene": "gene",
    "nucleotide_change": "nucleotide_change",
    "amino_acid_change": "amino_acid_change",
    "type": "type",
    "frequency": "frequency",
    "depth": "depth",
    "confidence": "confidence",
    "who_confidence": "who_confidence"
  },
  
  "qc_thresholds": {
    "min_reads": 50000,
    "min_pct_mapped_warning": 90.0,
    "min_pct_mapped_reject": 10.0,
    "min_median_depth_warning": 30,
    "min_median_depth_reject": 10,
    "min_coverage_30x": 90.0,
    "min_target_depth": 30,
    "min_variant_depth": 10
  },
  
  "variant_thresholds": {
    "resistant_min_frequency": 0.75,
    "heteroresistance_min_frequency": 0.25,
    "subthreshold_max_frequency": 0.249
  },
  
  "status_values": {
    "sensitive": "Sensitive",
    "resistant": "Resistant",
    "insufficient_coverage": "Insufficient coverage"
  },
  
  "drug_whonet_mapping": {
    "rifampicin": "RIF",
    "isoniazid": "INH",
    "ethambutol": "EMB",
    "pyrazinamide": "PZA",
    "streptomycin": "STR",
    "fluoroquinolones": "FLQ",
    "amikacin": "AMK",
    "kanamycin": "KAN",
    "capreomycin": "CAP",
    "ethionamide": "ETH",
    "linezolid": "LZD",
    "bedaquiline": "BDQ",
    "clofazimine": "CFZ",
    "delamanid": "DLM"
  }
}
```

### 9.2 CSV Batch Import Configuration

```json
{
  "import_format": "CSV",
  "pipeline_name": "TB-Profiler",
  "field_delimiter": ",",
  "has_header_row": true,
  
  "accession_column": "sample_id",
  "species_column": "species",
  "lineage_column": "main_lineage",
  "sub_lineage_column": "sub_lineage",
  "family_column": "family",
  "drtype_column": "drtype",
  "pipeline_version_column": "pipeline_version",
  "db_version_column": "db_version",
  "analysis_date_column": "analysis_date",
  
  "drug_columns": {
    "rifampicin": "rifampicin",
    "isoniazid": "isoniazid",
    "ethambutol": "ethambutol",
    "pyrazinamide": "pyrazinamide",
    "streptomycin": "streptomycin",
    "fluoroquinolones": "fluoroquinolones",
    "amikacin": "amikacin",
    "kanamycin": "kanamycin",
    "capreomycin": "capreomycin",
    "ethionamide": "ethionamide",
    "linezolid": "linezolid",
    "bedaquiline": "bedaquiline",
    "clofazimine": "clofazimine",
    "delamanid": "delamanid"
  },
  
  "mutation_columns": {
    "rifampicin_mutations": "rifampicin_mutations",
    "isoniazid_mutations": "isoniazid_mutations",
    "ethambutol_mutations": "ethambutol_mutations",
    "pyrazinamide_mutations": "pyrazinamide_mutations",
    "fluoroquinolone_mutations": "fluoroquinolone_mutations",
    "linezolid_mutations": "linezolid_mutations",
    "bedaquiline_mutations": "bedaquiline_mutations",
    "other_mutations": "other_mutations"
  },
  
  "mutation_separator": ";",
  "heteroresistance_tag": "het",
  
  "qc_columns": {
    "num_reads": "num_reads",
    "pct_reads_mapped": "pct_reads_mapped",
    "median_depth": "median_depth",
    "genome_coverage_30x": "genome_coverage_30x"
  },
  
  "drug_status_values": {
    "sensitive": "S",
    "resistant": "R",
    "insufficient_coverage": "IC",
    "empty": ""
  }
}
```

---

## 10. Localization Tags

| Context | Tag | Default (English) |
|---------|-----|-------------------|
| Pan-susceptible | `label.tb.sensitive` | Pan-susceptible *M. tuberculosis* |
| RR-TB | `label.tb.rrTb` | Rifampicin-resistant TB (RR-TB) |
| HR-TB | `label.tb.hrTb` | Isoniazid-resistant TB (HR-TB) |
| MDR-TB | `label.tb.mdrTb` | Multidrug-resistant TB (MDR-TB) |
| Pre-XDR-TB | `label.tb.preXdrTb` | Pre-extensively drug-resistant TB (Pre-XDR-TB) |
| XDR-TB | `label.tb.xdrTb` | Extensively drug-resistant TB (XDR-TB) |
| Insufficient coverage | `label.tb.insufficientCoverage` | Insufficient sequencing coverage |
| Heteroresistance | `label.tb.heteroresistance` | Heteroresistance detected — clinical review recommended |
| NTM detected | `label.tb.ntmDetected` | Non-tuberculosis mycobacterium — TB resistance results not applicable |
| Low mapping rate | `label.tb.lowMappingRate` | Low mapping rate — possible non-MTB species |
| Low depth warning | `label.tb.lowDepth` | Low sequencing depth — some drug targets may be unreliable |
| QC pass | `label.tb.qcPass` | Sequencing QC — Pass |
| QC fail | `label.tb.qcFail` | Sequencing QC — Fail |
| Re-sequence recommended | `label.tb.resequence` | Re-sequencing recommended |
| Mutation detail | `label.tb.mutationDetail` | Resistance mutation |
| WHO confidence high | `label.tb.whoHigh` | WHO Catalogue — High confidence |
| WHO confidence moderate | `label.tb.whoModerate` | WHO Catalogue — Moderate confidence |
| WHO confidence uncertain | `label.tb.whoUncertain` | WHO Catalogue — Uncertain significance |
| Cross-resistance | `label.tb.crossResistance` | Cross-resistance |
| Pipeline version | `label.tb.pipelineVersion` | Analysis pipeline version |
| Database version | `label.tb.dbVersion` | Resistance database version |
| Lineage | `label.tb.lineage` | M. tuberculosis lineage |
| BPaL eligible | `label.tb.bpalEligible` | Eligible for BPaL regimen assessment |
| BPaL ineligible | `label.tb.bpalIneligible` | Not eligible for BPaL — bedaquiline/linezolid resistance |

---

## 11. Test Data File Inventory

| File | Format | Scenario | Key Features |
|------|--------|----------|--------------|
| `tbprofiler_2502190001.json` | JSON | Pan-susceptible | Lineage4/Haarlem, all 14 drugs sensitive, good QC (87x depth), complete target coverage |
| `tbprofiler_2502190002.json` | JSON | MDR-TB | Lineage2/Beijing, RIF(rpoB S450L) + INH(katG S315T) + EMB(embB M306V), FQ sensitive |
| `tbprofiler_2502190003.json` | JSON | Pre-XDR-TB | MDR + FQ(gyrA D94A) + PZA(pncA D131Y), BDQ/LZD sensitive → BPaL eligible |
| `tbprofiler_2502190004.json` | JSON | XDR-TB | MDR + FQ + LZD(rplC C154R) + BDQ(Rv0678 D65fs) + CFZ cross-resistance, dual INH mechanisms |
| `tbprofiler_2502190005_lowqc.json` | JSON | Low quality | Only 8x median depth, many targets IC, rpoB variant at low depth with reduced confidence |
| `tbprofiler_2502190006_mixed.json` | JSON | Heteroresistance | HR-TB with rpoB S450L at 23% (sub-threshold) — emerging MDR or mixed population |
| `tbprofiler_2502190007_ntm.json` | JSON | NTM (not MTB) | 2.91% mapping rate, no lineage, no resistance calls — organism is not M. tuberculosis |
| `tbprofiler_batch_summary_20250219.csv` | CSV | Batch summary | All 7 samples in flat table format with S/R/IC status and mutation shorthand |

### 11.1 Expected Parse Results Summary

| Sample | Species | drtype | RIF | INH | EMB | PZA | FQ | LZD | BDQ | QC | Parser Action |
|--------|---------|--------|-----|-----|-----|-----|-----|-----|-----|-----|--------------|
| 2502190001 | MTB | Sensitive | S | S | S | S | S | S | S | PASS | Accept all results |
| 2502190002 | MTB | MDR-TB | **R** | **R** | **R** | S | S | S | S | PASS | Accept; MDR alert |
| 2502190003 | MTB | Pre-XDR-TB | **R** | **R** | **R** | **R** | **R** | S | S | PASS | Accept; Pre-XDR alert; BPaL eligible |
| 2502190004 | MTB | XDR-TB | **R** | **R** | **R** | **R** | **R** | **R** | **R** | PASS | Accept; XDR alert; BPaL ineligible |
| 2502190005 | MTB | Resistant | **R** | S | IC | IC | S | IC | IC | **WARN** | Accept with warnings; 10 drugs IC |
| 2502190006 | MTB | HR-TB | S(het) | **R** | S | S | S | S | S | PASS | Accept; heteroresistance flag on RIF |
| 2502190007 | NTM | N/A | — | — | — | — | — | — | — | **REJECT** | Reject; not MTB; refer for NTM workup |

---

## 12. Error Handling

| Scenario | Parser Behavior |
|----------|----------------|
| JSON parse failure | Reject file with `label.error.invalidJson` |
| Missing `id` field | Reject — cannot match to accession |
| `id` not found in OpenELIS | Flag as "Unmatched" in import UI |
| Missing `dr_resistances` array | Reject — no results to import |
| Drug name not in WHONET mapping | Accept result; flag unknown drug |
| `species` = NTM or blank | Import QC data only; no resistance results; flag for NTM workup |
| `pct_reads_mapped` < 10% | Auto-reject; flag as non-MTB |
| `median_depth` < 10x | Auto-reject; flag for re-sequencing |
| All drugs = IC | Accept metadata only; flag "insufficient for any result" |
| Duplicate sample ID in batch | Accept most recent (by timestamp); flag duplicate |
| Unknown pipeline version | Accept with warning; log version for review |
| Missing QC fields | Accept results; log QC gap; warn user |
