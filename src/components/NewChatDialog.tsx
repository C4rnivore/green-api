import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { errorText } from "../api/apiUtils.ts";
import { checkWhatsapp } from "../api/greenApi.ts";
import { chatTitle, normalizePhone } from "../lib/format.ts";
import { useMessengerStore } from "../store/messengerStore.ts";
import { Modal } from "./Modal.tsx";

interface NewChatDialogProps {
  onClose: () => void;
}

export function NewChatDialog({ onClose }: NewChatDialogProps) {
  const [phone, setPhone] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const credentials = useMessengerStore((state) => state.credentials);
  const upsertChat = useMessengerStore((state) => state.upsertChat);

  const mutation = useMutation({
    mutationFn: async (digits: string) => {
      if (!credentials) throw new Error("Нет учётных данных");
      return checkWhatsapp(credentials, digits);
    },
    onSuccess: (result) => {
      upsertChat({
        chatId: result.chatId,
        title: chatTitle(result.username, result.phone, result.chatId),
        phone: result.phone,
        username: result.username,
      });
      onClose();
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const digits = normalizePhone(phone);
    if (!digits) {
      setLocalError(
        "Введите номер в международном формате, от 11 до 16 цифр, например 79991234567",
      );
      return;
    }
    setLocalError(null);
    mutation.mutate(digits);
  }

  const error =
    localError ?? (mutation.error ? errorText(mutation.error) : null);

  return (
    <Modal title="Новый чат" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <label className="field" htmlFor="new-chat-phone">
          <span>Номер телефона</span>
          <input
            id="new-chat-phone"
            inputMode="tel"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="79991234567"
            maxLength={11}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
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
          {mutation.isPending ? "Проверяем номер..." : "Создать чат"}
        </button>
      </form>
    </Modal>
  );
}
