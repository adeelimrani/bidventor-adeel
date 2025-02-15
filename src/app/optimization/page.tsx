"use client"

import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [excelUrl, setExcelUrl] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event:any) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return alert("Please select a file!");

    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoading(true);

    try {
      const response = await axios.post("http://127.0.0.1:8000/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setExcelUrl(`http://127.0.0.1:8000/download/excel`);
      setPdfUrl(`http://127.0.0.1:8000/download/pdf`);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-5">
      <h1 className="text-2xl font-bold mb-4">Upload Excel File</h1>
      
      <input type="file" accept=".xlsx" onChange={handleFileChange} className="mb-4" />
      
      <button 
        onClick={handleUpload} 
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        disabled={loading}
      >
        {loading ? "Processing..." : "Upload & Process"}
      </button>

      {excelUrl && pdfUrl && (
        <div className="mt-5">
          <h2 className="text-xl font-semibold mb-2">Download Results:</h2>
          <a href={excelUrl} className="block text-blue-600 mb-2" download>📄 Download Excel</a>
          <a href={pdfUrl} className="block text-blue-600" download>📑 Download PDF</a>
        </div>
      )}
    </div>
  );
}
