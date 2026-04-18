import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="card w-96 bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <h1 className="card-title text-xl">Forms to Basecamp</h1>
          {error && (
            <div role="alert" className="alert alert-error alert-soft py-2">
              <span>Incorrect password.</span>
            </div>
          )}
          <form action={login} className="flex flex-col gap-3">
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Password</span>
              </div>
              <input
                type="password"
                name="password"
                className="input input-bordered w-full"
                autoFocus
                required
              />
            </label>
            <button type="submit" className="btn btn-primary w-full">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
