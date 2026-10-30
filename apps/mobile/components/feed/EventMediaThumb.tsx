import { AspectPhoto } from '@/components/media/AspectPhoto';
import { useFarmContext } from '@/providers/FarmProvider';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

const FEED_MAX_HEIGHT = 520;

export function EventMediaThumb({
  storagePath,
  maxHeight = FEED_MAX_HEIGHT,
}: {
  storagePath: string;
  /** Omit to show the whole frame. The feed caps height so one photo does not fill the screen. */
  maxHeight?: number | null;
}) {
  const { supabase, isLocalWorkspace, userId } = useFarmContext();
  const [uri, setUri] = useState<string | null>(null);
  const canLoad = !isLocalWorkspace && !!userId;

  useEffect(() => {
    if (!canLoad) return;
    let cancelled = false;
    void supabase.storage
      .from('media')
      .createSignedUrl(storagePath, 3600)
      .then(({ data, error }) => {
        if (cancelled || error || !data?.signedUrl) return;
        setUri(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath, supabase, canLoad]);

  if (!canLoad || !uri) return null;

  return (
    <View style={{ marginTop: 8 }}>
      <AspectPhoto uri={uri} maxHeight={maxHeight ?? undefined} />
    </View>
  );
}
