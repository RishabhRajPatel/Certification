import { avatarColor, initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
