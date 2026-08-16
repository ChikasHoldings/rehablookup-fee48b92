/**
 * Centralized contact info — single source of truth for the
 * RehabLookup support phone number across the public app.
 * Named CONCIERGE_* for historical reasons; renaming the exports is Stage-2
 * cleanup since the free-tier inquiry backend still surfaces this line.
 *
 * Use these constants instead of re-hardcoding the number; formatting
 * changes (vanity number, area-code rotation, dial-code formatting)
 * only need to happen once here.
 *
 * Tel-link convention: include `+1` country code so iOS / Android
 * dialers route the call without a follow-up confirmation prompt.
 */
export const CONCIERGE_PHONE_DISPLAY = "214-639-6420";
export const CONCIERGE_PHONE_TEL = "+12146396420";
