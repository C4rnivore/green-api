import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { errorText, normalizeCredentials } from "../api/apiUtils.ts";
import { connectInstance } from "../api/greenApi.ts";
import { useMessengerStore } from "../store/messengerStore.ts";
import {
  CredentialFields,
  type CredentialValues,
} from "./CredentialFields.tsx";

const emptyCredentials = (): CredentialValues => ({
  idInstance: "",
  apiTokenInstance: "",
  apiUrl: "",
});

export function CredentialsForm() {
  const [values, setValues] = useState<CredentialValues>(emptyCredentials);
  const [localError, setLocalError] = useState<string | null>(null);
  const setCredentials = useMessengerStore((state) => state.setCredentials);

  const mutation = useMutation({
    mutationFn: (next: CredentialValues) =>
      connectInstance(normalizeCredentials(next)),
    onSuccess: (_result, next) => {
      setCredentials(normalizeCredentials(next));
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!values.idInstance.trim() || !values.apiTokenInstance.trim()) {
      setLocalError("Заполните idInstance и apiTokenInstance");
      return;
    }
    setLocalError(null);
    mutation.mutate(values);
  }

  const error =
    localError ?? (mutation.error ? errorText(mutation.error) : null);

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <p className="eyebrow">WhatsApp · GREEN-API</p>
        <h1>Вход в чат</h1>
        <CredentialFields
          idPrefix="login"
          values={values}
          onChange={setValues}
        />
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="primary-button"
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Проверяем инстанс..." : "Войти"}
        </button>
      </form>
    </main>
  );
}
