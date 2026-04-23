"use client";

import { useTransition, useState } from "react";
import { ParsedFormField } from "@/lib/utils/google";
import { updateConnection, deleteConnection, testConnection } from "@/lib/actions/connection";
import { useToast } from "./ToastProvider";
import FormEditor from "./FormEditor";
import TitleEditor from "./TitleEditor";
import { IconPlugConnected } from "@tabler/icons-react";

interface ConnectionData {
  id: string;
  type: "BASECAMP_CARD" | "BASECAMP_TODO";
  title: string;
  content: string;
  routingQuestionId: string | null;
  routingValue: string | null;
  basecampUrl: string;
}

export default function ConnectionCard({
  connection,
  formFields,
}: {
  connection: ConnectionData;
  formFields: ParsedFormField[];
}) {
  const toast = useToast();
  const [savePending, startSave] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [testPending, startTest] = useTransition();

  const [routingQuestionId, setRoutingQuestionId] = useState(
    connection.routingQuestionId ?? ""
  );
  const [routingValue, setRoutingValue] = useState(
    connection.routingValue ?? ""
  );

  const selectedField = formFields.find(
    (f) => f.questionId === routingQuestionId
  );

  const handleSave = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSave(async () => {
      const result = await updateConnection(connection.id, formData);
      if (result.success) toast({ type: "success", message: "Connection saved!" });
      else toast({ type: "error", message: result.error });
    });
  };

  const handleDelete = () => {
    startDelete(async () => {
      const result = await deleteConnection(connection.id);
      if (!result.success) toast({ type: "error", message: result.error });
    });
  };

  const handleTest = () => {
    startTest(async () => {
      const result = await testConnection(connection.id);
      if (result.success) {
        toast({ type: "success", message: `Connected: "${result.name}"` });
      } else {
        toast({ type: "error", message: result.error });
      }
    });
  };

  return (
    <div className="card bg-base-200 mt-4">
      <form onSubmit={handleSave} className="card-body gap-0 p-4">
        {/* Routing */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col flex-1 min-w-40">
            <label className="label">
              <span className="label-text">Route when</span>
            </label>
            <select
              className="select select-sm"
              name="routingQuestionId"
              value={routingQuestionId}
              onChange={(e) => {
                setRoutingQuestionId(e.target.value);
                setRoutingValue("");
              }}
            >
              <option value="">Default (matches all)</option>
              {formFields.map((f) => (
                <option key={f.questionId} value={f.questionId}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          {routingQuestionId && (
            <div className="flex flex-col flex-1 min-w-40">
              <label className="label">
                <span className="label-text">equals</span>
              </label>
              {selectedField?.type === "choice" ? (
                <select
                  className="select select-sm"
                  name="routingValue"
                  value={routingValue}
                  onChange={(e) => setRoutingValue(e.target.value)}
                >
                  <option value="">Select a value</option>
                  {selectedField.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input input-sm"
                  name="routingValue"
                  value={routingValue}
                  onChange={(e) => setRoutingValue(e.target.value)}
                  placeholder="Value to match"
                />
              )}
            </div>
          )}
        </div>

        {/* Basecamp target */}
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div className="flex flex-col">
            <label className="label">
              <span className="label-text">Type</span>
            </label>
            <select
              className="select select-sm"
              name="itemType"
              defaultValue={connection.type === "BASECAMP_CARD" ? "card" : "todo"}
            >
              <option value="card">Card</option>
              <option value="todo">Todo</option>
            </select>
          </div>

          <div className="flex flex-col flex-1 min-w-60">
            <label className="label">
              <span className="label-text">Basecamp URL</span>
            </label>
            <input
              className="input input-sm w-full"
              name="basecampUrl"
              defaultValue={connection.basecampUrl}
              placeholder="https://3.basecamp.com/..."
              required
            />
          </div>
        </div>

        {/* Title editor */}
        <label className="label mt-4">
          <span className="label-text">Title</span>
        </label>
        <TitleEditor
          formFields={formFields}
          defaultValue={connection.title}
          name="title"
        />

        {/* Template editor */}
        <label className="label mt-4">
          <span className="label-text">Template</span>
        </label>
        <FormEditor
          formFields={formFields}
          defaultValue={connection.content}
          name="content"
          inputId={`trix-input-${connection.id}`}
        />

        {/* Actions */}
        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deletePending}
            className="btn btn-ghost btn-sm text-error"
          >
            {deletePending ? "Deleting…" : "Delete"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testPending || !connection.basecampUrl}
              className="btn btn-outline btn-sm"
            >
              {testPending ? (
                "Testing…"
              ) : (
                <>
                  <IconPlugConnected className="w-4 h-4" />
                  Test
                </>
              )}
            </button>
            <button
              type="submit"
              disabled={savePending}
              className="btn btn-primary btn-sm"
            >
              {savePending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
