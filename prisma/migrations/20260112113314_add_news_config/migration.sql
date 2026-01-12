-- CreateTable
CREATE TABLE "NewsConfig" (
    "id" SERIAL NOT NULL,
    "subtitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsConfig_pkey" PRIMARY KEY ("id")
);
