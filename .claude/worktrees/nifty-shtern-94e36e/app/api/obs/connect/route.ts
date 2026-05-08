import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import WebSocket from 'ws';

// OBS WebSocket connection handler
export async function POST(request: NextRequest) {
  try {
    const { obsHost = 'localhost', obsPort = 4456, obsPassword } = await request.json();

    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Store OBS connection details for user
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        obs_host: obsHost,
        obs_port: obsPort,
        obs_password: obsPassword, // In production, encrypt this
        obs_connected: false,
        obs_last_connected: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Failed to store OBS settings:', updateError);
      return NextResponse.json({ error: 'Failed to save OBS settings' }, { status: 500 });
    }

    // Test OBS connection
    const obsConnected = await testObsConnection(obsHost, obsPort, obsPassword);

    if (obsConnected) {
      // Update connection status
      await supabase
        .from('profiles')
        .update({ obs_connected: true })
        .eq('id', session.user.id);

      return NextResponse.json({
        success: true,
        connected: true,
        message: 'Successfully connected to OBS'
      });
    } else {
      return NextResponse.json({
        success: false,
        connected: false,
        message: 'Failed to connect to OBS. Please check your settings.'
      });
    }

  } catch (error) {
    console.error('OBS connection error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to OBS' },
      { status: 500 }
    );
  }
}

async function testObsConnection(host: string, port: number, password: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(`ws://${host}:${port}`);

      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);

      ws.on('open', () => {
        // Send authentication if password is provided
        if (password) {
          ws.send(JSON.stringify({
            'request-type': 'Authenticate',
            'auth': password
          }));
        } else {
          // Test without authentication
          ws.send(JSON.stringify({
            'request-type': 'GetVersion'
          }));
        }
      });

      ws.on('message', (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.status === 'ok') {
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          }
        } catch (e) {
          console.error('Failed to parse OBS response:', e);
        }
      });

      ws.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });

    } catch (error) {
      resolve(false);
    }
  });
}

// GET endpoint to check OBS connection status
export async function GET(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('obs_connected, obs_host, obs_port, obs_last_connected')
      .eq('id', session.user.id)
      .single();

    return NextResponse.json({
      connected: profile?.obs_connected || false,
      host: profile?.obs_host,
      port: profile?.obs_port,
      lastConnected: profile?.obs_last_connected
    });

  } catch (error) {
    console.error('OBS status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check OBS status' },
      { status: 500 }
    );
  }
}
