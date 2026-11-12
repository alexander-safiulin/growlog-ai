export type TimelineOpenIntent = {
  eventId: string;
  mediaAssetId?: string;
  pollLeaf?: boolean;
};

let pending: TimelineOpenIntent | null = null;

export function setTimelineOpenIntent(intent: TimelineOpenIntent): void {
  pending = intent;
}

export function consumeTimelineOpenIntent(): TimelineOpenIntent | null {
  const next = pending;
  pending = null;
  return next;
}
