import { useQuery } from "@tanstack/react-query";
import { getEventWorkspace } from "@/lib/admin-fns";

export function useEventWorkspace(eventId, { poll = true } = {}) {
  return useQuery({
    queryKey: ["workspace", eventId],
    queryFn: () => getEventWorkspace({ data: { eventId } }),
    refetchInterval: (query) => {
      if (!poll) return false;
      return query.state.data?.event?.status === "ditutup" ? false : 30000;
    },
  });
}