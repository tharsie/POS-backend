-- CreateEnum
CREATE TYPE "KotItemChangeType" AS ENUM ('NEW', 'MODIFIED', 'CANCELLED', 'UNCHANGED');

-- AlterTable
ALTER TABLE "kitchen_order_tickets" 
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "is_update" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "kitchen_order_ticket_items" (
    "id" UUID NOT NULL,
    "kot_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "previous_quantity" DECIMAL(14,3),
    "change_type" "KotItemChangeType" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_order_ticket_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kitchen_order_ticket_items_kot_id_idx" ON "kitchen_order_ticket_items"("kot_id");

-- CreateIndex
CREATE INDEX "kitchen_order_ticket_items_product_id_idx" ON "kitchen_order_ticket_items"("product_id");

-- AddForeignKey
ALTER TABLE "kitchen_order_ticket_items" ADD CONSTRAINT "kitchen_order_ticket_items_kot_id_fkey" FOREIGN KEY ("kot_id") REFERENCES "kitchen_order_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
