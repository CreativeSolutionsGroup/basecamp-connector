"use client";

import { useRef, useState } from "react";
import { ParsedFormField } from "@/lib/utils/google";

export default function TitleEditor({
  formFields,
  defaultValue = "",
  name = "title",
}: {
  formFields: ParsedFormField[];
  defaultValue?: string;
  name?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);

  const insertField = (questionId: string) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const token = `{{${questionId}}}`;
    const newValue = value.slice(0, start) + token + value.slice(end);
    setValue(newValue);
    requestAnimationFrame(() => {
      input.setSelectionRange(start + token.length, start + token.length);
      input.focus();
    });
  };

  const sections = formFields.reduce<
    { title: string | undefined; fields: typeof formFields }[]
  >((acc, field) => {
    const last = acc[acc.length - 1];
    if (last && last.title === field.sectionTitle) {
      last.fields.push(field);
    } else {
      acc.push({ title: field.sectionTitle, fields: [field] });
    }
    return acc;
  }, []);

  return (
    <>
      <input
        ref={inputRef}
        className="input w-full mt-2"
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Card title — click a field chip to insert form data"
      />
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
                    onClick={() => insertField(field.questionId)}
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
