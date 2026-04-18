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

  const sections = formFields.reduce<{ title: string | undefined; fields: typeof formFields }[]>(
    (acc, field) => {
      const last = acc[acc.length - 1];
      if (last && last.title === field.sectionTitle) {
        last.fields.push(field);
      } else {
        acc.push({ title: field.sectionTitle, fields: [field] });
      }
      return acc;
    },
    []
  );

  return (
    <>
      <TrixEditor ref={editorRef} className="mt-2" defaultValue={defaultValue} name={name} inputId={inputId} />
      {formFields.length > 0 && (
        <div className="mt-3 max-h-40 overflow-auto space-y-2">
          {sections.map((section, i) => (
            <div key={i}>
              {section.title && (
                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-1">
                  {section.title}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {section.fields.map((field) => (
                  <button
                    key={field.questionId}
                    type="button"
                    className="badge badge-outline cursor-pointer hover:badge-primary transition-colors"
                    onClick={() =>
                      editorRef.current?.insertPlaceholder(field.questionId, field.title)
                    }
                  >
                    {field.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
