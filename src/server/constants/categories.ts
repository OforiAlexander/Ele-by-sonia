export const CATEGORIES = [
  'Ladies Clothing',
  'Gentlemen Clothing',
  'Shoes',
  'Bags',
  'Cosmetics',
] as const;

export type Category = typeof CATEGORIES[number]; //categories should be CRUD
