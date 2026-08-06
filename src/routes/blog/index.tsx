import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { blogPosts } from "~/lib/blog-posts";
import iconSvg from "~/assets/flexora-icon.svg";
import { trackEvent } from "~/lib/pageview-tracker";
import { useTranslation } from "~/lib/i18n";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog | Flexora Fitnes - Fitness Tips, Guides & Technology" },
      {
        name: "description",
        content:
          "Read the latest fitness guides, technology insights, and training tips from Flexora Fitnes. Learn about AI coaching, 3D muscle visualization, and more.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.flexorafitnes.com/blog" }],
  }),
  component: BlogIndex,
});

const BASE_URL = "https://www.flexorafitnes.com";

function BlogIndex() {
  const { t } = useTranslation();
  useEffect(() => {
    trackEvent({ eventType: "blog_view", path: "/blog" });
  }, []);

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

      {/* Header */}
      <section className="bg-gradient-to-br from-[#1A56DB] via-[#3B82F6] to-[#1E40AF] py-16 text-white">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h1 className="text-4xl font-bold md:text-5xl">{t("blog.header")}</h1>
          <p className="mt-4 text-lg text-blue-100 md:text-xl">
            {t("blog.subtitle")}
          </p>
        </div>
      </section>

      {/* Blog posts grid */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <Link
                key={post.slug}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="group block rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-[#3B82F6]/40 hover:-translate-y-1"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-block rounded-full bg-[#1A56DB]/10 px-3 py-1 text-xs font-semibold text-[#1A56DB]">
                    {post.category}
                  </span>
                  <span className="text-xs text-gray-400">{post.readTime}</span>
                </div>
                <h2 className="mb-3 text-xl font-bold text-gray-900 group-hover:text-[#1A56DB] transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="mb-4 text-sm text-gray-500 line-clamp-3">
                  {post.metaDescription}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-sm font-medium text-[#1A56DB] group-hover:translate-x-1 transition-transform">
                    {t("blog.readMore")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#1A56DB] to-[#1E40AF] py-16 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold">{t("blog.ctaTitle")}</h2>
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
              &copy; {new Date().getFullYear()} {t("footer.rights")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
