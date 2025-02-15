"use client"

import { useState } from "react";
import axios from "axios";
import { CloudUpload, File, FileText } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 p-6">
      <div className="bg-white shadow-lg rounded-2xl p-6 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Upload Excel File</h1>
        <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition">
          <CloudUpload className="w-10 h-10 text-blue-500 mb-2" />
          <span className="text-gray-600">Click to upload or drag & drop</span>
          <input type="file" accept=".xlsx" onChange={handleFileChange} className="hidden" />
        </label>
        <button
          onClick={handleUpload}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 transition"
          disabled={loading}
        >
          {loading ? "Processing..." : "Upload & Process"}
        </button>

        {excelUrl && pdfUrl && (
          <div className="mt-6 text-left">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Download Results:</h2>
            <a href={excelUrl} className="flex items-center text-blue-600 hover:underline mb-2" download>
              <FileText className="w-5 h-5 mr-2" /> Download Excel
            </a>
            <a href={pdfUrl} className="flex items-center text-blue-600 hover:underline" download>
              <File className="w-5 h-5 mr-2" /> Download PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
