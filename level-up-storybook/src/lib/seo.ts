export const seo = (title: string, description: string, noindex = false) => ({
  meta: [
    { title: `${title} — WordBook` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — WordBook` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    ...(noindex ? [{ name: "robots", content: "noindex" }] : []),
  ],
});
