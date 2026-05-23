import { readData } from "@/lib/actions/read";
import SubmitButton from "@/components/SubmitButton";
import { IconChevronLeft } from "@tabler/icons-react";
import Link from "next/link";

export default async function NewForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex justify-center w-full h-full">
      <main className="w-2xl mt-4">
        <div className="flex items-center">
          <Link href="/" className="btn btn-ghost btn-square">
            <IconChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold ml-2">New Form</h1>
        </div>

        {error && (
          <div role="alert" className="alert alert-error mt-6">
            {error}
          </div>
        )}

        <form className="flex flex-col" action={readData}>
          <input type="hidden" name="returnUrl" value="/new-form" />
          <label className="label mt-8">
            <span className="label-text">Google Form URL *</span>
          </label>
          <input
            className="input w-full mt-1"
            placeholder="Form URL"
            name="formUrl"
            required
          ></input>
          <p className="card p-2 mt-4 bg-accent text-accent-content">
            Ensure that the bot account (creativesolutions@cedarville.edu) has
            access to both the Google Form and the Basecamp project.
          </p>
          <SubmitButton label="Create from Form" loadingLabel="Creating…" />
        </form>
      </main>
    </div>
  );
}
