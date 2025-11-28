import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

export const useLiveStreamStatus = () => {
  const [isLive, setIsLive] = useState(false);
  const [liveData, setLiveData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLiveStream = async () => {
      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select('*')
          .eq('is_live', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching live stream:', error);
          setIsLive(false);
        } else if (data) {
          setLiveData(data);
          setIsLive(true);
        } else {
          setIsLive(false);
        }
      } catch (error) {
        console.error('Error:', error);
        setIsLive(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveStream();

    // Optional: Subscribe to changes
    const channel = supabase
      .channel('public:live_streams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => {
        fetchLiveStream();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { isLive, liveData, isLoading };
};
