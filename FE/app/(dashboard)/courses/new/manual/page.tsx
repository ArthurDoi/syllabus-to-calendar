import { ManualEntryForm } from "@/components/course/ManualEntryForm";

export default function ManualEntryPage() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Manual Course Entry</h1>
        <p className="text-gray-600">
          Enter your course information manually. All fields marked with * are required.
        </p>
      </div>
      <ManualEntryForm />
    </div>
  );
}

