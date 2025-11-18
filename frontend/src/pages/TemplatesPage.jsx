import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import TemplateList from "@/components/TemplateList";

const TemplatesPage = () => {
  const navigate = useNavigate();

  const handleSelectTemplate = async (templateData) => {
    // Convert base64 to ArrayBuffer
    const binaryString = atob(templateData.pdfData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    // Navigate to editor with template data
    navigate("/editor", {
      state: {
        pdfData: arrayBuffer,
        fileName: templateData.name + ".pdf",
        templateId: templateData.id,
        templateName: templateData.name,
      },
    });
  };

  const handleNewTemplate = async (id, file) => {
    // Read file as ArrayBuffer
    const reader = new FileReader();
    reader.onload = (e) => {
      navigate("/editor", {
        state: {
          pdfData: e.target.result,
          fileName: file.name,
          templateId: id,
          templateName: "",
        },
      });
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Layout>
      <TemplateList
        onSelectTemplate={handleSelectTemplate}
        onNewTemplate={handleNewTemplate}
      />
    </Layout>
  );
};

export default TemplatesPage;
