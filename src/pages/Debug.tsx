import { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, Play, Trash2, RefreshCw, Server } from "lucide-react";
import { useState, useEffect } from "react";
import { getRequestLog, clearRequestLog, subscribeToRequestLog, RequestLogEntry } from "@/lib/requestLogger";
import { supabase } from "@/integrations/supabase/client";

const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION || "dev";
const BUILD_TIME = new Date().toISOString();

interface ProbeResult {
  step: string;
  url: string;
  success?: boolean;
  error?: string;
  responseType?: string;
  status?: number;
  redirected?: boolean;
  conclusion?: string;
}

interface ServerProbeResult {
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
  error?: string;
}

export default function Debug() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);
  const [debugApi, setDebugApi] = useState(sessionStorage.getItem("debug_api") === "1");
  const [debugFetch, setDebugFetch] = useState(sessionStorage.getItem("debug_fetch") === "1");
  const [probeResults, setProbeResults] = useState<ProbeResult[]>([]);
  const [probing, setProbing] = useState(false);
  const [requestLog, setRequestLog] = useState<RequestLogEntry[]>(getRequestLog());
  const [serverProbeResult, setServerProbeResult] = useState<ServerProbeResult | null>(null);
  const [serverProbing, setServerProbing] = useState(false);

  useEffect(() => {
    return subscribeToRequestLog(setRequestLog);
  }, []);

  const runServerProbe = async () => {
    setServerProbing(true);
    setServerProbeResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-backend', {
        body: { url: `${API_BASE}/api/v1/conversations/?business_id=feelori` }
      });
      
      if (error) {
        setServerProbeResult({ 
          targetUrl: '', 
          steps: [], 
          conclusion: '', 
          error: error.message 
        });
      } else {
        setServerProbeResult(data);
      }
    } catch (err) {
      setServerProbeResult({ 
        targetUrl: '', 
        steps: [], 
        conclusion: '', 
        error: err instanceof Error ? err.message : String(err) 
      });
    }
    
    setServerProbing(false);
  };

  const copyToClipboard = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const toggleDebugApi = () => {
    const newValue = !debugApi;
    if (newValue) {
      sessionStorage.setItem("debug_api", "1");
    } else {
      sessionStorage.removeItem("debug_api");
    }
    setDebugApi(newValue);
  };

  const toggleDebugFetch = () => {
    const newValue = !debugFetch;
    if (newValue) {
      sessionStorage.setItem("debug_fetch", "1");
    } else {
      sessionStorage.removeItem("debug_fetch");
    }
    setDebugFetch(newValue);
  };

  const runNetworkProbe = async () => {
    setProbing(true);
    setProbeResults([]);
    const results: ProbeResult[] = [];

    const testUrl = `${API_BASE}/api/v1/conversations/?business_id=feelori`;
    
    // Step 1: Show the URL we're testing
    results.push({
      step: "1. Target URL",
      url: testUrl,
    });
    setProbeResults([...results]);

    // Step 2: Manual redirect check
    try {
      const manualResp = await fetch(testUrl, {
        method: "GET",
        redirect: "manual",
        headers: { "Content-Type": "application/json" },
      });
      
      results.push({
        step: "2. Redirect check (manual)",
        url: testUrl,
        responseType: manualResp.type,
        status: manualResp.status,
        success: manualResp.type !== "opaqueredirect",
        conclusion: manualResp.type === "opaqueredirect" 
          ? "⚠️ Server returned a redirect (possibly HTTP→HTTPS or vice versa)"
          : "✓ No redirect detected",
      });
    } catch (err) {
      results.push({
        step: "2. Redirect check (manual)",
        url: testUrl,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        conclusion: "❌ Request blocked (likely Mixed Content)",
      });
    }
    setProbeResults([...results]);

    // Step 3: Normal fetch
    try {
      const token = sessionStorage.getItem("auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const normalResp = await fetch(testUrl, {
        method: "GET",
        headers,
      });

      results.push({
        step: "3. Normal fetch",
        url: testUrl,
        status: normalResp.status,
        redirected: normalResp.redirected,
        success: normalResp.ok,
        conclusion: normalResp.ok 
          ? "✓ Request succeeded" 
          : `⚠️ Request failed with status ${normalResp.status}`,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isMixedContent = errMsg.toLowerCase().includes("mixed") || 
                            errMsg.toLowerCase().includes("blocked") ||
                            errMsg.toLowerCase().includes("insecure");
      
      results.push({
        step: "3. Normal fetch",
        url: testUrl,
        success: false,
        error: errMsg,
        conclusion: isMixedContent 
          ? "❌ Mixed Content blocked - browser rejected HTTP request from HTTPS page"
          : `❌ Request failed: ${errMsg}`,
      });
    }
    setProbeResults([...results]);

    // Step 4: Test with explicit HTTP to confirm blocking
    const httpUrl = testUrl.replace("https://", "http://");
    if (httpUrl !== testUrl) {
      try {
        await fetch(httpUrl, { method: "HEAD" });
        results.push({
          step: "4. HTTP test (should fail)",
          url: httpUrl,
          success: false,
          conclusion: "⚠️ HTTP request was NOT blocked - unexpected!",
        });
      } catch (err) {
        results.push({
          step: "4. HTTP test (should fail)",
          url: httpUrl,
          success: true,
          error: err instanceof Error ? err.message : String(err),
          conclusion: "✓ HTTP correctly blocked by browser",
        });
      }
      setProbeResults([...results]);
    }

    // Final diagnosis
    const hasRedirect = results.some(r => r.responseType === "opaqueredirect");
    const hasMixedContentError = results.some(r => 
      r.error?.toLowerCase().includes("mixed") || 
      r.error?.toLowerCase().includes("blocked")
    );

    let finalConclusion = "";
    if (hasMixedContentError && !hasRedirect) {
      finalConclusion = "🔴 DIAGNOSIS: Something is making HTTP requests. Enable debug flags and check /conversations.";
    } else if (hasRedirect) {
      finalConclusion = "🔴 DIAGNOSIS: Backend is redirecting. Check server/proxy configuration.";
    } else if (results.some(r => r.step === "3. Normal fetch" && r.success)) {
      finalConclusion = "🟢 DIAGNOSIS: API requests work correctly from this page.";
    } else {
      finalConclusion = "🟡 DIAGNOSIS: Inconclusive. Check auth token and enable debug flags.";
    }

    results.push({
      step: "FINAL",
      url: "",
      conclusion: finalConclusion,
    });
    setProbeResults([...results]);
    setProbing(false);
  };

  const envVars = [
    { key: "API_BASE (resolved)", value: API_BASE },
    { key: "VITE_API_URL (raw)", value: import.meta.env.VITE_API_URL || "(not set)" },
    { key: "VITE_SUPABASE_URL", value: import.meta.env.VITE_SUPABASE_URL || "(not set)" },
    { key: "VITE_SUPABASE_PROJECT_ID", value: import.meta.env.VITE_SUPABASE_PROJECT_ID || "(not set)" },
    { key: "MODE", value: import.meta.env.MODE },
    { key: "DEV", value: String(import.meta.env.DEV) },
    { key: "PROD", value: String(import.meta.env.PROD) },
  ];

  const isHttps = API_BASE.startsWith("https://");

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold">Debug Info</h1>
        </div>

        {/* Build Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Build Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <code className="bg-muted px-2 py-0.5 rounded">{BUILD_VERSION}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Page loaded at</span>
              <code className="bg-muted px-2 py-0.5 rounded">{BUILD_TIME}</code>
            </div>
          </CardContent>
        </Card>

        {/* API Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              API Status
              {isHttps ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  HTTPS ✓
                </Badge>
              ) : (
                <Badge variant="destructive">
                  HTTP (will fail!)
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <code className="block bg-muted p-3 rounded text-sm break-all">
              {API_BASE}
            </code>
          </CardContent>
        </Card>

        {/* Server-Side Probe */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Server-Side Probe (bypasses CORS)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runServerProbe} disabled={serverProbing} className="w-full">
              <Server className="h-4 w-4 mr-2" />
              {serverProbing ? "Testing..." : "Test from Server"}
            </Button>
            
            {serverProbeResult && (
              <div className="space-y-2 text-sm">
                {serverProbeResult.error ? (
                  <div className="bg-destructive/10 p-3 rounded text-destructive">
                    Error: {serverProbeResult.error}
                  </div>
                ) : (
                  <>
                    <div className="bg-muted p-3 rounded">
                      <div className="font-medium">Target URL</div>
                      <code className="text-xs break-all">{serverProbeResult.targetUrl}</code>
                    </div>
                    
                    {serverProbeResult.steps.map((step, i) => (
                      <div key={i} className="bg-muted p-3 rounded space-y-1">
                        <div className="font-medium">{step.step}</div>
                        {step.status !== undefined && (
                          <div>Status: <Badge variant={step.status < 400 ? "secondary" : "destructive"}>{step.status} {step.statusText}</Badge></div>
                        )}
                        {step.redirected && <div className="text-amber-600">⚠️ Redirected</div>}
                        {step.finalUrl && step.finalUrl !== step.url && (
                          <div>Final URL: <code className="text-xs">{step.finalUrl}</code></div>
                        )}
                        {step.error && <div className="text-destructive">Error: {step.error}</div>}
                        {step.headers && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground">Headers</summary>
                            <pre className="mt-1 overflow-auto max-h-32 bg-background p-2 rounded">
                              {JSON.stringify(step.headers, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                    
                    <div className={`p-3 rounded font-medium ${
                      serverProbeResult.conclusion.includes('BACKEND ISSUE') 
                        ? 'bg-destructive/10 text-destructive' 
                        : serverProbeResult.conclusion.includes('CORS')
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {serverProbeResult.conclusion}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Network Probe */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Network Probe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runNetworkProbe} disabled={probing} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              {probing ? "Testing..." : "Test Conversations Request"}
            </Button>
            
            {probeResults.length > 0 && (
              <div className="space-y-2 text-sm">
                {probeResults.map((result, i) => (
                  <div key={i} className="bg-muted p-3 rounded space-y-1">
                    <div className="font-medium">{result.step}</div>
                    {result.url && (
                      <code className="text-xs break-all block text-muted-foreground">{result.url}</code>
                    )}
                    {result.responseType && (
                      <div>Response type: <code>{result.responseType}</code></div>
                    )}
                    {result.status !== undefined && (
                      <div>Status: <code>{result.status}</code></div>
                    )}
                    {result.redirected !== undefined && (
                      <div>Redirected: <code>{String(result.redirected)}</code></div>
                    )}
                    {result.error && (
                      <div className="text-destructive text-xs">Error: {result.error}</div>
                    )}
                    {result.conclusion && (
                      <div className={`font-medium ${result.step === "FINAL" ? "text-base pt-2" : ""}`}>
                        {result.conclusion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Flags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Debug Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">debug_api</div>
                <div className="text-xs text-muted-foreground">Log all API requests</div>
              </div>
              <Button 
                variant={debugApi ? "default" : "outline"} 
                size="sm"
                onClick={toggleDebugApi}
              >
                {debugApi ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">debug_fetch</div>
                <div className="text-xs text-muted-foreground">Intercept all fetch calls</div>
              </div>
              <Button 
                variant={debugFetch ? "default" : "outline"} 
                size="sm"
                onClick={toggleDebugFetch}
              >
                {debugFetch ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Reload
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/conversations")}>
                Go to Conversations
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Request Log */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Request Log ({requestLog.length})</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearRequestLog}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {requestLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No requests logged yet. Enable debug flags and navigate to other pages.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {requestLog.map((entry) => (
                  <div 
                    key={entry.id} 
                    className={`text-xs p-2 rounded ${
                      entry.isInsecure 
                        ? "bg-destructive/10 border border-destructive/30" 
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <code className="break-all flex-1">
                        {entry.method} {entry.url}
                      </code>
                      {entry.status && (
                        <Badge variant={entry.status < 400 ? "secondary" : "destructive"} className="shrink-0">
                          {entry.status}
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                      {entry.isInsecure && <span className="text-destructive ml-2">⚠️ INSECURE</span>}
                      {entry.redirected && <span className="ml-2">↪️ redirected</span>}
                      {entry.error && <span className="text-destructive ml-2">{entry.error}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Environment Variables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {envVars.map(({ key, value }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-muted-foreground truncate">{key}</span>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded max-w-[200px] truncate">
                    {value}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(key, value)}
                  >
                    {copied === key ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
