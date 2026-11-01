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
};

export function sopImportErrorI18nKey(code: string): string {
  return CODE_TO_KEY[code] ?? 'sop.importErrors.generic';
}
