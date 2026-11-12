import type { EventType } from '@growlog/domain';

export type JournalVoiceSaveResult = {
  body: string;
  occurredAt: string;
  createdAt: string;
  eventType: EventType;
  eventId?: string;
  recordingDurationSec?: number;
};
