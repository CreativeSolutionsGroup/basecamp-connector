import ConnectionCard from "@/components/ConnectionCard";
import AddConnectionButton from "@/components/AddConnectionButton";
import SearchParamToast from "@/components/SearchParamToast";
import SubmitButton from "@/components/SubmitButton";
import { ConnectionsProvider } from "@/components/ConnectionsContext";
import SaveBar from "@/components/SaveBar";
import { readData } from "@/lib/actions/read";
import { db } from "@/lib/db";
import { parseFormFields } from "@/lib/utils/google";
import { buildBasecampUrl } from "@/lib/utils/basecamp";
import { IconChevronLeft, IconMessages } from "@tabler/icons-react";
import Link from "next/link";
import { Suspense } from "react";
import DeleteFormButton from "@/components/DeleteFormButton";

export default async function FormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);

  const formData = await db.form.findUnique({
    where: { id },
    include: { connections: true },
  });

  const formFields = parseFormFields(formData?.formFields);
  const formUrl = formData
    ? `https://docs.google.com/forms/d/${formData.formId}/edit`
    : "";

  return (
    <ConnectionsProvider>
      <div className="flex justify-center w-full">
        <Suspense>
          <SearchParamToast
            param="updated"
            message="Form updated successfully."
          />
        </Suspense>
        <main className="w-2xl mt-4 mb-16">
          <div className="flex items-center gap-2">
            <Link href="/" className="btn btn-ghost btn-square">
              <IconChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold">Form Details</h1>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href={`/form/${id}/responses`}
                className="btn btn-ghost btn-sm"
              >
                <IconMessages className="w-4 h-4" />
                Responses
              </Link>
              <DeleteFormButton formId={id} />
            </div>
          </div>

          {error && (
            <div role="alert" className="alert alert-error mt-6">
              {error}
            </div>
          )}

          <form className="flex flex-col" action={readData}>
            <input type="hidden" name="returnUrl" value={`/form/${id}`} />
            <label className="label mt-8">
              <span className="label-text">Google Form URL *</span>
            </label>
            <input
              className="input w-full mt-1"
              placeholder="Form URL"
              defaultValue={formUrl}
              name="formUrl"
              required
            />
            <SubmitButton
              label="Update from Form"
              loadingLabel="Updating…"
              className="mt-4"
            />
            <hr className="mt-6" />
          </form>

          <p className="card p-2 mt-6 bg-accent text-accent-content">
            Ensure that the bot account (creativesolutions@cedarville.edu) has
            access to both the Google Form and the Basecamp project.
          </p>

          <div className="flex items-center justify-between mt-6">
            <h2 className="text-lg font-semibold">Connections</h2>
            <AddConnectionButton formId={id} />
          </div>

          {formData?.connections.length === 0 && (
            <p className="text-base-content/50 text-sm mt-4">
              No connections yet. Add one above.
            </p>
          )}

          {formData?.connections.map((c) => (
            <ConnectionCard
              key={c.id}
              connection={{
                id: c.id,
                type: c.type,
                title: c.title,
                content: c.content,
                routingQuestionId: c.routingQuestionId,
                routingValue: c.routingValue,
                exclusive: c.exclusive,
                basecampUrl:
                  c.basecampProjectId && c.basecampSubItemId
                    ? buildBasecampUrl(
                        c.type,
                        c.basecampProjectId,
                        c.basecampSubItemId,
                      )
                    : "",
              }}
              formFields={formFields}
            />
          ))}
        </main>
        <SaveBar />
      </div>
    </ConnectionsProvider>
  );
}
