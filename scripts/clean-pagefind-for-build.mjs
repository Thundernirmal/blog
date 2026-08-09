import { rm } from 'node:fs/promises';

const developmentIndex = new URL('../public/pagefind/', import.meta.url);

await rm(developmentIndex, { recursive: true, force: true });
