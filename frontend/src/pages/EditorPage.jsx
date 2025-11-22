import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarClock } from "lucide-react";
import PDFEditor from "@/components/PDFEditor";

const EditorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pdfData, fileName, templateId, templateName } = location.state || {};
  const [pageCount, setPageCount] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const handleBack = () => {
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Leave anyway?")) {
        return;
      }
    }
    navigate("/templates");
  };

  const handleSaveSuccess = () => {
    setIsDirty(false);
    // Optionally show toast via setState in parent; staying on page
  };

  if (!pdfData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No PDF data found</p>
          <Button onClick={handleBack}>Go to Templates</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Header with back button */}
      <header className="flex items-center gap-4 border-b border-border bg-background px-4 py-3 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-9 w-9"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">
            {templateName || fileName || "Edit Template"}
          </h1>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <PDFEditor
          pdfData={pdfData}
          fileName={fileName}
          templateId={templateId}
          templateName={templateName}
          onSaveSuccess={handleSaveSuccess}
          onDocumentInfo={({ numPages }) => setPageCount(numPages)}
          onDirtyChange={setIsDirty}
        />
      </main>
    </div>
  );
};

export default EditorPage;
