import { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { useState } from "react";

const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION || "dev";
const BUILD_TIME = new Date().toISOString();

export default function Debug() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
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

        {/* Session Storage Debug Flags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Debug Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">debug_api</span>
              <Badge variant="outline">
                {sessionStorage.getItem("debug_api") || "not set"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">debug_fetch</span>
              <Badge variant="outline">
                {sessionStorage.getItem("debug_fetch") || "not set"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Run in console: <code>sessionStorage.setItem("debug_api", "1")</code> then reload.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
