import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    const targetUrl = url || 'https://staging-api.feelori.com/api/v1/conversations/?business_id=feelori';
    
    console.log(`[test-backend] Testing URL: ${targetUrl}`);
    
    const results: {
      targetUrl: string;
      steps: Array<{
        step: string;
        url: string;
        status?: number;
        statusText?: string;
        headers?: Record<string, string>;
        error?: string;
        redirected?: boolean;
        finalUrl?: string;
      }>;
      conclusion: string;
    } = {
      targetUrl,
      steps: [],
      conclusion: ''
    };

    // Step 1: Test with redirect: manual to detect redirects
    try {
      console.log('[test-backend] Step 1: Testing with redirect: manual');
      const manualResponse = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const responseHeaders: Record<string, string> = {};
      manualResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      results.steps.push({
        step: 'Manual redirect test',
        url: targetUrl,
        status: manualResponse.status,
        statusText: manualResponse.statusText,
        headers: responseHeaders,
        redirected: manualResponse.status >= 300 && manualResponse.status < 400,
      });
      
      console.log(`[test-backend] Manual test status: ${manualResponse.status}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      results.steps.push({
        step: 'Manual redirect test',
        url: targetUrl,
        error: errorMessage,
      });
      console.error('[test-backend] Manual test error:', errorMessage);
    }

    // Step 2: Normal fetch to see final result
    try {
      console.log('[test-backend] Step 2: Normal fetch');
      const normalResponse = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const responseHeaders: Record<string, string> = {};
      normalResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      results.steps.push({
        step: 'Normal fetch',
        url: targetUrl,
        status: normalResponse.status,
        statusText: normalResponse.statusText,
        headers: responseHeaders,
        redirected: normalResponse.redirected,
        finalUrl: normalResponse.url,
      });
      
      console.log(`[test-backend] Normal fetch status: ${normalResponse.status}, redirected: ${normalResponse.redirected}, finalUrl: ${normalResponse.url}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      results.steps.push({
        step: 'Normal fetch',
        url: targetUrl,
        error: errorMessage,
      });
      console.error('[test-backend] Normal fetch error:', errorMessage);
    }

    // Step 3: Check if final URL differs from target (detect HTTP redirect)
    const normalStep = results.steps.find(s => s.step === 'Normal fetch');
    const manualStep = results.steps.find(s => s.step === 'Manual redirect test');
    
    if (manualStep?.status && manualStep.status >= 300 && manualStep.status < 400) {
      const location = manualStep.headers?.['location'] || manualStep.headers?.['Location'];
      if (location?.startsWith('http://')) {
        results.conclusion = `BACKEND ISSUE: Server redirects HTTPS to HTTP (Location: ${location})`;
      } else if (location) {
        results.conclusion = `Redirect detected to: ${location}`;
      } else {
        results.conclusion = `Redirect status ${manualStep.status} but no Location header`;
      }
    } else if (normalStep?.finalUrl && normalStep.finalUrl.startsWith('http://')) {
      results.conclusion = 'BACKEND ISSUE: Final URL is HTTP, server redirected HTTPS to HTTP';
    } else if (normalStep?.status === 200) {
      results.conclusion = 'Server-to-server HTTPS works correctly. Issue is likely CORS.';
    } else if (normalStep?.status === 401) {
      results.conclusion = 'Server reachable but requires authentication (401). CORS may still be an issue for browser.';
    } else if (normalStep?.error || manualStep?.error) {
      results.conclusion = 'Server-to-server request failed. Backend may be down or unreachable.';
    } else {
      results.conclusion = `Server returned status ${normalStep?.status}. Check headers for CORS configuration.`;
    }

    console.log(`[test-backend] Conclusion: ${results.conclusion}`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[test-backend] Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
