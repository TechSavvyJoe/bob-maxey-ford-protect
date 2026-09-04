import { Component } from 'react';
import { useDialogFocus } from '../useDialogFocus';

export function RecoveryPanel({ modal = false, loading = false, onClose }) {
  const ref = useDialogFocus({ active: modal, onClose });
  return <div className={modal ? 'recovery-backdrop' : 'recovery-page'}>
    <section ref={ref} className="recovery-panel" role={modal ? 'dialog' : undefined} aria-modal={modal || undefined} aria-labelledby="recovery-title" tabIndex={-1}>
      <small>BOB MAXEY FORD PROTECT</small>
      <h2 id="recovery-title">{loading ? 'Opening your coverage builder…' : 'This view could not be loaded.'}</h2>
      <p role={loading ? 'status' : 'alert'}>{loading ? 'Your vehicle and product choices will appear here shortly.' : 'Please reload to try again. Saved planning drafts are kept on this device; unsaved information may need to be entered again.'}</p>
      <div>{!loading && <button className="button button--primary" type="button" onClick={() => window.location.reload()}>Reload this page</button>}
        {onClose && <button className="button button--secondary" type="button" onClick={onClose}>Back to the site</button>}</div>
    </section>
  </div>;
}

export default class RecoveryBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    // Do not log customer input or snapshots when reporting a rendering failure.
    console.error('A Ford Protect view could not be rendered.');
  }
  render() {
    return this.state.failed ? <RecoveryPanel modal={this.props.modal} onClose={this.props.onClose} /> : this.props.children;
  }
}
