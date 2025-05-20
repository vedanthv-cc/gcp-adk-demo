export function AutoPartsLogo() {
  return (
    <div className="relative flex items-center justify-center h-10 w-10">
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10"
      >
        <rect width="40" height="40" rx="8" fill="#1E40AF" />
        <circle cx="20" cy="20" r="12" stroke="white" strokeWidth="2.5" />
        <path
          d="M14 20C14 16.6863 16.6863 14 20 14C23.3137 14 26 16.6863 26 20"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M26 20C26 23.3137 23.3137 26 20 26C16.6863 26 14 23.3137 14 20"
          stroke="#EF4444"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="20" cy="20" r="3" fill="white" />
        <rect x="19" y="8" width="2" height="5" rx="1" fill="white" />
        <rect x="19" y="27" width="2" height="5" rx="1" fill="white" />
        <rect x="27" y="19" width="5" height="2" rx="1" fill="white" />
        <rect x="8" y="19" width="5" height="2" rx="1" fill="white" />
      </svg>
    </div>
  );
}
