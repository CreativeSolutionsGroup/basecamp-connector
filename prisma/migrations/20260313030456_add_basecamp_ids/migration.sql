/*
  Warnings:

  - Added the required column `basecamp_project_id` to the `connections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `basecamp_sub_item_id` to the `connections` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "connections" ADD COLUMN     "basecamp_project_id" TEXT NOT NULL,
ADD COLUMN     "basecamp_sub_item_id" TEXT NOT NULL;
