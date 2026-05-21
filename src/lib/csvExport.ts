/**
 * CSV Export Utility for Lead Data
 */

interface LeadExportData {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  status: string;
  exclusivity?: string | null;
  qualified?: boolean | null;
  urgency?: string | null;
  primary_substance?: string[] | null;
  insurance_type?: string | null;
  insurance_provider?: string | null;
  level_of_care?: string | null;
  location_city_state?: string | null;
  location_zip?: string | null;
  who_seeking_help?: string | null;
  message?: string | null;
  facility_name?: string;
  // Fields that the source data carries but the original CSV didn't
  // export — added for admin ops use cases (cohort export, quality
  // analysis, response-time audits).
  inquiry_type?: string | null;
  preferred_contact?: string | null;
  quality_flag?: string | null;
  provider_response_status?: string | null;
  provider_responded_at?: string | null;
  age_range?: string | null;
  gender?: string | null;
}

/**
 * Escape a value for CSV format
 */
function escapeCSVValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // If contains comma, newline, or quote, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Format date for export
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format status for display
 */
function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Export leads to CSV format
 */
export function exportLeadsToCSV(leads: LeadExportData[], filename?: string): void {
  // Define columns
  const columns = [
    { key: 'created_at', header: 'Date' },
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status' },
    { key: 'exclusivity', header: 'Exclusivity' },
    { key: 'qualified', header: 'Qualified' },
    { key: 'urgency', header: 'Urgency' },
    { key: 'who_seeking_help', header: 'Seeking Help For' },
    { key: 'primary_substance', header: 'Primary Substance' },
    { key: 'level_of_care', header: 'Level of Care' },
    { key: 'insurance_type', header: 'Insurance Type' },
    { key: 'insurance_provider', header: 'Insurance Provider' },
    { key: 'location_city_state', header: 'Location' },
    { key: 'location_zip', header: 'ZIP Code' },
    { key: 'age_range', header: 'Age Range' },
    { key: 'gender', header: 'Gender' },
    { key: 'inquiry_type', header: 'Inquiry Type' },
    { key: 'preferred_contact', header: 'Preferred Contact' },
    { key: 'facility_name', header: 'Facility' },
    { key: 'quality_flag', header: 'Quality Flag' },
    { key: 'provider_response_status', header: 'Provider Response' },
    { key: 'provider_responded_at', header: 'Responded At' },
    { key: 'message', header: 'Message' },
  ];

  // Build header row
  const headerRow = columns.map(col => col.header).join(',');

  // Build data rows
  const dataRows = leads.map(lead => {
    return columns.map(col => {
      const key = col.key as keyof LeadExportData;
      let value = lead[key];

      // Format specific fields
      if (key === 'created_at' || key === 'provider_responded_at') {
        value = value ? formatDate(value as string) : '';
      } else if (key === 'status' || key === 'inquiry_type' || key === 'preferred_contact' ||
                 key === 'quality_flag' ||
                 key === 'provider_response_status') {
        // Title-case + replace underscores for any enum-shaped string field
        value = value ? formatStatus(value as string) : '';
      } else if (key === 'qualified') {
        value = value === true ? 'Yes' : value === false ? 'No' : '';
      } else if (key === 'primary_substance' && Array.isArray(value)) {
        value = value.join('; ');
      } else if (key === 'exclusivity') {
        value = value ? String(value).charAt(0).toUpperCase() + String(value).slice(1) : '';
      }

      return escapeCSVValue(value as string);
    }).join(',');
  });

  // Combine into CSV content
  const csvContent = [headerRow, ...dataRows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const exportFilename = filename || `leads-export-${date}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', exportFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get count of leads that will be exported
 */
export function getExportableLeadsCount(leads: LeadExportData[]): number {
  return leads.length;
}
