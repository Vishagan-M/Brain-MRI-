
import { useState } from "react";
import "./App.css";

const API_URL = "https://clinguard-api-copy.onrender.com/predict";

const CLASSES = [
  { key: "glioma", label: "Glioma" },
  { key: "meningioma", label: "Meningioma" },
  { key: "notumor", label: "No tumor" },
  { key: "pituitary", label: "Pituitary" },
];

function formatClass(value) {
  const normalized = String(value ?? "").toLowerCase().replace(/[\s_-]/g, "");
  const match = CLASSES.find(
    (item) => item.key.replace(/[\s_-]/g, "") === normalized
  );
  return match?.label ?? String(value ?? "Unknown");
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";

  // The API may return either 0–1 probabilities or 0–100 percentages.
  const percent = number <= 1 ? number * 100 : number;
  return `${percent.toFixed(2)}%`;
}

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function handleFile(event) {
    const selected = event.target.files?.[0];
    event.target.value = "";

    if (!selected) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(selected.type)) {
      setError("Please select a JPG, PNG, or WebP image.");
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("The image must be smaller than 10 MB.");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setError("");
  }

  function removeFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
  }

  async function analyzeImage() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || `Prediction failed (HTTP ${response.status}).`
        );
      }

      if (!data.prediction || data.confidence === undefined) {
        throw new Error("The API returned an unexpected response.");
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message?.includes("Failed to fetch")
          ? "Could not reach the API. It may be starting up, or a network/CORS issue may be preventing access. Please try again."
          : err.message || "Something went wrong while analyzing the image."
      );
    } finally {
      setLoading(false);
    }
  }

  const probabilities = result?.probabilities;
  const probabilityFor = (key) => {
    if (Array.isArray(probabilities)) {
      const index = CLASSES.findIndex((item) => item.key === key);
      return probabilities[index];
    }

    if (probabilities && typeof probabilities === "object") {
      const matchingKey = Object.keys(probabilities).find(
        (item) => item.toLowerCase().replace(/[\s_-]/g, "") === key
      );
      return matchingKey ? probabilities[matchingKey] : undefined;
    }

    return undefined;
  };

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
          <h1>
            Understand the image.
            <br />
            <span>Explore the evidence.</span>
          </h1>
          <p>
            Upload a brain MRI image to explore model-assisted classification.
            Results are experimental and are not a medical diagnosis.
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
              <span className="file-tag">JPG · PNG · WEBP</span>
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
                <button type="button" onClick={removeFile} disabled={loading}>
                  Remove
                </button>
              </div>
            )}

            <button
              className="analyze-button"
              onClick={analyzeImage}
              disabled={!file || loading}
            >
              {loading
                ? "Analyzing image..."
                : "Analyze MRI image →"}
            </button>

            <p className="helper">
              {loading
                ? "Waiting for the model API to return its prediction."
                : "Images are sent to the research API for classification."}
            </p>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
          </div>

          <div className="panel results-panel">
            <span className="step">STEP 02</span>
            <h2>Analysis results</h2>

            {!result && !loading && (
              <div className="empty-state">
                <div className="scan-icon">⌕</div>
                <h3>Awaiting analysis</h3>
                <p>
                  Select an image and analyze it to see the model's prediction
                  and output scores.
                </p>
              </div>
            )}

            {loading && (
              <div className="empty-state">
                <div className="scan-icon">◌</div>
                <h3>Processing image</h3>
                <p>
                  The API may take a little longer if the free service was
                  sleeping.
                </p>
              </div>
            )}

            

{result && (
  <>
    <div className="prediction-result" aria-live="polite">
      <span className="result-label">MODEL PREDICTION</span>
      <h3>{formatClass(result.prediction)}</h3>
      <p>
        Output score:{" "}
        <strong>{formatPercent(result.confidence)}</strong>
      </p>
      <p className="helper">
        This score reflects the model output, not a clinically
        validated probability.
      </p>
    </div>

    <div className="gradcam-panel">
      <h3>Grad-CAM Explainability</h3>

      {result.gradcam ? (
        <img
          src={result.gradcam}
          alt="Grad-CAM heatmap overlay"
          className="gradcam-image"
          onError={() =>
            setError("The Grad-CAM image could not be displayed.")
          }
        />
      ) : (
        <p>Grad-CAM image was not returned by the API.</p>
      )}

      <p className="helper">
        {result.explanation_notice ||
          "Experimental visualization only. Not a clinical interpretation."}
      </p>
    </div>
  </>
)}


            <div className="class-list">
              {CLASSES.map(({ key, label }) => {
                const score = probabilityFor(key);
                const isPredicted =
                  result &&
                  String(result.prediction).toLowerCase().replace(/[\s_-]/g, "") ===
                    key;

                return (
                  <div className="class-row" key={key}>
                    <span>{label}</span>
                    <span className={isPredicted ? "pending predicted" : "pending"}>
                      {score !== undefined
                        ? formatPercent(score)
                        : result
                          ? isPredicted
                            ? formatPercent(result.confidence)
                            : "Score unavailable"
                          : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="helper">
              Research prototype only. Do not use these outputs to diagnose,
              rule out, or make treatment decisions about a medical condition.
            </p>
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
