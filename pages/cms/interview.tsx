'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { INTERVIEW_QUESTIONS, type InterviewStage } from '@/lib/growlog/interview-scripts';
import { useMemo, useState } from 'react';

const STAGES = Object.keys(INTERVIEW_QUESTIONS) as InterviewStage[];

export default function InterviewPage() {
  const { t } = useTranslation();
  const { farmId, supabase } = useFarmContext();
  const [stage, setStage] = useState<InterviewStage>('veg');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [covered, setCovered] = useState<string[]>([]);

  const questions = useMemo(() => INTERVIEW_QUESTIONS[stage], [stage]);

  async function saveSession() {
    if (!farmId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const answersJson = questions.map((q, i) => ({
      question: q,
      answer: answers[`${stage}-${i}`]?.trim() ?? '',
    }));
    const res = await fetch('/api/cms/interview/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ farmId, stage, answers: answersJson }),
    });
    const data = await res.json();
    if (!res.ok) return;
    setSavedId(data.session?.id ?? null);
    setCovered(Array.isArray(data.coveredStages) ? data.coveredStages : []);
  }

  return (
    <AppShell title={t('cms.interview')}>
      <div className="max-w-2xl space-y-4">
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <Button
              key={s}
              type="button"
              variant={s === stage ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStage(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{stage}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.map((q, i) => (
              <div key={q}>
                <label className="text-sm font-medium">{q}</label>
                <textarea
                  className="mt-1 w-full min-h-[72px] border rounded p-2 text-sm"
                  value={answers[`${stage}-${i}`] ?? ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [`${stage}-${i}`]: e.target.value }))
                  }
                />
              </div>
            ))}
            <Button type="button" onClick={() => void saveSession()}>
              Save interview session
            </Button>
            {savedId ? <p className="text-xs text-muted-foreground">Session {savedId}</p> : null}
            {covered.length > 0 ? (
              <p className="text-xs text-muted-foreground">Covered stages: {covered.join(', ')}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Voice: record on Log → Voice, paste the transcript into the answer. Saving creates
              Playbook drafts. A manager approves them before they become canonical.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
