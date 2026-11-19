"use client";
import { SOCIAL_AUTH_ICON_PATHS } from "@fitness-battle/shared";

type Props = {
  onGoogle: () => void;
  onApple: () => void;
  onEmail?: () => void;
  busy?: boolean;
  disabled?: boolean;
};

export function SocialAuthButtons({
  onGoogle,
  onApple,
  onEmail,
  busy,
  disabled,
}: Props) {
  const isDisabled = Boolean(busy || disabled);
  const buttonStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
  } as const;

  return (
    <div className="fb-stack" style={{ marginTop: 4 }}>
      <button
        type="button"
        className="fb-btn-line"
        disabled={isDisabled}
        onClick={onApple}
        style={buttonStyle}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={SOCIAL_AUTH_ICON_PATHS.apple} />
        </svg>
        <span>Continue with Apple</span>
      </button>

      <button
        type="button"
        className="fb-btn-line"
        disabled={isDisabled}
        onClick={onGoogle}
        style={buttonStyle}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {SOCIAL_AUTH_ICON_PATHS.google.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
        <span>Continue with Google</span>
      </button>

      {onEmail ? (
        <button
          type="button"
          className="fb-btn-line"
          disabled={isDisabled}
          onClick={onEmail}
          style={buttonStyle}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d={SOCIAL_AUTH_ICON_PATHS.email} />
          </svg>
          <span>Continue with Email</span>
        </button>
      ) : null}
    </div>
  );
}
