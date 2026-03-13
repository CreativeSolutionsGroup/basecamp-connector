"use client";

import "trix/dist/trix.css";
import "@/styles/trix-dark.css";
import { forwardRef, HTMLAttributes, useEffect, useImperativeHandle, useRef } from "react";

interface TrixEditorProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  defaultValue?: string;
  name?: string;
  inputId?: string;
  onChange?: (html: string) => void;
}

export interface TrixEditorHandle {
  insertText: (text: string) => void;
}

const TrixEditor = forwardRef<TrixEditorHandle, TrixEditorProps>(function TrixEditor(
  { defaultValue = "", name, inputId = "trix-input", onChange, ...props },
  ref
) {
  const editorRef = useRef<HTMLElement & { value: string; editor: { insertString: (s: string) => void; loadHTML: (html: string) => void } } & EventTarget>(null);

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      editorRef.current?.editor?.insertString(text);
    },
  }));

  useEffect(() => {
    import("trix");
  }, []);

  const defaultValueRef = useRef(defaultValue);

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

    const loadInitialValue = () => {
      if (defaultValueRef.current) {
        editor.editor?.loadHTML(defaultValueRef.current);
      }
    };

    editor.addEventListener("trix-change", handleChange);
    editor.addEventListener("trix-initialize", removeAttachButton);
    editor.addEventListener("trix-initialize", loadInitialValue);
    return () => {
      editor.removeEventListener("trix-change", handleChange);
      editor.removeEventListener("trix-initialize", removeAttachButton);
      editor.removeEventListener("trix-initialize", loadInitialValue);
    };
  }, [onChange]);

  useEffect(() => {
    if (defaultValue === defaultValueRef.current) return;
    defaultValueRef.current = defaultValue;
    const editor = editorRef.current;
    if (editor?.editor) {
      editor.editor.loadHTML(defaultValue ?? "");
    }
  }, [defaultValue]);

  return (
    <div {...props}>
      <input
        type="hidden"
        id={inputId}
        name={name}
        defaultValue={defaultValue}
      />
      {/* @ts-expect-error trix custom element */}
      <trix-editor input={inputId} ref={editorRef} className="h-60" />
    </div>
  );
});

export default TrixEditor;
