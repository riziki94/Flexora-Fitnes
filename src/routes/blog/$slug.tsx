import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { blogPosts } from "~/lib/blog-posts";
import { renderMarkdown } from "~/lib/markdown";
import iconSvg from "~/assets/flexora-icon.svg";
import { trackEvent } from "~/lib/pageview-tracker";
import { useTranslation } from "~/lib/i18n";
export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = blogPosts.find((p) => p.slug === params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData.metaTitle },
      { name: "description", content: loaderData.metaDescription },
      { property: "og:title", content: loaderData.metaTitle },
      { property: "og:description", content: loaderData.metaDescription },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `https://4b6e74dd2d7c803e38bdf306792a9d33.ctonew.app/blog/${loaderData.slug}` },
      { property: "article:published_time", content: loaderData.date },
      { property: "article:author", content: loaderData.author },
    ],
    links: [
      {
        rel: "canonical",
        href: `https://4b6e74dd2d7c803e38bdf306792a9d33.ctonew.app/blog/${loaderData.slug}`,
      },
    ],
  }),
  component: BlogPostPage,
});
function BlogPostPage() {
  const { t } = useTranslation();
  const post = Route.useLoaderData();
  useEffect(() => {
    trackEvent({ eventType: "blog_view", path: `/blog/${post.slug}` });
  }, [post.slug]);
  return (
    <div className="min-h-dvh bg-white text-gray-900">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <img src={iconSvg} alt="Flexora" className="h-9 w-9" />
            <span className="text-xl font-bold text-[#1A56DB]">Flexora</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/blog" className="text-sm font-medium text-[#1A56DB]">
              Blog
            </a>
            <a
              href="/register"
              className="rounded-full bg-[#1A56DB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors"
            >
              {t("banner.startFree")}
            </a>
          </div>
        </div>
      </nav>
      {/* Back link */}
      <div className="mx-auto max-w-3xl px-6 pt-8">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#1A56DB] hover:underline"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("blog.backToBlog")}
        </Link>
      </div>
      {/* Article header */}
      <article className="mx-auto max-w-3xl px-6 pb-8 pt-6">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="inline-block rounded-full bg-[#1A56DB]/10 px-3 py-1 text-xs font-semibold text-[#1A56DB]">
            {post.category}
          </span>
          <span className="text-xs text-gray-400">{post.readTime}</span>
        </div>
        <h1 className="mb-4 text-3xl font-bold text-gray-900 leading-tight md:text-4xl">
          {post.title}
        </h1>
        <div className="mb-10 flex items-center gap-4 border-b border-gray-100 pb-6">
          <div>
            <p className="text-sm font-medium text-gray-700">{post.author}</p>
            <p className="text-xs text-gray-400">
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        {/* Article content */}
        <div
          className="prose-custom"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />
      </article>
      {/* CTA at bottom */}
      <section className="bg-gradient-to-br from-[#1A56DB] to-[#1E40AF] py-16 text-white mt-12">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-2xl font-bold md:text-3xl">
            {t("blog.ctaTitle")}
          </h2>
          <p className="mb-8 text-lg text-blue-100">
            {t("blog.ctaDescription")}
          </p>
          <a
            href="/register"
            className="inline-block rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#1A56DB] shadow-lg hover:bg-blue-50 transition-colors"
          >
            {t("blog.ctaButton")}
          </a>
        </div>
      </section>
      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
            <div className="flex items-center gap-2">
              <img src={iconSvg} alt="Flexora" className="h-6 w-6" />
              <span className="text-sm font-semibold text-gray-500">Flexora Fitnes</span>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Flexora Fitnes. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
