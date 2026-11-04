"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { newsRepository, slugifyTitle } from "@/features/news/repository";
import { NEWS_CATEGORIES, type NewsCategory } from "@/content/news";
import { projects } from "@/content/projects";
import { PLACEHOLDER_IMAGE, resolveCoverAndGallery } from "@/lib/photoUploads";

export interface NewsFormState {
  error?: string;
}

function isNewsCategory(value: string): value is NewsCategory {
  return (NEWS_CATEGORIES as readonly string[]).includes(value);
}

/** Shared authenticate → authorize step every action below starts with (brief's own repeated pattern from the API routes). */
async function requireContentPermission(permission: "content.create" | "content.update" | "content.delete") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, permission)) throw new Error("Forbidden");
  return user;
}

function parseArticleFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const date = String(formData.get("date") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const contentRaw = String(formData.get("content") ?? "");
  const coverImageAlt = String(formData.get("coverImageAlt") ?? "").trim();
  const projectSlug = String(formData.get("projectSlug") ?? "").trim();
  const featured = formData.get("featured") === "on";

  if (!title || title.length < 4) return { error: "Title must be at least 4 characters." } as const;
  if (!isNewsCategory(category)) return { error: "Choose a valid category." } as const;
  if (!date) return { error: "Enter a publish date (e.g. \"September 2026\")." } as const;
  if (!excerpt || excerpt.length < 10) return { error: "Excerpt must be at least 10 characters." } as const;

  const content = contentRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (content.length === 0) return { error: "Write at least one paragraph of content." } as const;

  return {
    fields: {
      title,
      category,
      date,
      excerpt,
      content,
      coverImageAlt: coverImageAlt || title,
      projectSlug: projectSlug && projects.some((p) => p.slug === projectSlug) ? projectSlug : undefined,
      featured,
    },
  } as const;
}

/**
 * Cover photo + extra in-article photos, through the same shared helper the
 * project and unit forms use (the article's `images` play the part of the
 * gallery). A cover left alone keeps its current file; extra photos append,
 * and ticked ones are removed.
 */
async function resolveNewsPhotos(
  formData: FormData,
  existing: { coverImage: { src: string; alt: string }; images?: { src: string; alt: string }[] } | undefined,
  alt: string,
) {
  const result = await resolveCoverAndGallery(
    formData,
    existing ? { coverImage: existing.coverImage, gallery: existing.images ?? [] } : undefined,
    alt,
    "news",
  );
  if (result.error) return { error: result.error };
  const gallery = (result.gallery ?? []).filter((g) => g.src !== PLACEHOLDER_IMAGE);
  return { coverImage: result.coverImage, images: gallery.length > 0 ? gallery : undefined };
}

export async function createNewsArticle(_prevState: NewsFormState, formData: FormData): Promise<NewsFormState> {
  const user = await requireContentPermission("content.create");

  const parsed = parseArticleFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const existing = await newsRepository.list();
  let slug = slugifyTitle(fields.title);
  if (existing.some((a) => a.slug === slug)) {
    slug = `${slug}-${existing.length + 1}`;
  }

  const photos = await resolveNewsPhotos(formData, undefined, fields.coverImageAlt);
  if (photos.error) return { error: photos.error };

  const id = randomUUID();
  await newsRepository.create({
    id,
    slug,
    title: fields.title,
    category: fields.category,
    date: fields.date,
    excerpt: fields.excerpt,
    coverImage: { src: photos.coverImage?.src ?? PLACEHOLDER_IMAGE, alt: fields.coverImageAlt },
    images: photos.images,
    content: fields.content,
    projectSlug: fields.projectSlug,
    featured: fields.featured,
  });

  await recordAuditEvent({
    actorUserId: user.id,
    action: "content.news.create",
    entityType: "NewsArticle",
    entityId: id,
  });

  revalidatePath("/news");
  revalidatePath(`/news/${slug}`);
  revalidatePath("/admin/content/news");
  revalidatePath("/", "layout");
  redirect("/admin/content/news");
}

export async function updateNewsArticle(
  id: string,
  _prevState: NewsFormState,
  formData: FormData,
): Promise<NewsFormState> {
  const user = await requireContentPermission("content.update");

  const parsed = parseArticleFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const existingArticle = await newsRepository.findById(id);
  if (!existingArticle) return { error: "This article no longer exists." };

  const photos = await resolveNewsPhotos(formData, existingArticle, fields.coverImageAlt);
  if (photos.error) return { error: photos.error };

  const updated = await newsRepository.update(id, {
    title: fields.title,
    category: fields.category,
    date: fields.date,
    excerpt: fields.excerpt,
    coverImage: { src: photos.coverImage?.src ?? existingArticle.coverImage.src, alt: fields.coverImageAlt },
    images: photos.images,
    content: fields.content,
    projectSlug: fields.projectSlug,
    featured: fields.featured,
  });
  if (!updated) return { error: "This article no longer exists." };

  await recordAuditEvent({
    actorUserId: user.id,
    action: "content.news.update",
    entityType: "NewsArticle",
    entityId: id,
  });

  revalidatePath("/news");
  revalidatePath(`/news/${existingArticle.slug}`);
  revalidatePath("/admin/content/news");
  revalidatePath("/", "layout");
  redirect("/admin/content/news");
}

export async function deleteNewsArticle(id: string): Promise<void> {
  const user = await requireContentPermission("content.delete");

  const article = await newsRepository.findById(id);
  if (!article) return;

  await newsRepository.remove(id);

  await recordAuditEvent({
    actorUserId: user.id,
    action: "content.news.delete",
    entityType: "NewsArticle",
    entityId: id,
  });

  revalidatePath("/news");
  revalidatePath(`/news/${article.slug}`);
  revalidatePath("/admin/content/news");
  revalidatePath("/", "layout");
}
