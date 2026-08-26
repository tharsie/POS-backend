-- CreateTable
CREATE TABLE "kitchen_stations" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "printer_ip" TEXT,
    "printer_port" INTEGER NOT NULL DEFAULT 9100,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_stations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "kitchen_station_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_stations_business_id_code_key" ON "kitchen_stations"("business_id", "code");

-- CreateIndex
CREATE INDEX "kitchen_stations_business_id_idx" ON "kitchen_stations"("business_id");

-- CreateIndex
CREATE INDEX "kitchen_stations_branch_id_idx" ON "kitchen_stations"("branch_id");

-- CreateIndex
CREATE INDEX "categories_kitchen_station_id_idx" ON "categories"("kitchen_station_id");

-- AddForeignKey
ALTER TABLE "kitchen_stations" ADD CONSTRAINT "kitchen_stations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_stations" ADD CONSTRAINT "kitchen_stations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_kitchen_station_id_fkey" FOREIGN KEY ("kitchen_station_id") REFERENCES "kitchen_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
