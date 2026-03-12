import Link from "next/link";

export default function Home() {
  return (
    <div className="flex justify-center w-full h-full">
      <main className="w-2xl mt-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Forms &rarr; Basecamp</h1>
          <Link href="/new-form" className="btn btn-primary">New Form</Link>
        </div>

      </main>
    </div>
  );
}
