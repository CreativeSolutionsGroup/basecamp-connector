"use client";

import { useRef } from "react";
import TrixEditor, { TrixEditorHandle } from "./TrixEditor";
import { ParsedFormField } from "@/lib/utils/google";

export default function FormEditor({
  formFields,
  defaultValue,
  name,
  inputId,
}: {
  formFields: ParsedFormField[];
  defaultValue?: string;
  name?: string;
  inputId?: string;
}) {
  const editorRef = useRef<TrixEditorHandle>(null);

  return (
    <>
      <TrixEditor ref={editorRef} className="mt-2" defaultValue={defaultValue} name={name} inputId={inputId} />
      {formFields.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 max-h-40 overflow-auto">
          {formFields.map((field) => (
            <button
              key={field.questionId}
              type="button"
              className="badge badge-outline cursor-pointer hover:badge-primary transition-colors"
              onClick={() =>
                editorRef.current?.insertText(`{{${field.questionId}}}`)
              }
            >
              {field.title}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
