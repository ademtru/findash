import { DocumentUploader } from './DocumentUploader'

export const dynamic = 'force-dynamic'

export default function ImportPage() {
  return (
    <div className="px-4 py-5 md:px-6 md:py-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-[28px] font-bold text-white tracking-tight">Import</h1>
        <p className="text-[14px] mt-1" style={{ color: 'rgba(235,235,245,0.55)' }}>
          Upload bank statements (PDF) or CSV exports for historical catch-up. AI extracts the transactions — you review and commit.
        </p>
      </div>

      <DocumentUploader />
    </div>
  )
}
