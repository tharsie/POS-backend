-- AlterTable
ALTER TABLE "orders" 
ADD COLUMN "notes" TEXT,
ADD COLUMN "table_name" TEXT,
ADD COLUMN "service_name" TEXT,
ADD COLUMN "service_fee" DECIMAL(12,2) NOT NULL DEFAULT 0;
