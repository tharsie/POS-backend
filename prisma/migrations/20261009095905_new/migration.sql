/*
  Warnings:

  - You are about to drop the column `kitchen_station` on the `categories` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[business_id,branch_id,code]` on the table `order_services` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "order_services_branch_id_code_key";

-- AlterTable
ALTER TABLE "cash_register_shifts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "kitchen_station";

-- AlterTable
ALTER TABLE "order_services" ALTER COLUMN "fee_type" SET DEFAULT 'FIXED',
ALTER COLUMN "fee_value" SET DEFAULT 0.00;

-- CreateIndex
CREATE INDEX "order_services_branch_id_idx" ON "order_services"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_services_business_id_branch_id_code_key" ON "order_services"("business_id", "branch_id", "code");
