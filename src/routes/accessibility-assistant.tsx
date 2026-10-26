import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "./settings";

export const Route = createFileRoute("/accessibility-assistant")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "المساعد الصوتي | سند" },
      {
        name: "description",
        content: "مساعد صوتي بالعامية المصرية لفاقدي البصر وكبار السن يوصلك لأقرب مستشفى.",
      },
      { property: "og:title", content: "المساعد الصوتي | سند" },
      {
        property: "og:description",
        content: "اتكلم بالعامية وسند يوجهك لأقرب مستشفى ويتصل بيها.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});
