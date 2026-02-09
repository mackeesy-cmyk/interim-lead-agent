# Manual Airtable Configuration Required

To ensure the Interim Lead Agent works correctly with the new compliance updates, please perform the following changes in your Airtable Base.

## 1. Table: `Seeds`

### Modify Field: `source_type` (Single Select)
Add the following options to the list:
- `brreg_status_update`
- `brreg_role_change`
- `brreg_kunngjoringer`
- `finn`
- `linkedin_exec_move`
- `linkedin_company_signal`

### Add New Fields
- **Name**: `linkedin_type`
  - **Type**: Single Select
  - **Options**: `EXEC_MOVE`, `COMPANY_SIGNAL`
  
- **Name**: `linkedin_status`
  - **Type**: Single Select
  - **Options**: `queued`, `consumed`, `rejected`

## 2. Table: `CaseFiles`

### Modify Field: `feedback_grade` (Single Select)
Update/Add the following options (Addendum §5):
- `Relevant`
- `Delvis`
- `Ikke` (or `Ikke relevant`)

> **Note**: If you have existing records with A/B/C, the code does not automatically migrate them. The new system expects the values above.

### Add New Fields
- **Name**: `source_type`
  - **Type**: Single Line Text (or Single Select matching Seeds if preferred)
  - **Description**: Stores the source type of the seed that generated this lead. Required for rule-based feedback adjustments.

## 3. General verification
Ensure your Base ID and API Key in `.env.local` are correct and have permissions to create/edit records in these tables.
