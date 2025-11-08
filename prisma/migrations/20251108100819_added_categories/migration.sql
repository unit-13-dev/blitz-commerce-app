/*
  Warnings:

  - The `category` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EcommerceCategory" AS ENUM ('electronics', 'clothing', 'accessories', 'home_garden', 'beauty_personal_care', 'sports_outdoors', 'books_media', 'toys_games', 'automotive', 'health_wellness', 'food_beverages', 'pet_supplies', 'baby_kids', 'jewelry_watches', 'shoes', 'bags_luggage', 'furniture', 'appliances', 'office_supplies', 'art_crafts', 'musical_instruments', 'industrial_scientific', 'other');

-- AlterTable
ALTER TABLE "products" DROP COLUMN "category",
ADD COLUMN     "category" "EcommerceCategory";
