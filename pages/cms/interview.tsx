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

  const questions = useMemo(() => INTERVIEW_QUESTIONS[stage], [stage]);

  async function saveSession() {
    if (!farmId) return;
    const answersJson = questions.map((q, i) => ({
      question: q,
      answer: answers[`${stage}-${i}`]?.trim() ?? '',
    }));
    const { data, error } = await supabase
      .from('interview_sessions')
      .insert({
        farm_id: farmId,
        stage,
        status: 'in_progress',
        answers_json: answersJson,
      })
      .select('id')
      .single();
    if (error) return;
    setSavedId(data!.id as string);
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
            <p className="text-xs text-muted-foreground">
              Voice capture: use Log → Voice on mobile; convert answers to SOP drafts via Master
              Grower review (approve in Playbook).
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
