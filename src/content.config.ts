import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        description: z.string().min(20),
        slug: z.string().min(1).optional(),
        publishedAt: z.coerce.date(),
        updatedAt: z.coerce.date().optional(),
        draft: z.boolean().default(false),
        tags: z
          .array(z.string().min(1))
          .default([])
          .transform((tags) => [...new Set(tags.map((tag) => tag.trim().toLowerCase()))]),
        heroImage: image().optional(),
        heroAlt: z.string().optional(),
        originalUrl: z.url().optional(),
        mediumId: z.string().optional(),
        archived: z.boolean().default(false),
      })
      .superRefine((data, context) => {
        if (data.heroImage && !data.heroAlt?.trim()) {
          context.addIssue({
            code: 'custom',
            path: ['heroAlt'],
            message: 'heroAlt is required when heroImage is present',
          });
        }
      }),
});

export const collections = { blog };
