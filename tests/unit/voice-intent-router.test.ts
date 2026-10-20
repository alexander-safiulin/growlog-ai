import { describe, expect, it } from 'vitest';
import { routeAdvisorTranscript } from '@/lib/assistant/voice-intent-router';

describe('routeAdvisorTranscript', () => {
  it('routes procedure questions to ask', () => {
    expect(routeAdvisorTranscript('What should I do about high VPD?')).toBe('ask');
    expect(routeAdvisorTranscript('Как действовать при высоком VPD?')).toBe('ask');
  });

  it('routes log-like phrases to extract', () => {
    expect(routeAdvisorTranscript('Полил сегодня в 18:00')).toBe('log_extract');
    expect(routeAdvisorTranscript('pH=5.8 in room A')).toBe('log_extract');
  });

  it('defaults conversational text to ask', () => {
    expect(routeAdvisorTranscript('Hello team')).toBe('ask');
  });
});
