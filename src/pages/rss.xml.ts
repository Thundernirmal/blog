import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '@/config';
import { getPostUrl, getPublishedPosts } from '@/lib/content';

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      link: getPostUrl(post),
      categories: post.data.tags,
      customData: `<author>${SITE.author}</author>`,
    })),
    customData: `<language>${SITE.language}</language>`,
  });
}
