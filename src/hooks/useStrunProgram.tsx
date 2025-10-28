import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Location } from '@/types/strun-program';

export const useStrunProgram = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createTask = async (
    title: string,
    location: Location,
    rewardSol: number,
    rewardXp: number,
    rentUsdc?: number
  ) => {
    if (!user) {
      toast.error('Please login first');
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('solana-create-task', {
        body: {
          title,
          location,
          rewardSol,
          rewardXp,
          rentUsdc,
        },
      });

      if (error) throw error;

      toast.success('Task created on Solana!');
      return data;
    } catch (error) {
      console.error('Create task error:', error);
      toast.error('Failed to create task');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const acceptTask = async (taskPubkey: string, ownerTokenAccount: string) => {
    if (!user) {
      toast.error('Please login first');
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('solana-accept-task', {
        body: { taskPubkey, ownerTokenAccount },
      });

      if (error) throw error;

      toast.success('Task accepted on Solana!');
      return data;
    } catch (error) {
      console.error('Accept task error:', error);
      toast.error('Failed to accept task');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskPubkey: string) => {
    if (!user) {
      toast.error('Please login first');
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('solana-complete-task', {
        body: { taskPubkey },
      });

      if (error) throw error;

      toast.success('Task completed! Rewards claimed from Solana.');
      return data;
    } catch (error) {
      console.error('Complete task error:', error);
      toast.error('Failed to complete task');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const mintLand = async (coordinates: Location) => {
    if (!user) {
      toast.error('Please login first');
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('solana-mint-land', {
        body: { coordinates },
      });

      if (error) throw error;

      toast.success('Land NFT minted on Solana!');
      return data;
    } catch (error) {
      console.error('Mint land error:', error);
      toast.error('Failed to mint land');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const setLandRent = async (landPubkey: string, rentUsdc: number) => {
    if (!user) {
      toast.error('Please login first');
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('solana-set-land-rent', {
        body: { landPubkey, rentUsdc },
      });

      if (error) throw error;

      toast.success('Land rent updated on Solana!');
      return data;
    } catch (error) {
      console.error('Set land rent error:', error);
      toast.error('Failed to set rent');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const recordRun = async (
    routeHash: number[],
    distance: number,
    duration: number
  ) => {
    if (!user) {
      toast.error('Please login first');
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('solana-record-run', {
        body: { routeHash, distance, duration },
      });

      if (error) throw error;

      toast.success('Run recorded on Solana blockchain!');
      return data;
    } catch (error) {
      console.error('Record run error:', error);
      toast.error('Failed to record run');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createTask,
    acceptTask,
    completeTask,
    mintLand,
    setLandRent,
    recordRun,
  };
};
