'use client';

type SopImportReviewSummaryProps = {
  selectedLine: string;
  droppedLine: string | null;
};

export function SopImportReviewSummary({ selectedLine, droppedLine }: SopImportReviewSummaryProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-border/70 bg-muted/25 px-3 py-2 text-sm">
      <span className="font-medium">{selectedLine}</span>
      {droppedLine ? <span className="text-amber-800 dark:text-amber-300">{droppedLine}</span> : null}
    </div>
  );
}
