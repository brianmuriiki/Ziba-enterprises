interface Props {
  label?: string;
  fullScreen?: boolean;
}

export default function LoadingAnimation({ label = "Loading Ziba", fullScreen = false }: Props) {
  return (
    <div
      className={`ziba-loader ${fullScreen ? "ziba-loader-screen" : "ziba-loader-inline"}`}
      role="status"
      aria-live="polite"
    >
      <span className="ziba-loader-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M14 18h20l-2 22H16l-2-22Z" />
          <path d="M19 19v-4a5 5 0 0 1 10 0v4" />
          <path className="ziba-loader-spark" d="m35 9 1.4 3.6L40 14l-3.6 1.4L35 19l-1.4-3.6L30 14l3.6-1.4L35 9Z" />
        </svg>
      </span>
      <span className="ziba-loader-wordmark">Ziba</span>
      <span className="ziba-loader-label">{label}</span>
      <span className="ziba-loader-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}
