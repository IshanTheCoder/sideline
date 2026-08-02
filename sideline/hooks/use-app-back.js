/**
 * useAppBack — the header back arrow.
 *
 * Returns a handler that sends the user to the page they were on before this
 * one, per the trail in `lib/navHistory`. Deliberately does *not* use
 * `router.back()`: that pops the focused navigator, which is not always the
 * page the user came from. `replace` keeps the trail and the router in step —
 * going back never leaves a forward entry pointing at the page we just left.
 *
 * @param {string} fallback where to go when there is no trail (a deep link,
 *   a fresh reload) — Home for app screens, Welcome for the auth screens.
 */
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { previousPath } from '@/lib/navHistory';

export function useAppBack(fallback = '/app') {
  const router = useRouter();

  return useCallback(() => {
    router.replace(previousPath() ?? fallback);
  }, [router, fallback]);
}
