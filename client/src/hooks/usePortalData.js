import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useSocketSync } from './useSocketSync';

function mapProgressList(progressList) {
  return progressList.reduce((acc, entry) => {
    acc[entry.dayNumber] = entry;
    return acc;
  }, {});
}

export function usePortalData({ isAdmin = false } = {}) {
  const [content, setContent] = useState(null);
  const [progressMap, setProgressMap] = useState({});
  const [summary, setSummary] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState(null);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const requests = [
        apiClient.get('/content'),
        apiClient.get('/progress/me'),
        apiClient.get('/summary/me'),
      ];

      if (isAdmin) {
        requests.push(apiClient.get('/admin/overview'));
      }

      const [contentResponse, progressResponse, summaryResponse, adminResponse] = await Promise.all(requests);
      setContent(contentResponse.data);
      setProgressMap(mapProgressList(progressResponse.data));
      setSummary(summaryResponse.data);
      if (adminResponse) {
        setAdminOverview(adminResponse.data);
      }
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load portal data.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const saveProgress = useCallback(async (dayNumber, payload) => {
    setSavingDay(dayNumber);
    setError('');
    try {
      const { data } = await apiClient.put(`/progress/${dayNumber}`, payload);
      setProgressMap((current) => ({ ...current, [dayNumber]: data }));
      const summaryResponse = await apiClient.get('/summary/me');
      setSummary(summaryResponse.data);
      if (isAdmin) {
        const adminResponse = await apiClient.get('/admin/overview');
        setAdminOverview(adminResponse.data);
      }
      return { ok: true };
    } catch (saveError) {
      const message = saveError?.response?.data?.message || saveError.message || 'Failed to save progress.';
      setError(message);
      return { ok: false, message };
    } finally {
      setSavingDay(null);
    }
  }, [isAdmin]);

  const loadUserDetail = useCallback(async (userId) => {
    if (!isAdmin || !userId) return null;
    const { data } = await apiClient.get(`/admin/users/${userId}/progress`);
    setSelectedUserDetail(data);
    return data;
  }, [isAdmin]);

  useSocketSync(Boolean(content), {
    'progress:updated': () => {
      void loadDashboard();
      if (selectedUserDetail?.user?.id) {
        void loadUserDetail(selectedUserDetail.user.id);
      }
    },
    'users:updated': () => {
      if (isAdmin) {
        void loadDashboard();
      }
    },
  });

  const totalCompleted = useMemo(() => summary?.statusCounts?.complete || 0, [summary]);

  return {
    content,
    progressMap,
    summary,
    adminOverview,
    selectedUserDetail,
    loading,
    error,
    savingDay,
    totalCompleted,
    reload: loadDashboard,
    saveProgress,
    loadUserDetail,
    setSelectedUserDetail,
  };
}
