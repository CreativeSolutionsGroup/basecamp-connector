import { db } from "@/lib/db";
import { IconPlus, IconSettings } from "@tabler/icons-react";
import Link from "next/link";

export default async function Home() {
  const forms = await db.form.findMany({
    include: { connections: true },
  });

  return (
    <div className="flex justify-center w-full h-full">
      <main className="w-2xl mt-4">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-auto">Forms to Basecamp</h1>
          <Link href="/new-form" className="btn btn-primary mr-2">
            <IconPlus className="w-5 h-5 inline-block mr-1" /> New Form
          </Link>
          <Link href="/setup" className="btn btn-ghost">
            <IconSettings />
          </Link>
        </div>
        <div>
          {forms.length === 0 ? (
            <p className="mt-6 text-center text-gray-500">No forms yet</p>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {forms.map((form) => (
                <Link
                  key={form.id}
                  href={`/form/${form.id}`}
                  className="card bg-base-100 border border-base-300 hover:bg-base-200 transition-colors"
                >
                  <div className="card-body">
                    <h2 className="card-title">{form.title}</h2>
                    <p className="text-sm text-gray-500">
                      {form.connections.length} connection
                      {form.connections.length !== 1 && "s"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
