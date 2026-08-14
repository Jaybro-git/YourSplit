"use client";

import { useState } from "react";
import { Modal } from "./Modal";

export function NameEntryModal({
  title,
  placeholder,
  submitLabel,
  onSubmit,
  onClose,
}: {
  title: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onClose();
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-2xl bg-accent px-4 py-3 text-base font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!name.trim()}
        >
          {submitLabel}
        </button>
      </form>
    </Modal>
  );
}
