import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Set up real-time subscriptions
  let usersChannel: any = null;
  let auditLogsChannel: any = null;

  const setupSubscriptions = () => {
    // Subscribe to users table changes
    usersChannel = supabase
      .channel('dashboard-users-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          console.log('Users table changed:', payload);
          // Send notification to client
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'users_changed',
              data: payload
            }));
          }
        }
      )
      .subscribe();

    // Subscribe to audit_logs table changes
    auditLogsChannel = supabase
      .channel('dashboard-audit-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen to new audit logs
          schema: 'public',
          table: 'audit_logs'
        },
        (payload) => {
          console.log('New audit log:', payload);
          // Send notification to client
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'audit_log_created',
              data: payload
            }));
          }
        }
      )
      .subscribe();
  };

  socket.onopen = () => {
    console.log('WebSocket connection opened');
    setupSubscriptions();
    // Send initial connection confirmation
    socket.send(JSON.stringify({
      type: 'connection_established',
      message: 'Dashboard realtime connection established'
    }));
  };

  socket.onmessage = (event) => {
    console.log('Received message:', event.data);
    try {
      const message = JSON.parse(event.data);
      
      // Handle different message types from client
      switch (message.type) {
        case 'ping':
          socket.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'request_stats':
          // Client requesting fresh stats - trigger reload
          socket.send(JSON.stringify({
            type: 'stats_reload_requested'
          }));
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
    // Clean up subscriptions
    if (usersChannel) {
      supabase.removeChannel(usersChannel);
    }
    if (auditLogsChannel) {
      supabase.removeChannel(auditLogsChannel);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return response;
});