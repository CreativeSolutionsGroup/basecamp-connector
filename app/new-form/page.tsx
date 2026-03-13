import { readData } from "@/lib/actions/read";
import { IconChevronLeft } from "@tabler/icons-react";
import Link from "next/link";

export default function NewForm() {
  return (
    <div className="flex justify-center w-full h-full">
      <main className="w-2xl mt-4">
        <div className="flex items-center">
          <Link href="/" className="btn btn-ghost btn-square">
            <IconChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold ml-2">New Form</h1>
        </div>

        <form className="flex flex-col" action={readData}>
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
          <button className="btn btn-primary mt-6 ml-auto" type="submit">
            Create from Form
          </button>
        </form>
      </main>
    </div>
  );
}
