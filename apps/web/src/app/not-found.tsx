import Link from "next/link";

export default function NotFound() {
  return (
    <div className="phone-frame">
      <div className="phone-shell">
        <header className="focus-shell-header">
          <Link href="/today">OVERTAEK</Link>
          <span>A LITTLE FURTHER</span>
        </header>
        <div className="phone-main phone-main-solo">
          <section className="fb-card focus-empty" style={{ margin: "auto 0" }}>
            <span className="focus-empty-mark">◎</span>
            <p className="fb-kicker">404 · Off track</p>
            <h1>This path isn’t on the map.</h1>
            <p className="fb-copy">
              The page you were looking for doesn’t exist or has moved. Let’s get
              you back to today’s field.
            </p>
            <div className="fb-stack" style={{ marginTop: "12px" }}>
              <Link href="/today" className="fb-btn">
                Back to Home
              </Link>
              <Link href="/arena" className="fb-btn-line">
                Open Arena
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
