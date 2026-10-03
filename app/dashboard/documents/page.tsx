export default function DocumentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
        <p className="text-sm font-medium text-gray-900">
          No documents uploaded yet
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Upload your security policies and documentation here so Trustloop
          can draft answers from them.
        </p>
      </div>
    </div>
  );
}
