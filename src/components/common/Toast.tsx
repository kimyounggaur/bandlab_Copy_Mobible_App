type ToastProps = {
  message: string | null;
};

export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-36 z-50 rounded-studio border border-studio-success/40 bg-studio-success px-4 py-3 text-center text-body font-semibold text-studio-bg shadow-lg">
      {message}
    </div>
  );
}
