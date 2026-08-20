-- CreateEnum
CREATE TYPE "ServiceFeeType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "order_services" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fee_type" "ServiceFeeType" NOT NULL,
    "fee_value" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_services_branch_id_code_key" ON "order_services"("branch_id", "code");

-- CreateIndex
CREATE INDEX "order_services_business_id_idx" ON "order_services"("business_id");

-- AddForeignKey
ALTER TABLE "order_services" ADD CONSTRAINT "order_services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_services" ADD CONSTRAINT "order_services_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
