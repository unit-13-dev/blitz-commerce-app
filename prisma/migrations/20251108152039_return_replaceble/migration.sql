-- AlterTable
ALTER TABLE "products" ADD COLUMN     "isReplaceable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isReturnable" BOOLEAN NOT NULL DEFAULT false;
