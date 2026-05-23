"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { sendResponseToBasecamp } from "@/lib/actions/responses";
import { IconExternalLink } from "@tabler/icons-react";

const TrixEditor = dynamic(() => import("@/components/TrixEditor"), {
  ssr: false,
});

export interface ConnectionBlock {
  connectionId: string;
  connectionName: string;
  connectionType: "BASECAMP_CARD" | "BASECAMP_TODO";
  initialTitle: string;
  initialContent: string;
  alreadySent: boolean;
}

interface BlockState {
  title: string;
  content: string;
  status: "idle" | "sending" | "sent" | "error";
  basecampUrl?: string;
  errorMessage?: string;
}

interface Props {
  formId: string;
  responseId: string;
  responseData: Record<string, string>;
  connectionBlocks: ConnectionBlock[];
}

export default function ResponseDetailClient({
  formId,
  responseId,
  responseData,
  connectionBlocks,
}: Props) {
  const [states, setStates] = useState<Record<string, BlockState>>(() => {
    const initial: Record<string, BlockState> = {};
    for (const block of connectionBlocks) {
      initial[block.connectionId] = {
        title: block.initialTitle,
        content: block.initialContent,
        status: block.alreadySent ? "sent" : "idle",
      };
    }
    return initial;
  });

  const [, startTransition] = useTransition();

  function updateBlock(
    connectionId: string,
    patch: Partial<BlockState>,
  ) {
    setStates((prev) => ({
      ...prev,
      [connectionId]: { ...prev[connectionId], ...patch },
    }));
  }

  function handleSend(block: ConnectionBlock) {
    const state = states[block.connectionId];
    updateBlock(block.connectionId, { status: "sending" });

    startTransition(async () => {
      const result = await sendResponseToBasecamp({
        formId,
        responseId,
        connectionId: block.connectionId,
        title: state.title,
        content: state.content,
        responseData,
      });

      if (result.success) {
        updateBlock(block.connectionId, {
          status: "sent",
          basecampUrl: result.basecampUrl,
        });
      } else {
        updateBlock(block.connectionId, {
          status: "error",
          errorMessage: result.error,
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 mt-6">
      {connectionBlocks.map((block) => {
        const state = states[block.connectionId];
        const isSent = state.status === "sent";
        const isSending = state.status === "sending";

        return (
          <div key={block.connectionId} className="card bg-base-200 p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="font-semibold">{block.connectionName}</h3>
              <span className="badge badge-ghost badge-sm">
                {block.connectionType === "BASECAMP_CARD" ? "Card" : "Todo"}
              </span>
            </div>

            {isSent ? (
              <div className="flex items-center gap-2">
                <span className="badge badge-success">Sent</span>
                {(state.basecampUrl) && (
                  <a
                    href={state.basecampUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-xs btn-ghost"
                  >
                    <IconExternalLink className="w-3.5 h-3.5" />
                    View in Basecamp
                  </a>
                )}
              </div>
            ) : (
              <>
                <label className="label mb-1">
                  <span className="label-text text-sm">Title</span>
                </label>
                <input
                  type="text"
                  className="input input-sm w-full mb-3"
                  value={state.title}
                  onChange={(e) =>
                    updateBlock(block.connectionId, { title: e.target.value })
                  }
                  disabled={isSending}
                />

                <label className="label mb-1">
                  <span className="label-text text-sm">Content</span>
                </label>
                <TrixEditor
                  defaultValue={state.content}
                  inputId={`trix-${block.connectionId}`}
                  onChange={(html) =>
                    updateBlock(block.connectionId, { content: html })
                  }
                  className="mb-3"
                />

                {state.status === "error" && (
                  <div role="alert" className="alert alert-error alert-sm mb-3 text-sm">
                    {state.errorMessage}
                  </div>
                )}

                <button
                  className="btn btn-primary btn-sm mt-1"
                  onClick={() => handleSend(block)}
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      Sending…
                    </>
                  ) : (
                    "Send to Basecamp"
                  )}
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
