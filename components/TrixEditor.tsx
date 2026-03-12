"use client";

import "trix/dist/trix.css";
import "@/styles/trix-dark.css";
import { HTMLAttributes, useEffect, useRef } from "react";

interface TrixEditorProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  value?: string;
  onChange?: (html: string) => void;
}

export default function TrixEditor({
  value = "",
  onChange,
  ...props
}: TrixEditorProps) {
  const editorRef = useRef<HTMLElement & { value: string } & EventTarget>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    import("trix");
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleChange = () => {
      onChange?.(editor.value);
    };

    const removeAttachButton = () => {
      editor
        .closest("div")
        ?.querySelector(".trix-button-group--file-tools")
        ?.remove();
    };

    editor.addEventListener("trix-change", handleChange);
    editor.addEventListener("trix-initialize", removeAttachButton);
    return () => {
      editor.removeEventListener("trix-change", handleChange);
      editor.removeEventListener("trix-initialize", removeAttachButton);
    };
  }, [onChange]);

  return (
    <div {...props}>
      <input
        type="hidden"
        id="trix-input"
        ref={inputRef}
        value={value}
        readOnly
      />
      {/* @ts-expect-error trix custom element */}
      <trix-editor input="trix-input" ref={editorRef} className="h-60" />
    </div>
  );
}
