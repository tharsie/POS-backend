-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CashMovementType" AS ENUM ('CASH_IN', 'CASH_OUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shift_id" UUID;

-- CreateTable
CREATE TABLE IF NOT EXISTS "cash_register_shifts" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "opening_float" DECIMAL(12,2) NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opening_note" TEXT,
    "closed_at" TIMESTAMP(3),
    "closing_note" TEXT,
    "actual_cash" DECIMAL(12,2),
    "expected_cash" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "total_sales" DECIMAL(12,2),
    "cash_sales" DECIMAL(12,2),
    "card_sales" DECIMAL(12,2),
    "other_sales" DECIMAL(12,2),
    "total_cash_in" DECIMAL(12,2) DEFAULT 0,
    "total_cash_out" DECIMAL(12,2) DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_register_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cash_movements" (
    "id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cash_register_shifts_business_id_idx" ON "cash_register_shifts"("business_id");
CREATE INDEX IF NOT EXISTS "cash_register_shifts_branch_id_idx" ON "cash_register_shifts"("branch_id");
CREATE INDEX IF NOT EXISTS "cash_register_shifts_user_id_idx" ON "cash_register_shifts"("user_id");
CREATE INDEX IF NOT EXISTS "cash_register_shifts_status_idx" ON "cash_register_shifts"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cash_movements_shift_id_idx" ON "cash_movements"("shift_id");
CREATE INDEX IF NOT EXISTS "orders_shift_id_idx" ON "orders"("shift_id");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "cash_register_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "cash_register_shifts" ADD CONSTRAINT "cash_register_shifts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "cash_register_shifts" ADD CONSTRAINT "cash_register_shifts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "cash_register_shifts" ADD CONSTRAINT "cash_register_shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "cash_register_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
