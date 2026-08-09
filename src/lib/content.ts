import { getCollection, type CollectionEntry } from 'astro:content';
import { getReadingTime } from '@/lib/reading-time';

export type BlogPost = CollectionEntry<'blog'>;

export function getPostSlug(post: BlogPost) {
  return post.data.slug ?? post.id.replace(/\/index$/, '');
}

export function getPostUrl(post: BlogPost) {
  return `/blog/${getPostSlug(post)}/`;
}

export function getPostReadingTime(post: BlogPost) {
  return getReadingTime(post.body);
}

export async function getPublishedPosts() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort(
    (first, second) => second.data.publishedAt.getTime() - first.data.publishedAt.getTime(),
  );
}

export function getTagCounts(posts: BlogPost[]) {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((first, second) => first.tag.localeCompare(second.tag));
}

export function getPostNeighbors(posts: BlogPost[], current: BlogPost) {
  const index = posts.findIndex((post) => post.id === current.id);
  return {
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index >= 0 && index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}
