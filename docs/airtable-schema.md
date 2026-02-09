# Airtable Schema for Interim Lead Agent

Instructions: Create a new Airtable base and add these tables with the specified fields.

---

## Table 1: Seeds

The initial signals that trigger Case File creation.

| Field Name | Field Type | Options/Notes |
|------------|------------|---------------|
| company_name | Single line text | |
| org_number | Single line text | 9-digit Norwegian org number |
| source_type | Single select | Options: `bronnysund`, `dn_rss`, `newsweb`, `mynewsdesk`, `finn`, `proff`, `other` |
| source_url | URL | Link to original source |
| trigger_detected | Single select | Options: `LeadershipChange`, `Restructuring`, `MergersAcquisitions`, `StrategicReview`, `OperationalCrisis`, `RegulatoryLegal`, `CostProgram`, `HiringSignal`, `OwnershipGovernance`, `TransformationProgram` |
| excerpt | Long text | Relevant snippet from source (max 500 chars) |
| collected_at | Date | Include time |
| processed | Checkbox | True when ESL+ has run |
| case_file | Link to another record | Link to CaseFiles table |

---

## Table 2: CaseFiles

Main entity tracking each potential lead through the ESL+ process.

| Field Name | Field Type | Options/Notes |
|------------|------------|---------------|
| company_name | Single line text | |
| org_number | Single line text | |
| trigger_hypothesis | Single select | Same options as Seeds.trigger_detected |
| secondary_triggers | Multiple select | Same options |
| E | Number | Evidence strength, 0.0-1.0, precision 2 |
| W | Number | Why-now score, 0.0-1.0, precision 2 |
| V | Number | Verification, 0 or 1 |
| R | Number | Risk/noise, 0.0-1.0, precision 2 |
| C | Number | Confidence (formula: `(E*0.4)+(W*0.4)+(V*0.2)-(R*0.3)`) |
| stars | Number | 1-5 rating (formula based on C) |
| status | Single select | Options: `pending`, `processing`, `qualified`, `dropped` |
| why_now_text | Long text | Norwegian explanation for client |
| suggested_role | Single select | Options: `CEO`, `CFO`, `COO`, `CTO`, `Other` |
| sources_checked | Multiple select | Options: `bronnysund`, `proff`, `news_search`, `company_website` |
| iteration_count | Number | ESL+ loop iterations |
| is_ostlandet | Checkbox | True if company in Østlandet |
| has_operations | Checkbox | True if operational business |
| created_at | Date | Include time |
| qualified_at | Date | Include time |
| report_date | Date | Which Monday report |
| feedback_grade | Single select | Options: `A` (Correct), `B` (Marginal), `C` (Wrong) |
| why_now_valid | Checkbox | Did the explanation make sense? |
| feedback_notes | Long text | Specific comments from client |
| seeds | Link to another record | Link to Seeds table |
| evidence | Link to another record | Link to Evidence table |

---

## Table 3: Evidence

Individual pieces of evidence collected during ESL+ loop.

| Field Name | Field Type | Options/Notes |
|------------|------------|---------------|
| case_file | Link to another record | Link to CaseFiles |
| source_type | Single select | Same as Seeds.source_type |
| source_url | URL | |
| title | Single line text | |
| excerpt | Long text | |
| keywords_matched | Long text | Comma-separated list |
| delta_E | Number | Score change, precision 2 |
| delta_W | Number | |
| delta_R | Number | |
| is_corroborating | Checkbox | Different source type confirms hypothesis |
| fetched_at | Date | Include time |

---

## Table 4: WeeklyReports

Tracking report delivery.

| Field Name | Field Type | Options/Notes |
|------------|------------|---------------|
| report_date | Date | Monday of the week |
| leads_count | Number | |
| leads | Link to another record | Link to CaseFiles |
| email_sent | Checkbox | |
| email_sent_at | Date | Include time |
| recipient | Email | |
| report_html | Long text | Generated HTML content |
| warnings | Long text | Any issues during generation |

---

## Table 5: SourceConfig

Configuration for each data source (optional, for advanced setup).

| Field Name | Field Type | Options/Notes |
|------------|------------|---------------|
| source_name | Single line text | |
| source_type | Single select | |
| url | URL | RSS or API endpoint |
| firecrawl_schedule_id | Single line text | If using Firecrawl |
| is_active | Checkbox | |
| last_fetched | Date | Include time |
| fetch_frequency | Single select | Options: `hourly`, `daily`, `weekly` |

---

## Formulas

### CaseFiles.C (Confidence)

```
IF(V=0, 0, MAX(0, MIN(1, (E*0.4)+(W*0.4)+(V*0.2)-(R*0.3))))
```

### CaseFiles.stars

```
IF(C >= 0.85, 5,
  IF(C >= 0.70, 4,
    IF(C >= 0.55, 3,
      IF(C >= 0.40, 2,
        IF(C >= 0.25, 1, 0)))))
```

---

## Views to Create

### CaseFiles Views

1. **Kanban by Status** - Group by status column
2. **Qualified Leads** - Filter: status = "qualified", Sort: stars DESC
3. **This Week's Report** - Filter: report_date = THIS_WEEK()
4. **Processing Queue** - Filter: status = "processing"

### Seeds Views

1. **Unprocessed** - Filter: processed = false
2. **By Source** - Group by source_type

---

## Airtable API Base ID

After creating the base, get the Base ID from:
1. Go to https://airtable.com/create/tokens
2. Create a new token with access to this base
3. Copy the Base ID (starts with "app")
