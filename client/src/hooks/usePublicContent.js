import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export function usePublicContent() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/content');
      setContent(data);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load brochure content.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { content, loading, error, reload: load };
}
