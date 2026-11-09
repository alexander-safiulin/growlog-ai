import { describe, expect, it } from 'vitest';
import { classifyQueryIntent } from '@/lib/growlog/retrieval/classify-intent';

describe('classifyQueryIntent', () => {
  it('detects causal intent in Russian', () => {
    const r = classifyQueryIntent('Почему листья поникли?');
    expect(r.intentType).toBe('causal');
    expect(r.requiresHistoricalContext).toBe(true);
    expect(r.requiresKnowledgeContext).toBe(true);
  });

  it('detects causal intent in English', () => {
    expect(classifyQueryIntent('Why are leaves drooping?').intentType).toBe('causal');
  });

  it('detects daily focus in Russian', () => {
    expect(classifyQueryIntent('Что важно сегодня на ферме?').intentType).toBe('daily_focus');
  });

  it('detects action in Russian', () => {
    expect(classifyQueryIntent('Что делать с pH?').intentType).toBe('action');
  });

  it('detects planning in Russian', () => {
    expect(classifyQueryIntent('Что будет если подкормить завтра?').intentType).toBe('planning');
  });

  it('detects report in Russian', () => {
    expect(classifyQueryIntent('Сводка за неделю').intentType).toBe('report');
  });

  it('detects SOP dialog', () => {
    expect(classifyQueryIntent('Открой протокол полива').intentType).toBe('sop_execution_dialog');
  });

  it('detects exploration', () => {
    expect(classifyQueryIntent('Покажи все заметки').intentType).toBe('exploration');
  });

  it('defaults to status when no keyword', () => {
    expect(classifyQueryIntent('температура в комнате').intentType).toBe('status');
  });

  it('marks high diagnostic risk', () => {
    const r = classifyQueryIntent('Похоже на дефицит азота');
    expect(r.diagnosticRiskLevel).toBe('high');
    expect(r.requiresPhotoContext).toBe(true);
  });

  it('returns unknown for empty query', () => {
    expect(classifyQueryIntent('   ').intentType).toBe('unknown');
  });
});
