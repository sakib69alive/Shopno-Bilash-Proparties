CREATE TABLE "FinanceCalculation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceCalculation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceCalculation_ownerId_updatedAt_idx" ON "FinanceCalculation"("ownerId", "updatedAt");
