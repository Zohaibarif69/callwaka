interface Props {
  size?: number;
}

export default function KeptLogo({ size = 22 }: Props) {
  return (
    <span className="inline-flex items-center gap-2">
      {/* Logomark: rounded square with a check */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="22" height="22" rx="6" fill="#111827" />
        <path
          d="M6.5 11.25L9.5 14.25L15.5 8"
          stroke="white"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Wordmark */}
      <span className="text-lg font-semibold tracking-tight text-gray-900">
        kept
      </span>
    </span>
  );
}
