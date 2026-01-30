import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { height: 18, text: 'text-base', gap: '-ml-0.5' },
    md: { height: 24, text: 'text-xl', gap: '-ml-0.5' },
    lg: { height: 36, text: 'text-3xl', gap: '-ml-1' },
  };

  const { height, text, gap } = sizes[size];
  const width = height;

  return (
    <div className={cn('flex items-center', className)}>
      {/* The "O" with checkmark - same color as "kay" text */}
      <svg
        width={width}
        height={height}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 text-foreground"
      >
        {/* Circle */}
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        {/* Checkmark */}
        <path
          d="M10 16L14.5 20.5L22 11.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {showText && (
        <span
          className={cn(
            'font-extrabold tracking-tight',
            gap,
            text
          )}
        >
          <span className="text-foreground">kay</span>
          <span className="text-primary">fam</span>
        </span>
      )}
    </div>
  );
}

// Icon-only version for favicon/app icon
export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Circle */}
      <circle
        cx="16"
        cy="16"
        r="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      {/* Checkmark */}
      <path
        d="M10 16L14.5 20.5L22 11.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
