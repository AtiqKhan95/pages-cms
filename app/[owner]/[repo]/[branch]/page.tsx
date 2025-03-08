'use client';

import { useEffect } from 'react';
import { useRepo } from '@/contexts/repo-context';
import { useConfig } from '@/contexts/config-context';

export default function BranchPage() {
  const { syncBranch } = useRepo();
  const { config } = useConfig();

  useEffect(() => {
    if (config?.branch) {
      // Initial sync when page loads
      syncBranch(config.branch);

      // Set up polling every 30 seconds
      const pollInterval = setInterval(() => {
        syncBranch(config.branch);
      }, 30000);

      return () => clearInterval(pollInterval);
    }
  }, [config?.branch, syncBranch]);

  return null; // This is a container component, no UI needed
} 