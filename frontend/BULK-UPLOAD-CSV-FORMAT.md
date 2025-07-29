# Bulk Member Upload CSV Format Guide

## Overview
The bulk upload feature allows you to import multiple members at once using a CSV file. This guide explains the required format and provides examples.

## Required CSV Columns

### Personal Information (Required)
- **firstName** - Member's first name (required)
- **lastName** - Member's last name (required)
- **dateOfBirth** - Date of birth in YYYY-MM-DD format (required)
- **zipCode** - 5-digit ZIP code (required)
- **tobacco** - Tobacco use status: `true` or `false` (defaults to false if empty)

### Previous Coverage Information
- **employerContribution** - Previous employer monthly contribution amount (number)
- **memberContribution** - Previous member monthly contribution amount (number)
- **planName** - Name of previous health plan (defaults to "Unknown" if empty)
- **planType** - Type of previous plan: PPO, HMO, EPO, POS, or Other
- **metalLevel** - Metal tier: Bronze, Silver, Gold, Platinum, or Other
- **carrier** - Insurance carrier name (optional)

### Class Assignment
- **classId** - MongoDB ID of the ICHRA class (optional - uses default class if not specified)

### Dependents (Optional)
- **dependents** - JSON array of dependent information (see format below)

## Dependent Format
Dependents must be provided as a JSON array string in the CSV. Each dependent should have:
- `relationship`: "spouse", "child", or "other"
- `firstName`: Dependent's first name
- `lastName`: Dependent's last name
- `dateOfBirth`: Date in YYYY-MM-DD format
- `tobacco`: true or false

### Example Dependent Format
```json
[
  {
    "relationship": "spouse",
    "firstName": "Jane",
    "lastName": "Doe",
    "dateOfBirth": "1987-05-15",
    "tobacco": false
  },
  {
    "relationship": "child",
    "firstName": "Jimmy",
    "lastName": "Doe",
    "dateOfBirth": "2020-03-10",
    "tobacco": false
  }
]
```

## CSV Examples

### Example 1: Single Member (No Dependents)
```csv
firstName,lastName,dateOfBirth,zipCode,tobacco,employerContribution,memberContribution,planName,planType,metalLevel,carrier,classId,dependents
John,Doe,1985-03-15,97204,false,500,150,Blue Cross PPO,PPO,Gold,Blue Cross Blue Shield,,
```

### Example 2: Member with Dependents
```csv
firstName,lastName,dateOfBirth,zipCode,tobacco,employerContribution,memberContribution,planName,planType,metalLevel,carrier,classId,dependents
Jane,Smith,1990-07-22,97204,false,450,200,Kaiser HMO Plan,HMO,Silver,Kaiser Permanente,,"[{""relationship"":""spouse"",""firstName"":""Mike"",""lastName"":""Smith"",""dateOfBirth"":""1988-11-30"",""tobacco"":false}]"
```

## Important Notes

1. **Date Format**: All dates must be in YYYY-MM-DD format
2. **ZIP Codes**: Must be valid 5-digit US ZIP codes
3. **Numbers**: Don't include currency symbols ($) or commas in contribution amounts
4. **Boolean Values**: Use `true` or `false` (lowercase) for tobacco status
5. **JSON Escaping**: In the dependents column, use double quotes (`""`) to escape quotes within the JSON
6. **Empty Values**: Leave fields blank if not applicable (they'll use defaults)
7. **Class Assignment**: If no classId is provided, you can set a default class during upload

## File Requirements
- File must be in CSV format (.csv extension)
- Maximum file size: 10MB
- UTF-8 encoding recommended
- First row must contain column headers

## Error Handling
The system will validate each row and provide detailed error messages for:
- Missing required fields
- Invalid date formats
- Invalid ZIP codes
- Malformed JSON in dependents column
- Invalid class IDs

After upload, you'll receive a detailed report showing:
- Successfully imported members
- Failed imports with specific error messages
- Row numbers for easy troubleshooting

## Sample File
A complete sample CSV file is available at: `sample-members-upload.csv`