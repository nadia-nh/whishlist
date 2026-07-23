"use client";

import { useState } from "react";

export default function CopyShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-200 p-2 text-sm dark:border-gray-800">
      <code className="flex-1 truncate">{url}</code>
      <button onClick={handleCopy} className="shrink-0 text-gray-500 hover:underline">
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
