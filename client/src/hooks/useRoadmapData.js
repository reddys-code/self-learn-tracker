import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';

function toProgressMap(list) {
  return list.reduce((acc, item) => {
    acc[item.dayNumber] = item;
    return acc;
  }, {});
}

export function useRoadmapData() {
  const [content, setContent] = useState(null);
  const [progressMap, setProgressMap] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [contentResponse, progressResponse, summaryResponse] = await Promise.all([
        apiClient.get('/content'),
        apiClient.get('/progress'),
        apiClient.get('/summary'),
      ]);

      setContent(contentResponse.data);
      setProgressMap(toProgressMap(progressResponse.data));
      setSummary(summaryResponse.data);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load roadmap data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const saveProgress = useCallback(async (dayNumber, payload) => {
    setSavingDay(dayNumber);
    setError('');
    try {
      const { data } = await apiClient.put(`/progress/${dayNumber}`, payload);
      setProgressMap((current) => ({
        ...current,
        [dayNumber]: data,
      }));
      const summaryResponse = await apiClient.get('/summary');
      setSummary(summaryResponse.data);
      return { ok: true };
    } catch (saveError) {
      const message = saveError?.response?.data?.message || saveError.message || 'Failed to save progress.';
      setError(message);
      return { ok: false, message };
    } finally {
      setSavingDay(null);
    }
  }, []);

  const totalCompleted = useMemo(() => summary?.statusCounts?.complete || 0, [summary]);

  return {
    content,
    progressMap,
    summary,
    loading,
    error,
    savingDay,
    totalCompleted,
    reload: loadData,
    saveProgress,
  };
}
