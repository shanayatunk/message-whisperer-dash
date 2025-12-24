import { useBusiness } from "@/contexts/BusinessContext";
import { apiRequest, ApiError } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, UserCheck, Bot, Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  phone_number: string;
  mode: "bot" | "human";
  last_message: string;
  updated_at: string;
}

export default function Conversations() {
  const { businessId } = useBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const {
    data: conversations,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["conversations", businessId],
    queryFn: () =>
      apiRequest<Conversation[]>(
        `/api/v1/conversations?business_id=${encodeURIComponent(businessId)}`
      ),
  });

  // Take Over mutation
  const takeOverMutation = useMutation({
    mutationFn: (phoneNumber: string) =>
      apiRequest("/admin/conversation/takeover", {
        method: "POST",
        body: JSON.stringify({ phone_number: phoneNumber }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", businessId] });
      toast({ title: "Success", description: "Conversation taken over" });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Take over failed";
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  // Release mutation
  const releaseMutation = useMutation({
    mutationFn: (phoneNumber: string) =>
      apiRequest("/admin/conversation/release", {
        method: "POST",
        body: JSON.stringify({ phone_number: phoneNumber }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", businessId] });
      toast({ title: "Success", description: "Conversation released to bot" });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Release failed";
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  const formatLastActive = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Conversations</h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load conversations
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-3"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && conversations?.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No conversations found</p>
        </div>
      )}

      {/* Conversations Table */}
      {!isLoading && !isError && conversations && conversations.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Phone Number</TableHead>
                <TableHead className="w-[150px]">Last Active</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead>Last Message</TableHead>
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.map((conv) => (
                <TableRow key={conv.phone_number}>
                  <TableCell className="font-mono text-sm">
                    {conv.phone_number}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatLastActive(conv.updated_at)}
                  </TableCell>
                  <TableCell>
                    {conv.mode === "human" ? (
                      <Badge
                        variant="destructive"
                        className="gap-1 bg-orange-500/90 hover:bg-orange-500"
                      >
                        <UserCheck className="h-3 w-3" />
                        HUMAN CONTROL
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                      >
                        <Bot className="h-3 w-3" />
                        Bot Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                    {conv.last_message}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {conv.mode === "human" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            releaseMutation.mutate(conv.phone_number)
                          }
                          disabled={releaseMutation.isPending}
                        >
                          {releaseMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Bot className="h-4 w-4 mr-1" />
                              Release
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() =>
                            takeOverMutation.mutate(conv.phone_number)
                          }
                          disabled={takeOverMutation.isPending}
                        >
                          {takeOverMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-1" />
                              Take Over
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
