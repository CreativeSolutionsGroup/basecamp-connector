-- AlterTable
ALTER TABLE "connections" ADD COLUMN     "basecamp_project_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "basecamp_sub_item_name" TEXT NOT NULL DEFAULT '';
