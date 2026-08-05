import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, CalendarPlus, Loader2, Play, Share2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PostViewer, type ViewerPost } from "@/components/PostViewer";
import { svrGetPost } from "@/lib/post-social.functions";
import { postShareUrl, shareLink } from "@/lib/post-social";

const SITE = "https://tabeebak-egypt.lovable.app";

export const Route = createFileRoute("/p/$postId")({
  loader: async ({ params }) => {
    const post = await svrGetPost({ data: { postId: params.postId } });
    return { post };
  },
  head: ({ params, loaderData }) => {
    const post = loaderData?.post;
    if (!post) {
      return {
        meta: [
          { title: "المنشور غير متاح — سندي" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${post.doctor} — سندي`;
    const desc = post.caption
      ? post.caption.slice(0, 150)
      : `شوف منشورات عيادة ${post.doctor} واحجز موعدك من تطبيق سندي.`;
    const url = `${SITE}/p/${params.postId}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(post.url
          ? [
              { property: "og:image", content: post.url },
              { name: "twitter:image", content: post.url },
            ]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  errorComponent: () => (
    <AppShell title="المنشور غير متاح" backTo="/patient">
      <p className="mt-6 text-center text-sm text-muted-foreground">حصلت مشكلة في تحميل المنشور، حاول تاني.</p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell title="المنشور غير متاح" backTo="/patient">
      <p className="mt-6 text-center text-sm text-muted-foreground">المنشور ده مش موجود أو تم حذفه.</p>
    </AppShell>
  ),
  component: PostPage,
});

function PostPage() {
  const { post } = Route.useLoaderData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, []);

  if (!post) {
    return (
      <AppShell title="المنشور غير متاح" backTo="/patient">
        <p className="mt-6 text-center text-sm text-muted-foreground">المنشور ده مش موجود أو تم حذفه.</p>
        <Link
          to="/patient/search"
          className="mt-4 flex items-center justify-center rounded-2xl gradient-primary py-3 text-sm font-extrabold text-white"
        >
          ابحث عن عيادة
        </Link>
      </AppShell>
    );
  }

  const viewerPost: ViewerPost = {
    id: post.id,
    url: post.url,
    mediaType: post.mediaType,
    caption: post.caption,
  };

  return (
    <AppShell title={post.doctor} subtitle="منشور من العيادة" backTo="/patient">
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <button onClick={() => setOpen(true)} className="relative block aspect-square w-full bg-surface-deep">
          {post.mediaType === "video" ? (
            <>
              <video src={post.url} className="h-full w-full object-cover" muted playsInline />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-background/70 text-gold backdrop-blur">
                  <Play className="h-6 w-6" />
                </span>
              </span>
            </>
          ) : (
            <img src={post.url} alt={post.caption || `منشور عيادة ${post.doctor}`} className="h-full w-full object-cover" />
          )}
        </button>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-extrabold">{post.doctor}</p>
            {post.isVerified && <BadgeCheck className="h-4 w-4 text-primary" />}
          </div>
          {post.caption && <p className="text-sm leading-relaxed text-muted-foreground">{post.caption}</p>}
          <div className="flex items-center gap-2">
            <Link
              to="/patient/clinic/$id"
              params={{ id: post.clinicId }}
              className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-2xl gradient-primary py-3 text-xs font-black text-white"
            >
              <CalendarPlus className="h-4 w-4" /> افتح العيادة واحجز
            </Link>
            <button
              onClick={() =>
                shareLink({
                  title: `${post.doctor} — سندي`,
                  text: `شوف منشور عيادة ${post.doctor} على سندي`,
                  url: postShareUrl(post.id),
                })
              }
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-gold/40 bg-card py-3 text-xs font-bold text-gold"
            >
              <Share2 className="h-4 w-4" /> مشاركة
            </button>
          </div>
        </div>
      </div>

      {open && (
        <PostViewer
          posts={[viewerPost]}
          startIndex={0}
          doctor={post.doctor}
          isVerified={post.isVerified}
          onClose={() => setOpen(false)}
        />
      )}
    </AppShell>
  );
}

/** Kept so unused-import lint stays quiet if the loader spinner is reintroduced. */
export const _spinner = Loader2;
