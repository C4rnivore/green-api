import { useQuery } from "@tanstack/react-query";
import { deleteNotification, receiveNotification } from "../api/greenApi.ts";
import { useMessengerStore } from "../store/messengerStore.ts";

export function useIncomingNotifications() {
  const credentials = useMessengerStore((state) => state.credentials);

  return useQuery({
    queryKey: ["notifications", credentials?.apiUrl, credentials?.idInstance],
    enabled: credentials !== null,
    retry: false,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: true,
    refetchInterval: (query) => (query.state.status === "error" ? 4000 : 250),
    queryFn: async ({ signal }) => {
      const current = useMessengerStore.getState().credentials;
      if (!current) return null;

      const notification = await receiveNotification(current, signal);
      if (!notification) return null;

      useMessengerStore.getState().applyNotification(notification.body);
      await deleteNotification(current, notification.receiptId, signal);
      return notification.receiptId;
    },
  });
}
