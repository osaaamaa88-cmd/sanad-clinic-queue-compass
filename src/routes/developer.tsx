import { createFileRoute, Link } from "@tanstack/react-router";
import developerAsset from "@/assets/osama-retro-2004.png.asset.json";

export const Route = createFileRoute("/developer")({
  head: () => ({
    meta: [
      { title: "About the Developer — Osama M. Sanad | سَنَد" },
      { name: "description", content: "About the Developer of SANAD: Osama M. Sanad, Founder & CEO — dental student & coding enthusiast." },
      { property: "og:title", content: "About the Developer — Osama M. Sanad | سَنَد" },
      { property: "og:description", content: "Meet the founder of SANAD: Osama M. Sanad, Founder & CEO — dental student & coding enthusiast." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeveloperPage,
});

const infoRows: { label: string; value: React.ReactNode }[] = [
  { label: "Name:", value: <span>Osama M. Sanad <span dir="rtl" style={{ color: "#333333" }}>(أسامة محمد عبدالمجيد سند)</span></span> },
  { label: "Title:", value: "Founder & CEO, SANAD" },
  { label: "Status:", value: "Dental Student & Coding Enthusiast" },
  {
    label: "About Me:",
    value:
      "Founder of SANAD. A dental student with a genuine passion for programming and technology, building simple digital tools to make healthcare easier and accessible.",
  },
  { label: "Interests:", value: "Dentistry, Coding, Web Building, HealthTech" },
  {
    label: "Contact:",
    value: (
      <span>
        Instagram: <b>@dr__osama0</b> —{" "}
        <a href="https://www.instagram.com/dr__osama0" target="_blank" rel="noreferrer" style={{ color: "#3b5998", textDecoration: "underline" }}>
          instagram.com/dr__osama0
        </a>
      </span>
    ),
  },
];

function DeveloperPage() {
  return (
    <div dir="ltr" className="min-h-screen" style={{ background: "#3b5998", fontFamily: "'Trebuchet MS', Verdana, Arial, sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: "#3b5998", borderBottom: "1px solid #2d4373" }}>
        <div className="mx-auto flex max-w-3xl items-end justify-between px-4 pt-2 pb-2">
          <div style={{ color: "#ffffff", fontSize: "28px", fontWeight: "bold", letterSpacing: "-1px", lineHeight: 1 }}>
            <span style={{ fontStyle: "italic" }}>the</span>sanad
          </div>
          <div style={{ color: "#d6dceb", fontSize: "11px" }}>[ About the Developer ]</div>
        </div>
      </div>

      {/* Page body */}
      <div className="mx-auto max-w-3xl px-4 py-5" style={{ background: "#ffffff", minHeight: "70vh" }}>
        <h1 style={{ color: "#3b5998", fontSize: "18px", fontWeight: "bold", borderBottom: "1px solid #d8dfea", paddingBottom: 6 }}>
          Osama M. Sanad <span style={{ color: "#666666", fontSize: "12px", fontWeight: "normal" }}>[ Founder &amp; CEO, SANAD ]</span>
        </h1>

        <div className="mt-4 flex flex-col gap-5 sm:flex-row">
          {/* Left: photo (polaroid-style box like 2004 profiles) */}
          <div className="shrink-0" style={{ width: 220 }}>
            <div style={{ border: "1px solid #b0b0b0", padding: 6, background: "#f7f7f7", boxShadow: "2px 2px 0 #d8dfea" }}>
              <img
                src={developerAsset.url}
                alt="Osama M. Sanad — retro binary portrait"
                style={{ display: "block", width: "100%", border: "1px solid #d8dfea" }}
              />
              <div className="mt-2" style={{ color: "#333333", fontSize: "10px", textAlign: "center" }}>
                osama_retro_2004.png — <span style={{ color: "#888888" }}>the early binary days</span>
              </div>
            </div>
            <div className="mt-2" style={{ fontSize: "10px", color: "#666666", textAlign: "center" }}>
              <span style={{ color: "#aaaaaa" }}>sanad directory</span> &middot; member since 2004
            </div>
          </div>

          {/* Right: info table */}
          <div className="min-w-0 flex-1">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", border: "1px solid #d8dfea" }}>
              <tbody>
                {infoRows.map((row) => (
                  <tr key={row.label}>
                    <td
                      className="w-24 align-top sm:w-32"
                      style={{ background: "#d8dfea", color: "#3b5998", fontWeight: "bold", padding: "6px 8px", borderBottom: "1px solid #ffffff", width: 110 }}
                    >
                      {row.label}
                    </td>
                    <td className="align-top" style={{ color: "#333333", padding: "6px 8px", borderBottom: "1px solid #d8dfea", lineHeight: 1.6 }}>
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Classic 2004 "poke"-style action strip */}
            <div className="mt-4" style={{ border: "1px solid #d8dfea", background: "#f7f7f7", padding: 10, fontSize: "12px", color: "#333333" }}>
              <b style={{ color: "#3b5998" }}>سَنَد | SANAD</b> — a simple tool to book clinic queues and keep your health in one place.
              <div className="mt-1" style={{ fontSize: "11px", color: "#666666" }}>
                Built with care in Egypt. This page is a loving tribute to Thefacebook, 2004.
              </div>
            </div>
          </div>
        </div>

        {/* Back to app */}
        <div className="mt-8 border-t pt-4" style={{ borderColor: "#d8dfea" }}>
          <Link
            to="/"
            style={{
              display: "inline-block",
              background: "#3b5998",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "bold",
              padding: "7px 16px",
              textDecoration: "none",
              border: "1px solid #2d4373",
            }}
          >
            ← Back to SANAD (العودة إلى سَنَد)
          </Link>
          <Link to="/" style={{ marginLeft: 12, fontSize: "11px", color: "#3b5998", textDecoration: "underline" }}>
            العودة للرئيسية
          </Link>
        </div>
      </div>

      {/* Footer bar */}
      <div style={{ background: "#3b5998", borderTop: "1px solid #2d4373" }}>
        <div className="mx-auto max-w-3xl px-4 py-3" style={{ color: "#d6dceb", fontSize: "10px" }}>
          thesanad &copy; 2026 &middot; About the Developer &middot; <span dir="rtl">سَنَد | SANAD</span>
        </div>
      </div>
    </div>
  );
}
