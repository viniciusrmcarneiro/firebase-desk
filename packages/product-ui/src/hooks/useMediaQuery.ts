import { useEffect, useState } from 'react';

export function useMediaQuery(query: string, defaultMatches = true): boolean {
  const [matches, setMatches] = useState(() => getMediaQueryMatch(query, defaultMatches));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

function getMediaQueryMatch(query: string, defaultMatches: boolean): boolean {
  return typeof window === 'undefined' ? defaultMatches : window.matchMedia(query).matches;
}
