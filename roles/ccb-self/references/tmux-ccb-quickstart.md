# Tmux CCB Quickstart

This is user-facing tmux guidance for CCB-managed sessions.

Safe user actions:

- detach from tmux
- reattach to the CCB session
- navigate windows and panes
- zoom a pane
- enter copy/scroll mode
- resize panes interactively for local viewing

Unsafe maintenance actions for `ccb_self`:

- `tmux kill-pane`
- `tmux kill-window`
- `tmux kill-server`
- `tmux respawn-pane`
- ad hoc `tmux send-keys`
- manual pane/window creation as a replacement for CCB recovery

`ccb_self` may use read-only CCB-owned pane evidence: pane list, pane text
capture, activity sampling, and later bounded screenshots. Pane evidence does
not define configured-agent authority.
