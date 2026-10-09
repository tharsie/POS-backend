-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unit" TEXT DEFAULT 'pcs';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "unit" TEXT DEFAULT 'pcs';

-- AlterTable
ALTER TABLE "kitchen_order_ticket_items" ADD COLUMN IF NOT EXISTS "unit" TEXT DEFAULT 'pcs';
