import { defineCollection, z } from "astro:content";

const blogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string().trim().min(1),
    date: z.coerce.date(),
    tags: z.array(z.string().trim().min(1)).default([]),
    readingTime: z.string().trim().min(1).optional()
  })
});

export const collections = {
  blog: blogCollection
};
