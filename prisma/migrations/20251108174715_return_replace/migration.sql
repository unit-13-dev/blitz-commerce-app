-- CreateEnum
CREATE TYPE "ReturnReplaceRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'processed');

-- CreateEnum
CREATE TYPE "ReturnReplaceRequestType" AS ENUM ('return', 'replace');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'return_requested';
ALTER TYPE "OrderStatus" ADD VALUE 'replace_requested';
ALTER TYPE "OrderStatus" ADD VALUE 'return_approved';
ALTER TYPE "OrderStatus" ADD VALUE 'replace_approved';
ALTER TYPE "OrderStatus" ADD VALUE 'return_rejected';
ALTER TYPE "OrderStatus" ADD VALUE 'replace_rejected';
ALTER TYPE "OrderStatus" ADD VALUE 'return_processed';
ALTER TYPE "OrderStatus" ADD VALUE 'replace_processed';

-- CreateTable
CREATE TABLE "return_replace_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "type" "ReturnReplaceRequestType" NOT NULL,
    "status" "ReturnReplaceRequestStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "returnAmount" DECIMAL(10,2),
    "returnPaymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_replace_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "return_replace_requests" ADD CONSTRAINT "return_replace_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_replace_requests" ADD CONSTRAINT "return_replace_requests_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_replace_requests" ADD CONSTRAINT "return_replace_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_replace_requests" ADD CONSTRAINT "return_replace_requests_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
