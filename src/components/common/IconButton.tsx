import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

type IconButtonProps = {
  label: string;
  icon: ComponentType<LucideProps>;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
  className?: string;
};

export function IconButton({ label, icon: Icon, onClick, disabled, active, danger, className = '' }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-12 min-w-12 place-items-center rounded-studio border text-micro transition ${
        active
          ? 'border-studio-accent bg-studio-accent text-white shadow-led'
          : danger
            ? 'border-studio-record/40 bg-studio-record/10 text-studio-record'
            : 'border-studio-border bg-studio-card text-studio-text'
      } ${disabled ? 'cursor-not-allowed opacity-40' : 'active:scale-95'} ${className}`}
    >
      <Icon size={20} strokeWidth={2.2} />
    </button>
  );
}
