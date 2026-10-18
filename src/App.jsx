import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import {
  Brain,
  LayoutGrid,
  Sparkles,
  UploadCloud,
  X,
  Loader2,
  ScanSearch,
  Activity,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
  CircleCheck,
  Copy,
  Gauge,
  Lightbulb,
} from "lucide-react";
import "./App.css";

const API_URL = "https://clinguard-api-copy.onrender.com/predict";

const CLASSES = [
  { key: "glioma", label: "Glioma", dot: "cg-dot-a" },
  { key: "meningioma", label: "Meningioma", dot: "cg-dot-b" },
  { key: "notumor", label: "No tumor", dot: "cg-dot-c" },
  { key: "pituitary", label: "Pituitary", dot: "cg-dot-d" },
];

function formatClass(value) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  const match = CLASSES.find(
    (item) => item.key.replace(/[\s_-]/g, "") === normalized,
  );
  return match?.label ?? String(value ?? "Unknown");
}

function toPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return number <= 1 ? number * 100 : number;
}

function formatPercent(value) {
  const percent = toPercent(value);
  if (percent === null) return "—";
  return `${percent.toFixed(2)}%`;
}

/* ---------- Animated counter hook ---------- */
function useCountUp(target, duration = 1200, start = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
}

/* ---------- Stat card ---------- */
function StatCard({ icon, label, displayValue, caption, delay }) {
  return (
    <motion.div
      className="cg-stat-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <span>{label}</span>
      <h3>{displayValue}</h3>
      <p>{caption}</p>
      <span
        style={{
          position: "absolute",
          right: 20,
          top: 20,
          color: "rgba(110,231,183,0.45)",
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
    </motion.div>
  );
}

function AnimatedStat({ icon, label, target, suffix, caption, delay, decimals = 0 }) {
  const animated = useCountUp(target, 1400, true);
  const display =
    decimals > 0 ? animated.toFixed(decimals) : Math.round(animated).toString();
  return (
    <StatCard
      icon={icon}
      label={label}
      displayValue={`${display}${suffix}`}
      caption={caption}
      delay={delay}
    />
  );
}

/* ---------- Confidence gauge ---------- */
function ConfidenceGauge({ percent }) {
  const animated = useCountUp(percent, 1100, true);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, animated));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="cg-gauge">
      <div className="cg-gauge-ring">
        <svg width="86" height="86" viewBox="0 0 86 86">
          <defs>
            <linearGradient id="cg-gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9af0cf" />
              <stop offset="100%" stopColor="#46b891" />
            </linearGradient>
          </defs>
          <circle className="cg-gauge-track-circle" cx="43" cy="43" r={radius} />
          <circle
            className="cg-gauge-fill-circle"
            cx="43"
            cy="43"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="cg-gauge-value">{Math.round(clamped)}%</div>
      </div>
      <div className="cg-gauge-meta">
        <span>Model output score</span>
        <strong>{percent.toFixed(2)}% confidence</strong>
        <span style={{ fontSize: 10, color: "#71849e" }}>
          ResNet18 · softmax probability
        </span>
      </div>
    </div>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const navItems = [
  { key: "analysis", label: "MRI Analysis", icon: <Brain size={17} /> },
  { key: "overview", label: "Model Overview", icon: <LayoutGrid size={17} /> },
  { key: "explainability", label: "Explainability", icon: <Sparkles size={17} /> },
];

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [activePage, setActivePage] = useState("analysis");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = useCallback((selected) => {
    if (!selected) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(selected.type)) {
      setError("Please select a JPG, PNG, or WebP image.");
      toast.error("Unsupported file type", {
        description: "Please select a JPG, PNG, or WebP image.",
      });
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("The image must be smaller than 10 MB.");
      toast.error("File too large", {
        description: "The image must be smaller than 10 MB.",
      });
      return;
    }
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });
    setFile(selected);
    setResult(null);
    setError("");
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files?.[0];
      handleFile(dropped);
    },
    [handleFile],
  );

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const analyzeImage = async () => {
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
          data?.detail || `Prediction failed (HTTP ${response.status}).`,
        );
      }
      if (!data.prediction || data.confidence === undefined) {
        throw new Error("The API returned an unexpected response.");
      }
      setResult(data);
      toast.success("Analysis complete", {
        description: `Predicted: ${formatClass(data.prediction)} · ${formatPercent(data.confidence)} confidence`,
      });
    } catch (err) {
      const message =
        err?.message?.includes("Failed to fetch")
          ? "Could not reach the API. It may be starting up, or a network/CORS issue may be preventing access. Please try again."
          : err?.message || "Something went wrong while analyzing the image.";
      setError(message);
      toast.error("Analysis failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  const probabilities = result?.probabilities;
  const probabilityFor = (key) => {
    if (Array.isArray(probabilities)) {
      const index = CLASSES.findIndex((item) => item.key === key);
      const v = probabilities[index];
      return typeof v === "number" ? v : undefined;
    }
    if (probabilities && typeof probabilities === "object") {
      const matchingKey = Object.keys(probabilities).find(
        (item) => item.toLowerCase().replace(/[\s_-]/g, "") === key,
      );
      const v = matchingKey ? probabilities[matchingKey] : undefined;
      return typeof v === "number" ? v : undefined;
    }
    return undefined;
  };

  const confidencePercent = useMemo(
    () => toPercent(result?.confidence) ?? 0,
    [result?.confidence],
  );

  const pageTitle =
    activePage === "analysis"
      ? "MRI Analysis"
      : activePage === "overview"
        ? "Model Overview"
        : "Explainability";

  const copyResult = () => {
    if (!result) return;
    const text = `ClinGuard MRI Analysis\nPrediction: ${formatClass(result.prediction)}\nConfidence: ${formatPercent(result.confidence)}\nModel: ResNet18 (research prototype)`;
    navigator.clipboard?.writeText(text);
    toast.success("Result copied to clipboard");
  };

  return (
    <div className="cg-app">
      <div className="cg-aurora" aria-hidden="true">
        <div className="cg-aurora-blob" />
      </div>
      <div className="cg-grid-overlay" aria-hidden="true" />

      <div className="cg-shell">
        {/* ---------- Sidebar ---------- */}
        <aside className="cg-sidebar">
          <div className="cg-brand">
            <div className="cg-brand-icon">C</div>
            <div>
              <h2>ClinGuard</h2>
              <span>MRI Intelligence</span>
            </div>
          </div>

          <p className="cg-nav-label">WORKSPACE</p>
          <nav style={{ display: "flex", flexDirection: "column" }}>
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`cg-nav-item${activePage === item.key ? " active" : ""}`}
                onClick={() => setActivePage(item.key)}
                type="button"
              >
                <span className="cg-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="cg-sidebar-bottom">
            <div>
              <span className="cg-status-dot" />
              Research prototype
            </div>
            <p>AI-assisted image analysis · not for clinical use</p>
          </div>
        </aside>

        {/* ---------- Main ---------- */}
        <main className="cg-main">
          <header className="cg-topbar">
            <div>
              <span className="cg-breadcrumb">Workspace / </span>
              <strong>{pageTitle}</strong>
            </div>
            <span className="cg-badge">EXPERIMENTAL PROTOTYPE</span>
          </header>

          <div className="cg-content">
            <AnimatePresence mode="wait">
              {activePage === "analysis" && (
                <motion.div
                  key="analysis"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <section className="cg-welcome">
                    <span className="cg-eyebrow">AI-POWERED IMAGE ANALYSIS</span>
                    <h1>
                      Understand the image.
                      <br />
                      <span className="cg-accent">Explore the evidence.</span>
                    </h1>
                    <p>
                      Upload a brain MRI image to explore model-assisted
                      classification with Grad-CAM explainability.
                    </p>
                  </section>

                  <section className="cg-stats">
                    <StatCard
                      icon={<Cpu size={22} />}
                      label="MODEL ARCHITECTURE"
                      displayValue="ResNet18"
                      caption="Transfer learning"
                      delay={0.05}
                    />
                    <AnimatedStat
                      icon={<Gauge size={22} />}
                      label="TEST ACCURACY"
                      target={92.4}
                      suffix="%"
                      caption="Held-out test split"
                      delay={0.13}
                      decimals={2}
                    />
                    <AnimatedStat
                      icon={<Layers size={22} />}
                      label="OUTPUT CLASSES"
                      target={4}
                      suffix=""
                      caption="Multi-class classification"
                      delay={0.21}
                    />
                  </section>

                  <section className="cg-workspace">
                    <div className="cg-panel cg-upload-panel">
                      <div className="cg-panel-heading">
                        <div>
                          <span className="cg-step">STEP 01</span>
                          <h2>Upload MRI image</h2>
                        </div>
                        <span className="cg-file-tag">JPG · PNG · WEBP · MAX 10 MB</span>
                      </div>

                      <label
                        className={`cg-dropzone${dragging ? " cg-dragging" : ""}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                      >
                        {preview ? (
                          <img src={preview} alt="Selected MRI preview" />
                        ) : (
                          <>
                            <div className="cg-upload-icon">
                              <UploadCloud size={26} />
                            </div>
                            <h3>
                              {dragging ? "Drop the image here" : "Drag & drop an MRI image"}
                            </h3>
                            <p>or click to browse your files</p>
                            <span className="cg-browse-button">Select image</span>
                          </>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                      </label>

                      <AnimatePresence>
                        {file && (
                          <motion.div
                            className="cg-file-info"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            <div className="cg-file-info-meta">
                              <span>Selected file</span>
                              <strong>{file.name}</strong>
                            </div>
                            <button type="button" onClick={removeFile} disabled={loading}>
                              <X size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                              Remove
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        className="cg-analyze-button"
                        onClick={analyzeImage}
                        disabled={!file || loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            Analyzing image…
                          </>
                        ) : (
                          <>
                            <ScanSearch size={15} />
                            Analyze MRI image
                            <ArrowRight size={15} />
                          </>
                        )}
                      </button>

                      <p className="cg-helper">
                        {loading
                          ? "Waiting for the model API to return its prediction."
                          : "Images are sent to the research API for classification."}
                      </p>

                      <AnimatePresence>
                        {error && (
                          <motion.div
                            className="cg-error-message"
                            role="alert"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                          >
                            <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{error}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="cg-panel cg-results-panel">
                      <div className="cg-panel-heading">
                        <div>
                          <span className="cg-step">STEP 02</span>
                          <h2>Analysis results</h2>
                        </div>
                        {result && (
                          <button className="cg-copy-chip" onClick={copyResult} type="button">
                            <Copy size={12} /> Copy
                          </button>
                        )}
                      </div>

                      {!result && !loading && (
                        <div className="cg-empty-state">
                          <div className="cg-scan-icon cg-pulsing">
                            <ScanSearch size={28} />
                          </div>
                          <h3>Awaiting analysis</h3>
                          <p>
                            Select an image and analyze it to see the model's
                            prediction and output scores.
                          </p>
                        </div>
                      )}

                      {loading && (
                        <div className="cg-empty-state">
                          <div className="cg-scan-icon cg-spinning">
                            <Loader2 size={28} />
                          </div>
                          <h3>Processing image</h3>
                          <p>
                            The API may take a little longer if the free service was
                            sleeping.
                          </p>
                          <div className="cg-skeleton">
                            <div className="cg-skeleton-line mid" />
                            <div className="cg-skeleton-line short" />
                            <div className="cg-skeleton-block" />
                            <div className="cg-skeleton-line" />
                            <div className="cg-skeleton-line short" />
                          </div>
                        </div>
                      )}

                      <AnimatePresence>
                        {result && !loading && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                          >
                            <motion.div
                              className="cg-prediction-result"
                              aria-live="polite"
                              initial={{ opacity: 0, scale: 0.97, y: 8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            >
                              <span className="cg-result-label">MODEL PREDICTION</span>
                              <h3>{formatClass(result.prediction)}</h3>
                              <div className="cg-confidence-row">
                                <Activity size={15} style={{ opacity: 0.7 }} />
                                <span>Output score:</span>
                                <strong>{formatPercent(result.confidence)}</strong>
                              </div>
                              <ConfidenceGauge percent={confidencePercent} />
                            </motion.div>

                            {result.gradcam && (
                              <motion.div
                                className="cg-gradcam-panel"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15, duration: 0.4 }}
                              >
                                <h3>Grad-CAM Explainability</h3>
                                <p className="cg-gradcam-sub">
                                  Heatmap of regions influencing the prediction.
                                </p>
                                <img
                                  src={result.gradcam}
                                  alt="Grad-CAM heatmap overlay"
                                  className="cg-gradcam-image"
                                  onError={() =>
                                    toast.error("The Grad-CAM image could not be displayed.")
                                  }
                                />
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="cg-class-list">
                        {CLASSES.map(({ key, label, dot }, idx) => {
                          const score = probabilityFor(key);
                          const isPredicted =
                            !!result &&
                            String(result.prediction)
                              .toLowerCase()
                              .replace(/[\s_-]/g, "") === key;

                          const displayScore =
                            score !== undefined
                              ? Number(score) <= 1
                                ? Number(score) * 100
                                : Number(score)
                              : result && isPredicted
                                ? Number(result.confidence) <= 1
                                  ? Number(result.confidence) * 100
                                  : Number(result.confidence)
                                : null;

                          const scoreText =
                            score !== undefined
                              ? formatPercent(score)
                              : result
                                ? isPredicted
                                  ? formatPercent(result.confidence)
                                  : "Score unavailable"
                                : "Pending";

                          return (
                            <motion.div
                              className={`cg-class-row${isPredicted ? " cg-is-predicted" : ""}`}
                              key={key}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 + idx * 0.08, duration: 0.35 }}
                            >
                              <div className="cg-class-row-main">
                                <span>
                                  <span className={`cg-class-dot ${dot}`} />
                                  {label}
                                  {isPredicted && (
                                    <CircleCheck
                                      size={14}
                                      style={{ marginLeft: 6, color: "var(--cg-mint)", verticalAlign: "middle" }}
                                    />
                                  )}
                                </span>
                                <span className={isPredicted ? "cg-predicted" : "cg-pending"}>
                                  {scoreText}
                                </span>
                              </div>
                              <div className="cg-score-track" aria-label={`${label} output score`}>
                                <div
                                  className={`cg-score-fill${isPredicted ? " cg-score-fill-active" : ""}`}
                                  style={{
                                    width: `${displayScore === null || !Number.isFinite(displayScore) ? 0 : Math.max(0, Math.min(100, displayScore))}%`,
                                  }}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  <footer className="cg-footer">
                    <div>
                      <strong>ClinGuard MRI</strong>
                      <span style={{ marginLeft: 10 }}>
                        Research prototype · For research and demonstration
                      </span>
                    </div>
                    <div className="cg-footer-links">
                      <span>ResNet18 · Grad-CAM</span>
                    </div>
                  </footer>
                </motion.div>
              )}

              {activePage === "overview" && (
                <motion.section
                  key="overview"
                  className="cg-content-page"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="cg-page-intro">
                    <span className="cg-eyebrow">MODEL DOCUMENTATION</span>
                    <h1>Inside the model.</h1>
                    <p>
                      Explore the model architecture, evaluation results, and
                      image-analysis workflow behind ClinGuard.
                    </p>
                  </div>
                  <p className="cg-prototype-note">
                    Research prototype · Results are for research and demonstration,
                    not clinical use.
                  </p>
                  <div className="cg-overview-grid">
                    <article className="cg-info-card cg-feature-card">
                      <span className="cg-card-kicker">CLASSIFICATION MODEL</span>
                      <h2>ResNet18</h2>
                      <p>
                        A convolutional neural network using transfer learning to
                        classify an uploaded MRI image into one of four dataset
                        categories.
                      </p>
                      <div className="cg-chip-row">
                        <span>Transfer learning</span>
                        <span>4 output classes</span>
                        <span>PyTorch</span>
                      </div>
                    </article>
                    <article className="cg-info-card cg-metric-card">
                      <span className="cg-card-kicker">HELD-OUT TEST SET</span>
                      <strong className="cg-big-metric">92.40%</strong>
                      <p>Test accuracy · 1,459 / 1,579 images correct</p>
                      <span className="cg-metric-note">
                        Measured on the current deduplicated test split.
                      </span>
                    </article>
                  </div>
                  <article className="cg-info-card">
                    <span className="cg-card-kicker">OUTPUT CATEGORIES</span>
                    <div className="cg-class-definition-grid">
                      <div><span className="cg-class-dot cg-dot-a" /><strong>Glioma</strong><p>Dataset classification category.</p></div>
                      <div><span className="cg-class-dot cg-dot-b" /><strong>Meningioma</strong><p>Dataset classification category.</p></div>
                      <div><span className="cg-class-dot cg-dot-c" /><strong>No tumor</strong><p>Dataset classification category.</p></div>
                      <div><span className="cg-class-dot cg-dot-d" /><strong>Pituitary</strong><p>Dataset classification category.</p></div>
                    </div>
                  </article>
                  <article className="cg-info-card">
                    <span className="cg-card-kicker">HOW THE PIPELINE WORKS</span>
                    <div className="cg-pipeline-steps">
                      <div><span>01</span><strong>Upload</strong><p>Select a JPG, PNG or WebP image up to 10 MB.</p></div>
                      <div><span>02</span><strong>Classify</strong><p>The API preprocesses the image and runs the ResNet18 model.</p></div>
                      <div><span>03</span><strong>Explain</strong><p>Grad-CAM creates a heatmap highlighting image regions influential to the prediction.</p></div>
                    </div>
                  </article>
                  <button className="cg-primary-link" onClick={() => setActivePage("analysis")} type="button">
                    Go to MRI analysis <ArrowRight size={14} />
                  </button>
                </motion.section>
              )}

              {activePage === "explainability" && (
                <motion.section
                  key="explainability"
                  className="cg-content-page"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="cg-page-intro">
                    <span className="cg-eyebrow">MODEL INTERPRETATION</span>
                    <h1>Explore the evidence.</h1>
                    <p>
                      Grad-CAM visualizes image regions that influence the
                      classifier's prediction. It is an explanatory aid, not a tumor
                      segmentation mask.
                    </p>
                  </div>
                  <p className="cg-prototype-note">
                    Research prototype · Results are for research and demonstration,
                    not clinical use.
                  </p>
                  {result?.gradcam ? (
                    <>
                      <article className="cg-info-card cg-explain-result-card">
                        <div className="cg-explain-result-heading">
                          <div>
                            <span className="cg-card-kicker">CURRENT ANALYSIS</span>
                            <h2>{formatClass(result.prediction)}</h2>
                          </div>
                          <span className="cg-result-pill">
                            Output score {formatPercent(result.confidence)}
                          </span>
                        </div>
                        <img
                          src={result.gradcam}
                          alt="Grad-CAM visualization for the current MRI prediction"
                          className="cg-explain-large-image"
                          onError={() => toast.error("The Grad-CAM image could not be displayed.")}
                        />
                      </article>
                      <div className="cg-overview-grid">
                        <article className="cg-info-card">
                          <span className="cg-card-kicker">HOW TO READ IT</span>
                          <h2>Highlighted areas</h2>
                          <p>
                            The heatmap indicates regions that contributed to the
                            model's output for this prediction. Highlighted areas are
                            not proof that a tumor exists there.
                          </p>
                        </article>
                        <article className="cg-info-card">
                          <span className="cg-card-kicker">GRAD-CAM</span>
                          <h2>Image-region highlights</h2>
                          <p>
                            Grad-CAM highlights regions that influenced the
                            classifier. It is different from a pixel-level tumor
                            segmentation mask.
                          </p>
                        </article>
                      </div>
                    </>
                  ) : (
                    <article className="cg-info-card cg-explain-empty">
                      <div className="cg-explain-empty-icon">
                        <Lightbulb size={30} />
                      </div>
                      <h2>No explanation available yet</h2>
                      <p>
                        Upload an MRI in the MRI Analysis workspace and run an
                        analysis. When the API returns a Grad-CAM image, it will
                        appear here.
                      </p>
                      <button className="cg-primary-link" onClick={() => setActivePage("analysis")} type="button">
                        Go to MRI analysis <ArrowRight size={14} />
                      </button>
                    </article>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "rgba(16, 26, 42, 0.95)",
            border: "1px solid rgba(46, 64, 92, 0.7)",
            color: "#eaf0fa",
          },
        }}
      />
    </div>
  );
}
