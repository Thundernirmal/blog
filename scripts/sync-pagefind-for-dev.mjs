import { cp, rm } from 'node:fs/promises';

const productionIndex = new URL('../dist/pagefind/', import.meta.url);
const developmentIndex = new URL('../public/pagefind/', import.meta.url);

await rm(developmentIndex, { recursive: true, force: true });
await cp(productionIndex, developmentIndex, { recursive: true });

console.log('Pagefind development index synced to public/pagefind/.');
