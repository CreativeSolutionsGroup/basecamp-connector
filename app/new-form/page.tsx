import TrixEditor from "@/components/TrixEditor";

export default function NewForm() {
  return (
    <div className="flex justify-center w-full h-full">
      <main className="w-2xl mt-4">
        <h1 className="text-2xl font-bold">New Form</h1>

        <form className="flex flex-col">
          <label className="label mt-8">
            <span className="label-text">Google Form URL</span>
          </label>
          <input className="input w-full mt-1" placeholder="Form URL"></input>
          <div className="flex flex-col">
            <label className="label mt-4">
              <span className="label-text">Basecamp Item Type</span>
            </label>
            <select className="select mt-1" defaultValue="default">
              <option disabled value="default">
                Select an item type
              </option>
              <option value="todo">Todo</option>
              <option value="card">Card</option>
            </select>
          </div>
          <label className="label mt-4">
            <span className="label-text">Basecamp URL</span>
          </label>
          <input
            className="input w-full mt-1"
            placeholder="Basecamp URL"
          ></input>
          <button className="btn btn-primary mt-6 ml-auto" type="submit">
            Update from Form
          </button>
          <hr className="mt-6" />
        </form>
        <label className="label mt-6">
          <span className="label-text">Format</span>
        </label>
        <TrixEditor className="mt-2" />
        <p className="card p-2 mt-4 bg-accent text-accent-content">
          Ensure that the bot account (creativesolutions@cedarville.edu) has
          access to both the Google Form and the Basecamp project.
        </p>
      </main>
    </div>
  );
}
