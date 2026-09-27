import { useState } from "react";
import { API_URL } from "../api/apiConfig.ts";

export interface CredentialValues {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
}

interface CredentialFieldsProps {
  idPrefix: string;
  values: CredentialValues;
  onChange: (values: CredentialValues) => void;
}

export function CredentialFields({
  idPrefix,
  values,
  onChange,
}: CredentialFieldsProps) {
  const [showToken, setShowToken] = useState(false);

  return (
    <>
      <label className="field" htmlFor={`${idPrefix}-id`}>
        <span>idInstance</span>
        <input
          id={`${idPrefix}-id`}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={values.idInstance}
          onChange={(event) =>
            onChange({ ...values, idInstance: event.target.value })
          }
        />
      </label>
      <label className="field" htmlFor={`${idPrefix}-token`}>
        <span>apiTokenInstance</span>
        <span className="token-row">
          <input
            id={`${idPrefix}-token`}
            type={showToken ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            value={values.apiTokenInstance}
            onChange={(event) =>
              onChange({ ...values, apiTokenInstance: event.target.value })
            }
          />
          <button
            type="button"
            className="ghost-button"
            onClick={() => setShowToken((value) => !value)}
          >
            {showToken ? "Скрыть" : "Показать"}
          </button>
        </span>
      </label>
      <label className="field" htmlFor={`${idPrefix}-url`}>
        <span>URL - опционально</span>
        <input
          id={`${idPrefix}-url`}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder={"https://api.green-api.com"}
          value={values.apiUrl}
          onChange={(event) =>
            onChange({ ...values, apiUrl: event.target.value })
          }
        />
      </label>
    </>
  );
}
