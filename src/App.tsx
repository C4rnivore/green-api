import { CredentialsForm } from "./components/CredentialsForm.tsx";
import { MessangerLayout } from "./components/MessangerLayout.tsx";
import { useMessengerStore } from "./store/messengerStore.ts";

export default function App() {
  const credentials = useMessengerStore((state) => state.credentials);

  if (!credentials) return <CredentialsForm />;

  return <MessangerLayout />;
}
