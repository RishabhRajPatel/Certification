"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  className,
  pendingText,
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={cn(className)} {...props}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? pendingText ?? "Please wait…" : children}
    </Button>
  );
}
