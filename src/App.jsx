
import { useState } from "react";
import "./App.css";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  function handleFile(event) {
    const selected = event.target.files[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">C</div>
          <div>
            <h2>ClinGuard</h2>
            <span>MRI Intelligence</span>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>
        <div className="nav-item active">◈ &nbsp; MRI Analysis</div>
        <div className="nav-item">▦ &nbsp; Model Overview</div>
        <div className="nav-item">◎ &nbsp; Explainability</div>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          Research prototype
          <p>AI-assisted image analysis</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace / </span>
            <strong>MRI Analysis</strong>
          </div>
          <span className="badge">RESEARCH MODE</span>
        </header>

        <section className="welcome">
          <span className="eyebrow">AI-POWERED IMAGE ANALYSIS</span>
          <h1>Understand the image.<br /><span>Explore the evidence.</span></h1>
          <p>
            Upload a brain MRI image to prepare for model-assisted
            classification and visual explanation.
          </p>
        </section>

        <section className="stats">
          <div className="stat-card">
            <span>MODEL ARCHITECTURE</span>
            <h3>ResNet18</h3>
            <p>Transfer learning</p>
          </div>
          <div className="stat-card">
            <span>TEST ACCURACY</span>
            <h3>92.40%</h3>
            <p>Existing evaluation result</p>
          </div>
          <div className="stat-card">
            <span>OUTPUT CLASSES</span>
            <h3>04 classes</h3>
            <p>Multi-class classification</p>
          </div>
        </section>

        <section className="workspace">
          <div className="panel upload-panel">
            <div className="panel-heading">
              <div>
                <span className="step">STEP 01</span>
                <h2>Upload MRI image</h2>
              </div>
              <span className="file-tag">JPG · PNG</span>
            </div>

            <label className="dropzone">
              {preview ? (
                <img src={preview} alt="Selected MRI preview" />
              ) : (
                <>
                  <div className="upload-icon">↑</div>
                  <h3>Choose an MRI image</h3>
                  <p>Click here to browse your files</p>
                  <span className="browse-button">Select image</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
              />
            </label>

            {file && (
              <div className="file-info">
                <span>Selected file</span>
                <strong>{file.name}</strong>
                <button
                  onClick={() => {
                    URL.revokeObjectURL(preview);
                    setFile(null);
                    setPreview("");
                  }}
                >
                  Remove
                </button>
              </div>
            )}

            <button className="analyze-button" disabled>
              Model API not connected yet &nbsp; →
            </button>
            <p className="helper">
              Image preview only. Classification will be enabled after
              the Python inference API is connected.
            </p>
          </div>

          <div className="panel results-panel">
            <span className="step">STEP 02</span>
            <h2>Analysis results</h2>
            <div className="empty-state">
              <div className="scan-icon">⌕</div>
              <h3>Awaiting analysis</h3>
              <p>
                Your model predictions and confidence scores will
                appear here after integration.
              </p>
            </div>

            <div className="class-list">
              {["Glioma", "Meningioma", "No tumor", "Pituitary"].map(
                (name) => (
                  <div className="class-row" key={name}>
                    <span>{name}</span>
                    <span className="pending">Pending</span>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        <footer>
          <strong>ClinGuard MRI</strong>
          <span>
            Research prototype · Not intended for medical diagnosis
          </span>
        </footer>
      </main>
    </div>
  );
}
