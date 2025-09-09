-- CreateEnum
CREATE TYPE "public"."TemplateType" AS ENUM ('SVG', 'CANVAS', 'HYBRID');

-- CreateEnum
CREATE TYPE "public"."GenerationType" AS ENUM ('TEMPLATE', 'AI_GENERATED', 'HYBRID');

-- CreateTable
CREATE TABLE "public"."TemplateCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "type" "public"."TemplateType" NOT NULL DEFAULT 'SVG',
    "svgContent" TEXT,
    "canvasConfig" JSONB,
    "parameters" JSONB NOT NULL,
    "previewUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GeneratedImage" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "questionId" TEXT,
    "generationType" "public"."GenerationType" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "parameters" JSONB,
    "cost" DOUBLE PRECISION,
    "cacheKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateCategory_name_key" ON "public"."TemplateCategory"("name");

-- CreateIndex
CREATE INDEX "GeneratedImage_cacheKey_idx" ON "public"."GeneratedImage"("cacheKey");

-- CreateIndex
CREATE INDEX "GeneratedImage_questionId_idx" ON "public"."GeneratedImage"("questionId");

-- AddForeignKey
ALTER TABLE "public"."Template" ADD CONSTRAINT "Template_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."TemplateCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GeneratedImage" ADD CONSTRAINT "GeneratedImage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GeneratedImage" ADD CONSTRAINT "GeneratedImage_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
