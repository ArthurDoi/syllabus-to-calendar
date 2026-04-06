"use client";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * A reusable modal confirmation dialog.
 * Used wherever a destructive action needs user confirmation.
 */
export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
}: ConfirmDialogProps) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(32,33,36,0.6)",
      zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 8, padding: 24,
        maxWidth: 400, width: "90%",
        boxShadow: "0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)",
        boxSizing: "border-box",
      }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: "#202124", marginBottom: 16 }}>
          Confirm Delete
        </div>
        <div style={{ fontSize: 14, color: "#5f6368", marginBottom: 24, lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ padding: "8px 24px", border: "none", borderRadius: 4, background: "transparent", color: "#1a73e8", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: "8px 24px", border: "none", borderRadius: 4, background: "transparent", color: "#d93025", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
