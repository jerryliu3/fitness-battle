import type { BrandId } from "./model";

export function BrandArt({
  brand,
  small = false,
}: {
  brand: BrandId;
  small?: boolean;
}) {
  return (
    <svg
      className={`evo-character ${small ? "character-small" : ""}`}
      viewBox="0 0 240 240"
      aria-hidden="true"
    >
      {brand === "volt" ? (
        <>
          <path className="art-shadow" d="M48 218 161 218 187 229 29 229Z" />
          <path
            className="art-main"
            d="m84 93 12-73 26 48 36-54-9 90 24 35-33 41-7 38-27-2 1-44-37-24Z"
          />
          <path
            className="art-detail"
            d="m83 128 39-14 27 11-31 17Zm32 34 16 11-39 42-31-2Zm31-4 19 9 18 47-29 2-11-31Z"
          />
          <path
            className="art-eye"
            d="m96 98 24-8-6 13-15 5Zm34-8 19 8-6 9-14-5Z"
          />
          <path
            className="art-stripe"
            d="m45 95 22-13m-28 31 22-8m107-10 21-10"
          />
        </>
      ) : brand === "form" ? (
        <>
          <path className="art-shadow" d="M42 223h153v9H42z" />
          <path
            className="art-main"
            d="M84 39h66l12 12v52l-12 12H84L72 103V51Zm-17 88h104l15 17-11 43h-22v34h-26v-45h-20v45H79v-34H56l-7-43Z"
          />
          <path
            className="art-detail"
            d="M91 62h53v9H91zm-7 88h63v14H84zM74 212h34v13H67zm53 0h39l7 13h-46z"
          />
          <path className="art-eye" d="M91 85h16v7H91zm37 0h16v7h-16z" />
          <path
            className="art-stripe"
            d="M29 41v26m0-26h26m153 170v-26m0 26h-26"
          />
        </>
      ) : brand === "even" ? (
        <>
          <ellipse className="art-shadow" cx="118" cy="224" rx="80" ry="9" />
          <path
            className="art-main"
            d="M78 52c29-14 68-8 85 15 17 24 19 56 12 85-5 23-25 36-56 35-39-1-61-21-60-54 0-37-5-64 19-81Z"
          />
          <path
            className="art-outline"
            d="M78 52c29-14 68-8 85 15 17 24 19 56 12 85-5 23-25 36-56 35-39-1-61-21-60-54 0-37-5-64 19-81Z"
          />
          <ellipse
            className="art-detail"
            cx="81"
            cy="213"
            rx="24"
            ry="13"
            transform="rotate(-12 81 213)"
          />
          <ellipse
            className="art-detail"
            cx="160"
            cy="211"
            rx="27"
            ry="13"
            transform="rotate(10 160 211)"
          />
          <path className="art-eye" d="M94 95h8v16h-8zm39 0h8v16h-8z" />
          <path className="art-smile" d="M107 128q12 11 26 0" />
          <path
            className="art-stripe"
            d="M62 130q-27 6-26 24m142-31q19-16 25-10"
          />
        </>
      ) : (
        <>
          <ellipse className="art-shadow" cx="120" cy="224" rx="75" ry="8" />
          <path
            className="art-ribbon"
            d="M153 51C72 10 24 74 66 116c28 29 83-7 84 35 1 44-64 72-94 36m106-30c59-41 35-111-17-119"
          />
          <path
            className="art-ribbon-light"
            d="M153 51C72 10 24 74 66 116c28 29 83-7 84 35 1 44-64 72-94 36"
          />
          <path className="art-eye" d="M91 70h6v11h-6zm23 2h6v11h-6z" />
          <path className="art-smile" d="M99 92q8 5 15 0" />
          <circle className="art-main" cx="56" cy="187" r="15" />
        </>
      )}
    </svg>
  );
}

export function NavIcon({
  kind,
}: {
  kind: "track" | "field" | "splits" | "athlete";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {kind === "track" ? (
        <>
          <path d="M4 20V4m6 16V8m6 12V2m4 18V6" />
          <path d="m2 13 20-5" />
        </>
      ) : kind === "field" ? (
        <>
          <path d="M5 21V3m7 18V3m7 18V3" />
          <circle cx="5" cy="8" r="3" fill="currentColor" />
          <circle cx="12" cy="15" r="3" fill="currentColor" />
          <circle cx="19" cy="6" r="3" fill="currentColor" />
        </>
      ) : kind === "splits" ? (
        <>
          <path d="M8 5h13M8 12h13M8 19h13M3 4v2m0 5v2m0 5v2" />
        </>
      ) : (
        <>
          <circle cx="12" cy="7" r="4" />
          <path d="M4 21v-3a8 8 0 0 1 16 0v3" />
        </>
      )}
    </svg>
  );
}
