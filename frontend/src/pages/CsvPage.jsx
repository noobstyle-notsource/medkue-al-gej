import {
  DownloadOutlined,
  InboxOutlined,
  ReloadOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { Button, Card, message, Progress, Upload } from "antd";
import { useRef, useState } from "react";
import { api } from "../api/client.js";

const { Dragger } = Upload;

export default function CsvPage() {
  const [importing, setImporting]     = useState(false);
  const [exporting, setExporting]     = useState(false);
  const [importResult, setImportResult] = useState(null); // null | {ok, rows}
  const [progress, setProgress]       = useState(0);
  const [fileList, setFileList]       = useState([]);

  /* ── Export ── */
  async function handleExport(type = "companies") {
    setExporting(true);
    try {
      const token = localStorage.getItem("crm_token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/csv/export`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success("Export downloaded!");
    } catch (e) {
      message.error(e.message);
    } finally {
      setExporting(false);
    }
  }

  /* ── Import ── */
  async function handleImport() {
    if (!fileList.length) { message.warning("Please select a CSV file first"); return; }
    const file = fileList[0].originFileObj || fileList[0];
    setImporting(true);
    setImportResult(null);
    setProgress(0);

    // Fake progress animation while backend processes
    const ticker = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 90));
    }, 250);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("crm_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/csv/import`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData }
      );
      const json = await res.json();
      clearInterval(ticker);
      setProgress(100);
      setImportResult({ ok: true, message: json.message || "Import completed!" });
      setFileList([]);
      message.success("Import started! Rows are being processed.");
    } catch (e) {
      clearInterval(ticker);
      setProgress(0);
      setImportResult({ ok: false, message: e.message });
      message.error(e.message);
    } finally {
      setImporting(false);
    }
  }

  const beforeUpload = (file) => {
    const isCSV = file.type === "text/csv" || file.name.endsWith(".csv");
    if (!isCSV) { message.error("Only .csv files are supported"); return Upload.LIST_IGNORE; }
    setFileList([file]);
    return false; // prevent auto-upload
  };

  return (
    <div>
      {/* Header */}
      <div className="srm-page-header">
        <div>
          <div className="srm-page-title">CSV Import / Export</div>
          <div className="srm-page-sub">Bulk manage contact & company data</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* ── Export ── */}
        <Card
          className="page-card"
          title={<span><DownloadOutlined style={{ marginRight: 8, color: "var(--emerald)" }} />Export Data</span>}
        >
          <div style={{ padding: "8px 0" }}>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 20, lineHeight: 1.7 }}>
              Download all your contacts/companies as a CSV file.
              Supports <strong style={{ color: "var(--text)" }}>10,000+ rows</strong> via streaming — no timeouts.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Companies export */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", borderRadius: "var(--radius)",
                background: "var(--surface-2)", border: "1px solid var(--border)",
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>🏢 Companies</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>id, name, phone, email, status, createdAt</div>
                </div>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={exporting}
                  onClick={() => handleExport("companies")}
                  style={{ height: 36 }}
                >
                  Download
                </Button>
              </div>

              <div style={{
                padding: "10px 14px", borderRadius: "var(--radius)",
                background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
                fontSize: 12, color: "var(--text-3)",
              }}>
                💡 <strong style={{ color: "var(--text-2)" }}>Stream processing</strong> — exports are generated line-by-line, so huge datasets don't time out.
              </div>
            </div>
          </div>
        </Card>

        {/* ── Import ── */}
        <Card
          className="page-card"
          title={<span><InboxOutlined style={{ marginRight: 8, color: "var(--primary)" }} />Import Data</span>}
        >
          <div style={{ padding: "8px 0" }}>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 16, lineHeight: 1.7 }}>
              Upload a CSV to bulk-create companies. Processed in <strong style={{ color: "var(--text)" }}>batches of 1,000 rows</strong> for performance.
            </p>

            {/* CSV format hint */}
            <div style={{
              padding: "10px 14px", borderRadius: "var(--radius)",
              background: "var(--surface-2)", border: "1px solid var(--border)",
              fontSize: 12, fontFamily: "monospace", color: "var(--text-2)",
              marginBottom: 16,
            }}>
              <div style={{ color: "var(--text-3)", marginBottom: 4, fontSize: 11, fontFamily: "inherit" }}>Expected columns:</div>
              name, phone, email, status
            </div>

            <Dragger
              name="file"
              beforeUpload={beforeUpload}
              fileList={fileList}
              onRemove={() => setFileList([])}
              accept=".csv"
              multiple={false}
              style={{ marginBottom: 16 }}
            >
              <p style={{ fontSize: 36, margin: "8px 0 4px" }}>📄</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                Drop CSV here or <span style={{ color: "var(--primary)" }}>click to browse</span>
              </p>
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                .csv files only · 10,000+ rows supported
              </p>
            </Dragger>

            {importing && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>Processing…</div>
                <Progress
                  percent={Math.round(progress)}
                  strokeColor={{ from: "var(--primary)", to: "var(--violet)" }}
                  trailColor="var(--surface-3)"
                  size="small"
                />
              </div>
            )}

            {importResult && (
              <div style={{
                padding: "10px 14px", borderRadius: "var(--radius)", marginBottom: 14,
                background: importResult.ok ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)",
                border: `1px solid ${importResult.ok ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.25)"}`,
                color: importResult.ok ? "#6ee7b7" : "#fda4af",
                fontSize: 13,
              }}>
                {importResult.ok ? "✅" : "❌"} {importResult.message}
              </div>
            )}

            <Button
              type="primary"
              icon={<InboxOutlined />}
              onClick={handleImport}
              loading={importing}
              disabled={!fileList.length}
              block
              style={{ height: 40 }}
            >
              {importing ? "Importing…" : "Start Import"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="page-card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {[
            { icon: "1️⃣", title: "Prepare your CSV", desc: "Make sure your file has headers: name, phone, email, status" },
            { icon: "2️⃣", title: "Upload",           desc: "Drag & drop or click browse. Only .csv files accepted." },
            { icon: "3️⃣", title: "Background processing", desc: "Large files are processed in 1,000-row batches in the background." },
            { icon: "4️⃣", title: "Check contacts",   desc: "Go to Contacts to see your imported data after a few seconds." },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ flex: "1 1 180px" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
