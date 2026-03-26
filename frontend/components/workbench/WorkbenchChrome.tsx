import { ActionIcon } from "./ActionIcon";
import type { AgentTab } from "./types";

type WorkbenchChromeProps = {
  activeAgentTab: AgentTab;
  stageFlags: { ba: boolean; dev: boolean; rev: boolean };
  stageJobStatus: Partial<Record<AgentTab, "pending" | "running" | "completed" | "failed" | "cancelled">>;
  allowedTabs: AgentTab[];
  setActiveAgentTab: (tab: AgentTab) => void;
  showFullWorkflow: boolean;
};

export function WorkbenchChrome({
  activeAgentTab,
  stageFlags,
  stageJobStatus,
  allowedTabs,
  setActiveAgentTab,
  showFullWorkflow
}: WorkbenchChromeProps) {
  const canOpen = (tab: AgentTab) => allowedTabs.includes(tab);
  const jobLabel = (tab: AgentTab) => {
    const status = stageJobStatus[tab];
    if (!status) return null;
    if (status === "running") return "Running";
    if (status === "pending") return "Queued";
    if (status === "failed") return "Failed";
    if (status === "cancelled") return "Cancelled";
    if (status === "completed" && !stageFlags[tab]) {
      return tab === "dev" ? "In progress" : "Ready";
    }
    return "Done";
  };
  const stageIcon = (tab: AgentTab) => (tab === "ba" ? "ba" : tab === "dev" ? "dev" : "reviewer");

  return (
    <>
      {showFullWorkflow && (
        <section className="workflow-rail">
          <button
            className={`workflow-stage-card ${activeAgentTab === "ba" ? "active" : ""} ${stageFlags.ba ? "completed" : ""} ${!canOpen("ba") ? "locked" : ""}`}
            onClick={() => setActiveAgentTab("ba")}
            disabled={!canOpen("ba")}
            aria-current={activeAgentTab === "ba" ? "step" : undefined}
            title={!canOpen("ba") ? "Complete prior stage to unlock BA details" : "Open BA stage"}
          >
            <div className="workflow-stage-card-head">
              <div className="workflow-stage-top">
                <span className="workflow-stage-index">01</span>
                <span className="workflow-stage-icon">
                  <ActionIcon name={stageIcon("ba")} className="action-icon" />
                </span>
                <span className="workflow-stage-role">BA</span>
              </div>
              {jobLabel("ba") ? <span className={`stage-job-pill ${stageJobStatus.ba}`}>{jobLabel("ba")}</span> : null}
            </div>
            <div className="workflow-stage-title">Mapping Spec</div>
            <div className="workflow-stage-meta">{stageFlags.ba ? "Spec completed" : "PSD to data mapping"}</div>
          </button>

          <button
            className={`workflow-stage-card ${activeAgentTab === "dev" ? "active" : ""} ${stageFlags.dev ? "completed" : ""} ${!canOpen("dev") ? "locked" : ""}`}
            onClick={() => setActiveAgentTab("dev")}
            disabled={!canOpen("dev")}
            aria-current={activeAgentTab === "dev" ? "step" : undefined}
            title={!canOpen("dev") ? "Complete prior stage to unlock DEV details" : "Open DEV stage"}
          >
            <div className="workflow-stage-card-head">
              <div className="workflow-stage-top">
                <span className="workflow-stage-index">02</span>
                <span className="workflow-stage-icon">
                  <ActionIcon name={stageIcon("dev")} className="action-icon" />
                </span>
                <span className="workflow-stage-role">DEV</span>
              </div>
              {jobLabel("dev") ? <span className={`stage-job-pill ${stageJobStatus.dev}`}>{jobLabel("dev")}</span> : null}
            </div>
            <div className="workflow-stage-title">Submission Build</div>
            <div className="workflow-stage-meta">{stageFlags.dev ? "SQL ready" : "Build delivery assets"}</div>
          </button>

          <button
            className={`workflow-stage-card ${activeAgentTab === "rev" ? "active" : ""} ${stageFlags.rev ? "completed" : ""} ${!canOpen("rev") ? "locked" : ""}`}
            onClick={() => setActiveAgentTab("rev")}
            disabled={!canOpen("rev")}
            aria-current={activeAgentTab === "rev" ? "step" : undefined}
            title={!canOpen("rev") ? "Complete prior stage to unlock Reviewer details" : "Open Reviewer stage"}
          >
            <div className="workflow-stage-card-head">
              <div className="workflow-stage-top">
                <span className="workflow-stage-index">03</span>
                <span className="workflow-stage-icon">
                  <ActionIcon name={stageIcon("rev")} className="action-icon" />
                </span>
                <span className="workflow-stage-role">Review</span>
              </div>
              {jobLabel("rev") ? <span className={`stage-job-pill ${stageJobStatus.rev}`}>{jobLabel("rev")}</span> : null}
            </div>
            <div className="workflow-stage-title">Validation</div>
            <div className="workflow-stage-meta">{stageFlags.rev ? "Review complete" : "Validate XML and rules"}</div>
          </button>
        </section>
      )}
    </>
  );
}
