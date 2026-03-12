-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "response_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "basecamp_project_id" TEXT,
    "basecamp_column_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);
