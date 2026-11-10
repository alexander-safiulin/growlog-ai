/** Maps API error codes to i18n keys under `sop.importErrors.*`. */
const CODE_TO_KEY: Record<string, string> = {
  missing_content: 'sop.importErrors.missingContent',
  text_too_short: 'sop.importErrors.textTooShort',
  source_text_too_short: 'sop.importErrors.textTooShort',
  no_extractable_text: 'sop.importErrors.noExtractableText',
  invalid_file_encoding: 'sop.importErrors.invalidFile',
  openai_not_configured: 'sop.importErrors.openaiNotConfigured',
  empty_model_response: 'sop.importErrors.modelFailed',
  invalid_classifier_json: 'sop.importErrors.modelFailed',
  preview_failed: 'sop.importErrors.previewFailed',
  commit_failed: 'sop.importErrors.commitFailed',
  no_drafts: 'sop.importErrors.noDrafts',
  farm_not_found: 'sop.importErrors.farmNotFound',
  cycle_not_found: 'sop.importErrors.cycleNotFound',
  invalid_scope: 'sop.importErrors.invalidScope',
  cycle_scope_mismatch: 'sop.importErrors.cycleScopeMismatch',
  unauthorized: 'sop.importErrors.unauthorized',
  read_failed: 'sop.importErrors.fileReadFailed',
  duplicate_document: 'sop.importErrors.duplicateDocument',
  duplicate_check_failed: 'sop.importErrors.duplicateCheckFailed',
  missing_applies_to_scope: 'sop.importErrors.missingAppliesToScope',
};

const EXTRA_SOP_IMPORT_ERROR_CODES = [
  'validation_error',
  'invalid_trigger_type',
  'invalid_local_time',
  'invalid_interval_days',
  'missing_dates',
  'missing_stages',
  'invalid_offset_days',
  'invalid_window_end',
  'trigger_config_must_be_object',
  'unsupported_trigger_type',
  'source_text_too_short',
  'commit_failed',
  'preview_failed',
] as const;

export function matchSopImportErrorCode(message: string): string | null {
  const text = message.trim();
  const codes = [...Object.keys(CODE_TO_KEY), ...EXTRA_SOP_IMPORT_ERROR_CODES];
  for (const code of codes) {
    if (text === code) return code;
    const idx = text.lastIndexOf(code);
    if (idx > 0 && idx + code.length === text.length && !/[A-Za-z0-9_]/.test(text[idx - 1] ?? '')) {
      return code;
    }
  }
  return null;
}

export function sopImportErrorI18nKey(code: string): string {
  return CODE_TO_KEY[code] ?? 'sop.importErrors.generic';
}
