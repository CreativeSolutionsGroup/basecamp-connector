/*
  Warnings:

  - A unique constraint covering the columns `[form_id]` on the table `forms` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `title` to the `forms` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "forms" ADD COLUMN     "title" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "forms_form_id_key" ON "forms"("form_id");
