import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
}

export function IconButton({ icon, label, ...props }: IconButtonProps) {
  return (
    <button aria-label={label} title={label} type="button" {...props}>
      {icon}
    </button>
  );
}
