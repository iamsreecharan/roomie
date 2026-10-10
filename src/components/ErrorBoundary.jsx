import React from "react";
import { RefreshCw, Home } from "lucide-react";

export class PageBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("Roomverse view failed:", error);
  }
  render() {
    if (this.state.failed)
      return (
        <section className="view-recovery" role="alert">
          <span className="recovery-icon">
            <RefreshCw size={28} />
          </span>
          <h1>This view couldn’t open</h1>
          <p>Try this view again, or return to your room.</p>
          <div className="row">
            <button
              className="button secondary"
              onClick={() => this.setState({ failed: false })}
            >
              <RefreshCw size={16} />
              Retry view
            </button>
            <button
              className="button"
              onClick={async () => {
                if (this.props.onRecover) {
                  await this.props.onRecover();
                  this.setState({ failed: false });
                } else location.assign("/#/room");
              }}
            >
              <Home size={16} />
              Open my room
            </button>
          </div>
        </section>
      );
    return this.props.children;
  }
}
