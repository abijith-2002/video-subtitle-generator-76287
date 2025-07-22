import React, { useEffect, useState, useRef } from "react";
import "./App.css";

// COLOR PALETTE
const COLORS = {
  primary: "#232946",
  secondary: "#b8c1ec",
  accent: "#f7c59f",
  white: "#fff",
  dark: "#1a1a1a",
  border: "#e9ecef"
};

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000"; // Configurable for deployment

// PUBLIC_INTERFACE
function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadVideoId, setUploadVideoId] = useState("");
  const [generationStatus, setGenerationStatus] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [subtitleFormat, setSubtitleFormat] = useState("srt");
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef();

  // Fetch subtitle history
  useEffect(() => {
    fetchHistory();
  }, []);

  // PUBLIC_INTERFACE
  async function fetchHistory() {
    setLoadingHistory(true);
    setErrMsg("");
    try {
      const resp = await fetch(`${API_BASE}/history`);
      if (!resp.ok) throw new Error("Unable to fetch history");
      const data = await resp.json();
      setHistory(data.subtitles || []);
    } catch (e) {
      setErrMsg("Failed to retrieve subtitle history");
    }
    setLoadingHistory(false);
  }

  // PUBLIC_INTERFACE
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length) {
      setSelectedFile(e.target.files[0]);
      setErrMsg("");
      setSuccessMsg("");
    }
  };

  // PUBLIC_INTERFACE
  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile) {
      setErrMsg("Please select a video file to upload.");
      return;
    }
    setUploadStatus("Uploading...");
    setUploadVideoId("");
    setErrMsg("");
    setSuccessMsg("");
    let formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const resp = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData
      });
      if (!resp.ok) throw new Error("Upload failed");
      const resData = await resp.json();
      setUploadStatus("Upload successful.");
      setUploadVideoId(resData.video_id);
      setSuccessMsg(`Uploaded: ${resData.filename}`);
    } catch (e) {
      setUploadStatus("");
      setErrMsg("File upload failed.");
    }
  }

  // PUBLIC_INTERFACE
  async function handleGenerate(e) {
    e.preventDefault();
    if (!uploadVideoId) {
      setErrMsg("Please upload a video first.");
      return;
    }
    setGenerationStatus("Generating subtitles...");
    setIsGenerating(true);
    setErrMsg("");
    setSuccessMsg("");
    try {
      const resp = await fetch(`${API_BASE}/generate_subtitles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: uploadVideoId,
          format: subtitleFormat
        })
      });
      if (!resp.ok) throw new Error("Generation failed");
      const data = await resp.json();
      setGenerationStatus(data.status_text);
      if (data.status_text === "success") {
        setSuccessMsg("Subtitles generated!");
        await fetchHistory();
      } else {
        setErrMsg(`Subtitle generation failed: ${data.status_text}`);
      }
    } catch (e) {
      setErrMsg("Subtitle generation failed.");
      setGenerationStatus("");
    }
    setIsGenerating(false);
  }

  // PUBLIC_INTERFACE
  function handleDownload(videoId, format) {
    window.open(`${API_BASE}/subtitles/${videoId}?format=${format}`, "_blank");
  }

  // PUBLIC_INTERFACE
  function renderHistory() {
    if (loadingHistory) return <div className="history-empty">Loading...</div>;
    if (!history.length)
      return <div className="history-empty">No subtitles generated yet.</div>;
    return (
      <ul className="subtitle-history-list">
        {history.map((item) => (
          <li className="subtitle-history-item" key={item.video_id}>
            <div className="history-item-main">
              <div className="history-filename">{item.original_filename}</div>
              <div className="history-time">
                {new Date(item.created_at).toLocaleString()}
              </div>
            </div>
            <div className="history-downloads">
              {item.formats.map((f) => (
                <button
                  key={f}
                  className="download-btn"
                  onClick={() => handleDownload(item.video_id, f)}
                  title={`Download as ${f.toUpperCase()}`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // PUBLIC_INTERFACE
  function handleClear() {
    setSelectedFile(null);
    setUploadStatus("");
    setUploadVideoId("");
    setGenerationStatus("");
    setErrMsg("");
    setSuccessMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // --- MAIN RENDER ---
  return (
    <div className="App" style={{
      background: COLORS.primary,
      color: COLORS.white,
      minHeight: "100vh"
    }}>
      <header className="main-header" style={{borderBottom: `1.5px solid ${COLORS.secondary}`}}>
        <h1 style={{color: COLORS.secondary, letterSpacing: "0.05em", margin: 0}}>
          🎬 Video Subtitle Generator
        </h1>
        <span className="header-hint" style={{color: COLORS.accent, fontSize: "1.01em"}}>
          Powered by LLM transcription &mdash; modern & minimal design
        </span>
      </header>

      <main className="content-main">
        {/* UPLOAD AREA */}
        <form className="upload-box" onSubmit={handleUpload} style={{background: COLORS.dark}}>
          <label htmlFor="video-upload" className="upload-label">
            <span role="img" aria-label="upload" style={{marginRight: 8}}>⏫</span>
            Choose a video file (mp4, mov, webm, etc)
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="file-input"
            />
          </label>
          <div className="btn-row">
            <button type="submit" className="primary-btn" style={{background: COLORS.secondary, color: COLORS.primary}}>
              Upload
            </button>
            <button type="button" className="secondary-btn" onClick={handleClear}>
              Clear
            </button>
          </div>
          {uploadStatus && <div className="status-upload">{uploadStatus}</div>}
          {successMsg && <div className="status-success">{successMsg}</div>}
          {errMsg && <div className="status-error">{errMsg}</div>}
        </form>

        {/* SUBTITLE GENERATION AREA */}
        <form className="generate-box" onSubmit={handleGenerate}>
          <div className="generate-row">
            <label htmlFor="subtitle-format" style={{marginRight: 12, color: COLORS.secondary}}>
              Subtitle Format
            </label>
            <select
              id="subtitle-format"
              value={subtitleFormat}
              onChange={e => setSubtitleFormat(e.target.value)}
              className="format-select"
              aria-label="Subtitle Format"
            >
              <option value="srt">SRT</option>
              <option value="vtt">VTT</option>
            </select>
            <button
              type="submit"
              className="primary-btn"
              disabled={!uploadVideoId || isGenerating}
              style={{marginLeft: 18, background: COLORS.accent, color: COLORS.primary, fontWeight: 700}}
            >
              {isGenerating ? "Generating..." : "Generate Subtitles"}
            </button>
          </div>
          {generationStatus && <div className="status-generation">{generationStatus}</div>}
        </form>

        {/* HISTORY DOWNLOAD PANEL */}
        <section className="history-panel" style={{background: COLORS.dark}}>
          <h2 style={{color: COLORS.secondary, fontSize: "1.5em", fontWeight: 500, margin: "12px 0 16px 0"}}>Subtitle History</h2>
          {renderHistory()}
        </section>
      </main>

      <footer className="main-footer" style={{marginTop: 48, color: COLORS.secondary}}>
        <span>
          &copy; {new Date().getFullYear()} &mdash; KAVIA Demo |{" "}
          <a
            href="https://github.com/kavia-ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{color: COLORS.accent}}
          >
            GitHub
          </a>
        </span>
      </footer>
    </div>
  );
}

export default App;
